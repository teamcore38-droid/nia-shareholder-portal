import React, { useState, useMemo } from 'react';
import { TrendingUp, Table2, BarChart3, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function SteppedValuationChart({
  data = [],
  currency = 'LKR',
  title = 'Holding Value Over Time',
  subtitle = 'Published valuation updates',
  valueKey = 'valuePerShare',
  changeKey = 'changePercent',
  height = 240,
  chartStyle = 'smooth' // 'smooth' | 'stepped'
}) {
  const [viewMode, setViewMode] = useState('chart'); // 'chart' | 'table'
  const [curveMode, setCurveMode] = useState(chartStyle); // 'smooth' | 'stepped'
  const [activeIndex, setActiveIndex] = useState(null);

  const filteredData = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return [...data].sort((a, b) =>
      String(a.effectiveDate).localeCompare(String(b.effectiveDate))
    );
  }, [data]);

  if (!filteredData || filteredData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs h-full flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
        </div>
        <div className="flex-1 min-h-[190px] rounded-2xl bg-[#F8F7FF] border border-dashed border-purple-200 flex flex-col items-center justify-center text-center px-6 py-8">
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-[#6D28D9] flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-slate-800">No published valuation points yet</p>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Approved company valuations and holding values appear here once published.
          </p>
        </div>
      </div>
    );
  }

  const svgWidth = 640;
  const svgHeight = height;
  const padLeft = 72;
  const padRight = 28;
  const padTop = 38;
  const padBottom = 36;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const values = filteredData.map((d) => Number(d[valueKey]) || 0);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.max(rawMax * 0.15, 10);
  const minVal = Math.max(0, rawMin - span * 0.25);
  const maxVal = rawMax + span * 0.25;

  const getX = (idx) => {
    if (filteredData.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (filteredData.length - 1)) * plotW;
  };

  const getY = (val) => {
    if (maxVal === minVal) return padTop + plotH / 2;
    return padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;
  };

  const points = filteredData.map((d, i) => ({
    x: getX(i),
    y: getY(Number(d[valueKey]) || 0),
    raw: d
  }));

  let linePath = '';
  let areaPath = '';

  if (points.length === 1) {
    const p = points[0];
    linePath = `M ${padLeft} ${p.y} L ${padLeft + plotW} ${p.y}`;
    areaPath = `M ${padLeft} ${padTop + plotH} L ${padLeft} ${p.y} L ${padLeft + plotW} ${p.y} L ${padLeft + plotW} ${padTop + plotH} Z`;
  } else if (curveMode === 'stepped') {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      linePath += ` L ${next.x} ${curr.y} L ${next.x} ${next.y}`;
    }
    areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`;
  } else {
    // Smooth Catmull-Rom / cubic bezier curve matching the reference image
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpx1 = curr.x + (next.x - curr.x) * 0.45;
      const cpy1 = curr.y;
      const cpx2 = curr.x + (next.x - curr.x) * 0.55;
      const cpy2 = next.y;
      linePath += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${next.x} ${next.y}`;
    }
    areaPath = `${linePath} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`;
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = minVal + t * (maxVal - minVal);
    return { val, y: getY(val) };
  });

  const inspectedIndex =
    activeIndex !== null && points[activeIndex] ? activeIndex : points.length - 1;
  const inspectedPoint = points[inspectedIndex];

  const formatAxisCurrency = (val) => {
    if (val >= 1000000) return `${currency} ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${currency} ${(val / 1000).toFixed(0)}k`;
    return `${currency} ${val.toFixed(0)}`;
  };

  const formatMonthLabel = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { month: 'short' });
  };

  const formatCalloutDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          <span title={subtitle} className="text-slate-400 hover:text-slate-600 cursor-help">
            <Info className="w-4 h-4" />
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {viewMode === 'chart' && (
            <button
              type="button"
              onClick={() => setCurveMode(curveMode === 'smooth' ? 'stepped' : 'smooth')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 text-[#6D28D9] border border-purple-200/70 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              {curveMode === 'smooth' ? 'Smooth View' : 'Stepped View'}
            </button>
          )}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'chart'
                  ? 'bg-white text-[#6D28D9] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Chart View"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#6D28D9] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tabular View"
            >
              <Table2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'chart' ? (
        <div className="relative mt-1">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
            role="img"
            aria-label={`${title} in ${currency}`}
          >
            <defs>
              <linearGradient id="purpleAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.28" />
                <stop offset="85%" stopColor="#A78BFA" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#DDD6FE" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={t.y}
                  x2={svgWidth - padRight}
                  y2={t.y}
                  stroke="#F1F5F9"
                  strokeWidth="1.2"
                />
                <text
                  x={padLeft - 10}
                  y={t.y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-medium font-mono-num"
                >
                  {formatAxisCurrency(t.val)}
                </text>
              </g>
            ))}

            {/* Soft Lavender Area Fill */}
            <path d={areaPath} fill="url(#purpleAreaFill)" />

            {/* Vibrant Purple Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#7C3AED"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vertical Dashed Line on Inspected Point */}
            {inspectedPoint && (
              <line
                x1={inspectedPoint.x}
                y1={inspectedPoint.y}
                x2={inspectedPoint.x}
                y2={padTop + plotH}
                stroke="#A78BFA"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}

            {/* Data Points & Floating Callout Box (Matches Reference Image Callout) */}
            {points.map((pt, idx) => {
              const isSelected = idx === inspectedIndex;
              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex(idx)}
                >
                  <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />
                  {isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="8"
                      fill="#EDE9FE"
                      stroke="#7C3AED"
                      strokeWidth="1.5"
                    />
                  )}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? '5' : '4'}
                    fill="#FFFFFF"
                    stroke="#7C3AED"
                    strokeWidth="2.5"
                  />
                  {/* X-axis Month Label */}
                  <text
                    x={pt.x}
                    y={padTop + plotH + 22}
                    textAnchor="middle"
                    className={`text-[11px] ${
                      isSelected ? 'fill-slate-900 font-bold' : 'fill-slate-400 font-medium'
                    }`}
                  >
                    {formatMonthLabel(pt.raw.effectiveDate)}
                  </text>
                </g>
              );
            })}

            {/* Floating Callout Tooltip above Active Node */}
            {inspectedPoint && (
              <g
                transform={`translate(${Math.min(
                  Math.max(inspectedPoint.x - 62, padLeft),
                  svgWidth - 135
                )}, ${Math.max(inspectedPoint.y - 46, 2)})`}
              >
                <rect
                  x="0"
                  y="0"
                  width="124"
                  height="38"
                  rx="8"
                  fill="#FFFFFF"
                  stroke="#E2E8F0"
                  strokeWidth="1"
                />
                <text
                  x="62"
                  y="14"
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-semibold"
                >
                  {formatCalloutDate(inspectedPoint.raw.effectiveDate)}
                </text>
                <text
                  x="62"
                  y="29"
                  textAnchor="middle"
                  className="fill-slate-900 text-[11px] font-extrabold font-mono-num"
                >
                  {currency}{' '}
                  {Number(inspectedPoint.raw[valueKey] || 0).toLocaleString(undefined, {
                    minimumFractionDigits:
                      Number(inspectedPoint.raw[valueKey] || 0) >= 1000 ? 0 : 2,
                    maximumFractionDigits: 2
                  })}
                </text>
              </g>
            )}
          </svg>
        </div>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50">
                <th className="py-2 px-3">Effective Date</th>
                <th className="py-2 px-3">Reference</th>
                <th className="py-2 px-3">Value ({currency})</th>
                <th className="py-2 px-3">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {[...filteredData].reverse().map((row, i) => (
                <tr key={i} className="hover:bg-purple-50/40">
                  <td className="py-2.5 px-3 font-mono-num font-semibold text-slate-900">
                    {row.effectiveDate}
                  </td>
                  <td className="py-2.5 px-3 font-mono-num text-slate-500">
                    {row.reference || row.valuationReference || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono-num font-bold text-slate-900">
                    {currency}{' '}
                    {Number(row[valueKey] || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-mono-num">
                    {row[changeKey] !== null && row[changeKey] !== undefined ? (
                      <span
                        className={`inline-flex items-center gap-0.5 font-bold ${
                          Number(row[changeKey]) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {Number(row[changeKey]) >= 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Number(row[changeKey]) >= 0 ? '+' : ''}
                        {row[changeKey]}%
                      </span>
                    ) : (
                      <span className="text-slate-400">Baseline</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
