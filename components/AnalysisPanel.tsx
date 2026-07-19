"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnalyzeResponse, fetchFingerprintTrend, TrendRun } from '@/lib/api';
import DiffViewer from './DiffViewer';
import ExplainTree from './ExplainTree';
import PlanListView from './PlanListView';
import IndexRecommendations from './IndexRecommendations';
import HistoryTrendChart from './HistoryTrendChart';
import { 
  IconBrain, 
  IconCode, 
  IconBinary, 
  IconDatabase, 
  IconChartLine,
  IconCopy,
  IconCheck,
  IconAlertTriangle,
  IconInfoCircle,
  IconExternalLink
} from '@tabler/icons-react';

interface AnalysisPanelProps {
  analysisData: AnalyzeResponse;
  explainLoading: boolean;
  explainError: string | null;
  originalQuery: string;
  connectionString: string;
}

export default function AnalysisPanel({ 
  analysisData, 
  explainLoading, 
  explainError,
  originalQuery,
  connectionString
}: AnalysisPanelProps) {
  // Tabs: 'explain' (Plan Tree), 'ai' (AI Insights), 'diff' (Diff), 'indexes' (Indexes), 'trend' (History Trend)
  const [activeTab, setActiveTab] = useState<'explain' | 'ai' | 'diff' | 'indexes' | 'trend'>('explain');
  const [showVisualTree, setShowVisualTree] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // History trend data
  const [trendRuns, setTrendRuns] = useState<TrendRun[]>([]);
  const [loadingTrend, setLoadingTrend] = useState<boolean>(false);

  // Fetch trend when switching to trend tab
  useEffect(() => {
    if (activeTab === 'trend' && analysisData?.fingerprint) {
      setLoadingTrend(true);
      fetchFingerprintTrend(analysisData.fingerprint)
        .then(res => {
          setTrendRuns(res.runs || []);
        })
        .catch(err => {
          console.error("Failed to load trend data:", err);
        })
        .finally(() => {
          setLoadingTrend(false);
        });
    }
  }, [activeTab, analysisData?.fingerprint]);

  const handleCopy = () => {
    navigator.clipboard.writeText(analysisData.optimized_query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'danger':
        return 'bg-red-500/10 text-red-400 border border-red-500/25';
      case 'medium':
      case 'warning':
        return 'bg-amber-500/10 text-amber-450 border border-amber-500/25';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
    }
  };

  // Extract explain plans from analysis response
  const originalPlan = analysisData.explain_data?.original;
  const optimizedPlan = analysisData.explain_data?.optimized;

  return (
    <div className="w-full bg-[#0A0A0F]/60 backdrop-blur-md border border-[#232333]/80 rounded-xl shadow-xl flex flex-col overflow-hidden">
      {/* Shell tabs */}
      <div className="flex border-b border-[#232333]/80 bg-[#07070B] px-4 overflow-x-auto select-none">
        <button
          onClick={() => setActiveTab('explain')}
          className={`relative flex items-center gap-2 py-3.5 px-5 text-sm font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'explain'
              ? 'text-[#7C6FE0] font-bold'
              : 'text-text-muted hover:text-slate-200'
          }`}
        >
          <IconBinary className="w-4.5 h-4.5" />
          <span>Plan Tree</span>
          {activeTab === 'explain' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C6FE0]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`relative flex items-center gap-2 py-3.5 px-5 text-sm font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ai'
              ? 'text-[#7C6FE0] font-bold'
              : 'text-text-muted hover:text-slate-200'
          }`}
        >
          <IconBrain className="w-4.5 h-4.5" />
          <span>AI Insights</span>
          {activeTab === 'ai' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C6FE0]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          className={`relative flex items-center gap-2 py-3.5 px-5 text-sm font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'diff'
              ? 'text-[#7C6FE0] font-bold'
              : 'text-text-muted hover:text-slate-200'
          }`}
        >
          <IconCode className="w-4.5 h-4.5" />
          <span>Diff Viewer</span>
          {activeTab === 'diff' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C6FE0]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('indexes')}
          className={`relative flex items-center gap-2 py-3.5 px-5 text-sm font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'indexes'
              ? 'text-[#7C6FE0] font-bold'
              : 'text-text-muted hover:text-slate-200'
          }`}
        >
          <IconDatabase className="w-4.5 h-4.5" />
          <span>Indexes</span>
          {activeTab === 'indexes' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C6FE0]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('trend')}
          className={`relative flex items-center gap-2 py-3.5 px-5 text-sm font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'trend'
              ? 'text-[#7C6FE0] font-bold'
              : 'text-text-muted hover:text-slate-200'
          }`}
        >
          <IconChartLine className="w-4.5 h-4.5" />
          <span>History Trend</span>
          {activeTab === 'trend' && (
            <motion.div
              layoutId="activeTabUnderline"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C6FE0]"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>

      {/* Panels container */}
      <div className="p-5 flex-1 min-h-[460px] flex flex-col">
        
        {/* TAB 1 — PLAN TREE (D3 Interactive + Before/After simple list) */}
        {activeTab === 'explain' && (
          <div className="space-y-4 flex-grow flex flex-col justify-between">
            {explainLoading ? (
              <div className="h-[400px] w-full flex flex-col items-center justify-center text-text-muted gap-2 bg-[#0A0A0F] border border-[#232333] rounded-xl">
                <svg className="animate-spin h-8 w-8 text-[#7C6FE0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs">Fetching query explain structures...</span>
              </div>
            ) : explainError ? (
              <div className="h-[400px] w-full flex flex-col items-center justify-center p-6 text-center bg-red-500/5 border border-red-500/25 rounded-xl">
                <IconAlertTriangle className="w-8 h-8 text-red-400 mb-2 animate-bounce" />
                <h4 className="text-sm font-semibold text-foreground">Explain execution failed</h4>
                <p className="text-xs text-red-300 max-w-lg mt-1 leading-relaxed">{explainError}</p>
              </div>
            ) : originalPlan ? (
              <div className="space-y-4 flex-grow flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-text-muted font-mono bg-[#13131A] border border-[#232333] py-1 px-2.5 rounded-lg flex items-center gap-1.5">
                    <IconInfoCircle size={14} className="text-[#7C6FE0]" />
                    Fingerprint: <span className="text-slate-300 select-all font-semibold">{analysisData.fingerprint?.substring(0, 16)}...</span>
                  </span>
                  
                  <button
                    onClick={() => setShowVisualTree(!showVisualTree)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#7C6FE0]/10 hover:bg-[#7C6FE0]/25 text-[#7C6FE0] border border-[#7C6FE0]/30 hover:border-[#7C6FE0]/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-black/30"
                  >
                    <IconExternalLink size={14} />
                    {showVisualTree ? "Switch to Collapsible List View" : "Expand D3.js Interactive Graph"}
                  </button>
                </div>

                {/* Show D3 visualizer if expanded, else simple 2-column node lists */}
                {showVisualTree ? (
                  <div className="space-y-4 animate-fade-in flex-grow">
                    <ExplainTree data={originalPlan.tree} />
                    <div className="text-[10px] text-text-muted italic text-center">
                      * Color gradient corresponds to execution time (Red = slowest, Green = fastest). Circle size represents row count.
                    </div>
                  </div>
                ) : (
                  <div className="animate-fade-in flex-grow">
                    <PlanListView 
                      originalTree={originalPlan.tree} 
                      optimizedTree={optimizedPlan?.tree} 
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] w-full flex flex-col items-center justify-center text-text-muted gap-2 bg-[#0A0A0F] border border-[#232333] border-dashed rounded-xl">
                <IconBinary className="w-8 h-8" />
                <span className="text-xs">No query explain structures available.</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 2 — AI INSIGHTS */}
        {activeTab === 'ai' && (
          <div className="space-y-5 flex-grow flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Performance Summary</h3>
                <p className="text-sm text-slate-300 leading-relaxed bg-[#0A0A0F] border border-[#232333] rounded-xl p-4.5 shadow-inner">
                  {analysisData.summary || "AI didn't provide a general summary. Look at issues listed."}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Detected Bottlenecks</h3>
                {analysisData.issues && analysisData.issues.length > 0 ? (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {analysisData.issues.map((issue, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3.5 p-4 bg-[#0A0A0F] border border-[#232333] rounded-xl hover:border-[#2D2D3D] transition-colors"
                      >
                        <IconAlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          issue.severity.toLowerCase() === 'high' || issue.severity.toLowerCase() === 'danger'
                            ? 'text-red-400' 
                            : 'text-amber-450'
                        }`} />
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200 bg-[#161622] py-1 px-2.5 rounded-lg border border-[#232333] font-mono">
                              {issue.type}
                            </span>
                            <span className="text-xs text-text-muted font-mono bg-black/40 px-2 py-0.5 rounded-lg border border-[#232333]">
                              Node: {issue.node}
                            </span>
                            <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full ${getSeverityStyles(issue.severity)}`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted leading-relaxed pt-0.5">
                            {issue.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted italic bg-black/20 p-4 border border-dashed border-[#232333] rounded-xl">
                    No query plan inefficiencies identified.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 — DIFF VIEWER */}
        {activeTab === 'diff' && (
          <div className="space-y-4 flex-grow flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-350 font-semibold font-mono">Side-by-side SQL diff</span>
              <button
                onClick={handleCopy}
                className="bg-[#7C6FE0] hover:bg-[#6D60D0] text-foreground font-bold text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-[#7C6FE0]/15 active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <IconCheck size={14} />
                    Copied!
                  </>
                ) : (
                  <>
                    <IconCopy size={14} />
                    Copy Rewritten SQL
                  </>
                )}
              </button>
            </div>

            <div className="flex-grow min-h-[300px]">
              <DiffViewer 
                original={originalQuery} 
                modified={analysisData.optimized_query || ''} 
              />
            </div>

            <div className="bg-[#0A0A0F] border border-[#232333] rounded-xl p-4.5">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Applied Query Modifications</h3>
              {analysisData.changes && analysisData.changes.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-muted leading-relaxed">
                  {analysisData.changes.map((change, idx) => (
                    <li key={idx} className="hover:text-slate-300 transition-colors">
                      {change}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted italic bg-black/25 p-3 rounded-lg border border-dashed border-[#232333]">
                  Original structure was deemed optimal by AI optimizer.
                </p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4 — INDEXES (Validate index with hypopg) */}
        {activeTab === 'indexes' && (
          <div className="space-y-4 flex-grow flex flex-col justify-between">
            <div>
              <IndexRecommendations 
                recommendations={analysisData.index_recommendations} 
                query={originalQuery}
                connectionString={connectionString}
                queryHistoryId={analysisData.history_id}
              />
              {(!analysisData.index_recommendations || analysisData.index_recommendations.length === 0) && (
                <div className="h-[220px] w-full flex flex-col items-center justify-center text-text-muted text-sm border border-dashed border-[#232333] rounded-xl bg-[#0A0A0F]">
                  <IconDatabase size={28} className="text-slate-500 mb-2" />
                  <span>No indexes recommended.</span>
                  <span className="text-xs text-text-muted mt-1">The query execution utilizes primary keys or exists inside optimal columns.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5 — HISTORY TREND */}
        {activeTab === 'trend' && (
          <div className="space-y-4 flex-grow flex flex-col justify-center">
            {loadingTrend ? (
              <div className="h-[220px] w-full flex flex-col items-center justify-center text-text-muted gap-2 bg-[#0A0A0F] border border-[#232333] rounded-xl">
                <svg className="animate-spin h-6 w-6 text-[#7C6FE0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs">Fetching execution time logs...</span>
              </div>
            ) : (
              <HistoryTrendChart runs={trendRuns} />
            )}
          </div>
        )}

      </div>
    </div>
  );
}
