'use client'

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Zap,
  Eye,
  Swords,
  ShieldCheck,
  FileText,
  ArrowRight,
  Terminal,
  Brain,
  Bug,
  Workflow,
  Server,
  Monitor,
  Cloud,
  ChevronDown,
  Github,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animated counter hook                                              */
/* ------------------------------------------------------------------ */
function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setValue(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

/* ------------------------------------------------------------------ */
/*  Pipeline node component                                            */
/* ------------------------------------------------------------------ */
const AGENTS = [
  { name: 'Triage', icon: Eye, color: '#6366f1', desc: 'Classifies input and validates Python-only payloads' },
  { name: 'Static Analysis', icon: Bug, color: '#f59e0b', desc: 'Runs Semgrep MCP scans for known vulnerability patterns' },
  { name: 'Code Review', icon: Terminal, color: '#06b6d4', desc: 'Deep LLM reasoning over code structure and logic flaws' },
  { name: 'Red Team', icon: Swords, color: '#ef4444', desc: 'Generates realistic exploit scenarios from findings' },
  { name: 'Blue Team', icon: ShieldCheck, color: '#22c55e', desc: 'Prioritizes remediation and crafts defensive fixes' },
  { name: 'Report Synthesizer', icon: FileText, color: '#8b5cf6', desc: 'Produces structured security report with CVSS scores' },
];

function PipelineViz() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % AGENTS.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex flex-col items-center gap-0">
      {AGENTS.map((agent, i) => {
        const Icon = agent.icon;
        const isActive = i === active;
        const isPast = i < active;
        return (
          <div key={agent.name} className="flex items-center gap-4 relative group">
            {/* connector line */}
            {i > 0 && (
              <div
                className="absolute left-[19px] -top-5 w-0.5 h-5 transition-colors duration-500"
                style={{ background: isPast || isActive ? agent.color : '#334155' }}
              />
            )}
            <div
              className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shrink-0"
              style={{
                borderColor: isActive || isPast ? agent.color : '#334155',
                background: isActive ? agent.color + '22' : 'transparent',
                boxShadow: isActive ? `0 0 20px ${agent.color}44` : 'none',
              }}
            >
              <Icon
                className="w-5 h-5 transition-colors duration-500"
                style={{ color: isActive || isPast ? agent.color : '#64748b' }}
              />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-semibold transition-colors duration-500"
                style={{ color: isActive ? agent.color : isPast ? '#94a3b8' : '#64748b' }}
              >
                {agent.name}
              </p>
              <p className="text-xs text-slate-500 max-w-[220px] leading-snug hidden sm:block">
                {agent.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature card                                                       */
/* ------------------------------------------------------------------ */
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 hover:border-emerald-500/40 transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
        <Icon className="w-5 h-5 text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat pill                                                          */
/* ------------------------------------------------------------------ */
function Stat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const counter = useCountUp(value);
  return (
    <div className="text-center">
      <span ref={counter.ref} className="text-4xl md:text-5xl font-bold text-white tabular-nums">
        {counter.value}{suffix}
      </span>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tech stack badge                                                   */
/* ------------------------------------------------------------------ */
function TechBadge({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-emerald-500/30 transition-colors">
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-xs text-slate-500">{sub}</span>
    </div>
  );
}

/* ================================================================== */
/*  LANDING PAGE                                                       */
/* ================================================================== */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-white overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-lg bg-[#0b0f19]/80 border-b border-slate-800/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-emerald-400" />
            <span className="text-lg font-bold tracking-tight">PyShame</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pipeline" className="hover:text-white transition-colors">Pipeline</a>
            <a href="#tech" className="hover:text-white transition-colors">Tech Stack</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Vedant-Jayesh-Oza/PyShame"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <Link
              href="/analyze"
              className="px-4 py-2 rounded-lg bg-emerald-500 text-sm font-medium text-white hover:bg-emerald-400 transition-colors"
            >
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-40 pb-28 px-6">
        {/* glow decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-emerald-500/[0.07] blur-[120px]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.05] blur-[100px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            6-Agent Security Pipeline
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.08] tracking-tight">
            Find vulnerabilities
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
              before attackers do
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            PyShame is a multi-agent AI platform that combines Semgrep static analysis with
            LLM-powered code review, red-team exploit generation, and blue-team remediation, all
            streamed in real time.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/analyze"
              className="group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
            >
              Start Analyzing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#pipeline"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-700 text-base font-medium text-slate-300 hover:border-slate-500 hover:text-white transition-all"
            >
              See How It Works
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* terminal preview */}
        <div className="relative max-w-3xl mx-auto mt-20">
          <div className="rounded-2xl border border-slate-800 bg-[#0d1117] shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-900/80 border-b border-slate-800">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="ml-3 text-xs text-slate-500 font-mono">pyshame | analysis pipeline</span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed">
              <p className="text-slate-500">$ pyshame analyze app.py</p>
              <p className="mt-3 text-emerald-400">
                <span className="text-slate-500">[1/6]</span> Triage Agent · validating Python payload...
              </p>
              <p className="text-yellow-400">
                <span className="text-slate-500">[2/6]</span> Static Analysis · running Semgrep MCP scan...
              </p>
              <p className="text-cyan-400">
                <span className="text-slate-500">[3/6]</span> Code Review · deep inspection of logic flaws...
              </p>
              <p className="text-red-400">
                <span className="text-slate-500">[4/6]</span> Red Team · generating exploit scenarios...
              </p>
              <p className="text-green-400">
                <span className="text-slate-500">[5/6]</span> Blue Team · crafting remediation plan...
              </p>
              <p className="text-violet-400">
                <span className="text-slate-500">[6/6]</span> Report Synthesizer · compiling final report...
              </p>
              <p className="mt-4 text-emerald-300">
                ✓ Analysis complete · 4 vulnerabilities found, 2 critical
              </p>
              <p className="text-slate-500 mt-1">  Report saved to ./report.json (12.4s)</p>
            </div>
          </div>
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent -z-10 blur-sm" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-6 border-y border-slate-800/60">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-16">
          <Stat value={6} label="Specialist Agents" />
          <Stat value={100} label="Semgrep Rules" suffix="+" />
          <Stat value={12} label="Avg. Analysis Time" suffix="s" />
          <Stat value={5} label="Output Sections" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-bold">Everything you need to secure Python code</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">
              From automated scanning to AI-powered exploit generation and remediation planning.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Workflow}
              title="Multi-Agent Pipeline"
              description="Six specialized agents with ordered handoffs: triage, static analysis, code review, red team, blue team, and report synthesis."
              delay={0}
            />
            <FeatureCard
              icon={Bug}
              title="Semgrep MCP Integration"
              description="Industry-grade static analysis powered by Semgrep with real-time finding cards and fallback behavior for incomplete scans."
              delay={80}
            />
            <FeatureCard
              icon={Brain}
              title="LLM-Powered Review"
              description="Deep reasoning over code structure, logic flaws, and security anti-patterns using state-of-the-art language models."
              delay={160}
            />
            <FeatureCard
              icon={Swords}
              title="Red Team Exploits"
              description="Automatic generation of realistic exploit scenarios showing exactly how each vulnerability could be weaponized."
              delay={240}
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Blue Team Remediation"
              description="Prioritized fix suggestions with diff previews and one-click apply, tailored to each vulnerability's context."
              delay={320}
            />
            <FeatureCard
              icon={Zap}
              title="Real-Time Streaming"
              description="Watch agents think live. SSE-powered streaming of thoughts, tool calls, findings, and handoffs as they happen."
              delay={400}
            />
          </div>
        </div>
      </section>

      {/* ── PIPELINE ── */}
      <section id="pipeline" className="py-28 px-6 bg-slate-900/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase mb-3">Pipeline</p>
            <h2 className="text-3xl md:text-4xl font-bold">How the analysis works</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">
              Your code flows through six specialized security agents, each handing off context to the next.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-16 justify-center">
            <PipelineViz />

            <div className="flex-1 max-w-md space-y-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-emerald-400 mb-2">Input</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Upload a <code className="text-emerald-300/80">.py</code> file, paste code, or pick
                  from sample snippets. The Monaco editor gives you full syntax highlighting.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">Processing</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Each agent runs sequentially with full context handoff. The pipeline includes
                  guardrails for prompt-injection tripwires and Python-only validation.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h3 className="text-sm font-semibold text-violet-400 mb-2">Output</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  A structured security report with summary, risk areas, detailed issues with CVSS scores,
                  exploit scenarios, and prioritized remediation checklist.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ── */}
      <section id="tech" className="py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-emerald-400 text-sm font-semibold tracking-wide uppercase mb-3">Tech Stack</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Built with modern tools</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            <div className="flex flex-col items-center gap-2 p-4">
              <Server className="w-6 h-6 text-emerald-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Backend</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <Monitor className="w-6 h-6 text-cyan-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Frontend</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 col-span-2 sm:col-span-1">
              <Cloud className="w-6 h-6 text-violet-400" />
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Infrastructure</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <TechBadge label="Python 3.12+" sub="Backend" />
            <TechBadge label="FastAPI" sub="API" />
            <TechBadge label="OpenAI Agents SDK" sub="Orchestration" />
            <TechBadge label="Semgrep MCP" sub="Static Analysis" />
            <TechBadge label="Next.js 15" sub="Frontend" />
            <TechBadge label="React 19" sub="UI" />
            <TechBadge label="Tailwind CSS" sub="Styling" />
            <TechBadge label="Monaco Editor" sub="Code Input" />
            <TechBadge label="Docker" sub="Container" />
            <TechBadge label="Terraform" sub="IaC" />
            <TechBadge label="Microsoft Azure" sub="Cloud" />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-[#0b0f19] p-12 md:p-16 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.04] to-transparent" />
            <div className="relative">
              <Shield className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to secure your code?</h2>
              <p className="text-slate-400 max-w-md mx-auto mb-8">
                Upload a Python file and let six AI agents find, exploit, and fix every vulnerability.
              </p>
              <Link
                href="/analyze"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
              >
                Launch the Analyzer
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-800/60 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Shield className="w-4 h-4" />
            <span>PyShame | Multi-Agent Security Analysis</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pipeline" className="hover:text-white transition-colors">Pipeline</a>
            <a href="#tech" className="hover:text-white transition-colors">Tech Stack</a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
