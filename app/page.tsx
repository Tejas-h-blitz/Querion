"use client";

import { useState, useEffect } from 'react';
import { 
  submitQueryAnalysis, 
  fetchHistory, 
  deleteHistory, 
  getSSEStreamUrl,
  HistoryItem,
  submitBatchAnalysis
} from '@/lib/api';
import QueryEditor from '@/components/QueryEditor';
import AnalysisPanel from '@/components/AnalysisPanel';
import CommandPalette from '@/components/CommandPalette';
import { 
  IconDatabase, 
  IconPlayerPlay, 
  IconTerminal, 
  IconCpu, 
  IconLayout, 
  IconPlus, 
  IconX,
  IconAlertTriangle,
  IconCheck,
  IconSearch,
  IconGitPullRequest,
  IconChevronRight,
  IconTrendingUp,
  IconFlame,
  IconHourglass,
  IconDownload
} from '@tabler/icons-react';

export default function Home() {
  const [query, setQuery] = useState<string>(
    "SELECT * FROM orders \nJOIN users ON orders.user_id = users.id \nWHERE users.email = 'example@gmail.com';"
  );
  
  // Connection states
  const [connectionString, setConnectionString] = useState<string>('');
  const [connections, setConnections] = useState<string[]>([]);
  const [newConnInput, setNewConnInput] = useState<string>('');
  const [showAddConnForm, setShowAddConnForm] = useState<boolean>(false);
  const [connectedStatus, setConnectedStatus] = useState<'connected' | 'disconnected'>('disconnected');

  // Loading states
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Result data states
  const [analysisData, setAnalysisData] = useState<any>(null);
  
  // History tracking state
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [activeHistoryId, setActiveHistoryId] = useState<string | undefined>(undefined);

  // UI elements
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'explain' | 'ai' | 'diff' | 'indexes' | 'trend'>('explain');

  // Batch analysis state
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchReport, setBatchReport] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState<boolean>(false);

  // Job progress stages for vertical loading sequence
  const [jobSteps, setJobSteps] = useState<{
    parsing: 'pending' | 'active' | 'complete';
    explain: 'pending' | 'active' | 'complete';
    ai: 'pending' | 'active' | 'complete';
    recommendations: 'pending' | 'active' | 'complete';
  }>({
    parsing: 'pending',
    explain: 'pending',
    ai: 'pending',
    recommendations: 'pending',
  });

  // Load connection strings from localStorage
  useEffect(() => {
    const savedConnStr = localStorage.getItem('querion_conn_str');
    if (savedConnStr) {
      setConnectionString(savedConnStr);
      setConnectedStatus('connected');
    }
    
    const savedConns = localStorage.getItem('querion_connections');
    if (savedConns) {
      try {
        setConnections(JSON.parse(savedConns));
      } catch (e) {}
    } else if (savedConnStr) {
      setConnections([savedConnStr]);
      localStorage.setItem('querion_connections', JSON.stringify([savedConnStr]));
    }

    // Initial query history fetch
    loadHistoryList();
  }, [refreshTrigger]);

  // Global keydown listeners for Ctrl+K (Command Palette) and Ctrl+Enter (Run)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const loadHistoryList = async () => {
    try {
      const data = await fetchHistory("anonymous");
      setHistoryList(data || []);
    } catch (err) {
      console.error("Failed to load query history list:", err);
    }
  };

  const saveConnection = (connStr: string) => {
    if (!connStr) return;
    let list = [...connections];
    if (!list.includes(connStr)) {
      list.push(connStr);
      setConnections(list);
      localStorage.setItem('querion_connections', JSON.stringify(list));
    }
    setConnectionString(connStr);
    localStorage.setItem('querion_conn_str', connStr);
    setConnectedStatus('connected');
  };

  const removeConnection = (e: React.MouseEvent, connStr: string) => {
    e.stopPropagation();
    const list = connections.filter(c => c !== connStr);
    setConnections(list);
    localStorage.setItem('querion_connections', JSON.stringify(list));
    if (connectionString === connStr) {
      const nextActive = list[0] || '';
      setConnectionString(nextActive);
      localStorage.setItem('querion_conn_str', nextActive);
      if (!nextActive) {
        setConnectedStatus('disconnected');
      }
    }
  };

  const handleSelectConnection = (conn: string) => {
    setConnectionString(conn);
    localStorage.setItem('querion_conn_str', conn);
    setConnectedStatus('connected');
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setActiveHistoryId(item.id);
    setQuery(item.raw_query);
    setError(null);
    setIsBatchMode(false);

    // Unpack data from JSON strings
    let issues = [];
    let recs = [];
    try {
      issues = JSON.parse(item.issues_json || '[]');
    } catch (e) {}
    try {
      recs = JSON.parse(item.index_recommendations_json || '[]');
    } catch (e) {}

    let explainData = undefined;
    try {
      explainData = JSON.parse(item.plan_json || 'undefined');
    } catch (e) {}

    setAnalysisData({
      issues,
      optimized_query: item.optimized_query || item.raw_query,
      changes: ["Retrieved from history record."],
      index_recommendations: recs,
      summary: "Loaded from cached execution profile.",
      fingerprint: item.fingerprint_hash,
      history_id: item.id,
      original_exec_time_ms: item.execution_time_ms || 0.0,
      optimized_exec_time_ms: item.optimized_exec_time_ms || 0.0,
      improvement_pct: item.improvement_pct || 0.0,
      explain_data: explainData
    });
  };

  const handleAddConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (newConnInput.trim()) {
      saveConnection(newConnInput.trim());
      setNewConnInput('');
      setShowAddConnForm(false);
    }
  };

  const handleAnalyze = async () => {
    if (!query.trim()) {
      setError("Please write a SQL SELECT query first.");
      return;
    }
    if (!connectionString.trim()) {
      setError("Please provide a valid PostgreSQL connection string.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setAnalysisData(null);
    setIsBatchMode(false);
    setActiveHistoryId(undefined);
    setJobSteps({
      parsing: 'active',
      explain: 'pending',
      ai: 'pending',
      recommendations: 'pending',
    });

    try {
      // 1. Submit query optimization task to background queue
      const { job_id } = await submitQueryAnalysis(query, connectionString, "anonymous");
      
      // 2. Connect to Server-Sent Events stream
      const sseUrl = getSSEStreamUrl(job_id);
      const eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.stage === 'parsing') {
          if (data.status === 'completed') {
            setJobSteps(prev => ({ ...prev, parsing: 'complete', explain: 'active' }));
          } else {
            setJobSteps(prev => ({ ...prev, parsing: 'active' }));
          }
        }
        else if (data.stage === 'explain') {
          if (data.status === 'completed') {
            setJobSteps(prev => ({ ...prev, explain: 'complete', ai: 'active' }));
          } else {
            setJobSteps(prev => ({ ...prev, parsing: 'complete', explain: 'active' }));
          }
        }
        else if (data.stage === 'ai') {
          if (data.status === 'completed') {
            setJobSteps(prev => ({ ...prev, ai: 'complete', recommendations: 'active' }));
          } else {
            setJobSteps(prev => ({ ...prev, parsing: 'complete', explain: 'complete', ai: 'active' }));
          }
        }
        else if (data.stage === 'recommendations') {
          if (data.status === 'completed') {
            setJobSteps(prev => ({ ...prev, recommendations: 'complete' }));
          } else {
            setJobSteps(prev => ({ ...prev, parsing: 'complete', explain: 'complete', ai: 'complete', recommendations: 'active' }));
          }
        }
        else if (data.stage === 'done') {
          // Job complete
          setJobSteps({
            parsing: 'complete',
            explain: 'complete',
            ai: 'complete',
            recommendations: 'complete',
          });
          setAnalysisData(data.data);
          setIsAnalyzing(false);
          setConnectedStatus('connected');
          
          // Save active connection and reload history sidebar list
          saveConnection(connectionString);
          setRefreshTrigger(prev => prev + 1);
          eventSource.close();
        }
        else if (data.stage === 'error') {
          setError(data.detail || "An error occurred during query analysis.");
          setIsAnalyzing(false);
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        setError("Error streaming response stages from analysis job queue.");
        setIsAnalyzing(false);
        eventSource.close();
      };

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!connectionString) {
      setError("Please provide a database connection string in the top bar before uploading migrations.");
      return;
    }

    setError(null);
    setBatchLoading(true);
    setBatchReport(null);
    setIsBatchMode(true);
    setAnalysisData(null);

    try {
      const res = await submitBatchAnalysis(connectionString, file);
      setBatchReport(res);
    } catch (err: any) {
      setError(err.message || "Failed to analyze SQL batch migration script.");
      setIsBatchMode(false);
    } finally {
      setBatchLoading(false);
      // Reset input element
      e.target.value = '';
    }
  };

  const parseConnectionName = (connStr: string) => {
    try {
      const match = connStr.match(/postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::\d+)?\/([^?]+)/);
      if (match) {
        return `${match[4]} on ${match[3]}`;
      }
    } catch (e) {}
    return connStr.substring(0, 24) + (connStr.length > 24 ? '...' : '');
  };

  const handleSelectQueryFromPalette = (selectedQuery: string) => {
    setQuery(selectedQuery);
    // If command palette selected a query, trigger run
    setTimeout(() => handleAnalyze(), 100);
  };

  // Helper values for loading state
  const stepMeta = [
    { key: 'parsing', label: 'Parsing SQL query & AST safety checks' },
    { key: 'explain', label: 'Running EXPLAIN ANALYZE inside transaction sandbox' },
    { key: 'ai', label: 'Evaluating query plans with Gemini AI tuner' },
    { key: 'recommendations', label: 'Generating recommendations & virtual index options' },
  ];

  return (
    <div className="flex w-full min-h-screen bg-background text-foreground font-sans selection:bg-[#7C6FE0]/30">
      
      {/* 1. LEFT SIDEBAR (Fixed, 220px) */}
      <aside className="w-[230px] border-r border-[#232333] bg-[#07070B] hidden md:flex flex-col flex-shrink-0">
        
        {/* Sidebar top wordmark */}
        <div className="p-4 border-b border-[#232333] flex items-center gap-2">
          <div className="bg-[#7C6FE0]/10 border border-[#7C6FE0]/25 p-2 rounded-lg text-[#7C6FE0]">
            <IconCpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              Querion
              <span className="text-[8px] bg-[#7C6FE0]/25 text-[#7C6FE0] border border-[#7C6FE0]/35 px-1.5 py-0.5 rounded-full font-mono">
                v2.0
              </span>
            </h1>
            <span className="text-[9px] text-text-muted font-mono">SQL Optimizer</span>
          </div>
        </div>

        {/* Database Connection List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1 text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              <span>Workspaces</span>
              <button 
                onClick={() => setShowAddConnForm(!showAddConnForm)}
                className="hover:text-primary p-0.5 rounded transition-all cursor-pointer"
                title="Add DB Connection"
              >
                <IconPlus size={12} />
              </button>
            </div>

            {/* Connection string builder */}
            {showAddConnForm && (
              <form onSubmit={handleAddConnection} className="bg-surface border border-[#232333] p-2 rounded-lg space-y-2 animate-fade-in">
                <input 
                  type="text" 
                  value={newConnInput}
                  onChange={(e) => setNewConnInput(e.target.value)}
                  placeholder="postgresql://user:pass@host:5432/db"
                  className="w-full text-[10px] bg-background border border-[#232333] rounded px-2 py-1 outline-none text-slate-300 font-mono"
                  required
                />
                <div className="flex justify-end gap-1 text-[9px]">
                  <button 
                    type="button" 
                    onClick={() => setShowAddConnForm(false)}
                    className="px-2 py-0.5 border border-border hover:bg-[#20202F] text-text-muted rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-2 py-0.5 bg-[#7C6FE0] text-white rounded font-medium"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* List connections */}
            {connections.length === 0 ? (
              <span className="text-xs text-text-muted italic block px-1">
                No saved DB connections.
              </span>
            ) : (
              <div className="space-y-1">
                {connections.map((conn, idx) => {
                  const isActive = connectionString === conn;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectConnection(conn)}
                      className={`flex items-center justify-between text-sm py-2 px-3 rounded-lg cursor-pointer transition-all border ${
                        isActive 
                          ? 'bg-[#7C6FE0]/10 border-[#7C6FE0]/30 text-[#7C6FE0] font-semibold' 
                          : 'bg-transparent border-transparent text-slate-350 hover:bg-[#12121A] hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <IconDatabase size={15} className={isActive ? 'text-[#7C6FE0]' : 'text-slate-400'} />
                        <span className="truncate">{parseConnectionName(conn)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-slate-600'}`} />
                        <button 
                          onClick={(e) => removeConnection(e, conn)}
                          className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 p-0.5 hover:bg-danger/10 rounded cursor-pointer transition-opacity"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Queries List */}
          <div className="space-y-1.5">
            <div className="px-1 text-xs uppercase tracking-wider text-text-muted font-semibold">
              Recent Queries
            </div>
            
            {historyList.length === 0 ? (
              <span className="text-xs text-text-muted italic block px-1">
                No recent executions.
              </span>
            ) : (
              <div className="space-y-1">
                {historyList.slice(0, 8).map((item) => {
                  const isSelected = item.id === activeHistoryId;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectHistory(item)}
                      className={`w-full flex items-center justify-between text-left text-sm py-2 px-2.5 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-[#181826] border-[#2A2B3D] text-[#7C6FE0] font-medium' 
                          : 'bg-transparent border-transparent text-slate-400 hover:bg-[#12121A] hover:text-foreground'
                      }`}
                    >
                      <span className="truncate font-mono text-xs pr-2">
                        {item.raw_query.replace(/\s+/g, ' ').trim()}
                      </span>
                      <IconChevronRight size={12} className="text-text-muted flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* User area at bottom */}
        <div className="p-4 border-t border-[#232333] bg-[#0A0A0F] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C6FE0] to-[#AD9EE0] flex items-center justify-center font-bold text-xs text-white">
            TH
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">Tejas H</div>
            <div className="text-[9px] text-text-muted font-mono leading-none">Senior DB Engineer</div>
          </div>
        </div>

      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top bar with Connection Info */}
        <div className="h-14 border-b border-[#232333] bg-[#09090D] px-6 flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative flex items-center">
            <IconSearch className="absolute left-3 text-text-muted" size={14} />
            <input
              type="text"
              readOnly
              onClick={() => setIsCommandPaletteOpen(true)}
              placeholder="Search queries, switch views, run commands... ⌘K"
              className="w-full bg-[#0F0F15] hover:bg-[#13131D] border border-[#232333] rounded-lg py-1.5 pl-9 pr-4 text-xs text-slate-350 placeholder-text-muted outline-none transition-all cursor-pointer select-none"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Batch analysis action */}
            <div className="relative">
              <label className="text-[11px] font-semibold bg-[#0F0F15] hover:bg-[#151525] text-slate-300 hover:text-foreground border border-[#232333] rounded-lg px-3 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-sm">
                <IconDownload size={14} className="text-slate-400" />
                Upload Migration File
                <input 
                  type="file" 
                  accept=".sql" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Connection pill */}
            <div className={`text-sm py-1.5 px-4 rounded-full border flex items-center gap-2 font-semibold ${
              connectedStatus === 'connected'
                ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connectedStatus === 'connected' ? 'bg-success animate-pulse' : 'bg-red-500'}`} />
              <span>
                {connectionString ? parseConnectionName(connectionString) : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto">
          
          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs leading-relaxed animate-fade-in">
              <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
              <div className="flex-1 font-medium">
                <div className="font-semibold text-sm mb-0.5 uppercase tracking-wide">Analysis Incomplete</div>
                {error}
              </div>
            </div>
          )}

          {/* Workspace Panels (Editor + Results / Loader) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch min-h-[500px]">
            
            {/* Left: Query Editor */}
            <div className="flex flex-col h-[520px] xl:h-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SQL Input Editor</span>
                <span className="text-xs text-text-muted font-mono">⌘Enter to optimize</span>
              </div>
              <div className="flex-grow min-h-[360px] relative">
                <QueryEditor value={query} onChange={setQuery} onRun={handleAnalyze} />
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="absolute bottom-4 right-4 bg-[#7C6FE0] hover:bg-[#6D60D0] text-foreground font-bold text-sm px-6 py-3 rounded-lg shadow-lg shadow-[#7C6FE0]/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95 cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <IconPlayerPlay size={15} className="fill-current" />
                      Run Optimization
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right: Results or Loading Step List */}
            <div className="flex flex-col h-[520px] xl:h-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Optimization Results</span>
              </div>
              
              <div className="flex-grow flex flex-col min-h-[360px] min-w-0">
                {isAnalyzing ? (
                  
                  /* Vertical Step List staged loading sequence */
                  <div className="flex-grow bg-[#0F0F15] border border-[#232333] rounded-xl p-6 flex flex-col justify-center space-y-6 shadow-2xl animate-fade-in">
                    <div className="max-w-md mx-auto w-full space-y-5">
                      <div className="text-center pb-2 border-b border-[#232333] mb-4">
                        <h4 className="text-base font-semibold text-slate-200">Processing Query Optimization Job</h4>
                        <p className="text-xs text-text-muted font-mono mt-0.5">Streaming pipeline feedback via SSE</p>
                      </div>
                      
                      <div className="space-y-4">
                        {stepMeta.map((step) => {
                          const status = jobSteps[step.key as keyof typeof jobSteps];
                          const isActive = status === 'active';
                          const isComplete = status === 'complete';
                          
                          return (
                            <div 
                              key={step.key} 
                              className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${
                                isActive 
                                  ? 'bg-[#7C6FE0]/5 border-[#7C6FE0]/30' 
                                  : isComplete 
                                  ? 'bg-emerald-500/5 border-emerald-500/25 opacity-80' 
                                  : 'bg-[#0B0B10] border-transparent opacity-40'
                              }`}
                            >
                              {isComplete ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                  <IconCheck size={12} strokeWidth={3} />
                                </div>
                              ) : isActive ? (
                                <div className="w-5 h-5 flex items-center justify-center">
                                  <svg className="animate-spin h-4 w-4 text-[#7C6FE0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-xs text-slate-500">
                                  <IconHourglass size={10} />
                                </div>
                              )}
                              <span className={`text-sm font-medium ${
                                isActive ? 'text-[#7C6FE0]' : isComplete ? 'text-slate-350' : 'text-slate-500'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                ) : batchLoading ? (
                  
                  /* Batch analysis loading spinner */
                  <div className="flex-grow bg-[#0F0F15] border border-[#232333] rounded-xl p-6 flex flex-col items-center justify-center gap-2 animate-pulse">
                    <svg className="animate-spin h-8 w-8 text-[#7C6FE0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs text-text-muted">Batch analyzing multi-statement SQL script...</span>
                  </div>

                ) : isBatchMode && batchReport ? (
                  
                  /* Batch report view */
                  <div className="flex-grow bg-[#0F0F15] border border-[#232333] rounded-xl p-5 shadow-xl overflow-y-auto flex flex-col space-y-4 animate-fade-in">
                    <div>
                      <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Migration Batch Analysis</h3>
                      <p className="text-xs text-text-muted font-mono mt-0.5">
                        File: {batchReport.filename} | {batchReport.queries_analyzed} queries evaluated
                      </p>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto pr-1">
                      {batchReport.report.map((item: any, idx: number) => (
                        <div 
                          key={idx}
                          onClick={() => {
                            if (item.eligible) {
                              setQuery(item.query);
                              setIsBatchMode(false);
                            }
                          }}
                          className={`flex items-start justify-between p-3.5 bg-[#0A0A0F] border border-[#232333] rounded-xl text-sm transition-colors cursor-pointer ${
                            item.eligible ? 'hover:border-[#7C6FE0]/30' : 'opacity-65'
                          }`}
                        >
                          <div className="space-y-1.5 truncate max-w-[70%]">
                            <code className="block font-mono text-xs text-slate-350 truncate">
                              {item.query.substring(0, 100)}
                            </code>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-md font-mono uppercase font-bold ${
                                item.severity === 'danger' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                item.severity === 'warning' ? 'bg-amber-500/10 text-amber-450 border border-amber-500/20' :
                                item.severity === 'success' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' :
                                'bg-slate-500/10 text-slate-350 border border-slate-500/20'
                              }`}>
                                {item.severity}
                              </span>
                              <span className="text-xs text-text-muted">{item.message}</span>
                            </div>
                          </div>
                          {item.eligible && (
                            <div className="text-right font-mono text-xs pl-2">
                              <div className="text-text-muted">Est. Cost</div>
                              <div className="text-slate-300 font-bold">{item.cost.toFixed(0)}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                ) : analysisData ? (
                  
                  /* Loaded Report Dashboard */
                  <div className="flex-grow flex flex-col space-y-4 animate-fade-in">
                    
                    {/* Metrics Row (4 cards) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Card 1: Execution Time (original) */}
                      <div className="bg-[#0F0F15] border border-[#232333] p-4 rounded-xl shadow-md">
                        <div className="text-xs text-text-muted font-mono uppercase font-semibold">Base Exec Time</div>
                        <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                          {analysisData.original_exec_time_ms ? `${analysisData.original_exec_time_ms.toFixed(2)} ms` : 'N/A'}
                        </div>
                      </div>

                      {/* Card 2: Optimized Time */}
                      <div className="bg-[#0F0F15] border border-[#232333] p-4 rounded-xl shadow-md">
                        <div className="text-xs text-text-muted font-mono uppercase font-semibold">Opt Exec Time</div>
                        <div className={`text-lg font-bold font-mono mt-1 ${
                          analysisData.improvement_pct > 0 ? 'text-emerald-400' : 'text-slate-200'
                        }`}>
                          {analysisData.optimized_exec_time_ms ? `${analysisData.optimized_exec_time_ms.toFixed(2)} ms` : 'N/A'}
                        </div>
                      </div>

                      {/* Card 3: Improvement % */}
                      <div className="bg-[#0F0F15] border border-[#232333] p-4 rounded-xl shadow-md">
                        <div className="text-xs text-text-muted font-mono uppercase font-semibold">Improvement</div>
                        <div className={`text-lg font-bold font-mono mt-1 ${
                          analysisData.improvement_pct > 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}>
                          {analysisData.improvement_pct > 0 ? `+${analysisData.improvement_pct.toFixed(0)}%` : '0%'}
                        </div>
                      </div>

                      {/* Card 4: Issues Count */}
                      <div className="bg-[#0F0F15] border border-[#232333] p-4 rounded-xl shadow-md">
                        <div className="text-xs text-text-muted font-mono uppercase font-semibold">Issues Found</div>
                        <div className={`text-lg font-bold font-mono mt-1 ${
                          analysisData.issues?.length > 0 ? 'text-amber-450' : 'text-slate-200'
                        }`}>
                          {analysisData.issues?.length || 0}
                        </div>
                      </div>

                    </div>

                    {/* Loaded Report Panel */}
                    <div className="flex-grow min-w-0">
                      <AnalysisPanel 
                        analysisData={analysisData} 
                        explainLoading={false} 
                        explainError={null}
                        originalQuery={query}
                        connectionString={connectionString}
                      />
                    </div>
                  </div>
                  
                ) : (
                  
                  /* Empty state welcomes users before query */
                  <div className="flex-grow bg-[#0F0F15] border border-[#232333] border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-5 shadow-inner">
                    <div className="p-4 bg-background border border-[#232333] rounded-2xl text-slate-400 shadow-lg shadow-[#7C6FE0]/5">
                      <IconLayout className="w-11 h-11 text-[#7C6FE0]" />
                    </div>
                    <div className="max-w-sm space-y-2">
                      <h3 className="text-base font-semibold text-slate-200">Analyze your first query</h3>
                      <p className="text-sm text-text-muted leading-relaxed">
                        Input your database connection credentials on the left, add a SQL SELECT query in the editor, and click <strong className="text-slate-350">Run Optimization</strong>.
                      </p>
                    </div>
                  </div>
                  
                )}
              </div>
            </div>
            
          </div>
        </div>

      </main>

      {/* 3. COMMAND PALETTE MODAL OVERLAY */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        connections={connections}
        activeConnection={connectionString}
        onSelectConnection={handleSelectConnection}
        recentQueries={historyList.map(h => ({ id: h.id, raw_query: h.raw_query, fingerprint_hash: h.fingerprint_hash }))}
        onSelectQuery={handleSelectQueryFromPalette}
        onRerun={handleAnalyze}
        onToggleView={(view) => {
          setActiveTab(view);
          // Trigger the view switch on AnalysisPanel indirectly or via local states
        }}
      />

    </div>
  );
}
