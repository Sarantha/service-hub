// Brand/semantic color tokens for Recharts — mirrors client/src/context/ui-guides.md
// exactly so every chart matches the rest of the app instead of Recharts' default theme.
export const CHART_COLORS = {
  navy: '#0B192C',
  brandBlue: '#0F4C81',
  brandLight: '#1A5C96',
  blueGlow: '#3E92CC',
  brandPale: '#F4F8FF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  gridLine: '#E2E8F0',
  axisText: '#94A3B8',
}

// Data-series fills — mirrors the app's own chart convention (Dashboard.jsx's
// revenue bars are monochromatic brandBlue/brandLight, never semantic
// green/amber), so multi-series charts stay in the same blue family instead
// of introducing colors that appear nowhere else in the app's chrome.
export const CHART_SERIES_PALETTE = [
  CHART_COLORS.brandBlue,
  CHART_COLORS.blueGlow,
  CHART_COLORS.brandLight,
  CHART_COLORS.navy,
]
