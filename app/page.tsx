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
  useReducedMotion
} from 'framer-motion';
import { 
  IconDatabase, 
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
  IconChevronRight 
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

  return (
    <div className="min-h-screen bg-[#09090D] text-slate-100 selection:bg-[#7C6FE0]/30 relative overflow-x-hidden font-sans">
      <DriftingMesh />

      {/* 1. STICKY NAVBAR */}
      <motion.nav 
        animate={{ 
          backgroundColor: isScrolled ? "rgba(10, 10, 15, 0.85)" : "rgba(9, 9, 13, 0)",
          backdropFilter: isScrolled ? "blur(12px)" : "blur(0px)",
          borderBottomColor: isScrolled ? "rgba(35, 35, 51, 0.5)" : "rgba(35, 35, 51, 0)"
        }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 h-16 border-b z-50 flex items-center justify-between px-6 md:px-12 select-none"
      >
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <IconDatabase className="w-7 h-7 text-[#7C6FE0]" />
          <span className="font-bold text-lg tracking-tight font-mono text-white">Querion</span>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-[#7C6FE0] to-[#AD9EE0] hover:opacity-90 active:scale-95 transition-all cursor-pointer text-white font-bold text-xs shadow-md shadow-[#7C6FE0]/15"
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
                className="text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Log in
              </button>
              <button 
                onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
                className="bg-[#7C6FE0] hover:bg-[#6D60D0] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-[#7C6FE0]/15 active:scale-95 cursor-pointer"
              >
                Get started
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
              <div className="flex items-center gap-2">
                <IconDatabase className="w-7 h-7 text-[#7C6FE0]" />
                <span className="font-bold text-lg tracking-tight font-mono text-white">Querion</span>
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
                    className="w-full bg-[#13131A] text-slate-200 border border-[#232333] font-bold py-3 rounded-xl cursor-pointer"
                  >
                    Log in
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); setAuthMode('signup'); setAuthModalOpen(true); }}
                    className="w-full bg-[#7C6FE0] text-white font-bold py-3 rounded-xl cursor-pointer"
                  >
                    Get started
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <header className="relative min-h-screen pt-28 flex flex-col items-center justify-center px-6 text-center overflow-hidden z-10">
        <motion.div 
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="max-w-4xl space-y-6"
        >
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight font-sans"
          >
            Every slow database query, <br />
            <span className="bg-gradient-to-r from-[#7C6FE0] to-[#AD9EE0] bg-clip-text text-transparent">
              explained and optimized.
            </span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-sm md:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed"
          >
            AI-powered PostgreSQL performance tuning validated against the real query planner, not just LLM guesses. Inspect cost reductions, mock indexes, and track trends.
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
          >
            <button 
              onClick={handleGetStarted}
              className="w-full sm:w-auto bg-[#7C6FE0] hover:bg-[#6D60D0] text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-[#7C6FE0]/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              Get started free
              <IconArrowRight size={16} />
            </button>
            <button 
              onClick={() => scrollToSection('features')}
              className="w-full sm:w-auto bg-[#13131A] hover:bg-[#181824] text-slate-300 font-bold text-sm px-8 py-3.5 rounded-xl border border-[#232333] hover:border-[#7C6FE0]/30 transition-all cursor-pointer"
            >
              See how it works
            </button>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="pt-6 flex flex-wrap items-center justify-center gap-6 text-[#62627A] text-xs font-mono select-none"
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

        {/* Product screenshot mockup with scroll parallax */}
        <motion.div 
          ref={screenshotRef}
          style={{ y: shouldReduceMotion ? 0 : screenshotY }}
          className="mt-14 max-w-5xl w-full bg-[#0F0F15] border border-[#232333] rounded-2xl overflow-hidden shadow-2xl relative group select-none pointer-events-none"
        >
          <div className="h-8 border-b border-[#232333] bg-[#0A0A0F] px-4 flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#232333]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#232333]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#232333]" />
            <div className="w-32 h-4 rounded bg-[#13131A] ml-4" />
          </div>
          <div className="relative">
            <img 
              src="https://jtyiwwovqbgjrsdbmkzw.supabase.co/storage/v1/object/public/assets/landing_mockup.png" 
              alt="Querion Workspace Mockup" 
              onError={(e) => {
                // If remote asset isn't ready, fallback gracefully to a mock-up design representation
                e.currentTarget.style.display = 'none';
              }}
              className="w-full object-cover" 
            />
            {/* Elegant placeholder when screenshot file is not found */}
            <div className="w-full h-80 bg-gradient-to-b from-[#0F0F15] to-[#0A0A0F] flex flex-col items-center justify-center p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-10 rounded border border-[#232333] bg-background/50 flex flex-col justify-center px-2">
                  <div className="w-8 h-1 bg-[#7C6FE0] rounded" />
                  <div className="w-10 h-1 bg-slate-700 rounded mt-1.5" />
                </div>
                <div className="w-16 h-10 rounded border border-[#232333] bg-background/50 flex flex-col justify-center px-2">
                  <div className="w-10 h-1 bg-emerald-500 rounded" />
                  <div className="w-8 h-1 bg-slate-700 rounded mt-1.5" />
                </div>
                <div className="w-16 h-10 rounded border border-[#232333] bg-background/50 flex flex-col justify-center px-2">
                  <div className="w-6 h-1 bg-warning rounded" />
                  <div className="w-10 h-1 bg-slate-700 rounded mt-1.5" />
                </div>
              </div>
              <p className="text-xs text-text-muted max-w-sm">Visual Explain trees, index validation simulation and automated diff revisions at your fingertips.</p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090D] via-transparent to-transparent" />
          </div>
        </motion.div>
      </header>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-6xl mx-auto z-10 relative">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-bold text-[#7C6FE0] uppercase tracking-widest font-mono">Performance Engine</h2>
          <h3 className="text-2xl md:text-4xl font-bold text-white">Built for engineers who read query plans</h3>
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
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 border-t border-[#232333] bg-[#0A0A0F]/50 relative z-10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-16">
            <h2 className="text-xs font-bold text-[#7C6FE0] uppercase tracking-widest font-mono">Workflow</h2>
            <h3 className="text-2xl md:text-4xl font-bold text-white">Three steps to optimal database query performance</h3>
          </div>

          <div className="relative border-l border-[#232333] ml-4 md:ml-8 pl-8 md:pl-12 space-y-12">
            
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute top-1.5 left-[-42px] md:left-[-58px] w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#7C6FE0] flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-md shadow-[#7C6FE0]/20">
                1
              </div>
              <h4 className="font-bold text-lg text-slate-200 mb-1">Paste your query</h4>
              <p className="text-sm text-text-muted leading-relaxed max-w-xl">
                Add your slow SQL query into the Monaco SQL input editor. Querion validates its structure and sanitizes it immediately using an offline AST safety parser.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute top-1.5 left-[-42px] md:left-[-58px] w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#7C6FE0] flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-md shadow-[#7C6FE0]/20">
                2
              </div>
              <h4 className="font-bold text-lg text-slate-200 mb-1">Run Sandbox & AI Optimizer</h4>
              <p className="text-sm text-text-muted leading-relaxed max-w-xl">
                We trigger a dynamic read-only EXPLAIN plan against your database connection within a safe, auto-rolled-back transaction block, streaming step status back to you in real-time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute top-1.5 left-[-42px] md:left-[-58px] w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#7C6FE0] flex items-center justify-center text-xs md:text-sm font-bold text-white shadow-md shadow-[#7C6FE0]/20">
                3
              </div>
              <h4 className="font-bold text-lg text-slate-200 mb-1">Get Validated Improvements</h4>
              <p className="text-sm text-text-muted leading-relaxed max-w-xl">
                Verify index suggestions using our integrated `hypopg` validation tool to verify plan improvements. Review side-by-side SQL diffs and bottleneck ratings.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 5. FINAL CTA SECTION */}
      <section className="py-24 border-t border-[#232333] bg-[#0A0A0F] text-center z-10 relative overflow-hidden px-6">
        <div className="absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[80vw] h-[400px] bg-[#7C6FE0]/2 blur-[130px] pointer-events-none" />
        
        <div className="max-w-2xl mx-auto space-y-6 relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
            Stop guessing why your SQL queries are slow
          </h2>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Validate index recommendations, audit explain execution paths, and secure your database optimization loops today.
          </p>
          <div className="pt-4">
            <button 
              onClick={handleGetStarted}
              className="inline-flex items-center gap-2 bg-[#7C6FE0] hover:bg-[#6D60D0] text-white font-bold text-sm px-10 py-4 rounded-xl transition-all shadow-xl shadow-[#7C6FE0]/20 hover:shadow-[#7C6FE0]/35 active:scale-95 cursor-pointer border border-[#7C6FE0]/20"
            >
              Get started for free
              <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="py-12 border-t border-[#232333] bg-[#07070A] text-center px-6 z-10 relative">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[#62627A] text-xs select-none">
          <div className="flex items-center gap-2">
            <IconDatabase className="w-5 h-5 text-[#7C6FE0]" />
            <span className="font-bold text-sm text-slate-300 font-mono">Querion</span>
          </div>

          <div>
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
                <div className="flex justify-center gap-2 items-center mb-3">
                  <IconDatabase className="w-8 h-8 text-[#7C6FE0]" />
                  <span className="font-bold text-xl tracking-tight font-mono text-white">Querion</span>
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
