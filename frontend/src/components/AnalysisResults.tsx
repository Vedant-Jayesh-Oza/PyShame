import { AnalysisResultsProps } from '@/types/security';
import { Swords, ShieldPlus } from 'lucide-react';

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

export default function AnalysisResults({
  analysisResults,
  isAnalyzing,
  error,
}: AnalysisResultsProps) {
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
            {/* Summary */}
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

            {/* Security issues: table layout */}
            <div>
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Security Issues ({analysisResults.issues.length})
              </h3>
              {analysisResults.issues.length > 0 ? (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-border">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Issue</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Severity</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">CVSS</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vulnerable Code</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recommended Fix</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-white">
                        {analysisResults.issues.map((issue, index) => (
                          <tr key={index} className="align-top">
                            <td className="px-4 py-3 font-medium text-foreground min-w-[160px]">
                              {issue.title}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getSeverityStyles(issue.severity)}`}>
                                {issue.severity.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-medium text-gray-700 tabular-nums whitespace-nowrap">
                              {issue.cvss_score}
                            </td>
                            <td className="px-4 py-3 text-gray-700 leading-relaxed min-w-[200px] max-w-[300px]">
                              {issue.description}
                            </td>
                            <td className="px-4 py-3 min-w-[180px] max-w-[260px]">
                              {issue.code && (
                                <pre className="text-xs font-mono bg-red-50 text-red-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words border border-red-100">
                                  {issue.code}
                                </pre>
                              )}
                            </td>
                            <td className="px-4 py-3 min-w-[180px] max-w-[280px]">
                              {issue.fix && (
                                <pre className="text-xs font-mono bg-emerald-50 text-emerald-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words border border-emerald-100">
                                  {issue.fix}
                                </pre>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

            {/* Exploit scenarios */}
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
                    <div key={index} className="p-4">
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
                          {scenario.related_issues.map((issue, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Remediation priority */}
            {analysisResults.remediation_priority?.length > 0 && (
              <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30">
                <div className="px-4 py-3 border-b border-blue-200 flex items-center gap-2">
                  <ShieldPlus className="w-4 h-4 text-blue-700" />
                  <h3 className="font-semibold text-blue-900">Blue Team — Remediation Priority</h3>
                </div>
                <ol className="list-decimal list-inside p-4 space-y-1.5">
                  {analysisResults.remediation_priority.map((item, index) => (
                    <li
                      key={index}
                      className={`text-sm ${index === 0 ? 'text-red-700 font-medium' : index < 3 ? 'text-amber-700' : 'text-gray-700'}`}
                    >
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
