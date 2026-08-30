const Invoice = require('../models/Invoice');
const JobCard = require('../models/JobCard');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const Branch = require('../models/Branch');

class ReportService {
  /**
   * Compiles the full dashboard KPI payload using parallel MongoDB aggregation
   * pipelines. All arithmetic executes on the server (Guardrail #2 - No
   * Frontend Math). branchFilter is {} for Super Admin's central/all-branch
   * view, or { branchId } for a single-branch view — merged into every
   * pipeline's $match stage.
   */
  static async getDashboardKpis(branchFilter = {}) {
    // Run all aggregation pipelines concurrently
    const [
      revenueStats,
      workVolumeStats,
      topTechnicians,
      lowStockItems,
      stockValuation,
      completedToday
    ] = await Promise.all([
      ReportService._getRevenueStats(branchFilter),
      ReportService._getWorkVolumeStats(branchFilter),
      ReportService._getTopTechnicians(branchFilter),
      ReportService._getLowStockItems(branchFilter),
      ReportService._getStockValuation(branchFilter),
      ReportService._getCompletedTodayCount(branchFilter)
    ]);

    return {
      revenue:       revenueStats,
      workVolume:    { ...workVolumeStats, completedToday },
      topTechnicians,
      lowStock:      lowStockItems,
      stockValuation
    };
  }

  /**
   * Super Admin's "central" view: the same revenue/jobs-completed/low-stock
   * figures as the Dashboard KPIs, but grouped BY branch instead of collapsed
   * into one total — one row per branch, side by side, so performance can be
   * compared across the whole business in a single screen. Always
   * cross-branch by design (ignores any active-branch header — there's no
   * such thing as "central view, scoped to one branch").
   */
  static async getBranchPerformanceSummary() {
    const [branches, revenueByBranch, jobsByBranch, lowStockByBranch] = await Promise.all([
      Branch.find({ isDeleted: false }).sort({ branchName: 1 }).lean(),
      Invoice.aggregate([
        { $match: { paymentStatus: 'Paid', isDeleted: false } },
        { $group: { _id: '$branchId', totalRevenue: { $sum: '$totalAmount' }, paidInvoiceCount: { $sum: 1 } } }
      ]),
      JobCard.aggregate([
        { $match: { isDeleted: false, status: { $in: ['Completed', 'Delivered'] } } },
        { $group: { _id: '$branchId', jobsCompleted: { $sum: 1 } } }
      ]),
      Inventory.aggregate([
        { $match: { isDeleted: false, $expr: { $lte: ['$stockLevel', '$reorderPoint'] } } },
        { $group: { _id: '$branchId', lowStockCount: { $sum: 1 } } }
      ])
    ]);

    const toMap = (rows) => rows.reduce((map, row) => {
      map[String(row._id)] = row;
      return map;
    }, {});
    const revenueMap = toMap(revenueByBranch);
    const jobsMap = toMap(jobsByBranch);
    const lowStockMap = toMap(lowStockByBranch);

    return branches.map((branch) => {
      const key = String(branch._id);
      return {
        branchId: branch._id,
        branchName: branch.branchName,
        code: branch.code,
        isActive: branch.isActive,
        totalRevenue: revenueMap[key]?.totalRevenue ?? 0,
        paidInvoiceCount: revenueMap[key]?.paidInvoiceCount ?? 0,
        jobsCompleted: jobsMap[key]?.jobsCompleted ?? 0,
        lowStockCount: lowStockMap[key]?.lowStockCount ?? 0
      };
    });
  }

  /**
   * Count of Job Cards whose completedAt falls within today's local calendar
   * day — distinct from workVolume.totalCompleted, which is all-time.
   */
  static async _getCompletedTodayCount(branchFilter = {}) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return JobCard.countDocuments({
      ...branchFilter,
      isDeleted: false,
      status: { $in: ['Completed', 'Delivered'] },
      completedAt: { $gte: startOfDay, $lte: endOfDay }
    });
  }

  /**
   * Gross revenue aggregation:
   * - Total revenue from all paid invoices
   * - Daily revenue breakdown (last 30 days)
   * - Outstanding (Unpaid) balance
   */
  static async _getRevenueStats(branchFilter = {}) {
    const [paidStats, unpaidStats, dailyRevenue] = await Promise.all([
      // Total from settled invoices
      Invoice.aggregate([
        { $match: { ...branchFilter, paymentStatus: 'Paid', isDeleted: false } },
        {
          $group: {
            _id: null,
            totalGrossRevenue: { $sum: '$totalAmount' },
            totalTaxCollected: { $sum: '$taxAmount' },
            totalNetRevenue:   { $sum: '$subtotal' },
            invoiceCount:      { $sum: 1 }
          }
        }
      ]),

      // Outstanding unpaid balance
      Invoice.aggregate([
        { $match: { ...branchFilter, paymentStatus: 'Unpaid', isDeleted: false } },
        {
          $group: {
            _id: null,
            totalOutstanding: { $sum: '$totalAmount' },
            unpaidCount:      { $sum: 1 }
          }
        }
      ]),

      // Daily gross revenue — last 30 days
      Invoice.aggregate([
        {
          $match: {
            ...branchFilter,
            paymentStatus: 'Paid',
            isDeleted: false,
            paidAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year:  { $year: '$paidAt' },
              month: { $month: '$paidAt' },
              day:   { $dayOfMonth: '$paidAt' }
            },
            dailyRevenue: { $sum: '$totalAmount' },
            count:        { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    // Today's / yesterday's revenue + trend — derived server-side from the
    // same dailyRevenue buckets (Guardrail #2: no frontend currency math).
    const now = new Date();
    const findDay = (d) => dailyRevenue.find(b =>
      b._id.year === d.getFullYear() && b._id.month === d.getMonth() + 1 && b._id.day === d.getDate()
    );
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const todayRevenue = findDay(now)?.dailyRevenue ?? 0;
    const yesterdayRevenue = findDay(yesterday)?.dailyRevenue ?? 0;

    let revenueTrendVsYesterday = 'Stable';
    if (yesterdayRevenue > 0) {
      const pctChange = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
      revenueTrendVsYesterday = `${pctChange >= 0 ? '↑' : '↓'} ${Math.abs(pctChange)}% vs yesterday`;
    } else if (todayRevenue > 0) {
      revenueTrendVsYesterday = 'New activity vs yesterday';
    }

    return {
      totalGrossRevenue: paidStats[0]?.totalGrossRevenue ?? 0,
      totalTaxCollected: paidStats[0]?.totalTaxCollected ?? 0,
      totalNetRevenue:   paidStats[0]?.totalNetRevenue ?? 0,
      paidInvoiceCount:  paidStats[0]?.invoiceCount ?? 0,
      totalOutstanding:  unpaidStats[0]?.totalOutstanding ?? 0,
      unpaidInvoiceCount: unpaidStats[0]?.unpaidCount ?? 0,
      todayRevenue,
      revenueTrendVsYesterday,
      dailyRevenue
    };
  }

  /**
   * Work volume metrics:
   * - Job cards by status
   * - Average completion time (openedAt → completedAt) in hours
   */
  static async _getWorkVolumeStats(branchFilter = {}) {
    const [volumeByStatus, avgResolutionResult] = await Promise.all([
      JobCard.aggregate([
        { $match: { ...branchFilter, isDeleted: false } },
        {
          $group: {
            _id:   '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      JobCard.aggregate([
        {
          $match: {
            ...branchFilter,
            isDeleted: false,
            status: { $in: ['Completed', 'Delivered'] },
            openedAt: { $exists: true },
            completedAt: { $exists: true }
          }
        },
        {
          $project: {
            resolutionHours: {
              $divide: [
                { $subtract: ['$completedAt', '$openedAt'] },
                1000 * 60 * 60 // ms → hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            averageResolutionHours: { $avg: '$resolutionHours' },
            totalCompleted:         { $sum: 1 }
          }
        }
      ])
    ]);

    return {
      byStatus: volumeByStatus,
      averageResolutionHours: parseFloat((avgResolutionResult[0]?.averageResolutionHours ?? 0).toFixed(2)),
      totalCompleted:         avgResolutionResult[0]?.totalCompleted ?? 0
    };
  }

  /**
   * Top technicians ranking:
   * - Technicians with the most Completed/Delivered job cards assigned
   */
  static async _getTopTechnicians(branchFilter = {}) {
    return JobCard.aggregate([
      {
        $match: {
          ...branchFilter,
          isDeleted: false,
          status: { $in: ['Completed', 'Delivered'] },
          assignedTechnicianId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id:             '$assignedTechnicianId',
          completedJobs:   { $sum: 1 },
          avgResolutionHours: {
            $avg: {
              $cond: {
                if: { $and: ['$completedAt', '$openedAt'] },
                then: { $divide: [{ $subtract: ['$completedAt', '$openedAt'] }, 3600000] },
                else: null
              }
            }
          }
        }
      },
      { $sort: { completedJobs: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'technicianInfo'
        }
      },
      { $unwind: '$technicianInfo' },
      {
        $project: {
          _id:                1,
          completedJobs:      1,
          avgResolutionHours: { $round: ['$avgResolutionHours', 2] },
          name:               '$technicianInfo.name',
          role:               '$technicianInfo.role'
          // Note: email, password, and internal IDs intentionally omitted
        }
      }
    ]);
  }

  /**
   * Low stock alert items: items where stockLevel <= reorderPoint.
   * Sorted by urgency (smallest stock ratio first).
   */
  static async _getLowStockItems(branchFilter = {}) {
    return Inventory.aggregate([
      {
        $match: {
          ...branchFilter,
          isDeleted: false,
          $expr: { $lte: ['$stockLevel', '$reorderPoint'] }
        }
      },
      {
        $project: {
          partName:     1,
          sku:          1,
          category:     1,
          stockLevel:   1,
          reorderPoint: 1,
          unitPrice:    1,
          stockRatio: {
            $cond: {
              if:   { $gt: ['$reorderPoint', 0] },
              then: { $divide: ['$stockLevel', '$reorderPoint'] },
              else: 0
            }
          }
        }
      },
      { $sort: { stockRatio: 1 } }
    ]);
  }

  /**
   * Total stock valuation: sum of (stockLevel × unitPrice) across all active items.
   */
  static async _getStockValuation(branchFilter = {}) {
    const result = await Inventory.aggregate([
      { $match: { ...branchFilter, isDeleted: false } },
      {
        $group: {
          _id:             null,
          totalValuation:  { $sum: { $multiply: ['$stockLevel', '$unitPrice'] } },
          totalPartTypes:  { $sum: 1 },
          totalUnitsInStock: { $sum: '$stockLevel' }
        }
      }
    ]);

    return {
      totalValuation:    result[0]?.totalValuation ?? 0,
      totalPartTypes:    result[0]?.totalPartTypes ?? 0,
      totalUnitsInStock: result[0]?.totalUnitsInStock ?? 0
    };
  }
  // ── Reports & Analytics module ──────────────────────────────────────────
  // All methods below accept a resolved { gte, lte[, granularity] } date range
  // (see server/utils/dateRange.js) and perform every aggregation/currency
  // calculation server-side (Guardrail #2 - No Frontend Math).
  //
  // Revenue, Parts Consumed (inventory consumption), and Jobs Completed are
  // ALL derived from the same underlying record populations used elsewhere on
  // this page (Paid invoices for money figures, Completed/Delivered job cards
  // for completion counts) so the summary KPI tiles and the daily bar-chart
  // reports below are always mutually consistent — e.g. Gross Profit is
  // literally (revenue subtotal − the parts cost embedded in that same set of
  // paid invoices), not parts cost pulled from an unrelated job-card population.

  /**
   * Report: Jobs Completed — Daily.
   * Count of Completed/Delivered job cards per calendar day, by completedAt.
   */
  static async getJobsCompletedDaily({ gte, lte }) {
    const buckets = await JobCard.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $in: ['Completed', 'Delivered'] },
          completedAt: { $gte: gte, $lte: lte }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' }, day: { $dayOfMonth: '$completedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return { buckets };
  }

  /**
   * Report: Sales — Daily.
   * Sum of Paid invoice totals per calendar day, by paidAt.
   */
  static async getSalesDaily({ gte, lte }) {
    const buckets = await Invoice.aggregate([
      { $match: { paymentStatus: 'Paid', isDeleted: false, paidAt: { $gte: gte, $lte: lte } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' }, day: { $dayOfMonth: '$paidAt' } },
          totalSales: { $sum: '$totalAmount' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return { buckets };
  }

  /**
   * Report: Inventory Consumption — Daily.
   * Sum of parts-line value embedded in Paid invoices per calendar day, by
   * paidAt — the same parts-cost figure the Parts Consumed KPI tile uses, so
   * the two are always consistent with each other.
   */
  static async getInventoryConsumptionDaily({ gte, lte }) {
    const buckets = await Invoice.aggregate([
      { $match: { paymentStatus: 'Paid', isDeleted: false, paidAt: { $gte: gte, $lte: lte } } },
      { $addFields: { partsCostPerInvoice: { $sum: '$lineItems.parts.lineTotal' } } },
      {
        $group: {
          _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' }, day: { $dayOfMonth: '$paidAt' } },
          totalValue: { $sum: '$partsCostPerInvoice' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    return { buckets };
  }

  /**
   * Report: Outstanding Balances / Accounts Receivable.
   * Aging buckets computed against "now", scoped to unpaid invoices raised
   * within the selected range.
   */
  static async getOutstandingBalances({ gte, lte }) {
    const now = new Date();

    const invoices = await Invoice.aggregate([
      { $match: { paymentStatus: 'Unpaid', isDeleted: false, createdAt: { $gte: gte, $lte: lte } } },
      {
        $addFields: {
          ageDays: { $divide: [{ $subtract: [now, '$createdAt'] }, 24 * 60 * 60 * 1000] }
        }
      },
      {
        $project: {
          invoiceNumber: 1, customerPhone: 1, jobCardNumber: 1, totalAmount: 1, createdAt: 1,
          ageDays: { $round: ['$ageDays', 0] }
        }
      },
      { $sort: { ageDays: -1 } }
    ]);

    const bucketDefs = [
      { label: '0-30 days',  min: 0,  max: 30 },
      { label: '31-60 days', min: 31, max: 60 },
      { label: '61-90 days', min: 61, max: 90 },
      { label: '90+ days',   min: 91, max: Infinity }
    ];

    const buckets = bucketDefs.map(({ label, min, max }) => {
      const matching = invoices.filter((inv) => inv.ageDays >= min && inv.ageDays <= max);
      return {
        label,
        count: matching.length,
        totalAmount: matching.reduce((sum, inv) => sum + inv.totalAmount, 0)
      };
    });

    return {
      invoices,
      buckets,
      totalOutstanding: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      unpaidCount: invoices.length
    };
  }

  /**
   * Top-KPI-row summary for the Reports & Analytics page header, compared
   * against the equal-length immediately-preceding period for trend display.
   *
   * Revenue and Parts Consumed are computed from the SAME set of Paid
   * invoices (not a mix of invoice-based revenue and job-card-based parts
   * cost), so Gross Profit = netRevenue − partsConsumedValue is always a
   * coherent figure for this period rather than comparing two unrelated
   * populations of records.
   */
  static async getReportSummary({ gte, lte }) {
    const periodMs = lte - gte;
    const prevGte = new Date(gte.getTime() - periodMs);
    const prevLte = new Date(gte.getTime() - 1);

    const [currentRevenue, previousRevenue, completedJobsCount] = await Promise.all([
      Invoice.aggregate([
        { $match: { paymentStatus: 'Paid', isDeleted: false, paidAt: { $gte: gte, $lte: lte } } },
        { $addFields: { partsCostPerInvoice: { $sum: '$lineItems.parts.lineTotal' } } },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' },
            subtotal: { $sum: '$subtotal' },
            partsCost: { $sum: '$partsCostPerInvoice' }
          }
        }
      ]),
      Invoice.aggregate([
        { $match: { paymentStatus: 'Paid', isDeleted: false, paidAt: { $gte: prevGte, $lte: prevLte } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      JobCard.countDocuments({
        isDeleted: false,
        status: { $in: ['Completed', 'Delivered'] },
        completedAt: { $gte: gte, $lte: lte }
      })
    ]);

    const revenue = currentRevenue[0]?.total ?? 0;
    const netRevenue = currentRevenue[0]?.subtotal ?? 0;
    const partsConsumedValue = currentRevenue[0]?.partsCost ?? 0;
    const prevRevenueTotal = previousRevenue[0]?.total ?? 0;
    const grossProfit = netRevenue - partsConsumedValue;
    const profitMargin = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0;

    let revTrend = 'Stable';
    if (prevRevenueTotal > 0) {
      const pctChange = Math.round(((revenue - prevRevenueTotal) / prevRevenueTotal) * 100);
      revTrend = `${pctChange >= 0 ? '↑' : '↓'} ${Math.abs(pctChange)}% vs previous period`;
    }

    return { revenue, revTrend, completedJobsCount, partsConsumedValue, grossProfit, profitMargin };
  }

  /**
   * Dispatch map from report-type slug to its aggregation method — the single
   * owner both the JSON data route and the PDF/XLSX export routes call through.
   */
  static async getReportByType(reportType, rangeParams) {
    const dispatch = {
      'jobs-completed-daily':        ReportService.getJobsCompletedDaily,
      'sales-daily':                 ReportService.getSalesDaily,
      'inventory-consumption-daily': ReportService.getInventoryConsumptionDaily,
      'outstanding-balances':        ReportService.getOutstandingBalances
    };

    const handler = dispatch[reportType];
    if (!handler) {
      const error = new Error(`Unknown report type '${reportType}'.`);
      error.statusCode = 400;
      throw error;
    }

    return handler(rangeParams);
  }
}

module.exports = ReportService;
