"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { IconDatabase, IconBrandGoogle, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push(redirectPath);
      }
    });
  }, [router, redirectPath]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirectPath}`,
          },
        });
        if (error) throw error;
        setSuccess('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectPath);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${redirectPath}`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'OAuth initialization failed');
    }
  };

  return (
    <div className="w-full max-w-md bg-[#0F0F15] border border-[#232333] p-8 rounded-2xl shadow-2xl space-y-6 z-10">
      <div className="flex flex-col items-center text-center">
        <Link href="/" className="flex items-center gap-2 mb-4 hover:opacity-85 transition-opacity">
          <IconDatabase size={32} className="text-[#7C6FE0]" />
          <span className="text-xl font-bold tracking-tight text-white font-mono">Querion</span>
        </Link>
        <h2 className="text-lg font-bold text-slate-200">
          {isSignUp ? 'Create your account' : 'Sign in to Querion'}
        </h2>
        <p className="text-xs text-text-muted mt-1">
          {isSignUp ? 'Get started free with AI SQL query tuning' : 'Welcome back, optimize your DB connections'}
        </p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-505/10 border border-red-500/25 text-red-400 text-xs rounded-xl leading-relaxed">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl leading-relaxed">
            {success}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Email Address</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-sm bg-background border border-[#232333] focus:border-[#7C6FE0]/80 rounded-xl p-3 text-white placeholder-text-muted outline-none transition-all"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-sm bg-background border border-[#232333] focus:border-[#7C6FE0]/80 rounded-xl p-3 text-white placeholder-text-muted outline-none transition-all"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#7C6FE0] hover:bg-[#6D60D0] text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-[#7C6FE0]/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : isSignUp ? (
            'Sign Up'
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-[#232333]"></div>
        <span className="flex-shrink mx-3 text-text-muted text-[10px] uppercase font-mono">or continue with</span>
        <div className="flex-grow border-t border-[#232333]"></div>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full bg-[#13131A] hover:bg-[#181822] text-slate-300 font-semibold text-sm py-3 rounded-xl border border-[#232333] hover:border-[#7C6FE0]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <IconBrandGoogle size={18} />
        Google
      </button>

      <div className="text-center pt-2">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setSuccess(null);
          }}
          className="text-xs text-[#7C6FE0] hover:underline"
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
        </button>
      </div>

      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-slate-300 transition-colors">
          <IconArrowLeft size={14} />
          Back to home
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#09090D] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Drifting subtle gradient mesh in background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#7C6FE0]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#7C6FE0]/3 blur-[120px] pointer-events-none" />

      <Suspense fallback={
        <div className="text-xs text-text-muted">Loading authentication form...</div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
