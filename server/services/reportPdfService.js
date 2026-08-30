const PDFDocument = require('pdfkit');

const CURRENCY = 'LKR';
const fmt = (n) => `${CURRENCY} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => Number(n || 0).toLocaleString('en-US');

const REPORT_TITLES = {
  'jobs-completed-daily':        'Jobs Completed — Daily',
  'sales-daily':                 'Sales — Daily',
  'inventory-consumption-daily': 'Inventory Consumption — Daily',
  'outstanding-balances':        'Outstanding Balances / Accounts Receivable'
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (id) => `${MONTH_NAMES[id.month - 1]} ${id.day}`;

class ReportPdfService {
  /**
   * Renders one of the Reports & Analytics reports as a PDF and resolves to a
   * Buffer. Mirrors invoicePdfService.js's layout conventions exactly (manual
   * pdfkit coordinates, same brand color tokens, same currency formatter,
   * buffer-via-Promise wrapper) so every generated document in this app looks
   * and feels the same.
   */
  static async buildReportPdfBuffer(reportType, data, meta = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const title = REPORT_TITLES[reportType] || reportType;

        // ── Header ────────────────────────────────────────────────────────
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#0F4C81').text('ServiceHub', 50, 50);
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Station Management System', 50, 74);

        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1E293B').text(title, 50, 100, { width: 495, align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor('#64748B')
          .text(`Period: ${meta.label || '—'}`, 50, 122, { width: 495, align: 'right' })
          .text(`Generated: ${new Date().toLocaleString()}`, 50, 135, { width: 495, align: 'right' });

        doc.moveTo(50, 155).lineTo(545, 155).strokeColor('#E2E8F0').stroke();

        let y = 172;
        y = ReportPdfService._renderBody(doc, reportType, data, y);

        doc.fontSize(8).font('Helvetica').fillColor('#94A3B8')
          .text('Generated automatically by ServiceHub Reports & Analytics.', 50, 770, { width: 495, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  static _renderBody(doc, reportType, data, y) {
    switch (reportType) {
      case 'jobs-completed-daily':        return ReportPdfService._renderJobsCompletedDaily(doc, data, y);
      case 'sales-daily':                 return ReportPdfService._renderSalesDaily(doc, data, y);
      case 'inventory-consumption-daily': return ReportPdfService._renderInventoryConsumptionDaily(doc, data, y);
      case 'outstanding-balances':        return ReportPdfService._renderOutstandingBalances(doc, data, y);
      default:
        doc.fontSize(10).fillColor('#94A3B8').text('No renderer available for this report type.', 50, y);
        return y + 20;
    }
  }

  /** Generic column-aligned table, matching invoicePdfService.js's manual layout technique. */
  static _drawTable(doc, { x = 50, y, columns, rows, emptyMessage = 'No data for this period.' }) {
    const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B');
    let cx = x;
    columns.forEach((col) => {
      doc.text(col.label.toUpperCase(), cx, y, { width: col.width, align: col.align || 'left' });
      cx += col.width;
    });
    y += 13;
    doc.moveTo(x, y).lineTo(x + tableWidth, y).strokeColor('#E2E8F0').stroke();
    y += 8;

    if (!rows.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#94A3B8').text(emptyMessage, x, y);
      return y + 18;
    }

    doc.font('Helvetica').fontSize(9).fillColor('#1E293B');
    rows.forEach((row) => {
      cx = x;
      columns.forEach((col) => {
        const value = col.format ? col.format(row) : String(row[col.key] ?? '');
        doc.text(value, cx, y, { width: col.width, align: col.align || 'left' });
        cx += col.width;
      });
      y += 16;
    });

    return y + 10;
  }

  static _drawSectionTitle(doc, text, y) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E293B').text(text, 50, y);
    return y + 18;
  }

  static _renderJobsCompletedDaily(doc, { buckets = [] }, y) {
    y = ReportPdfService._drawSectionTitle(doc, 'Jobs Completed by Day', y);
    return ReportPdfService._drawTable(doc, {
      y,
      columns: [
        { label: 'Day', width: 150, format: (r) => dayLabel(r._id) },
        { label: 'Jobs Completed', width: 150, align: 'right', format: (r) => num(r.count) }
      ],
      rows: buckets
    });
  }

  static _renderSalesDaily(doc, { buckets = [] }, y) {
    y = ReportPdfService._drawSectionTitle(doc, 'Sales by Day', y);
    return ReportPdfService._drawTable(doc, {
      y,
      columns: [
        { label: 'Day', width: 150, format: (r) => dayLabel(r._id) },
        { label: 'Sales', width: 130, align: 'right', format: (r) => fmt(r.totalSales) },
        { label: 'Invoices', width: 90, align: 'right', format: (r) => num(r.invoiceCount) }
      ],
      rows: buckets
    });
  }

  static _renderInventoryConsumptionDaily(doc, { buckets = [] }, y) {
    y = ReportPdfService._drawSectionTitle(doc, 'Inventory Consumption by Day', y);
    return ReportPdfService._drawTable(doc, {
      y,
      columns: [
        { label: 'Day', width: 150, format: (r) => dayLabel(r._id) },
        { label: 'Parts Consumed', width: 150, align: 'right', format: (r) => fmt(r.totalValue) }
      ],
      rows: buckets
    });
  }

  static _renderOutstandingBalances(doc, { invoices = [], buckets = [], totalOutstanding = 0, unpaidCount = 0 }, y) {
    doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(`Total Outstanding: `, 50, y, { continued: true, width: 495 });
    doc.font('Helvetica-Bold').fillColor('#0F4C81').text(`${fmt(totalOutstanding)}  (${unpaidCount} unpaid invoice${unpaidCount === 1 ? '' : 's'})`);
    y += 22;

    y = ReportPdfService._drawSectionTitle(doc, 'Aging Buckets', y);
    y = ReportPdfService._drawTable(doc, {
      y,
      columns: [
        { label: 'Age Range', key: 'label', width: 150 },
        { label: 'Invoices', width: 100, align: 'right', format: (r) => num(r.count) },
        { label: 'Amount', width: 120, align: 'right', format: (r) => fmt(r.totalAmount) }
      ],
      rows: buckets
    });

    y += 10;
    y = ReportPdfService._drawSectionTitle(doc, 'Unpaid Invoices', y);
    return ReportPdfService._drawTable(doc, {
      y,
      columns: [
        { label: 'Invoice #', key: 'invoiceNumber', width: 90 },
        { label: 'Job Card', key: 'jobCardNumber', width: 90 },
        { label: 'Phone', key: 'customerPhone', width: 100 },
        { label: 'Age (days)', width: 80, align: 'right', format: (r) => num(r.ageDays) },
        { label: 'Amount', width: 100, align: 'right', format: (r) => fmt(r.totalAmount) }
      ],
      rows: invoices
    });
  }
}

module.exports = ReportPdfService;
