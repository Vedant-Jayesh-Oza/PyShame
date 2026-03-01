'use client';

import { useMemo } from 'react';
import { AnalysisResultsProps } from '@/types/security';
import { Swords } from 'lucide-react';
import CvssGauge from './CvssGauge';
import IssueDiffViewer from './IssueDiffViewer';
import IssueActionPanel from './IssueActionPanel';
import RemediationChecklist from './RemediationChecklist';

function getSeverityStyles(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'low':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getLikelihoodColor(likelihood: string): string {
  switch (likelihood.toLowerCase()) {
    case 'high':
      return 'text-red-700 bg-red-50';
    case 'medium':
      return 'text-amber-700 bg-amber-50';
    case 'low':
      return 'text-green-700 bg-green-50';
    default:
      return 'text-gray-700 bg-gray-50';
  }
}

function deriveStorageKey(summary: string, issues: { title: string }[]): string {
  const raw = (issues[0]?.title ?? '') + '|' + summary.slice(0, 64);
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

export default function AnalysisResults({
  analysisResults,
  isAnalyzing,
  error,
  onApplyFix,
}: AnalysisResultsProps) {
  const storageKey = useMemo(
    () =>
      analysisResults
        ? deriveStorageKey(analysisResults.summary, analysisResults.issues)
        : '',
    [analysisResults]
  );

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-6 flex flex-col h-full">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex-shrink-0">
        Results of Analysis
      </h2>

      <div className="flex-1 overflow-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!analysisResults && !error && (
          <div className="bg-gray-50 rounded-lg border border-border p-6 text-sm text-muted-foreground text-center">
            {isAnalyzing
              ? 'Multi-agent pipeline running, watch the progress above...'
              : 'Upload and analyze Python code to see security assessment results here.'}
          </div>
        )}

        {analysisResults && (
          <div className="space-y-6">
            {/* Summary — unchanged */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <h3 className="font-semibold text-sky-900 mb-2">Analysis Summary</h3>
              <p className="text-sky-800 text-sm leading-relaxed">{analysisResults.summary}</p>
              {(analysisResults.code_type || (analysisResults.risk_areas?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {analysisResults.code_type && analysisResults.code_type !== 'unknown' && (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-sky-200 text-sky-800">
                      {analysisResults.code_type}
                    </span>
                  )}
                  {analysisResults.risk_areas?.map((area) => (
                    <span
                      key={area}
                      className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Security issues: card layout */}
            <div>
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Security Issues ({analysisResults.issues.length})
              </h3>
              {analysisResults.issues.length > 0 ? (
                <div className="space-y-4">
                  {analysisResults.issues.map((issue, index) => (
                    <div
                      key={index}
                      className="border border-border rounded-lg overflow-hidden bg-white"
                    >
                      {/* Card header */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">
                            {issue.title}
                          </h4>
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border shrink-0 ${getSeverityStyles(issue.severity)}`}
                          >
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <CvssGauge score={issue.cvss_score} />
                      </div>

                      {/* Card body */}
                      <div className="p-4 space-y-3">
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {issue.description}
                        </p>

                        {issue.source && (
                          <div className="text-[11px] text-gray-400">
                            Source: <span className="font-medium text-gray-500">{issue.source}</span>
                          </div>
                        )}

                        {/* Diff viewer */}
                        {(issue.code || issue.fix) && (
                          <IssueDiffViewer
                            oldCode={issue.code || ''}
                            newCode={issue.fix || ''}
                          />
                        )}

                        {/* Action panel */}
                        <IssueActionPanel
                          issue={issue}
                          exploitScenarios={analysisResults.exploit_scenarios ?? []}
                          onApplyFix={onApplyFix}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                  <strong>Note:</strong> The Report Synthesizer did not produce structured issue data this run.
                  The agents found vulnerabilities (see summary above), but they could not be parsed into the
                  standard table format. This can happen when the Semgrep MCP tool fails and agents fall back
                  to manual analysis. Try running the analysis again.
                </div>
              )}
            </div>

            {/* Exploit scenarios — preserved, with id attributes for scroll targeting */}
            {analysisResults.exploit_scenarios?.length > 0 && (
              <div className="border border-red-200 rounded-lg overflow-hidden bg-red-50/30">
                <div className="px-4 py-3 border-b border-red-200 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-red-700" />
                  <h3 className="font-semibold text-red-900">
                    Red Team — Exploit Scenarios ({analysisResults.exploit_scenarios.length})
                  </h3>
                </div>
                <div className="divide-y divide-red-100">
                  {analysisResults.exploit_scenarios.map((scenario, index) => (
                    <div
                      key={index}
                      id={`exploit-${index}`}
                      className="p-4 transition-all duration-300"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{scenario.title}</h4>
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getLikelihoodColor(scenario.likelihood)}`}
                        >
                          {scenario.likelihood} likelihood
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Attack vector:</strong> {scenario.attack_vector}
                      </p>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Impact:</strong> {scenario.impact}
                      </p>
                      <ol className="list-decimal list-inside text-sm text-gray-600 space-y-0.5">
                        {scenario.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                      {scenario.related_issues.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {scenario.related_issues.map((ri, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                            >
                              {ri}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remediation priority — interactive checklist */}
            {analysisResults.remediation_priority?.length > 0 && (
              <RemediationChecklist
                items={analysisResults.remediation_priority}
                storageKey={storageKey}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
