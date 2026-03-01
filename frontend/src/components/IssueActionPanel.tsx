'use client';

import { useState, useCallback } from 'react';
import { Crosshair, ClipboardCopy, Code2, MessageCircleQuestion, Check } from 'lucide-react';
import type { SecurityIssue, ExploitScenario } from '@/types/security';
import FollowUpChat from './FollowUpChat';

interface IssueActionPanelProps {
  issue: SecurityIssue;
  exploitScenarios: ExploitScenario[];
  onApplyFix?: (vulnerableCode: string, fixCode: string) => void;
}

export default function IssueActionPanel({
  issue,
  exploitScenarios,
  onApplyFix,
}: IssueActionPanelProps) {
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);

  const matchingScenarioIndex = exploitScenarios.findIndex((s) =>
    s.related_issues.some(
      (ri) => ri.toLowerCase().trim() === issue.title.toLowerCase().trim()
    )
  );
  const hasExploit = matchingScenarioIndex >= 0;

  const handleShowExploit = useCallback(() => {
    if (!hasExploit) return;
    const el = document.getElementById(`exploit-${matchingScenarioIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-red-400', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-red-400', 'ring-offset-2');
      }, 2000);
    }
  }, [hasExploit, matchingScenarioIndex]);

  const handleCopyFix = useCallback(async () => {
    if (!issue.fix) return;
    try {
      await navigator.clipboard.writeText(issue.fix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: nothing to do
    }
  }, [issue.fix]);

  const handleInsertFix = useCallback(() => {
    if (issue.code && issue.fix && onApplyFix) {
      onApplyFix(issue.code, issue.fix);
    }
  }, [issue.code, issue.fix, onApplyFix]);

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Show Exploit Scenario */}
        <button
          onClick={handleShowExploit}
          disabled={!hasExploit}
          title={hasExploit ? 'Scroll to related exploit scenario' : 'No linked exploit scenario'}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors
            enabled:text-red-700 enabled:bg-red-50 enabled:border-red-200 enabled:hover:bg-red-100
            disabled:text-gray-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:cursor-not-allowed"
        >
          <Crosshair className="w-3 h-3" />
          Show Exploit
        </button>

        {/* Copy Fix */}
        <button
          onClick={handleCopyFix}
          disabled={!issue.fix}
          title="Copy fix to clipboard"
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors
            text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100
            disabled:text-gray-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:cursor-not-allowed"
        >
          {copied ? <Check className="w-3 h-3" /> : <ClipboardCopy className="w-3 h-3" />}
          {copied ? 'Copied!' : 'Copy Fix'}
        </button>

        {/* Insert into Editor */}
        {onApplyFix && (
          <button
            onClick={handleInsertFix}
            disabled={!issue.fix || !issue.code}
            title="Replace vulnerable code with fix in editor"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors
              text-violet-700 bg-violet-50 border-violet-200 hover:bg-violet-100
              disabled:text-gray-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:cursor-not-allowed"
          >
            <Code2 className="w-3 h-3" />
            Insert in Editor
          </button>
        )}

        {/* Ask Follow-up */}
        <button
          onClick={() => setShowChat((v) => !v)}
          className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors
            ${showChat
              ? 'text-blue-800 bg-blue-100 border-blue-300'
              : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
            }`}
        >
          <MessageCircleQuestion className="w-3 h-3" />
          Ask Follow-up
        </button>
      </div>

      {showChat && <FollowUpChat issue={issue} />}
    </div>
  );
}
