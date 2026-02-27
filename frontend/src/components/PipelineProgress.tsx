'use client';

import { useEffect, useRef, useState } from 'react';
import { PipelineProgressProps, PipelineStep, SemgrepFindingEvent } from '@/types/security';
import { useElapsedTimer } from '@/hooks/useElapsedTimer';
import {
  ScanSearch,
  ShieldCheck,
  FileCode,
  Swords,
  ShieldPlus,
  FileBarChart,
  Settings,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowDown,
  ExternalLink,
  Search,
  Clock,
} from 'lucide-react';
import { type LucideIcon } from 'lucide-react';

// --- Agent theme configuration ---

interface AgentTheme {
  icon: LucideIcon;
  shortName: string;
  roleBadge: string;
  badgeBg: string;
  badgeText: string;
  borderActive: string;
  bgActive: string;
  textActive: string;
  borderComplete: string;
  bgComplete: string;
  description: string;
}

const AGENT_THEMES: Record<string, AgentTheme> = {
  'Triage Agent': {
    icon: ScanSearch,
    shortName: 'Triage',
    roleBadge: 'Triage',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    borderActive: 'border-slate-400',
    bgActive: 'bg-slate-50',
    textActive: 'text-slate-800',
    borderComplete: 'border-slate-300',
    bgComplete: 'bg-slate-50/50',
    description: 'Classifying code type and risk areas',
  },
  'Static Analysis Agent': {
    icon: ShieldCheck,
    shortName: 'Static Analysis',
    roleBadge: 'Static Analysis',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    borderActive: 'border-purple-400',
    bgActive: 'bg-purple-50',
    textActive: 'text-purple-800',
    borderComplete: 'border-purple-300',
    bgComplete: 'bg-purple-50/50',
    description: 'Running Semgrep static analysis scan',
  },
  'Code Review Agent': {
    icon: FileCode,
    shortName: 'Code Review',
    roleBadge: 'Code Review',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    borderActive: 'border-amber-400',
    bgActive: 'bg-amber-50',
    textActive: 'text-amber-800',
    borderComplete: 'border-amber-300',
    bgComplete: 'bg-amber-50/50',
    description: 'Deep-reviewing logic vulnerabilities',
  },
  'Red Team Agent': {
    icon: Swords,
    shortName: 'Red Team',
    roleBadge: 'Red Team',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    borderActive: 'border-red-400',
    bgActive: 'bg-red-50',
    textActive: 'text-red-800',
    borderComplete: 'border-red-300',
    bgComplete: 'bg-red-50/50',
    description: 'Generating exploit scenarios',
  },
  'Blue Team Agent': {
    icon: ShieldPlus,
    shortName: 'Blue Team',
    roleBadge: 'Blue Team',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    borderActive: 'border-blue-400',
    bgActive: 'bg-blue-50',
    textActive: 'text-blue-800',
    borderComplete: 'border-blue-300',
    bgComplete: 'bg-blue-50/50',
    description: 'Building remediation strategies',
  },
  'Report Synthesizer': {
    icon: FileBarChart,
    shortName: 'Synthesizer',
    roleBadge: 'Synthesizer',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    borderActive: 'border-green-400',
    bgActive: 'bg-green-50',
    textActive: 'text-green-800',
    borderComplete: 'border-green-300',
    bgComplete: 'bg-green-50/50',
    description: 'Compiling final security report',
  },
};

const DEFAULT_THEME: AgentTheme = {
  icon: Settings,
  shortName: 'Agent',
  roleBadge: 'Agent',
  badgeBg: 'bg-gray-100',
  badgeText: 'text-gray-700',
  borderActive: 'border-gray-400',
  bgActive: 'bg-gray-50',
  textActive: 'text-gray-800',
  borderComplete: 'border-gray-300',
  bgComplete: 'bg-gray-50/50',
  description: 'Processing...',
};


function ElapsedTime({ startedAt, isRunning, elapsedMs }: {
  startedAt: number | null;
  isRunning: boolean;
  elapsedMs: number | null;
}) {
  const liveTime = useElapsedTimer(startedAt, isRunning);

  if (elapsedMs !== null) {
    const secs = (elapsedMs / 1000).toFixed(1);
    return (
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {secs}s
      </span>
    );
  }

  if (!isRunning) return null;

  return (
    <span className="text-xs text-gray-500 flex items-center gap-1">
      <Clock className="w-3 h-3" />
      {liveTime}
    </span>
  );
}


function ThoughtLog({ thoughts }: { thoughts: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  if (thoughts.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="mt-2 max-h-36 overflow-y-auto rounded bg-gray-900 p-3 font-mono text-xs text-gray-300 leading-relaxed scroll-smooth"
    >
      {thoughts.map((line, i) => (
        <span key={i} className="whitespace-pre-wrap">{line}</span>
      ))}
      <span className="inline-block w-1.5 h-3.5 bg-gray-400 animate-pulse ml-0.5 align-middle" />
    </div>
  );
}


function SemgrepPanel({ toolActivity, findings, isAgentComplete }: {
  toolActivity: string[];
  findings: SemgrepFindingEvent[];
  isAgentComplete: boolean;
}) {
  const isScanning = toolActivity.includes('semgrep_scan');
  if (!isScanning && findings.length === 0) return null;

  const categories = ['security', 'correctness', 'performance'];
  const stillScanning = isScanning && findings.length === 0 && !isAgentComplete;

  return (
    <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50/60 p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
          Semgrep
        </span>
        {stillScanning && (
          <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
        )}
        {isAgentComplete && findings.length === 0 && isScanning && (
          <Check className="w-3 h-3 text-purple-600" />
        )}
      </div>

      {stillScanning && (
        <div className="space-y-2">
          <p className="text-xs text-purple-700">Scanning with auto ruleset...</p>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat, i) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-600 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              >
                <Search className="w-2.5 h-2.5" />
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}

      {isAgentComplete && findings.length === 0 && isScanning && (
        <p className="text-xs text-purple-600">
          Semgrep scan attempted -- agent fell back to manual analysis
        </p>
      )}

      {findings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-purple-600">
            {findings.length} finding{findings.length !== 1 ? 's' : ''}
          </p>
          {findings.map((f, i) => (
            <SemgrepFinding key={i} finding={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function SemgrepFinding({ finding }: { finding: SemgrepFindingEvent }) {
  const severityColors: Record<string, string> = {
    ERROR: 'bg-red-100 text-red-700',
    WARNING: 'bg-amber-100 text-amber-700',
    INFO: 'bg-blue-100 text-blue-700',
    error: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const colorClass = severityColors[finding.severity] || 'bg-gray-100 text-gray-600';
  const ruleUrl = finding.rule_id !== 'unknown'
    ? `https://semgrep.dev/r/${finding.rule_id}`
    : null;

  return (
    <div className="flex items-start gap-2 text-xs bg-white/70 rounded p-2 border border-purple-100">
      <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium uppercase text-[10px] ${colorClass}`}>
        {finding.severity}
      </span>
      <div className="min-w-0 flex-1">
        {ruleUrl ? (
          <a
            href={ruleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-purple-700 hover:underline inline-flex items-center gap-0.5"
          >
            {finding.rule_id}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ) : (
          <span className="font-medium text-purple-700">{finding.rule_id}</span>
        )}
        {finding.message && (
          <p className="text-gray-600 mt-0.5 line-clamp-2">{finding.message}</p>
        )}
        {finding.file && finding.line ? (
          <p className="text-gray-400 mt-0.5">{finding.file}:{finding.line}</p>
        ) : null}
      </div>
    </div>
  );
}

// --- Handoff connector ---

function HandoffConnector({ summary, isAnimating }: {
  summary: string | null;
  isAnimating: boolean;
}) {
  return (
    <div className="flex flex-col items-center py-1 relative">
      <div className="relative h-8 flex items-center justify-center">
        <div className="w-px h-full bg-gray-300" />
        {isAnimating && (
          <div className="absolute w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/40 animate-handoff-packet" />
        )}
      </div>
      {isAnimating && summary && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ml-6 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-10 animate-fade-in pointer-events-none">
          {summary}
        </div>
      )}
      {!isAnimating && (
        <ArrowDown className="w-3.5 h-3.5 text-gray-300 -mt-0.5" />
      )}
    </div>
  );
}

// --- Summary helper for completed agents ---

function getCompleteSummary(step: PipelineStep, theme: AgentTheme): string {
  if (step.agent === 'Static Analysis Agent' && step.semgrepFindings.length > 0) {
    return `Found ${step.semgrepFindings.length} Semgrep finding${step.semgrepFindings.length !== 1 ? 's' : ''}. Click to expand.`;
  }
  if (step.thoughts.length > 0) {
    const full = step.thoughts.join('');
    const cleaned = full.replace(/^[\s\n]+/, '');
    const twoSentences = cleaned.match(/^[^.!?\n]+[.!?](?:\s+[^.!?\n]+[.!?])?/)?.[0] ?? cleaned.slice(0, 150);
    return twoSentences.trim() + (cleaned.length > twoSentences.length ? ' ...' : '');
  }
  if (step.elapsedMs !== null) {
    return `${theme.description} -- completed in ${(step.elapsedMs / 1000).toFixed(1)}s. Click to expand.`;
  }
  return `${theme.description}. Click to expand.`;
}


function AgentCard({ step }: { step: PipelineStep }) {
  const theme = AGENT_THEMES[step.agent] || DEFAULT_THEME;
  const Icon = theme.icon;
  const isRunning = step.status === 'running';
  const isComplete = step.status === 'complete';
  const isPending = step.status === 'pending';
  const [manualExpand, setManualExpand] = useState(false);

  const isExpanded = isRunning || manualExpand;
  const isSemgrepAgent = step.agent === 'Static Analysis Agent';

  let borderClass = 'border-gray-200';
  let bgClass = 'bg-white';
  if (isRunning) {
    borderClass = theme.borderActive;
    bgClass = theme.bgActive;
  } else if (isComplete) {
    borderClass = theme.borderComplete;
    bgClass = theme.bgComplete;
  }

  return (
    <div
      className={`rounded-lg border-2 transition-all duration-300 ${borderClass} ${bgClass} ${
        isPending ? 'opacity-50' : ''
      }`}
    >
      <button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => !isRunning && setManualExpand(prev => !prev)}
        disabled={isPending}
      >
        <div className={`p-1.5 rounded-md ${isRunning ? theme.badgeBg : isComplete ? theme.badgeBg : 'bg-gray-100'}`}>
          <Icon className={`w-4 h-4 ${isRunning ? theme.badgeText : isComplete ? theme.badgeText : 'text-gray-400'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${theme.badgeBg} ${theme.badgeText}`}>
              {theme.roleBadge}
            </span>
            {isRunning && (
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
            )}
            {isComplete && (
              <Check className="w-3.5 h-3.5 text-green-500" />
            )}
          </div>

          {isRunning && (
            <p className={`text-xs mt-0.5 truncate ${theme.textActive}`}>
              {step.thoughts.length > 0
                ? step.thoughts[step.thoughts.length - 1].slice(0, 60) + (step.thoughts[step.thoughts.length - 1].length > 60 ? '...' : '')
                : theme.description}
            </p>
          )}

          {isComplete && !isExpanded && (
            <p className="text-sm text-gray-700 mt-1 line-clamp-2">
              {getCompleteSummary(step, theme)}
            </p>
          )}

          {isPending && (
            <p className="text-xs text-gray-400 mt-0.5">{theme.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ElapsedTime
            startedAt={step.startedAt}
            isRunning={isRunning}
            elapsedMs={step.elapsedMs}
          />
          {!isPending && (
            isExpanded
              ? <ChevronDown className="w-4 h-4 text-gray-400" />
              : <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          <ThoughtLog thoughts={step.thoughts} />

          {isSemgrepAgent && (
            <SemgrepPanel
              toolActivity={step.toolActivity}
              findings={step.semgrepFindings}
              isAgentComplete={isComplete}
            />
          )}

          {isComplete && step.semgrepFindings.length > 0 && isSemgrepAgent && (
            <p className="text-xs text-purple-600 mt-2">
              {step.semgrepFindings.length} Semgrep finding{step.semgrepFindings.length !== 1 ? 's' : ''} detected
            </p>
          )}
        </div>
      )}
    </div>
  );
}


export default function PipelineProgress({ steps, isActive, activeHandoff }: PipelineProgressProps) {
  if (!isActive && steps.every(s => s.status === 'pending')) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-4">
      <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
        Agent Pipeline
      </h2>

      <div className="flex flex-col">
        {steps.map((step, index) => (
          <div key={step.agent}>
            <AgentCard step={step} />

            {index < steps.length - 1 && (
              <HandoffConnector
                summary={
                  activeHandoff?.from === step.agent
                    ? activeHandoff.summary
                    : null
                }
                isAnimating={activeHandoff?.from === step.agent}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
