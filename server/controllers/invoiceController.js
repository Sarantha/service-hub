const BillingService = require('../services/billingService');
const InvoicePdfService = require('../services/invoicePdfService');

/**
 * POST /api/v1/invoices/generate
 * Generate an invoice from a completed Job Card.
 */
exports.generateInvoice = async (req, res, next) => {
  try {
    const { jobCardId, taxRate } = req.body;
    const invoice = await BillingService.generateInvoice(jobCardId, taxRate, req.branchScope.filter);
    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully.',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/invoices
 * List all active invoices.
 */
exports.getAllInvoices = async (req, res, next) => {
  try {
    const { date, month } = req.query;
    const invoices = await BillingService.getAllInvoices({ date, month }, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Invoices retrieved successfully.',
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/invoices/summary
 * Period-scoped billing stats (today by default, or a given day/month).
 */
exports.getInvoiceSummary = async (req, res, next) => {
  try {
    const { date, month } = req.query;
    const summary = await BillingService.getInvoiceSummary({ date, month }, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Invoice summary retrieved successfully.',
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/invoices/:idOrNumber
 * Retrieve a single invoice by number or ObjectId.
 */
exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await BillingService.getInvoice(req.params.idOrNumber, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Invoice retrieved.',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/invoices/:idOrNumber/pdf
 * Stream a generated PDF of the invoice, including job card checklist and
 * Parts & Labour ledger details.
 */
exports.downloadInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await BillingService.getInvoice(req.params.idOrNumber, req.branchScope.filter);
    const pdfBuffer = await InvoicePdfService.buildInvoicePdfBuffer(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/invoices/:idOrNumber/payment
 * Record payment and seal the invoice (and its parent Job Card).
 */
exports.recordPayment = async (req, res, next) => {
  try {
    const { idOrNumber } = req.params;
    const { method } = req.body;
    const invoice = await BillingService.recordPayment(idOrNumber, method, req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: `Payment recorded. Invoice ${invoice.invoiceNumber} is now settled.`,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};
