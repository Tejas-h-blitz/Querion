"use client";

import { useState } from 'react';
import { IndexRecommendation, simulateIndex } from '@/lib/api';
import { 
  IconCopy, 
  IconCheck, 
  IconBulb, 
  IconPlayerPlay, 
  IconCpu, 
  IconReport, 
  IconAlertTriangle 
} from '@tabler/icons-react';

interface IndexRecommendationsProps {
  recommendations: IndexRecommendation[];
  query: string;
  connectionString: string;
  queryHistoryId?: string;
}

export default function IndexRecommendations({ 
  recommendations, 
  query, 
  connectionString, 
  queryHistoryId 
}: IndexRecommendationsProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  
  // Track simulation states per index card
  const [simResults, setSimResults] = useState<Record<number, any>>({});
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleValidate = async (recSql: string, idx: number) => {
    if (!connectionString) {
      alert("Please provide a database connection string in the top bar before validating.");
      return;
    }
    
    setLoadingIdx(idx);
    try {
      const res = await simulateIndex(query, recSql, connectionString, queryHistoryId);
      setSimResults(prev => ({
        ...prev,
        [idx]: res
      }));
    } catch (err: any) {
      setSimResults(prev => ({
        ...prev,
        [idx]: {
          success: false,
          error: err.message || "Failed to execute index simulation on PostgreSQL."
        }
      }));
    } finally {
      setLoadingIdx(null);
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-6 bg-[#0A0A0F]/70 border border-[#232333]/80 backdrop-blur-sm rounded-xl p-5 shadow-lg select-none">
      <div className="flex items-center gap-2 mb-4">
        <IconBulb className="w-5 h-5 text-warning" />
        <h3 className="text-sm font-semibold text-slate-350 uppercase tracking-wider">Recommended Indexes</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, idx) => {
          const sim = simResults[idx];
          const isLoading = loadingIdx === idx;

          return (
            <div 
              key={idx} 
              className="flex flex-col justify-between p-4 bg-[#09090D]/50 border border-[#232333]/80 rounded-xl hover:border-[#7C6FE0]/30 transition-colors group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <code className="text-[11px] font-mono text-emerald-400 select-all break-all bg-[#050508] p-2.5 rounded-lg border border-[#232333]/80 flex-1">
                    {rec.sql}
                  </code>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => copyToClipboard(rec.sql, idx)}
                      className="p-1.5 bg-[#13131A] hover:bg-[#1E1E2A] text-slate-400 hover:text-white rounded border border-[#232333] transition-colors cursor-pointer"
                      title="Copy SQL"
                    >
                      {copiedIdx === idx ? (
                        <IconCheck size={14} className="text-success" />
                      ) : (
                        <IconCopy size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleValidate(rec.sql, idx)}
                      disabled={isLoading}
                      className="p-1.5 bg-[#7C6FE0]/10 hover:bg-[#7C6FE0]/25 text-[#7C6FE0] rounded border border-[#7C6FE0]/20 hover:border-[#7C6FE0]/40 transition-colors disabled:opacity-50 cursor-pointer"
                      title="Validate index with hypopg"
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <IconCpu size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-3 leading-relaxed">
                  {rec.reason}
                </p>
              </div>

              {/* HypoPG Simulation Report Overlay */}
              {sim && (
                <div className="mt-4 pt-3 border-t border-[#1C1C26] animate-fade-in">
                  {sim.success ? (
                    <div className="bg-[#15251D] border border-emerald-500/20 rounded-lg p-3 text-[11px] text-emerald-300 leading-relaxed font-mono flex gap-2">
                      <IconReport size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-emerald-200 mb-0.5">Planner Validation Success</div>
                        <div>Estimated cost without index: <span className="font-bold text-slate-200">{sim.cost_before.toFixed(0)}</span></div>
                        <div>Estimated cost with index: <span className="font-bold text-emerald-200">{sim.cost_after.toFixed(0)}</span></div>
                        <div className="text-xs font-bold text-emerald-400 mt-1">
                          ↳ {sim.reduction_pct.toFixed(0)}% cost reduction (validated by the query planner via hypopg)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#2D1A1A] border border-red-500/20 rounded-lg p-3 text-[11px] text-red-300 leading-relaxed flex gap-2">
                      <IconAlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-red-200 mb-0.5">Planner Validation Blocked</div>
                        <div className="font-mono text-[10px] break-all">{sim.error}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
