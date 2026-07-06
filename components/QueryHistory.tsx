"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchHistory, deleteHistory, HistoryItem } from '@/lib/api';
import { Session } from '@supabase/supabase-js';
import { 
  History, Trash2, LogIn, UserPlus, LogOut, Loader2, Sparkles, 
  ArrowUp, ArrowRightLeft, ShieldAlert
} from 'lucide-react';

interface QueryHistoryProps {
  onSelectHistory: (item: HistoryItem) => void;
  activeId?: string;
  refreshTrigger: number; // Increment to force refetch
}

export default function QueryHistory({ onSelectHistory, activeId, refreshTrigger }: QueryHistoryProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Auth state inputs
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);

  // Sync session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch history when session changes or refresh is triggered
  useEffect(() => {
    if (session?.user?.id) {
      loadHistory(session.user.id);
    } else {
      setHistoryList([]);
    }
  }, [session, refreshTrigger]);

  const loadHistory = async (userId: string) => {
    setLoading(true);
    try {
      const data = await fetchHistory(userId);
      setHistoryList(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthError("Check your email for confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this query history item?")) return;
    try {
      await deleteHistory(id);
      setHistoryList(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete history item");
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-surface border border-border rounded-xl overflow-hidden shadow-xl">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-[#111118]">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm tracking-wide text-foreground">Query History</h2>
        </div>
        {session && (
          <button
            onClick={handleSignOut}
            className="text-xs text-text-muted hover:text-danger flex items-center gap-1 transition-colors bg-background/50 hover:bg-background border border-border/50 px-2 py-1 rounded"
            title="Sign Out"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        )}
      </div>

      {/* Main Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!session ? (
          /* Authentication Form */
          <div className="p-2 space-y-4">
            <div className="text-center">
              <h3 className="text-xs font-semibold text-slate-300">Sign in to save query history</h3>
              <p className="text-[10px] text-text-muted mt-0.5">Persist optimizations directly to Supabase</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-2.5">
              <div>
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs bg-background border border-border focus:border-primary/80 rounded-lg p-2.5 text-foreground placeholder-text-muted outline-none transition-all"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs bg-background border border-border focus:border-primary/80 rounded-lg p-2.5 text-foreground placeholder-text-muted outline-none transition-all"
                />
              </div>
              {authError && (
                <div className="flex gap-1.5 p-2 bg-danger/10 border border-danger/20 rounded-md text-[10px] text-danger leading-normal">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-primary hover:bg-primary-hover text-foreground font-semibold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {authLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-3 h-3" />
                    Sign Up
                  </>
                ) : (
                  <>
                    <LogIn className="w-3 h-3" />
                    Sign In
                  </>
                )}
              </button>
            </form>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                }}
                className="text-[10px] text-primary hover:underline"
              >
                {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
              </button>
            </div>
          </div>
        ) : loading ? (
          /* Loading Indicator */
          <div className="h-40 flex flex-col items-center justify-center text-text-muted gap-2 text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span>Loading history logs...</span>
          </div>
        ) : historyList.length === 0 ? (
          /* Empty State */
          <div className="h-60 flex flex-col items-center justify-center text-center p-4">
            <div className="p-3 bg-[#171725] border border-border/80 rounded-full mb-3 text-text-muted animate-bounce">
              <ArrowUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-medium text-slate-300">No queries yet.</p>
            <p className="text-[10px] text-text-muted mt-1 leading-normal">
              Run your first analysis above to persist your history.
            </p>
          </div>
        ) : (
          /* History Item List */
          <div className="space-y-2">
            {historyList.map((item) => {
              const isSelected = item.id === activeId;
              const hasImprovement = (item.improvement_pct || 0) > 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectHistory(item)}
                  className={`group relative flex flex-col justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-[#181826] border-primary/70 shadow-md shadow-primary/5' 
                      : 'bg-background/40 border-border hover:bg-background/90 hover:border-border/80'
                  }`}
                >
                  <div className="pr-6">
                    <p className="font-mono text-[10px] text-slate-300 break-all line-clamp-2 leading-relaxed">
                      {item.raw_query.substring(0, 60)}
                      {item.raw_query.length > 60 ? '...' : ''}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 text-[10px] text-text-muted">
                    <span>{formatTimestamp(item.created_at)}</span>
                    <span className={`font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                      hasImprovement ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'
                    }`}>
                      {hasImprovement && <Sparkles className="w-2.5 h-2.5" />}
                      {hasImprovement ? `+${(item.improvement_pct || 0).toFixed(0)}%` : '0%'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute top-2 right-2 p-1 text-text-muted hover:text-danger rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity bg-[#13131A] hover:bg-danger/10 border border-border/80"
                    title="Delete item"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
