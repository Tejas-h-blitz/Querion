"use client";

import React, { useState } from 'react';
import { IconChevronDown, IconChevronRight, IconCircleFilled, IconHourglass } from '@tabler/icons-react';
import { ExplainPlan } from '@/lib/api';

interface PlanNodeRow {
  node: ExplainPlan;
  depth: number;
  id: string;
  hasChildren: boolean;
}

interface PlanListViewProps {
  originalTree: ExplainPlan;
  optimizedTree?: ExplainPlan;
}

export default function PlanListView({ originalTree, optimizedTree }: PlanListViewProps) {
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  const flattenTree = (node: ExplainPlan, depth = 0, path = 'root', list: PlanNodeRow[] = []): PlanNodeRow[] => {
    if (!node) return list;
    const nodeId = path;
    const hasChildren = node.children && node.children.length > 0;
    
    list.push({
      node,
      depth,
      id: nodeId,
      hasChildren
    });
    
    if (hasChildren) {
      node.children.forEach((child, idx) => {
        flattenTree(child, depth + 1, `${path}-${idx}`, list);
      });
    }
    
    return list;
  };

  const getDotColor = (actualTime: number, cost: number) => {
    if (actualTime > 100 || cost > 5000) return 'text-red-500';
    if (actualTime > 10 || cost > 500) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const renderNodeRows = (tree: ExplainPlan, label: string) => {
    if (!tree || !tree.node_type) {
      return (
        <div className="flex-1 bg-[#0A0A0F]/45 border border-[#232333]/80 backdrop-blur-sm rounded-xl p-8 flex flex-col items-center justify-center text-center text-[#62627A] text-xs min-h-[220px]">
          <IconHourglass size={20} className="text-[#62627A] mb-2.5 opacity-60 animate-pulse" />
          <p className="font-semibold text-slate-400 mb-1">Plan data unavailable for {label}</p>
          <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
            Run optimization with database connection or migrations to view the {label.toLowerCase()} execution plan.
          </p>
        </div>
      );
    }

    const flatNodes = flattenTree(tree);
    
    // Filter nodes under collapsed parents
    const visibleNodes: PlanNodeRow[] = [];
    let skipPrefix = '';
    
    flatNodes.forEach(item => {
      if (skipPrefix && item.id.startsWith(skipPrefix)) {
        return;
      } else {
        skipPrefix = '';
      }
      
      visibleNodes.push(item);
      
      if (collapsedIds[item.id]) {
        skipPrefix = `${item.id}-`;
      }
    });

    return (
      <div className="flex-1 bg-[#0A0A0F]/50 backdrop-blur-md border border-[#232333]/80 rounded-xl p-5 overflow-x-auto flex flex-col min-w-0 shadow-lg">
        <h4 className="text-sm font-semibold text-slate-300 mb-4 border-b border-[#232333]/60 pb-2.5 uppercase tracking-wider flex items-center gap-1.5 select-none">
          <IconCircleFilled size={8} className="text-[#7C6FE0]" /> {label} Plan
        </h4>
        <div className="space-y-1 min-w-[360px]">
          {visibleNodes.map(({ node, depth, id, hasChildren }) => {
            const isCollapsed = collapsedIds[id];
            const nodeTime = node.actual_total_time;
            const nodeCost = node.cost;
            const dotColor = getDotColor(nodeTime, nodeCost);
            const isSlow = nodeTime > 10 || nodeCost > 500;
            const pulseClass = isSlow ? 'animate-pulse' : '';

            return (
              <div 
                key={id}
                className="flex items-center justify-between text-sm py-2 px-2.5 hover:bg-[#151520] rounded-lg border border-transparent hover:border-[#2D2D3D] transition-colors group"
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  {hasChildren ? (
                    <button
                      onClick={() => setCollapsedIds(prev => ({ ...prev, [id]: !prev[id] }))}
                      className="p-1 text-text-muted hover:text-foreground hover:bg-[#20202F] rounded-md cursor-pointer"
                    >
                      {isCollapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
                    </button>
                  ) : (
                    <span className="w-[20px]" />
                  )}
                  <IconCircleFilled size={8} className={`${dotColor} flex-shrink-0 ${pulseClass}`} />
                  <span className="font-mono text-slate-200 font-semibold flex-shrink-0">
                    {node.node_type}
                  </span>
                  {node.relation_name && (
                    <span 
                      className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-mono truncate max-w-[220px] flex-shrink"
                      title={`on ${node.relation_name}`}
                    >
                      on {node.relation_name}
                    </span>
                  )}
                  {node.index_name && (
                    <span 
                      className="text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg font-mono truncate max-w-[220px] flex-shrink"
                      title={`using ${node.index_name}`}
                    >
                      using {node.index_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4.5 text-right flex-shrink-0 font-mono text-xs text-text-muted pl-4">
                  <div>
                    <span className="text-text-muted">Cost:</span> <span className="text-slate-300 font-bold">{nodeCost.toFixed(0)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Time:</span> <span className="text-warning font-bold">{nodeTime.toFixed(3)}ms</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-between w-full">
      {renderNodeRows(originalTree, "Before")}
      {renderNodeRows(optimizedTree || {} as ExplainPlan, "After")}
    </div>
  );
}
