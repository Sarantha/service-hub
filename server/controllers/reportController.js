const ReportService = require('../services/reportService');
const ReportPdfService = require('../services/reportPdfService');
const ReportExcelService = require('../services/reportExcelService');
const { resolveDateRange } = require('../utils/dateRange');

/**
 * GET /api/v1/reports/dashboard-kpis
 * Returns the full executive dashboard KPI payload.
 */
exports.getDashboardKpis = async (req, res, next) => {
  try {
    const kpis = await ReportService.getDashboardKpis(req.branchScope.filter);
    res.status(200).json({
      success: true,
      message: 'Dashboard KPIs compiled successfully.',
      data: kpis
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/branch-performance
 * Super-Admin-only, always cross-branch: one row per branch.
 */
exports.getBranchPerformance = async (req, res, next) => {
  try {
    const summary = await ReportService.getBranchPerformanceSummary();
    res.status(200).json({
      success: true,
      message: 'Branch performance summary compiled successfully.',
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/analytics
 * Date-range-aware top KPI row for the Reports & Analytics page header.
 */
exports.getAnalyticsSummary = async (req, res, next) => {
  try {
    const range = resolveDateRange(req.query);
    const summary = await ReportService.getReportSummary(range);
    res.status(200).json({
      success: true,
      message: 'Analytics summary compiled successfully.',
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/revenue
 * Alias over the Revenue & Sales Trends report for the page's existing
 * getRevenueReport() frontend call.
 */
exports.getRevenueReport = async (req, res, next) => {
  try {
    const range = resolveDateRange(req.query);
    const data = await ReportService.getReportByType('revenue-trends', range);
    res.status(200).json({
      success: true,
      message: 'Revenue report compiled successfully.',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/:reportType
 * Generic JSON data endpoint shared by all six report types.
 */
exports.getReportData = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const range = resolveDateRange(req.query);
    const data = await ReportService.getReportByType(reportType, range);
    res.status(200).json({
      success: true,
      message: `${reportType} report compiled successfully.`,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/:reportType/pdf
 * Streams a generated PDF of the report.
 */
exports.downloadReportPdf = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const range = resolveDateRange(req.query);
    const data = await ReportService.getReportByType(reportType, range);
    const pdfBuffer = await ReportPdfService.buildReportPdfBuffer(reportType, data, range);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${range.label.replace(/\s+/g, '-').toLowerCase()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/reports/:reportType/xls
 * Streams a generated .xlsx workbook of the report.
 */
exports.downloadReportXlsx = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const range = resolveDateRange(req.query);
    const data = await ReportService.getReportByType(reportType, range);
    const xlsxBuffer = await ReportExcelService.buildReportWorkbookBuffer(reportType, data, range);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${reportType}-${range.label.replace(/\s+/g, '-').toLowerCase()}.xlsx"`);
    res.setHeader('Content-Length', xlsxBuffer.length);
    res.status(200).send(xlsxBuffer);
  } catch (error) {
    next(error);
  }
};
