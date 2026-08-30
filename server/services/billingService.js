const Invoice = require('../models/Invoice');
const JobCard = require('../models/JobCard');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

class BillingService {
  /**
   * Generates an invoice from a completed Job Card.
   * - Computes subtotal from partsAllocated + laborCharges (server-side, Guardrail #2)
   * - Applies VAT from the taxRate parameter (default 18%)
   * - Creates an immutable Invoice document
   */
  static async generateInvoice(jobCardId, taxRate = 18, branchFilter = {}) {
    if (!mongoose.Types.ObjectId.isValid(jobCardId)) {
      const error = new Error('Invalid Job Card ID format.');
      error.statusCode = 400;
      throw error;
    }

    // 1. Fetch Job Card
    const jobCard = await JobCard.findOne({ _id: jobCardId, ...branchFilter, isDeleted: false });
    if (!jobCard) {
      const error = new Error('Job Card not found.');
      error.statusCode = 404;
      throw error;
    }

    // 2. Enforce: Job Card must be Completed before invoicing
    if (!['Completed', 'Delivered'].includes(jobCard.status)) {
      const error = new Error(
        `Invoice can only be generated for Completed or Delivered Job Cards. Current status: '${jobCard.status}'.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Prevent duplicate invoices for the same Job Card
    const existingInvoice = await Invoice.findOne({ jobCardId, isDeleted: false });
    if (existingInvoice) {
      const error = new Error(
        `An invoice (${existingInvoice.invoiceNumber}) already exists for this Job Card.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Compile line items — all math done server-side (Guardrail #2)
    const partsLines = jobCard.partsAllocated.map(part => ({
      partName:              part.partName,
      quantity:              part.quantity,
      unitPriceAtAllocation: part.unitPriceAtAllocation,
      lineTotal:             part.quantity * part.unitPriceAtAllocation
    }));

    const laborLines = jobCard.laborCharges.map(labor => ({
      description: labor.description,
      cost:        labor.cost
    }));

    const partsTotal = partsLines.reduce((sum, p) => sum + p.lineTotal, 0);
    const laborTotal = laborLines.reduce((sum, l) => sum + l.cost, 0);
    const subtotal   = partsTotal + laborTotal;
    const taxAmount  = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

    // 5. Create the Invoice document — snapshot Job Card context so the invoice
    //    stays a complete, standalone record even if the Job Card changes later.
    const invoice = await Invoice.create({
      branchId:    jobCard.branchId,
      jobCardId:   jobCard._id,
      customerPhone: jobCard.customerPhone,
      jobCardNumber: jobCard.jobCardNumber,
      vehicleRegNo:  jobCard.vehicleRegNo,
      serviceType:   jobCard.serviceType,
      checklistSnapshot: jobCard.checklist.map(t => ({ task: t.task, isDone: t.isDone })),
      lineItems: {
        parts: partsLines,
        labor: laborLines
      },
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      paymentStatus: 'Unpaid',
      paymentMethod: 'None'
    });

    return invoice;
  }

  /**
   * Updates invoice payment status to Paid.
   * Once Paid, the parent Job Card is considered sealed (Guardrail #3).
   */
  static async recordPayment(invoiceNumberOrId, paymentMethod, branchFilter = {}) {
    const allowedMethods = ['Cash', 'Card', 'Online'];
    if (!allowedMethods.includes(paymentMethod)) {
      const error = new Error(`Invalid payment method. Allowed: ${allowedMethods.join(', ')}.`);
      error.statusCode = 400;
      throw error;
    }

    const query = mongoose.Types.ObjectId.isValid(invoiceNumberOrId)
      ? { _id: invoiceNumberOrId }
      : { invoiceNumber: invoiceNumberOrId };

    const invoice = await Invoice.findOne({ ...query, ...branchFilter, isDeleted: false });
    if (!invoice) {
      const error = new Error('Invoice not found.');
      error.statusCode = 404;
      throw error;
    }

    if (invoice.paymentStatus === 'Paid') {
      const error = new Error('This invoice has already been settled and is immutable.');
      error.statusCode = 400;
      throw error;
    }

    invoice.paymentStatus = 'Paid';
    invoice.paymentMethod = paymentMethod;
    invoice.paidAt = new Date();
    await invoice.save();

    return invoice;
  }

  /**
   * Resolves an optional { date: 'YYYY-MM-DD' } or { month: 'YYYY-MM' } filter
   * into concrete { gte, lte, label } bounds. Returns null if neither is given
   * (i.e. no date scoping requested).
   */
  static _resolveDayOrMonth({ date, month } = {}) {
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (month) {
      const [y, m] = month.split('-').map(Number);
      if (!y || !m || m < 1 || m > 12) return null;
      const gte = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const lte = new Date(y, m, 0, 23, 59, 59, 999); // last day of month
      return { gte, lte, label: `${MONTH_NAMES[m - 1]} ${y}` };
    }

    if (date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return null;
      const gte = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      const lte = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return { gte, lte, label: `${MONTH_NAMES[gte.getMonth()]} ${gte.getDate()}, ${gte.getFullYear()}` };
    }

    return null;
  }

  /**
   * Resolves customer names for a batch of invoices by their customerPhone,
   * matching the same customer-lookup pattern used by JobCardService.
   */
  static async _withCustomerNames(invoices) {
    const phones = [...new Set(invoices.map(inv => inv.customerPhone))];
    const customers = await Customer.find({ phone: { $in: phones }, isDeleted: false }).lean();
    const customerMap = {};
    customers.forEach(c => { customerMap[c.phone] = `${c.firstName} ${c.lastName}`; });

    return invoices.map(inv => ({
      ...inv,
      customerName: customerMap[inv.customerPhone] || 'Customer'
    }));
  }

  /**
   * Retrieves all non-deleted invoices, optionally scoped to a single day
   * ({date: 'YYYY-MM-DD'}) or a whole month ({month: 'YYYY-MM'}) by createdAt.
   */
  static async getAllInvoices({ date, month } = {}, branchFilter = {}) {
    const range = this._resolveDayOrMonth({ date, month });
    const query = { ...branchFilter, isDeleted: false };
    if (range) query.createdAt = { $gte: range.gte, $lte: range.lte };

    const invoices = await Invoice.find(query)
      .populate('jobCardId', 'jobCardNumber vehicleRegNo status')
      .sort({ createdAt: -1 })
      .lean();

    return this._withCustomerNames(invoices);
  }

  /**
   * Computes period-scoped billing stats server-side (Guardrail #2): total
   * collected (Paid, by paidAt), total outstanding (Unpaid, by createdAt),
   * invoice count and average invoice value (all invoices, by createdAt).
   * Defaults to "today" when neither date nor month is given.
   */
  static async getInvoiceSummary({ date, month } = {}, branchFilter = {}) {
    const range = this._resolveDayOrMonth({ date, month }) || this._resolveDayOrMonth({ date: new Date().toISOString().slice(0, 10) });

    const [collectedAgg, outstandingAgg, allAgg] = await Promise.all([
      Invoice.aggregate([
        { $match: { ...branchFilter, isDeleted: false, paymentStatus: 'Paid', paidAt: { $gte: range.gte, $lte: range.lte } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Invoice.aggregate([
        { $match: { ...branchFilter, isDeleted: false, paymentStatus: 'Unpaid', createdAt: { $gte: range.gte, $lte: range.lte } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Invoice.aggregate([
        { $match: { ...branchFilter, isDeleted: false, createdAt: { $gte: range.gte, $lte: range.lte } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
      ])
    ]);

    const totalCollection = collectedAgg[0]?.total || 0;
    const totalOutstanding = outstandingAgg[0]?.total || 0;
    const invoiceCount = allAgg[0]?.count || 0;
    const invoiceTotal = allAgg[0]?.total || 0;
    const avgInvoiceValue = invoiceCount ? invoiceTotal / invoiceCount : 0;

    return {
      label: range.label,
      totalCollection,
      totalOutstanding,
      invoiceCount,
      avgInvoiceValue
    };
  }

  /**
   * Retrieves a single invoice by number or ID.
   */
  static async getInvoice(invoiceNumberOrId, branchFilter = {}) {
    const query = mongoose.Types.ObjectId.isValid(invoiceNumberOrId)
      ? { _id: invoiceNumberOrId }
      : { invoiceNumber: invoiceNumberOrId };

    const invoice = await Invoice.findOne({ ...query, ...branchFilter, isDeleted: false })
      .populate('jobCardId', 'jobCardNumber vehicleRegNo status')
      .lean();

    if (!invoice) {
      const error = new Error('Invoice not found.');
      error.statusCode = 404;
      throw error;
    }

    const [enriched] = await this._withCustomerNames([invoice]);
    return enriched;
  }

  /**
   * Checks if a Job Card is locked (linked to a Paid invoice).
   * Used by the state lock guard middleware.
   */
  static async isJobCardLocked(jobCardId) {
    if (!mongoose.Types.ObjectId.isValid(jobCardId)) return false;
    const paidInvoice = await Invoice.findOne({ jobCardId, paymentStatus: 'Paid', isDeleted: false });
    return !!paidInvoice;
  }
}

module.exports = BillingService;
