"use client";

import React, { useState } from 'react';
import { TrendRun } from '@/lib/api';
import { IconAlertTriangle } from '@tabler/icons-react';

interface HistoryTrendChartProps {
  runs: TrendRun[];
}

export default function HistoryTrendChart({ runs }: HistoryTrendChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (!runs || runs.length === 0) {
    return (
      <div className="h-[220px] w-full flex flex-col items-center justify-center text-text-muted text-xs border border-dashed border-[#232333] rounded-xl bg-[#0A0A0F]">
        <IconAlertTriangle size={24} className="text-slate-500 mb-2" />
        <span>No execution trend logs found.</span>
        <span className="text-[10px] text-text-muted mt-0.5">Repeated query runs will register history data.</span>
      </div>
    );
  }

  // Dimension settings
  const width = 600;
  const height = 240;
  const padding = 40;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const executionTimes = runs.map(r => r.execution_time_ms);
  const maxTime = Math.max(...executionTimes, 1.0) * 1.25;

  const getX = (index: number) => {
    if (runs.length <= 1) return padding + chartWidth / 2;
    return padding + (index / (runs.length - 1)) * chartWidth;
  };

  const getY = (time: number) => {
    return padding + chartHeight - (time / maxTime) * chartHeight;
  };

  // Build points arrays for line and baseline
  const linePoints = runs.map((run, idx) => `${getX(idx)},${getY(run.execution_time_ms)}`).join(' ');
  const baselinePoints = runs.map((run, idx) => `${getX(idx)},${getY(run.baseline_ms)}`).join(' ');

  const regressions = runs.filter(r => r.regressed);

  return (
    <div className="w-full bg-[#0A0A0F]/70 border border-[#232333]/80 backdrop-blur-sm rounded-xl p-5 shadow-lg flex flex-col space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Performance Trend Chart</h3>
          <p className="text-[10px] text-text-muted mt-0.5 font-mono">Normalized Fingerprint Tracker</p>
        </div>
        
        {regressions.length > 0 && (
          <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
            <IconAlertTriangle size={12} />
            {regressions.length} Regression(s) Detected
          </div>
        )}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full min-w-[500px] h-[240px] overflow-visible"
        >
          {/* Horizontal lines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
            const val = maxTime * ratio;
            const y = getY(val);
            return (
              <g key={idx}>
                <line 
                  x1={padding} 
                  y1={y} 
                  x2={width - padding} 
                  y2={y} 
                  stroke="#1D1D2C" 
                  strokeDasharray="4 4" 
                  strokeWidth={1}
                />
                <text 
                  x={padding - 8} 
                  y={y + 3} 
                  textAnchor="end" 
                  className="font-mono text-[9px] fill-slate-400"
                >
                  {val.toFixed(1)} ms
                </text>
              </g>
            );
          })}

          {/* Running baseline */}
          {runs.length > 1 && (
            <polyline
              fill="none"
              stroke="#5D5D7C"
              strokeDasharray="3 3"
              strokeWidth={1.2}
              points={baselinePoints}
              opacity={0.7}
            />
          )}

          {/* Core trend line */}
          <polyline
            fill="none"
            stroke="#7C6FE0"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={linePoints}
          />

          {/* Nodes */}
          {runs.map((run, idx) => {
            const x = getX(idx);
            const y = getY(run.execution_time_ms);
            const isHovered = hoveredPoint === idx;

            return (
              <g key={run.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={run.regressed ? 6 : 4}
                  fill={run.regressed ? '#EF4444' : '#7C6FE0'}
                  opacity={isHovered ? 0.45 : 0.2}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={run.regressed ? 3.5 : 2.5}
                  fill={run.regressed ? '#EF4444' : '#7C6FE0'}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {run.regressed && (
                  <g>
                    <line
                      x1={x}
                      y1={y}
                      x2={x}
                      y2={y - 18}
                      stroke="#EF4444"
                      strokeWidth={1}
                    />
                    <rect
                      x={x - 28}
                      y={y - 30}
                      width={56}
                      height={12}
                      rx={2}
                      fill="#EF4444"
                    />
                    <text
                      x={x}
                      y={y - 21}
                      textAnchor="middle"
                      className="fill-white font-bold text-[7px] tracking-wide"
                    >
                      REGRESSED
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Tooltip Overlay */}
          {hoveredPoint !== null && (
            <g>
              <line
                x1={getX(hoveredPoint)}
                y1={padding}
                x2={getX(hoveredPoint)}
                y2={height - padding}
                stroke="#3F3F56"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              
              <foreignObject
                x={getX(hoveredPoint) > width / 2 ? getX(hoveredPoint) - 130 : getX(hoveredPoint) + 15}
                y={padding}
                width={110}
                height={80}
              >
                <div className="bg-[#101018] border border-[#2B2B3E] rounded p-2 text-[9px] shadow-2xl text-slate-350 font-mono space-y-0.5">
                  <div className="text-text-muted font-sans border-b border-[#232333] pb-0.5 mb-1 truncate">
                    {new Date(runs[hoveredPoint].created_at).toLocaleDateString()}
                  </div>
                  <div>Exec: <span className="text-[#7C6FE0] font-bold">{runs[hoveredPoint].execution_time_ms.toFixed(2)}ms</span></div>
                  <div>Base: <span className="text-slate-400">{runs[hoveredPoint].baseline_ms.toFixed(2)}ms</span></div>
                  {runs[hoveredPoint].regressed && (
                    <div className="text-red-400 font-bold uppercase text-[7px] pt-0.5">
                      Regressed +{runs[hoveredPoint].regression_pct.toFixed(0)}%
                    </div>
                  )}
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
      </div>

      <div className="flex items-center gap-5 text-[9px] text-text-muted font-mono justify-center border-t border-[#1C1C26] pt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 bg-[#7C6FE0] h-0.5" /> Execution Time
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 border-t border-dashed border-[#5D5D7C] h-0.5" /> Baseline Average
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" /> Regression Marker
        </div>
      </div>
    </div>
  );
}
