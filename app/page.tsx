"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  motion, 
  AnimatePresence, 
  useScroll, 
  useTransform, 
  useInView,
  useReducedMotion,
  useMotionValue,
  useSpring
} from 'framer-motion';
import { 
  IconCpu, 
  IconBrain, 
  IconCode, 
  IconGitPullRequest, 
  IconMenu2, 
  IconX, 
  IconBrandGoogle, 
  IconArrowRight, 
  IconLock, 
  IconTrendingUp, 
  IconChevronRight,
  IconBrandGithub
} from '@tabler/icons-react';
import Link from 'next/link';

// Background drifting gradient mesh blob
function DriftingMesh() {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#7C6FE0]/5 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#AD9EE0]/3 blur-[120px]" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div 
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -60, 80, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-[#7C6FE0]/6 blur-[140px]"
      />
      <motion.div 
        animate={{
          x: [0, -80, 60, 0],
          y: [0, 80, -60, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#AD9EE0]/4 blur-[120px]"
      />
    </div>
  );
}

// Smooth hardware-accelerated radial spotlight tracking the cursor
function MouseSpotlight() {
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);
  const shouldReduceMotion = useReducedMotion();

  // Smooth the mouse movement using subtle spring physics
  const springX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 20 });

  useEffect(() => {
    if (shouldReduceMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 250); // Offset by half the width of the spotlight (500px)
      mouseY.set(e.clientY - 250); // Offset by half the height of the spotlight (500px)
    };

    const handleMouseLeave = () => {
      mouseX.set(-1000);
      mouseY.set(-1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mouseX, mouseY, shouldReduceMotion]);

  if (shouldReduceMotion) return null;

  return (
    <motion.div
      style={{
        x: springX,
        y: springY,
      }}
      className="absolute w-[500px] h-[500px] rounded-full pointer-events-none z-0 bg-[radial-gradient(circle_at_center,rgba(124,111,224,0.25)_0%,rgba(124,111,224,0)_70%)] mix-blend-screen"
    />
  );
}

// Stats number counter animation on scroll into view
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setCount(value);
      return;
    }

    if (isInView) {
      let startTime: number | null = null;
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        setCount(Math.floor(progress * value));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [isInView, value, duration, shouldReduceMotion]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

// Interactive dynamic visualizer showing how database query optimization works
function TuningSimulator() {
  const [step, setStep] = useState(0); // 0: Slow Query, 1: Simulating Index, 2: Optimized Plan
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, [shouldReduceMotion]);

  const rawSql = `SELECT * FROM orders\nWHERE status = 'pending'\nORDER BY created_at DESC;`;
  const indexSql = `CREATE INDEX idx_orders_status_created\nON orders (status, created_at DESC);`;

  function highlightSQL(sql: string) {
    return sql.split('\n').map((line, i) => {
      const parts = line.split(/(\s+)/);
      return (
        <div key={i} className="font-mono text-[12px] leading-relaxed text-slate-350 select-none py-0.5">
          {parts.map((part, j) => {
            const trimmed = part.trim();
            if (/^(SELECT|FROM|WHERE|JOIN|ON|ORDER\s+BY|CREATE\s+INDEX|CREATE|INDEX|CONCURRENTLY|DESC|AND)$/i.test(trimmed)) {
              return <span key={j} className="text-[#a5b4fc] font-bold">{part}</span>;
            }
            if (/^'[^']*'$/.test(trimmed) || /^(orders|users)$/.test(trimmed)) {
              return <span key={j} className="text-[#818cf8]">{part}</span>;
            }
            if (/^(idx_orders_status_created|status)$/.test(trimmed)) {
              return <span key={j} className="text-emerald-400 font-semibold">{part}</span>;
            }
            return <span key={j}>{part}</span>;
          })}
        </div>
      );
    });
  }

  return (
    <div className="w-full bg-[#0F0F15]/95 border border-[#232333]/85 hover:border-[#7C6FE0]/30 rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 flex flex-col select-none">
      {/* simulated IDE header */}
      <div className="h-12 border-b border-[#232333] bg-[#0A0A0F] px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          <span className="text-xs font-mono text-[#62627A] ml-2">live_optimizer.sql</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono bg-[#13131A] px-2.5 py-1 rounded text-[#7C6FE0] border border-[#7C6FE0]/15">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7C6FE0] animate-pulse" />
          <span>HypoPG Sandbox</span>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col space-y-4">
        {/* Panel 1: SQL Code Box */}
        <div className="bg-[#050508] border border-[#1C1C24] rounded-xl p-5 relative overflow-hidden min-h-[175px] flex flex-col justify-center transition-all duration-300">
          <div className="absolute top-3 right-4 text-[9px] font-mono text-[#4A4A5E] tracking-wider select-none">SQL EDITOR</div>
          <div className="space-y-1 font-mono">
            {step === 0 && highlightSQL(rawSql)}
            {step === 1 && (
              <div className="space-y-2.5">
                <div className="opacity-40 transition-opacity duration-300">{highlightSQL(rawSql)}</div>
                <div className="border-t border-[#1C1C24]/60 pt-2.5">
                  <div className="text-[10px] text-[#7C6FE0] font-bold mb-1 font-mono tracking-wider">RECOMMENDING INDEX:</div>
                  <div className="animate-pulse">{highlightSQL(indexSql)}</div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-2.5">
                <div>{highlightSQL(rawSql)}</div>
                <div className="text-[10px] text-emerald-400 font-mono bg-emerald-950/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Verified: Query planner is using Index Scan
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Live Metrics */}
        <div className="grid grid-cols-3 gap-3.5">
          
          {/* Card A: Execution Time */}
          <div className="bg-[#13131A]/60 border border-[#232333] p-4 rounded-xl flex flex-col justify-between h-[92px] transition-all duration-300 hover:border-[#7C6FE0]/25">
            <span className="text-[10px] font-mono text-[#62627A] tracking-wider font-semibold">EXECUTION TIME</span>
            <div className="font-bold text-base sm:text-lg select-none flex items-baseline gap-1 mt-2">
              {step === 0 && <span className="text-red-400 font-mono">142 ms</span>}
              {step === 1 && (
                <span className="text-[#7C6FE0] animate-pulse text-xs font-mono">Calculating...</span>
              )}
              {step === 2 && (
                <div className="flex flex-col xl:flex-row xl:items-baseline xl:gap-1.5">
                  <span className="text-emerald-400 font-mono">0.6 ms</span>
                  <span className="text-[9px] text-emerald-500 font-semibold font-mono">(-99%)</span>
                </div>
              )}
            </div>
          </div>

          {/* Card B: Query Cost */}
          <div className="bg-[#13131A]/60 border border-[#232333] p-4 rounded-xl flex flex-col justify-between h-[92px] transition-all duration-300 hover:border-[#7C6FE0]/25">
            <span className="text-[10px] font-mono text-[#62627A] tracking-wider font-semibold">PLAN COST</span>
            <div className="flex flex-col gap-2 mt-2">
              <div className="font-bold text-base sm:text-lg select-none font-mono">
                {step === 0 && <span className="text-red-400">8,420</span>}
                {step === 1 && (
                  <span className="text-[#7C6FE0] animate-pulse text-xs">Simulating...</span>
                )}
                {step === 2 && (
                  <span className="text-emerald-400">42</span>
                )}
              </div>
              <div className="w-full bg-[#232333] h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${step === 0 ? 'bg-red-500' : step === 1 ? 'bg-[#7C6FE0]' : 'bg-emerald-500'}`}
                  initial={{ width: "100%" }}
                  animate={{ 
                    width: step === 0 ? "100%" : step === 1 ? "60%" : "1.5%" 
                  }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </div>
            </div>
          </div>

          {/* Card C: Plan Operation */}
          <div className="bg-[#13131A]/60 border border-[#232333] p-4 rounded-xl flex flex-col justify-between h-[92px] transition-all duration-300 hover:border-[#7C6FE0]/25">
            <span className="text-[10px] font-mono text-[#62627A] tracking-wider font-semibold">SCAN TYPE</span>
            <div className="flex items-center gap-1 font-bold text-sm select-none mt-2">
              {step === 0 && (
                <>
                  <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-red-400 font-mono text-[11px] sm:text-xs">Seq Scan</span>
                </>
              )}
              {step === 1 && (
                <>
                  <svg className="w-3.5 h-3.5 text-[#7C6FE0] animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-[#7C6FE0] font-mono text-[11px] sm:text-xs">Tuning...</span>
                </>
              )}
              {step === 2 && (
                <>
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400 font-mono text-[11px] sm:text-xs">Index Scan</span>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // Scroll parallax for app screenshot
  const screenshotRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: screenshotRef,
    offset: ["start end", "end start"]
  });
  const screenshotY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  // Auth States
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Scrolled state for Header
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Monitor scroll to trigger navbar blur transition
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);

    // Sync Auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
          },
        });
        if (error) throw error;
        setAuthSuccess('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setAuthModalOpen(false);
        router.push('/app');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/app`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(err.message || 'OAuth initialization failed');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleGetStarted = () => {
    if (user) {
      router.push('/app');
    } else {
      setAuthMode('signin');
      setAuthModalOpen(true);
    }
  };

  // Stagger configurations
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12
      }
    }
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  } as const;

  const titleContainerVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      }
    }
  } as const;

  const titleWordVariants = {
    hidden: { 
      opacity: 0, 
      y: shouldReduceMotion ? 0 : 20 
    },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 16
      }
    }
  } as const;

  return (
    <div className="min-h-screen bg-[#09090D] text-slate-100 selection:bg-[#7C6FE0]/30 relative overflow-x-hidden font-sans">
      <DriftingMesh />
      <MouseSpotlight />

      {/* 1. STICKY NAVBAR */}
      <motion.nav 
        animate={{ 
          height: isScrolled ? "64px" : "80px",
          backgroundColor: isScrolled ? "rgba(9, 9, 13, 0.55)" : "rgba(9, 9, 13, 0)",
          backdropFilter: isScrolled ? "blur(20px)" : "blur(0px)",
          borderBottomColor: isScrolled ? "rgba(124, 111, 224, 0.15)" : "rgba(124, 111, 224, 0)"
        }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="fixed top-0 left-0 right-0 border-b z-50 flex items-center justify-between px-6 md:px-12 select-none"
      >
        <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src="/querion-logo.png" alt="Querion Logo" className="h-11 w-auto object-contain" />
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com/Tejas-h-blitz/Querion"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#13131A]/70 hover:bg-[#1C1C24] text-slate-350 hover:text-white border border-[#232333] hover:border-[#7C6FE0]/40 transition-all active:scale-95 cursor-pointer shadow-md"
            title="GitHub Repository"
          >
            <IconBrandGithub size={20} />
          </a>
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-[#7C6FE0] to-[#AD9EE0] hover:opacity-90 active:scale-95 transition-all cursor-pointer text-white font-bold text-sm shadow-md shadow-[#7C6FE0]/15"
              >
                {user.email?.substring(0, 2).toUpperCase()}
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-[#0F0F15] border border-[#232333] rounded-xl shadow-xl py-1.5 z-50 font-sans"
                  >
                    <div className="px-3 py-2 border-b border-[#232333] text-[10px] text-[#62627A] font-mono truncate">
                      Logged in as:
                      <div className="text-slate-300 font-semibold text-xs mt-0.5 truncate">{user.email}</div>
                    </div>
                    <Link href="/app" className="block px-3 py-2 text-xs text-slate-350 hover:bg-[#181825] hover:text-white transition-colors">
                      Go to Workspace
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left block px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors border-t border-[#232333] cursor-pointer"
                    >
                      Log out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <button 
                onClick={() => { setAuthMode('signin'); setAuthModalOpen(true); }}
                className="bg-[#6355C7] hover:bg-[#7C6FE0] text-slate-100 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-[#7C6FE0]/10 hover:shadow-[#7C6FE0]/20 active:scale-95 cursor-pointer border border-[#7C6FE0]/15"
              >
                Log in
              </button>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button className="md:hidden text-slate-200 cursor-pointer" onClick={() => setMobileMenuOpen(true)}>
          <IconMenu2 size={24} />
        </button>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-[#09090D] z-50 p-6 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-[#232333] pb-4">
              <div className="flex items-center">
              <img src="/querion-logo.png" alt="Querion Logo" className="h-11 w-auto object-contain" />
            </div>
              <button className="text-slate-200 cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                <IconX size={24} />
              </button>
            </div>



            <div className="flex flex-col gap-3">
              {user ? (
                <>
                  <Link href="/app" className="w-full bg-[#13131A] text-slate-200 border border-[#232333] text-center font-bold py-3 rounded-xl block">
                    Go to Workspace
                  </Link>
                  <button onClick={handleLogout} className="w-full bg-red-500/10 text-red-400 font-bold py-3 rounded-xl border border-red-500/20 cursor-pointer">
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); setAuthMode('signin'); setAuthModalOpen(true); }}
                    className="w-full bg-[#6355C7] hover:bg-[#7C6FE0] text-slate-100 font-bold py-3 rounded-xl cursor-pointer border border-[#7C6FE0]/15 transition-all shadow-md shadow-[#7C6FE0]/10 hover:shadow-[#7C6FE0]/20"
                  >
                    Log in
                  </button>
                </>
              )}
              <a
                href="https://github.com/Tejas-h-blitz/Querion"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#13131A] text-slate-200 border border-[#232333] text-center font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-[#1C1C24]"
              >
                <IconBrandGithub size={18} />
                GitHub Repository
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <header className="relative min-h-screen pt-32 lg:pt-0 flex items-center justify-center px-6 md:px-12 xl:px-24 overflow-hidden z-10">
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center py-20 lg:py-0">
          
          {/* Left Column - Content */}
          <motion.div 
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 z-10"
          >
            <motion.h1 
              variants={titleContainerVariants}
              className="text-3xl sm:text-5xl lg:text-[34px] xl:text-[44px] 2xl:text-5xl font-extrabold tracking-tight leading-[1.25] lg:leading-[1.15] font-sans select-none"
            >
              <span className="block overflow-hidden pt-1 pb-1">
                <span className="block whitespace-nowrap">
                  {"PostgreSQL query tuning,".split(" ").map((word, idx) => (
                    <motion.span
                      key={idx}
                      variants={titleWordVariants}
                      className="inline-block mr-[0.15em] bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] bg-clip-text text-transparent pb-1 pr-2"
                    >
                      {word}
                    </motion.span>
                  ))}
                </span>
              </span>
              <span className="block overflow-hidden pt-1 pb-2 mt-1">
                <span className="relative inline-block whitespace-nowrap">
                  {"planner verified.".split(" ").map((word, idx) => (
                    <motion.span
                      key={idx}
                      variants={titleWordVariants}
                      className="inline-block mr-[0.15em] bg-gradient-to-r from-[#e2e8f0] via-[#a5b4fc] to-[#818cf8] bg-clip-text text-transparent font-extrabold pb-1 pr-2"
                    >
                      {word}
                    </motion.span>
                  ))}
                  <svg className="absolute bottom-[-10px] md:bottom-[-12px] left-0 w-full h-[8px] overflow-visible pointer-events-none" viewBox="0 0 100 10" preserveAspectRatio="none">
                    {/* Blur Glow Layer */}
                    <motion.path
                      d="M 0,5 L 100,5"
                      stroke="#818cf8"
                      strokeWidth="6"
                      strokeLinecap="round"
                      className="blur-[3px] opacity-35"
                      initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.8, duration: 1.4, ease: "easeOut" }}
                    />
                    {/* Sharp Main Layer */}
                    <motion.path
                      d="M 0,5 L 100,5"
                      stroke="url(#underline-gradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.7, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <defs>
                      <linearGradient id="underline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="60%" stopColor="#a5b4fc" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#a5b4fc" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-sm md:text-base xl:text-lg text-[#62627A] max-w-lg leading-relaxed font-medium mx-auto lg:mx-0"
            >
              Simulate index impact with HypoPG, run sandboxed query plans, and catch performance regressions before production.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2 w-full"
            >
              <motion.button 
                onClick={handleGetStarted}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group w-full sm:w-auto bg-[#6355C7] hover:bg-[#7C6FE0] text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-[#7C6FE0]/15 hover:shadow-xl hover:shadow-[#7C6FE0]/30 flex items-center justify-center gap-2 cursor-pointer border border-[#7C6FE0]/20 duration-200"
              >
                Get started free
                <IconArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>
              
              <motion.button
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group w-full sm:w-auto bg-[#13131A]/60 hover:bg-[#1C1C24]/85 text-[#A1A1B5] hover:text-white font-bold text-sm px-8 py-3.5 rounded-xl border border-[#232333] hover:border-[#7C6FE0]/40 transition-all flex items-center justify-center gap-2 cursor-pointer duration-200 active:scale-[0.98] shadow-md"
              >
                See how it works
                <IconChevronRight size={16} className="text-[#A1A1B5] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-200" />
              </motion.button>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-[#62627A] text-xs font-mono select-none w-full"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Validated by HypoPG</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  <AnimatedCounter value={12480} />+ Queries Fixed
                </span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Tuning Simulator */}
          <div className="lg:col-span-6 w-full flex justify-center z-10">
            <div className="relative w-full max-w-[560px] lg:max-w-none group">
              {/* Glowing gradient backdrops */}
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-[#7C6FE0]/20 to-[#AD9EE0]/10 opacity-30 blur-3xl group-hover:opacity-40 transition duration-700 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] bg-[#6355C7]/8 rounded-full blur-[80px] pointer-events-none" />
              
              <motion.div
                ref={screenshotRef}
                style={{ y: shouldReduceMotion ? 0 : screenshotY }}
                initial={{ opacity: 0, scale: 0.96, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                whileHover={{ y: -3 }}
                className="w-full"
              >
                <TuningSimulator />
              </motion.div>
            </div>
          </div>
          
        </div>
      </header>

      {/* 3. FEATURES SECTION */}
      <section 
        id="features" 
        className="py-24 px-6 md:px-12 relative overflow-hidden z-10"
        style={{
          backgroundImage: `
            radial-gradient(circle at center, rgba(124, 111, 224, 0.12) 0%, transparent 60%),
            linear-gradient(to right, rgba(124, 111, 224, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(124, 111, 224, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
        }}
      >
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#232333]/80 to-transparent" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center space-y-4 mb-16">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent pb-3 pt-1 px-1">
              Built for engineers who read query plans.
            </h3>
            <p className="text-sm text-text-muted max-w-xl mx-auto">Get deep visual planner insights, index verification and safety validation out of the box.</p>
          </div>

        <motion.div 
          variants={listVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Card 1: HypoPG */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4, borderColor: "rgba(124, 111, 224, 0.45)", boxShadow: "0 10px 30px -10px rgba(124, 111, 224, 0.15)" }}
            className="bg-[#0F0F15] border border-[#232333] p-8 rounded-2xl transition-all duration-300 flex flex-col justify-between hover:shadow-2xl relative overflow-hidden group cursor-default"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-[#7C6FE0] mb-5">
                <IconCpu size={20} />
              </div>
              <h4 className="font-bold text-lg text-slate-200 mb-2">Hypothetical index simulation</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                Recommendations are validated against PostgreSQL's real query planner using `hypopg` — not just AI guesses. Inspect the actual cost estimate savings before you run a single migrations line.
              </p>
            </div>
          </motion.div>

          {/* Card 2: Visual EXPLAIN */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4, borderColor: "rgba(124, 111, 224, 0.45)", boxShadow: "0 10px 30px -10px rgba(124, 111, 224, 0.15)" }}
            className="bg-[#0F0F15] border border-[#232333] p-8 rounded-2xl transition-all duration-300 flex flex-col justify-between hover:shadow-2xl relative overflow-hidden group cursor-default"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#7C6FE0]/10 border border-[#7C6FE0]/25 flex items-center justify-center text-[#7C6FE0] mb-5">
                <IconBrain size={20} />
              </div>
              <h4 className="font-bold text-lg text-slate-200 mb-2">Visual EXPLAIN plans</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                Every query plan rendered as an interactive tree. Spot sequential scans, expensive joins, and planning bottlenecks at a glance instead of parsing thousands of raw JSON lines.
              </p>
            </div>
          </motion.div>

          {/* Card 3: Regression Tracking */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4, borderColor: "rgba(124, 111, 224, 0.45)", boxShadow: "0 10px 30px -10px rgba(124, 111, 224, 0.15)" }}
            className="bg-[#0F0F15] border border-[#232333] p-8 rounded-2xl transition-all duration-300 flex flex-col justify-between hover:shadow-2xl relative overflow-hidden group cursor-default"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-5">
                <IconTrendingUp size={20} />
              </div>
              <h4 className="font-bold text-lg text-slate-200 mb-2">Regression tracking</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                Querion remembers every query fingerprint and its execution history, so you catch performance regressions from schema drift or table size growth before they hit production.
              </p>
            </div>
          </motion.div>

          {/* Card 4: CI Integrated Checks */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4, borderColor: "rgba(124, 111, 224, 0.45)", boxShadow: "0 10px 30px -10px rgba(124, 111, 224, 0.15)" }}
            className="bg-[#0F0F15] border border-[#232333] p-8 rounded-2xl transition-all duration-300 flex flex-col justify-between hover:shadow-2xl relative overflow-hidden group cursor-default"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-5">
                <IconGitPullRequest size={20} />
              </div>
              <h4 className="font-bold text-lg text-slate-200 mb-2">CI-integrated checks</h4>
              <p className="text-sm text-text-muted leading-relaxed">
                A GitHub Action that comments directly on pull requests when a query plan regresses. Catch slow SQL queries in code review, not in an incident Slack channel.
              </p>
            </div>
          </motion.div>
        </motion.div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section 
        id="how-it-works" 
        className="py-24 border-t border-[#232333]/50 relative z-10 px-6 overflow-hidden bg-[#09090D]"
        style={{
          backgroundImage: `radial-gradient(circle at center, rgba(124, 111, 224, 0.035) 0%, transparent 70%)`
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h3 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent pb-3 pt-1 px-1">
              Three steps to optimal database query performance.
            </h3>
          </div>

          <div className="relative space-y-12">
            {/* Connecting Vertical Line (centered exactly behind the w-8 circles) */}
            <div className="absolute left-[16px] top-4 bottom-4 w-[1px] bg-[#232333] z-0 pointer-events-none" />
            
            {/* Step 1 */}
            <div className="relative pl-14 group cursor-default">
              <div className="absolute top-0.5 left-0 w-8 h-8 rounded-full bg-[#13131A] border border-[#232333] group-hover:border-[#7C6FE0] group-hover:bg-[#7C6FE0] group-hover:text-white flex items-center justify-center text-sm font-bold text-slate-400 shadow-md group-hover:shadow-[#7C6FE0]/25 transition-all duration-300 z-10 font-mono">
                1
              </div>
              <div className="transition-transform duration-300 ease-out origin-left group-hover:scale-[1.015]">
                <h4 className="font-bold text-xl text-slate-200 mb-1.5 group-hover:text-[#7C6FE0] transition-colors duration-300">Paste your query</h4>
                <p className="text-[15px] text-[#8C8CA5] leading-relaxed max-w-2xl transition-colors duration-300 group-hover:text-slate-300">
                  Add your slow SQL query into the Monaco SQL input editor. Querion validates its structure and sanitizes it immediately using an offline AST safety parser.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative pl-14 group cursor-default">
              <div className="absolute top-0.5 left-0 w-8 h-8 rounded-full bg-[#13131A] border border-[#232333] group-hover:border-[#7C6FE0] group-hover:bg-[#7C6FE0] group-hover:text-white flex items-center justify-center text-sm font-bold text-slate-400 shadow-md group-hover:shadow-[#7C6FE0]/25 transition-all duration-300 z-10 font-mono">
                2
              </div>
              <div className="transition-transform duration-300 ease-out origin-left group-hover:scale-[1.015]">
                <h4 className="font-bold text-xl text-slate-200 mb-1.5 group-hover:text-[#7C6FE0] transition-colors duration-300">Run Sandbox & AI Optimizer</h4>
                <p className="text-[15px] text-[#8C8CA5] leading-relaxed max-w-2xl transition-colors duration-300 group-hover:text-slate-300">
                  We trigger a dynamic read-only EXPLAIN plan against your database connection within a safe, auto-rolled-back transaction block, streaming step status back to you in real-time.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative pl-14 group cursor-default">
              <div className="absolute top-0.5 left-0 w-8 h-8 rounded-full bg-[#13131A] border border-[#232333] group-hover:border-[#7C6FE0] group-hover:bg-[#7C6FE0] group-hover:text-white flex items-center justify-center text-sm font-bold text-slate-400 shadow-md group-hover:shadow-[#7C6FE0]/25 transition-all duration-300 z-10 font-mono">
                3
              </div>
              <div className="transition-transform duration-300 ease-out origin-left group-hover:scale-[1.015]">
                <h4 className="font-bold text-xl text-slate-200 mb-1.5 group-hover:text-[#7C6FE0] transition-colors duration-300">Get Validated Improvements</h4>
                <p className="text-[15px] text-[#8C8CA5] leading-relaxed max-w-2xl transition-colors duration-300 group-hover:text-slate-300">
                  Verify index suggestions using our integrated `hypopg` validation tool to verify plan improvements. Review side-by-side SQL diffs and bottleneck ratings.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FINAL CTA SECTION */}
      <section className="py-24 px-6 md:px-12 relative z-10">
        <div className="max-w-4xl mx-auto relative overflow-hidden bg-[#0A0A0F]/70 border border-[#232333] hover:border-[#7C6FE0]/30 hover:shadow-2xl hover:shadow-[#7C6FE0]/15 rounded-3xl p-12 md:p-16 text-center transition-all duration-500 group/card cursor-pointer">
          {/* Subtle background glow inside the card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-[#7C6FE0]/6 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <h3 className="text-4xl md:text-6xl font-bold tracking-tight md:tracking-tighter leading-[1.15] md:leading-[1.1] font-sans mx-auto max-w-3xl select-none">
              <span className="block bg-gradient-to-b from-white via-[#f1f5f9] to-[#cbd5e1] bg-clip-text text-transparent pb-1 md:pb-2">
                Stop guessing why your
              </span>
              <span className="block mt-1 bg-gradient-to-r from-[#e2e8f0] via-[#a5b4fc] to-[#818cf8] bg-clip-text text-transparent font-extrabold pb-2">
                SQL queries are slow.
              </span>
            </h3>
            <p className="text-sm text-text-muted max-w-lg mx-auto leading-relaxed">
              Validate index recommendations, audit explain execution paths, and secure your database optimization loops today.
            </p>
            <div className="pt-4">
              <motion.button 
                onClick={handleGetStarted}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 bg-[#6355C7] hover:bg-[#7C6FE0] text-white font-bold text-sm px-10 py-4 rounded-xl transition-all shadow-xl shadow-[#7C6FE0]/20 hover:shadow-2xl hover:shadow-[#7C6FE0]/35 cursor-pointer border border-[#7C6FE0]/20 duration-200"
              >
                Get started for free
                <IconArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="py-12 border-t border-[#232333]/40 bg-[#07070A] px-6 md:px-12 z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 select-none text-[#62627A]">
          {/* Logo & Tagline */}
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="flex items-center hover:opacity-80 transition-opacity duration-300 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img src="/querion-logo.png" alt="Querion Logo" className="h-10 w-auto object-contain" />
            </div>
            <span className="hidden md:inline text-[#232333]/40">|</span>
            <span className="text-[13px] font-medium tracking-wide text-slate-400">
              Sandboxed query plan analyzer and HypoPG index recommender for PostgreSQL.
            </span>
          </div>

          {/* Copyright */}
          <div className="text-[13px] font-medium tracking-wide text-slate-400">
            &copy; {new Date().getFullYear()} Querion. All rights reserved.
          </div>
        </div>
      </footer>

      {/* 7. AUTH MODAL OVERLAY */}
      <AnimatePresence>
        {authModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glass background */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setAuthModalOpen(false)}
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="w-full max-w-md bg-[#0F0F15] border border-[#232333] rounded-2xl shadow-2xl p-8 relative z-10 space-y-5"
            >
              <button 
                onClick={() => setAuthModalOpen(false)}
                className="absolute top-4 right-4 text-[#62627A] hover:text-white transition-colors cursor-pointer"
              >
                <IconX size={20} />
              </button>

              <div className="text-center">
                <div className="flex justify-center items-center mb-3">
                  <img src="/querion-logo.png" alt="Querion Logo" className="h-12 w-auto object-contain" />
                </div>
                <h3 className="text-base font-bold text-slate-200">
                  {authMode === 'signup' ? 'Create an account' : 'Welcome back'}
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-normal">
                  {authMode === 'signup' ? 'Gain full access to query explain sandboxes' : 'Sign in to access your saved database connections'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {authError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl leading-relaxed">
                    {authError}
                  </div>
                )}
                {authSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl leading-relaxed">
                    {authSuccess}
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
                  disabled={authLoading}
                  className="w-full bg-[#7C6FE0] hover:bg-[#6D60D0] text-white font-bold text-sm py-3 rounded-xl transition-all shadow-md shadow-[#7C6FE0]/15 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : authMode === 'signup' ? (
                    'Sign Up'
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="relative flex py-1 items-center select-none">
                <div className="flex-grow border-t border-[#232333]"></div>
                <span className="flex-shrink mx-3 text-text-muted text-[10px] uppercase font-mono">or</span>
                <div className="flex-grow border-t border-[#232333]"></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full bg-[#13131A] hover:bg-[#181822] text-slate-350 font-semibold text-sm py-3 rounded-xl border border-[#232333] hover:border-[#7C6FE0]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <IconBrandGoogle size={18} />
                Continue with Google
              </button>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className="text-xs text-[#7C6FE0] hover:underline cursor-pointer"
                >
                  {authMode === 'signin' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
