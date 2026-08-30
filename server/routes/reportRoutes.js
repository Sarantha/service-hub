const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authGuard = require('../middleware/authGuard');
const roleGuard = require('../middleware/roleGuard');
const branchScope = require('../middleware/branchScope');

// GET /api/v1/reports/dashboard-kpis
// Restricted to Super Admin and Service Advisor
router.get('/dashboard-kpis', authGuard, roleGuard(['Super Admin', 'Service Advisor']), branchScope, reportController.getDashboardKpis);

// GET /api/v1/reports/branch-performance — Super Admin's cross-branch
// comparison view. Super Admin only, and must be registered before the
// generic '/:reportType' route below or it'd be swallowed by it.
router.get('/branch-performance', authGuard, roleGuard(['Super Admin']), reportController.getBranchPerformance);

// GET /api/v1/reports/analytics — date-range-aware top KPI row for the Reports & Analytics page
router.get('/analytics', authGuard, roleGuard(['Super Admin', 'Service Advisor']), reportController.getAnalyticsSummary);

// GET /api/v1/reports/revenue — alias over the Revenue & Sales Trends report
router.get('/revenue', authGuard, roleGuard(['Super Admin', 'Service Advisor']), reportController.getRevenueReport);

// GET /api/v1/reports/:reportType/pdf and /xls — PDF/XLSX export per report type
router.get('/:reportType/pdf', authGuard, roleGuard(['Super Admin', 'Service Advisor']), reportController.downloadReportPdf);
router.get('/:reportType/xls', authGuard, roleGuard(['Super Admin', 'Service Advisor']), reportController.downloadReportXlsx);

// GET /api/v1/reports/:reportType — generic JSON data endpoint for all six report types
router.get('/:reportType', authGuard, roleGuard(['Super Admin', 'Service Advisor']), reportController.getReportData);

module.exports = router;
