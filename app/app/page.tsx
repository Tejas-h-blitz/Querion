"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
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
import Link from 'next/link';
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
  IconDownload,
  IconHome,
  IconBrandGithub,
  IconCode
} from '@tabler/icons-react';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
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
  const [activeSidebarTab, setActiveSidebarTab] = useState<'editor' | 'connections' | 'history'>('editor');

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
      } catch (e) { }
    } else if (savedConnStr) {
      setConnections([savedConnStr]);
      localStorage.setItem('querion_connections', JSON.stringify([savedConnStr]));
    }
  }, []);

  // Sync Supabase Auth State
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/login?redirect=/app');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
        router.push('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Load history when user changes or refresh is triggered
  useEffect(() => {
    if (user?.id) {
      loadHistoryList(user.id);
    }
  }, [user, refreshTrigger]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

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

  const loadHistoryList = async (userId: string) => {
    try {
      const data = await fetchHistory(userId);
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
    } catch (e) { }
    try {
      recs = JSON.parse(item.index_recommendations_json || '[]');
    } catch (e) { }

    let explainData = undefined;
    try {
      explainData = JSON.parse(item.plan_json || 'undefined');
    } catch (e) { }

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
      const { job_id } = await submitQueryAnalysis(query, connectionString, user?.id || "anonymous");

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
    } catch (e) { }
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
    <div className="flex flex-col w-full h-screen bg-background text-foreground font-sans selection:bg-[#7C6FE0]/30 overflow-hidden relative">

      {/* Background ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute top-[-25%] left-[-20%] w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(124,111,224,0.05),transparent_70%)] blur-[90px]" />
        <div className="absolute bottom-[-25%] right-[-20%] w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(173,158,224,0.04),transparent_70%)] blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b1b26_1px,transparent_1px),linear-gradient(to_bottom,#1b1b26_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.25]" />
      </div>

      {/* Top sticky app navbar */}
      <nav className="h-14 border-b border-[#232333]/80 bg-[#0A0A0F]/80 backdrop-blur-md px-6 flex items-center justify-between z-40 flex-shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center hover:opacity-85 transition-opacity">
            <img src="/querion-logo.png" alt="Querion Logo" className="h-9 w-auto object-contain" />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Connection state info */}
          <div className={`hidden sm:flex items-center gap-2 text-xs py-1.5 px-3 rounded-full border font-semibold ${connectedStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connectedStatus === 'connected' ? 'bg-success animate-pulse' : 'bg-red-500'}`} />
            <span className="whitespace-nowrap font-mono text-[11px]">
              {connectionString ? parseConnectionName(connectionString) : "Disconnected"}
            </span>
          </div>

          {/* User Menu Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C6FE0] to-[#AD9EE0] hover:opacity-90 active:scale-95 transition-all cursor-pointer text-white font-bold text-sm shadow-md shadow-[#7C6FE0]/15"
              >
                {user.email?.substring(0, 2).toUpperCase()}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#0F0F15] border border-[#232333] rounded-xl shadow-xl py-1.5 z-50 animate-fade-in font-sans">
                  <div className="px-3 py-2 border-b border-[#232333] text-[10px] text-[#62627A] font-mono truncate">
                    Logged in as:
                    <div className="text-slate-300 font-semibold text-xs mt-0.5 truncate">{user.email}</div>
                  </div>
                  <Link
                    href="/"
                    className="block px-3 py-2 text-xs text-slate-350 hover:bg-[#181825] hover:text-white transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Landing Page
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                    className="w-full text-left block px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border-t border-[#232333] cursor-pointer"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Main Workspace Body wrapper */}
      <div className="flex flex-grow w-full overflow-hidden">

        {/* 1. SLIM LEFT ICON DOCK (Supabase Style) */}
        <aside className="w-14 bg-[#050508] border-r border-[#232333]/80 flex flex-col justify-between items-center py-4 flex-shrink-0 z-30 hidden md:flex select-none">
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Home Link */}
            <Link
              href="/"
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#12121A] transition-all group cursor-pointer mb-2 border border-transparent hover:border-[#232333]/45"
              title="Back to Landing Page"
            >
              <IconHome size={20} />
            </Link>

            {/* Workspace Tab */}
            <button
              onClick={() => setActiveSidebarTab('editor')}
              className={`relative p-2.5 rounded-xl transition-all group cursor-pointer ${activeSidebarTab === 'editor'
                  ? 'text-[#7C6FE0] bg-[#7C6FE0]/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#12121A]'
                }`}
              title="SQL Editor Workspace"
            >
              {activeSidebarTab === 'editor' && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-[#7C6FE0] rounded-r" />
              )}
              <IconTerminal size={20} />
            </button>

            {/* Connections Tab */}
            <button
              onClick={() => setActiveSidebarTab('connections')}
              className={`relative p-2.5 rounded-xl transition-all group cursor-pointer ${activeSidebarTab === 'connections'
                  ? 'text-[#7C6FE0] bg-[#7C6FE0]/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#12121A]'
                }`}
              title="Database Connections"
            >
              {activeSidebarTab === 'connections' && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-[#7C6FE0] rounded-r" />
              )}
              <IconDatabase size={20} />
            </button>

            {/* History Tab */}
            <button
              onClick={() => setActiveSidebarTab('history')}
              className={`relative p-2.5 rounded-xl transition-all group cursor-pointer ${activeSidebarTab === 'history'
                  ? 'text-[#7C6FE0] bg-[#7C6FE0]/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#12121A]'
                }`}
              title="Query History & Trends"
            >
              {activeSidebarTab === 'history' && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[3px] bg-[#7C6FE0] rounded-r" />
              )}
              <IconTrendingUp size={20} />
            </button>
          </div>

          {/* Bottom utility icons */}
          <div className="flex flex-col items-center gap-4 w-full">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-[#12121A] transition-all cursor-pointer"
              title="Command Palette (Ctrl+K)"
            >
              <IconSearch size={18} />
            </button>
          </div>
        </aside>

        {/* 2. DETAILED SUB-NAVIGATION SIDEBAR */}
        <aside className="w-[200px] border-r border-[#232333]/80 bg-[#07070B]/95 backdrop-blur-md hidden md:flex flex-col flex-shrink-0 justify-between z-20 select-none">
          <div className="flex-grow overflow-y-auto p-4 space-y-5">

            {/* SQL Editor Tab View */}
            {activeSidebarTab === 'editor' && (
              <div className="space-y-5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">SQL Editor</div>
                <div className="space-y-4">
                  {/* Active Connection state summary */}
                  <div className={`border rounded-xl p-3 space-y-1.5 transition-all duration-350 ${connectedStatus === 'connected'
                      ? 'bg-emerald-500/5 border-emerald-500/20 shadow-md shadow-emerald-500/5'
                      : 'bg-[#0F0F15]/80 border-[#232333]/85 shadow-sm'
                    }`}>
                    <div className="text-[9px] uppercase tracking-wider text-[#62627A] font-bold">Active Connection</div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 font-mono truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${connectedStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="truncate">{connectionString ? parseConnectionName(connectionString) : "Disconnected"}</span>
                    </div>
                  </div>

                  {/* Recent Queries */}
                  <div className="space-y-2">
                    <div className="text-[9px] uppercase tracking-wider text-text-muted font-bold">Recent Runs</div>
                    {historyList.length === 0 ? (
                      <span className="text-[11px] text-text-muted italic block px-1">No recent runs.</span>
                    ) : (
                      <div className="space-y-1">
                        {historyList.slice(0, 5).map((item) => {
                          const isSelected = item.id === activeHistoryId;
                          return (
                            <motion.button
                              key={item.id}
                              onClick={() => handleSelectHistory(item)}
                              whileHover={{ x: 2 }}
                              className={`w-full flex items-center justify-between text-left text-[11px] py-1.5 px-2 rounded-lg cursor-pointer transition-all border ${isSelected
                                  ? 'bg-[#181826] border-[#2A2B3D] text-[#7C6FE0] font-medium'
                                  : 'bg-transparent border-transparent text-slate-400 hover:bg-[#12121A]/70 hover:text-foreground'
                                }`}
                            >
                              <span className="truncate font-mono pr-2">
                                {item.raw_query.replace(/\s+/g, ' ').trim()}
                              </span>
                              <IconChevronRight size={10} className="text-text-muted flex-shrink-0" />
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Connections Tab View */}
            {activeSidebarTab === 'connections' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Workspaces</span>
                  <button
                    onClick={() => setShowAddConnForm(!showAddConnForm)}
                    className="hover:text-primary p-0.5 rounded transition-all cursor-pointer text-slate-400"
                    title="Add Connection"
                  >
                    <IconPlus size={14} />
                  </button>
                </div>

                {/* Add connection form */}
                {showAddConnForm && (
                  <form onSubmit={handleAddConnection} className="bg-[#0A0A0F]/70 border border-[#232333]/85 p-2.5 rounded-lg space-y-2 shadow-inner">
                    <input
                      type="text"
                      value={newConnInput}
                      onChange={(e) => setNewConnInput(e.target.value)}
                      placeholder="postgresql://user:pass@host:port/db"
                      className="w-full bg-[#111116] border border-[#232333] rounded px-2 py-1 text-[10px] text-slate-355 placeholder-[#434355] outline-none font-mono"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddConnForm(false)}
                        className="text-[9px] px-2 py-0.5 border border-transparent rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="text-[9px] px-2 py-0.5 bg-[#7C6FE0] hover:bg-[#6D60D0] text-white rounded font-semibold cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                )}

                {/* List connections */}
                {connections.length === 0 ? (
                  <span className="text-[11px] text-text-muted italic block px-1">
                    No saved DB connections.
                  </span>
                ) : (
                  <div className="space-y-1">
                    {connections.map((conn, idx) => {
                      const isActive = connectionString === conn;
                      return (
                        <motion.div
                          key={idx}
                          onClick={() => handleSelectConnection(conn)}
                          whileHover={{ x: 2 }}
                          className={`flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg cursor-pointer transition-all border ${isActive
                              ? 'bg-[#7C6FE0]/10 border-[#7C6FE0]/30 text-[#7C6FE0] font-semibold'
                              : 'bg-transparent border-transparent text-slate-350 hover:bg-[#12121A]/70 hover:text-foreground'
                            }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <IconDatabase size={13} className={isActive ? 'text-[#7C6FE0]' : 'text-slate-400'} />
                            <span className="truncate font-mono">{parseConnectionName(conn)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-success animate-pulse' : 'bg-slate-600'}`} />
                            <button
                              onClick={(e) => removeConnection(e, conn)}
                              className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 p-0.5 hover:bg-danger/10 rounded cursor-pointer transition-opacity"
                            >
                              <IconX size={10} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* History Tab View */}
            {activeSidebarTab === 'history' && (
              <div className="space-y-4">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Query History</div>

                {historyList.length === 0 ? (
                  <span className="text-[11px] text-text-muted italic block px-1">
                    No recent executions.
                  </span>
                ) : (
                  <div className="space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
                    {historyList.map((item) => {
                      const isSelected = item.id === activeHistoryId;
                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => handleSelectHistory(item)}
                          whileHover={{ x: 2 }}
                          className={`w-full flex items-center justify-between text-left text-[11px] py-1.5 px-2 rounded-lg cursor-pointer transition-all border ${isSelected
                              ? 'bg-[#181826] border-[#2A2B3D] text-[#7C6FE0] font-medium'
                              : 'bg-transparent border-transparent text-slate-400 hover:bg-[#12121A]/70 hover:text-foreground'
                            }`}
                        >
                          <span className="truncate font-mono pr-2">
                            {item.raw_query.replace(/\s+/g, ' ').trim()}
                          </span>
                          <IconChevronRight size={10} className="text-text-muted flex-shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <main className="flex-1 flex flex-col min-w-0">

          {/* Top bar with Connection Info */}
          <div className="h-14 border-b border-[#232333] bg-[#09090D] px-6 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md relative flex items-center group">
              <IconSearch className="absolute left-3 text-[#62627A] group-hover:text-slate-400 transition-colors" size={14} />
              <input
                type="text"
                readOnly
                onClick={() => setIsCommandPaletteOpen(true)}
                placeholder="Search queries, switch views, run commands..."
                className="w-full bg-[#0F0F15] hover:bg-[#13131D] border border-[#232333] rounded-lg py-1.5 pl-9 pr-14 text-xs text-slate-300 placeholder-[#62627A] outline-none transition-all cursor-pointer select-none shadow-sm"
              />
              <div className="absolute right-2.5 flex items-center gap-0.5 pointer-events-none select-none">
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-[#232333] bg-[#09090D] px-1.5 font-mono text-[9px] font-bold text-slate-500 shadow-sm">
                  Ctrl
                </kbd>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-[#232333] bg-[#09090D] px-1.5 font-mono text-[9px] font-bold text-slate-500 shadow-sm">
                  K
                </kbd>
              </div>
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
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch min-h-[500px]"
            >

              {/* Left: Query Editor */}
              <div className="flex flex-col h-[520px] xl:h-auto border border-[#232333]/85 rounded-xl bg-[#09090D] overflow-hidden shadow-xl hover:border-[#7C6FE0]/30 transition-colors duration-300">
                {/* IDE-Style Editor Tab Bar */}
                <div className="h-10 bg-[#07070B] border-b border-[#232333]/80 px-4 flex items-center justify-between select-none">
                  <div className="flex items-center gap-1">
                    <div className="flex items-center gap-2 bg-[#0F0F15] px-3.5 py-2 border-r border-[#232333]/60 text-xs font-medium text-slate-200 border-t-2 border-t-[#7C6FE0]">
                      <IconCode size={13} className="text-[#7C6FE0]" />
                      <span>sandbox_query.sql</span>
                      <span className="text-text-muted hover:text-white ml-1 cursor-pointer">×</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuery("SELECT * FROM orders \nJOIN users ON orders.user_id = users.id \nWHERE users.email = 'example@gmail.com';")}
                      className="text-[10px] text-[#62627A] hover:text-slate-350 transition-colors font-semibold px-2 py-1 rounded hover:bg-[#13131D]"
                      title="Reset to default query"
                    >
                      Reset
                    </button>
                    <button
                      onClick={() => setQuery("")}
                      className="text-[10px] text-[#62627A] hover:text-slate-355 transition-colors font-semibold px-2 py-1 rounded hover:bg-[#13131D]"
                      title="Clear editor text"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex-grow min-h-[360px] relative">
                  <QueryEditor value={query} onChange={setQuery} onRun={handleAnalyze} />
                </div>

                {/* Editor Action Footer bar */}
                <div className="h-12 bg-[#07070B] border-t border-[#232333]/70 px-4 flex items-center justify-between">
                  <div className="text-[10px] text-[#62627A] font-mono hidden sm:inline-block">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-[#13131D] border border-[#232333] text-slate-400">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-[#13131D] border border-[#232333] text-slate-400">Enter</kbd> to run
                  </div>
                  <motion.button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    whileHover={{ scale: 1.01, y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    className="bg-[#7C6FE0] hover:bg-[#6D60D0] text-white font-semibold text-xs px-5 py-2 rounded-lg shadow-md shadow-[#7C6FE0]/15 hover:shadow-lg hover:shadow-[#7C6FE0]/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer border border-[#7C6FE0]/20"
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
                        <IconPlayerPlay size={14} className="fill-current" />
                        Run Optimization
                      </>
                    )}
                  </motion.button>
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
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex-grow bg-[#0F0F15]/95 backdrop-blur-md border border-[#232333]/85 rounded-xl p-6 flex flex-col justify-center space-y-6 shadow-2xl relative overflow-hidden"
                    >
                      {/* Embedded design glow detail */}
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#7C6FE0]/3 blur-3xl pointer-events-none" />

                      <div className="max-w-md mx-auto w-full space-y-5">
                        <div className="text-center pb-2 border-b border-[#232333]/80 mb-4">
                          <h4 className="text-base font-semibold text-slate-200">Processing Query Optimization Job</h4>
                          <p className="text-xs text-text-muted font-mono mt-0.5">Streaming pipeline feedback via SSE</p>
                        </div>

                        <div className="space-y-4">
                          {stepMeta.map((step, idx) => {
                            const status = jobSteps[step.key as keyof typeof jobSteps];
                            const isActive = status === 'active';
                            const isComplete = status === 'complete';

                            return (
                              <motion.div
                                key={step.key}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.08 }}
                                className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${isActive
                                    ? 'bg-[#7C6FE0]/5 border-[#7C6FE0]/35 shadow-lg shadow-[#7C6FE0]/3'
                                    : isComplete
                                      ? 'bg-emerald-500/5 border-emerald-500/25 opacity-80'
                                      : 'bg-[#0B0B10]/70 border-transparent opacity-40'
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
                                <span className={`text-sm font-medium ${isActive ? 'text-[#7C6FE0]' : isComplete ? 'text-slate-350' : 'text-slate-500'
                                  }`}>
                                  {step.label}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>

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
                            className={`flex items-start justify-between p-3.5 bg-[#0A0A0F] border border-[#232333] rounded-xl text-sm transition-colors cursor-pointer ${item.eligible ? 'hover:border-[#7C6FE0]/30' : 'opacity-65'
                              }`}
                          >
                            <div className="space-y-1.5 truncate max-w-[70%]">
                              <code className="block font-mono text-xs text-slate-350 truncate">
                                {item.query.substring(0, 100)}
                              </code>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-md font-mono uppercase font-bold ${item.severity === 'danger' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
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
                        <div className="bg-[#0A0A0F]/70 border border-[#232333]/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:border-[#7C6FE0]/30 transition-all duration-300">
                          <div className="text-xs text-text-muted font-mono uppercase font-semibold">Base Exec Time</div>
                          <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                            {analysisData.original_exec_time_ms ? `${analysisData.original_exec_time_ms.toFixed(2)} ms` : 'N/A'}
                          </div>
                        </div>

                        {/* Card 2: Optimized Time */}
                        <div className="bg-[#0A0A0F]/70 border border-[#232333]/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:border-[#7C6FE0]/30 transition-all duration-300">
                          <div className="text-xs text-text-muted font-mono uppercase font-semibold">Opt Exec Time</div>
                          <div className={`text-lg font-bold font-mono mt-1 ${analysisData.improvement_pct > 0 ? 'text-emerald-400' : 'text-slate-200'
                            }`}>
                            {analysisData.optimized_exec_time_ms ? `${analysisData.optimized_exec_time_ms.toFixed(2)} ms` : 'N/A'}
                          </div>
                        </div>

                        {/* Card 3: Improvement % */}
                        <div className="bg-[#0A0A0F]/70 border border-[#232333]/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:border-[#7C6FE0]/30 transition-all duration-300">
                          <div className="text-xs text-text-muted font-mono uppercase font-semibold">Improvement</div>
                          <div className={`text-lg font-bold font-mono mt-1 ${analysisData.improvement_pct > 0 ? 'text-emerald-400' : 'text-slate-400'
                            }`}>
                            {analysisData.improvement_pct > 0 ? `+${analysisData.improvement_pct.toFixed(0)}%` : '0%'}
                          </div>
                        </div>

                        {/* Card 4: Issues Count */}
                        <div className="bg-[#0A0A0F]/70 border border-[#232333]/80 backdrop-blur-sm p-4 rounded-xl shadow-md hover:border-[#7C6FE0]/30 transition-all duration-300">
                          <div className="text-xs text-text-muted font-mono uppercase font-semibold">Issues Found</div>
                          <div className={`text-lg font-bold font-mono mt-1 ${analysisData.issues?.length > 0 ? 'text-amber-450' : 'text-slate-200'
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
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="flex-grow bg-[#0A0A0F]/60 backdrop-blur-md border border-[#232333]/85 hover:border-[#7C6FE0]/30 transition-all duration-350 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-5 shadow-xl relative overflow-hidden group min-h-[360px]"
                    >
                      {/* Ambient radial accent inside empty state */}
                      <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-[#7C6FE0]/6 blur-2xl group-hover:bg-[#7C6FE0]/12 transition-all duration-750 pointer-events-none" />
                      <div className="absolute -left-16 -bottom-16 w-32 h-32 rounded-full bg-[#AD9EE0]/4 blur-2xl group-hover:bg-[#AD9EE0]/8 transition-all duration-750 pointer-events-none" />

                      <div className="p-4 bg-[#111118]/80 border border-[#232333]/80 rounded-2xl text-slate-400 shadow-lg shadow-[#7C6FE0]/5 transition-transform duration-500 group-hover:scale-105">
                        <IconLayout className="w-11 h-11 text-[#7C6FE0]" />
                      </div>
                      <div className="max-w-sm space-y-2 z-10 font-sans">
                        <h3 className="text-base font-semibold text-slate-200">Analyze your first query</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                          Input your database connection credentials on the left, add a SQL SELECT query in the editor, and click <strong className="text-slate-350">Run Optimization</strong>.
                        </p>
                      </div>
                    </motion.div>

                  )}
                </div>
              </div>

            </motion.div>
          </div>

        </main>
      </div>

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
