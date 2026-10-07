import React from 'react';

export interface GenderSummaryProps {
  B: number; // Boys count
  G: number; // Girls count
  T?: number; // Total count (defaults to B + G if not provided)
  total?: number; // Denominator for calculating percentage. If provided, T % is (T / total * 100).
  label?: string; // Optional label prefix e.g. "Division I"
  showPercentages?: boolean;
  size?: 'xs' | 'sm' | 'md';
  inline?: boolean;
  className?: string;
}

/**
 * Reusable GenderSummary component adhering strictly to user guidelines:
 * - Blue badge for Boys (B)
 * - Pink/Red badge for Girls (G)
 * - Green/Gray badge for Total (T)
 * - Percentage in small text (xx.x%) next to count
 * - Font font-normal (NOT bold)
 */
export const GenderSummary: React.FC<GenderSummaryProps> = ({
  B = 0,
  G = 0,
  T,
  total,
  label,
  showPercentages = true,
  size = 'sm',
  inline = true,
  className = ''
}) => {
  const calculatedTotal = T !== undefined ? T : (B + G);
  // Denominator for Boys and Girls percentages
  // If total is provided (e.g. total exam students), use total; otherwise use calculatedTotal
  const boyGirlDenominator = calculatedTotal > 0 ? calculatedTotal : 1;
  const overallDenominator = total && total > 0 ? total : (calculatedTotal > 0 ? calculatedTotal : 1);

  const bPercent = calculatedTotal > 0 ? ((B / boyGirlDenominator) * 100).toFixed(1) : '0.0';
  const gPercent = calculatedTotal > 0 ? ((G / boyGirlDenominator) * 100).toFixed(1) : '0.0';
  const tPercent = ((calculatedTotal / overallDenominator) * 100).toFixed(1);

  const textSizes = {
    xs: { main: 'text-[10px]', sub: 'text-[9px]', badge: 'px-1.5 py-0.5' },
    sm: { main: 'text-[11px]', sub: 'text-[10px]', badge: 'px-2 py-0.5' },
    md: { main: 'text-xs', sub: 'text-[11px]', badge: 'px-2.5 py-1' }
  }[size];

  return (
    <div className={`font-normal ${inline ? 'inline-flex items-center gap-1.5' : 'flex flex-wrap items-center gap-1.5'} ${className}`}>
      {label && (
        <span className={`text-slate-600 font-normal mr-0.5 ${textSizes.main}`}>
          {label}:
        </span>
      )}

      {/* Boys Badge (Blue) */}
      <span
        title={`Boys: ${B} (${bPercent}%)`}
        className={`inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-normal ${textSizes.badge} ${textSizes.main}`}
      >
        <span className="font-normal text-blue-800">B = {B}</span>
        {showPercentages && (
          <span className={`text-blue-500 font-normal ${textSizes.sub}`}>
            ({bPercent}%)
          </span>
        )}
      </span>

      {/* Girls Badge (Pink/Rose) */}
      <span
        title={`Girls: ${G} (${gPercent}%)`}
        className={`inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-normal ${textSizes.badge} ${textSizes.main}`}
      >
        <span className="font-normal text-rose-800">G = {G}</span>
        {showPercentages && (
          <span className={`text-rose-500 font-normal ${textSizes.sub}`}>
            ({gPercent}%)
          </span>
        )}
      </span>

      {/* Total Badge (Emerald/Slate) */}
      <span
        title={`Total: ${calculatedTotal} (${tPercent}%)`}
        className={`inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-normal ${textSizes.badge} ${textSizes.main}`}
      >
        <span className="font-normal text-emerald-900">T = {calculatedTotal}</span>
        {showPercentages && (
          <span className={`text-emerald-600 font-normal ${textSizes.sub}`}>
            ({tPercent}%)
          </span>
        )}
      </span>
    </div>
  );
};

/**
 * Helper to produce clean formatted text string for exports (PDF / CSV / WhatsApp)
 */
export const formatGenderSummaryText = (
  B: number,
  G: number,
  T?: number,
  total?: number
): string => {
  const calcT = T !== undefined ? T : (B + G);
  const bgDenom = calcT > 0 ? calcT : 1;
  const totDenom = total && total > 0 ? total : bgDenom;

  const bPct = calcT > 0 ? ((B / bgDenom) * 100).toFixed(1) : '0.0';
  const gPct = calcT > 0 ? ((G / bgDenom) * 100).toFixed(1) : '0.0';
  const tPct = ((calcT / totDenom) * 100).toFixed(1);

  return `B = ${B} (${bPct}%)  G = ${G} (${gPct}%)  T = ${calcT} (${tPct}%)`;
};
