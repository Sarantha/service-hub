const PDFDocument = require('pdfkit');

const CURRENCY = 'LKR';
const fmt = (n) => `${CURRENCY} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

class InvoicePdfService {
  /**
   * Renders a full invoice document (job card context, checklist, parts &
   * labour ledger, and totals) as a PDF and resolves to a Buffer.
   */
  static async buildInvoicePdfBuffer(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ── Header ──────────────────────────────────────────────────────────
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#0F4C81').text('ServiceHub', 50, 50);
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Station Management System', 50, 74);

        doc.fontSize(18).font('Helvetica-Bold').fillColor('#1E293B').text('INVOICE', 400, 50, { align: 'right' });
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F4C81').text(invoice.invoiceNumber, 400, 72, { align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor('#64748B')
          .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 400, 88, { align: 'right' })
          .text(`Status: ${invoice.paymentStatus}`, 400, 101, { align: 'right' });

        doc.moveTo(50, 125).lineTo(545, 125).strokeColor('#E2E8F0').stroke();

        // ── Customer & Job Card details ─────────────────────────────────────
        let y = 140;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#94A3B8').text('BILL TO', 50, y);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#94A3B8').text('JOB CARD', 300, y);
        y += 14;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E293B').text(invoice.customerName || 'Customer', 50, y);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E293B').text(invoice.jobCardNumber || '—', 300, y);
        y += 15;
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(invoice.customerPhone || '', 50, y);
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(`Vehicle: ${invoice.vehicleRegNo || '—'}`, 300, y);
        y += 13;
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(`Service: ${invoice.serviceType || '—'}`, 300, y);

        y += 30;

        // ── Task Checklist ───────────────────────────────────────────────────
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E293B').text('Task Checklist', 50, y);
        y += 18;
        const checklist = invoice.checklistSnapshot || [];
        if (checklist.length === 0) {
          doc.fontSize(9).font('Helvetica').fillColor('#94A3B8').text('No checklist tasks recorded for this job.', 50, y);
          y += 16;
        } else {
          checklist.forEach((t) => {
            const taskHeight = doc.fontSize(9).font('Helvetica').heightOfString(t.task, { width: 470 });
            doc.fillColor(t.isDone ? '#10B981' : '#94A3B8').text(t.isDone ? '[x]' : '[ ]', 50, y, { width: 20, lineBreak: false });
            doc.fillColor('#1E293B').text(t.task, 72, y, { width: 470 });
            y += Math.max(14, taskHeight + 2);
          });
        }

        y += 16;

        // ── Parts & Labour table ─────────────────────────────────────────────
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E293B').text('Parts & Labour', 50, y);
        y += 18;

        const tableTop = y;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B');
        doc.text('DESCRIPTION', 50, tableTop);
        doc.text('QTY', 340, tableTop, { width: 40, align: 'right' });
        doc.text('UNIT PRICE', 390, tableTop, { width: 70, align: 'right' });
        doc.text('AMOUNT', 470, tableTop, { width: 75, align: 'right' });
        y = tableTop + 13;
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#E2E8F0').stroke();
        y += 8;

        const parts = invoice.lineItems?.parts || [];
        const labor = invoice.lineItems?.labor || [];

        doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
        parts.forEach((p) => {
          doc.text(p.partName, 50, y, { width: 280 });
          doc.text(String(p.quantity), 340, y, { width: 40, align: 'right' });
          doc.text(fmt(p.unitPriceAtAllocation), 390, y, { width: 70, align: 'right' });
          doc.text(fmt(p.lineTotal), 470, y, { width: 75, align: 'right' });
          y += 16;
        });
        labor.forEach((l) => {
          doc.text(l.description, 50, y, { width: 280 });
          doc.text('—', 340, y, { width: 40, align: 'right' });
          doc.text('—', 390, y, { width: 70, align: 'right' });
          doc.text(fmt(l.cost), 470, y, { width: 75, align: 'right' });
          y += 16;
        });
        if (parts.length === 0 && labor.length === 0) {
          doc.fillColor('#94A3B8').text('No parts or labour line items recorded.', 50, y);
          y += 16;
        }

        y += 6;
        doc.moveTo(50, y).lineTo(545, y).strokeColor('#E2E8F0').stroke();
        y += 12;

        // ── Totals ────────────────────────────────────────────────────────────
        const totalsX = 390;
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Subtotal', totalsX, y, { width: 70 });
        doc.fillColor('#1E293B').text(fmt(invoice.subtotal), 470, y, { width: 75, align: 'right' });
        y += 15;
        doc.fillColor('#64748B').text(`VAT (${invoice.taxRate}%)`, totalsX, y, { width: 70 });
        doc.fillColor('#1E293B').text(fmt(invoice.taxAmount), 470, y, { width: 75, align: 'right' });
        y += 17;
        doc.moveTo(totalsX, y).lineTo(545, y).strokeColor('#CBD5E1').stroke();
        y += 8;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F4C81').text('Total', totalsX, y, { width: 70 });
        doc.text(fmt(invoice.totalAmount), 470, y, { width: 75, align: 'right' });
        y += 24;

        doc.fontSize(9).font('Helvetica').fillColor('#64748B')
          .text(`Payment status: ${invoice.paymentStatus}${invoice.paymentMethod && invoice.paymentMethod !== 'None' ? ` (${invoice.paymentMethod})` : ''}`, 50, y);

        doc.fontSize(8).font('Helvetica').fillColor('#94A3B8')
          .text('Thank you for choosing ServiceHub. This document was generated automatically.', 50, 760, { width: 495, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = InvoicePdfService;
