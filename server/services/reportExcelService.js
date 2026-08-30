const ExcelJS = require('exceljs');

const BRAND_BLUE = 'FF0F4C81';
const CURRENCY_FORMAT = '"LKR" #,##0.00';

const REPORT_TITLES = {
  'jobs-completed-daily':        'Jobs Completed — Daily',
  'sales-daily':                 'Sales — Daily',
  'inventory-consumption-daily': 'Inventory Consumption — Daily',
  'outstanding-balances':        'Outstanding Balances / Accounts Receivable'
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (id) => `${MONTH_NAMES[id.month - 1]} ${id.day}`;

class ReportExcelService {
  /**
   * Builds a real .xlsx workbook for one of the Reports & Analytics reports:
   * a "Summary" sheet (report identity + generation metadata) and a "Data"
   * sheet with the report's underlying rows.
   */
  static async buildReportWorkbookBuffer(reportType, data, meta = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ServiceHub';
    workbook.created = new Date();

    const title = REPORT_TITLES[reportType] || reportType;

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [{ width: 24 }, { width: 40 }];
    ReportExcelService._styleHeaderRow(summarySheet.addRow(['ServiceHub', title]));
    summarySheet.addRow(['Period', meta.label || '—']);
    summarySheet.addRow(['Generated At', new Date().toLocaleString()]);

    ReportExcelService._buildDataSheets(workbook, reportType, data);

    return workbook.xlsx.writeBuffer();
  }

  static _styleHeaderRow(row) {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
    });
    return row;
  }

  /** Adds a "Data" sheet with headers + auto-sized columns + currency formatting on money columns. */
  static _addDataSheet(workbook, sheetName, columns, rows) {
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: Math.max(c.label.length + 2, 14),
      style: c.currency ? { numFmt: CURRENCY_FORMAT } : undefined
    }));
    ReportExcelService._styleHeaderRow(sheet.getRow(1));
    rows.forEach((row) => sheet.addRow(row));
    return sheet;
  }

  static _buildDataSheets(workbook, reportType, data) {
    switch (reportType) {
      case 'jobs-completed-daily': {
        const rows = (data.buckets || []).map((b) => ({ day: dayLabel(b._id), jobsCompleted: b.count }));
        ReportExcelService._addDataSheet(workbook, 'Jobs Completed by Day', [
          { label: 'Day', key: 'day' },
          { label: 'Jobs Completed', key: 'jobsCompleted' }
        ], rows);
        break;
      }

      case 'sales-daily': {
        const rows = (data.buckets || []).map((b) => ({ day: dayLabel(b._id), sales: b.totalSales, invoiceCount: b.invoiceCount }));
        ReportExcelService._addDataSheet(workbook, 'Sales by Day', [
          { label: 'Day', key: 'day' },
          { label: 'Sales', key: 'sales', currency: true },
          { label: 'Invoices', key: 'invoiceCount' }
        ], rows);
        break;
      }

      case 'inventory-consumption-daily': {
        const rows = (data.buckets || []).map((b) => ({ day: dayLabel(b._id), partsConsumed: b.totalValue }));
        ReportExcelService._addDataSheet(workbook, 'Inventory Consumption by Day', [
          { label: 'Day', key: 'day' },
          { label: 'Parts Consumed', key: 'partsConsumed', currency: true }
        ], rows);
        break;
      }

      case 'outstanding-balances': {
        ReportExcelService._addDataSheet(workbook, 'Aging Buckets', [
          { label: 'Age Range', key: 'label' },
          { label: 'Invoices', key: 'count' },
          { label: 'Amount', key: 'totalAmount', currency: true }
        ], data.buckets || []);
        ReportExcelService._addDataSheet(workbook, 'Unpaid Invoices', [
          { label: 'Invoice #', key: 'invoiceNumber' },
          { label: 'Job Card', key: 'jobCardNumber' },
          { label: 'Customer Phone', key: 'customerPhone' },
          { label: 'Age (days)', key: 'ageDays' },
          { label: 'Amount', key: 'totalAmount', currency: true }
        ], data.invoices || []);
        break;
      }

      default: {
        ReportExcelService._addDataSheet(workbook, 'Data', [{ label: 'Note', key: 'note' }], [
          { note: 'No renderer available for this report type.' }
        ]);
      }
    }
  }
}

module.exports = ReportExcelService;
