const PDFDocument = require('pdfkit');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

class VehicleHistoryPdfService {
  /**
   * Renders a customer-facing vehicle service history as a PDF. Mirrors
   * invoicePdfService.js / reportPdfService.js's layout conventions exactly
   * (manual pdfkit coordinates, same brand color tokens, buffer-via-Promise
   * wrapper). Deliberately carries no financial amounts — the underlying
   * timeline data is already sanitized per the portal's access boundary
   * (Architecture 3.1), so the PDF just renders what it's given.
   */
  static async buildHistoryPdfBuffer({ vehicle, timeline }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // ── Header ────────────────────────────────────────────────────────
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#0F4C81').text('ServiceHub', 50, 50);
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text('Station Management System', 50, 74);

        doc.fontSize(16).font('Helvetica-Bold').fillColor('#1E293B').text('Vehicle Service History', 50, 100, { width: 495, align: 'right' });
        doc.fontSize(9).font('Helvetica').fillColor('#64748B')
          .text(`Generated: ${new Date().toLocaleString()}`, 50, 122, { width: 495, align: 'right' });

        doc.moveTo(50, 145).lineTo(545, 145).strokeColor('#E2E8F0').stroke();

        // ── Vehicle identity block ───────────────────────────────────────
        let y = 162;
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1E293B').text(`${vehicle.make} ${vehicle.model}`, 50, y);
        y += 18;
        doc.fontSize(9).font('Helvetica').fillColor('#64748B')
          .text(`Reg. No: ${vehicle.regNo}   |   Owner: ${vehicle.ownerName}   |   Fuel: ${vehicle.fuelType}   |   Odometer: ${vehicle.odometer?.toLocaleString() || '—'} km`, 50, y);
        y += 26;

        // ── Service history table ────────────────────────────────────────
        const columns = [
          { label: 'Date',      width: 65,  format: (r) => fmtDate(r.timestamps.completedAt || r.timestamps.openedAt) },
          { label: 'Job Card',  width: 55,  format: (r) => r.jobCardNumber },
          { label: 'Service',   width: 110, format: (r) => r.serviceType },
          { label: 'Mileage',   width: 65,  align: 'right', format: (r) => r.odometerReading != null ? `${r.odometerReading.toLocaleString()} km` : '—' },
          { label: 'Status',    width: 65,  format: (r) => r.status },
          { label: 'Invoice',   width: 75,  format: (r) => r.invoice?.invoiceNumber || '—' },
          { label: 'Payment',   width: 60,  align: 'right', format: (r) => r.invoice?.paymentStatus || '—' },
        ];
        // Each column reserves a fixed gutter so adjacent cells never touch —
        // without this, a right-aligned column's text sits flush against the
        // very edge of its slot, directly abutting the next (left-aligned)
        // column's text with no visible gap between them.
        const GUTTER = 10;
        const tableWidth = columns.reduce((sum, c) => sum + c.width, 0);

        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748B');
        let cx = 50;
        columns.forEach((col) => {
          doc.text(col.label.toUpperCase(), cx, y, { width: col.width - GUTTER, align: col.align || 'left' });
          cx += col.width;
        });
        y += 13;
        doc.moveTo(50, y).lineTo(50 + tableWidth, y).strokeColor('#E2E8F0').stroke();
        y += 8;

        if (!timeline.length) {
          doc.fontSize(9).font('Helvetica').fillColor('#94A3B8').text('No service records found.', 50, y);
        } else {
          doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B');
          timeline.forEach((row) => {
            if (y > 760) { doc.addPage(); y = 50; }
            cx = 50;
            columns.forEach((col) => {
              doc.text(col.format(row), cx, y, { width: col.width - GUTTER, align: col.align || 'left' });
              cx += col.width;
            });
            y += 16;
          });
        }

        doc.fontSize(8).font('Helvetica').fillColor('#94A3B8')
          .text('Generated automatically by ServiceHub. This document does not include billing amounts.', 50, 770, { width: 495, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = VehicleHistoryPdfService;
