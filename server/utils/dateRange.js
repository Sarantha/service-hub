const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Resolves a report date-range selector (or explicit custom bounds) into
 * concrete { gte, lte } Date bounds, plus a chart bucket granularity derived
 * from the span length. Never throws — invalid/missing input silently falls
 * back to 'This Month' so a bad query string can never crash a report route.
 */
const resolveDateRange = ({ range, startDate, endDate } = {}) => {
  const now = new Date();
  let gte, lte, label;

  if (range === 'Custom Range' && startDate && endDate) {
    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (
      !Number.isNaN(parsedStart.getTime()) &&
      !Number.isNaN(parsedEnd.getTime()) &&
      parsedStart <= parsedEnd
    ) {
      gte = startOfDay(parsedStart);
      lte = endOfDay(parsedEnd);
      label = 'Custom Range';
    }
  }

  if (!gte || !lte) {
    switch (range) {
      case 'Last Month': {
        const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        gte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        lte = endOfDay(new Date(firstOfThisMonth.getTime() - 1));
        label = 'Last Month';
        break;
      }
      case 'This Year': {
        gte = new Date(now.getFullYear(), 0, 1);
        lte = endOfDay(now);
        label = 'This Year';
        break;
      }
      case 'This Month':
      default: {
        gte = new Date(now.getFullYear(), now.getMonth(), 1);
        lte = endOfDay(now);
        label = 'This Month';
      }
    }
  }

  const spanDays = Math.max(1, Math.round((lte - gte) / (24 * 60 * 60 * 1000)));
  const granularity = spanDays <= 31 ? 'day' : spanDays <= 180 ? 'week' : 'month';

  return { gte, lte, label, granularity };
};

module.exports = { resolveDateRange };
