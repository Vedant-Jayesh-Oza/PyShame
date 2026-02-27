

export interface SecurityIssue {
  title: string;
  description: string;
  code: string;
  fix: string;
  cvss_score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
}

export interface ExploitScenario {
  title: string;
  attack_vector: string;
  steps: string[];
  impact: string;
  likelihood: string;
  related_issues: string[];
}

export interface AnalysisResponse {
  summary: string;
  code_type: string;
  risk_areas: string[];
  issues: SecurityIssue[];
  exploit_scenarios: ExploitScenario[];
  remediation_priority: string[];
}

// --- Pipeline / Streaming Types ---

export type AgentStatus = 'pending' | 'running' | 'complete';

export interface SemgrepFindingEvent {
  rule_id: string;
  message: string;
  severity: string;
  file?: string;
  line?: number;
}

export interface HandoffEvent {
  from: string;
  to: string;
  summary: string;
}

export interface PipelineStep {
  agent: string;
  step: number;
  status: AgentStatus;
  thoughts: string[];
  elapsedMs: number | null;
  summary: string | null;
  toolActivity: string[];
  semgrepFindings: SemgrepFindingEvent[];
  startedAt: number | null;
}

export interface StreamAgentEvent {
  agent: string;
  step: number;
  total: number;
}

export interface StreamAgentCompleteEvent {
  agent: string;
  step: number;
  elapsed_ms?: number;
}

export interface StreamErrorEvent {
  message: string;
}

// --- Component Props ---

export interface FileUploadProps {
  fileName: string;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyzeCode: () => void;
  isAnalyzing: boolean;
  hasCode: boolean;
}

export interface CodeInputProps {
  codeContent: string;
  fileName: string;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called when content is set from drag-drop or Load Example (same effect as file upload). */
  onFileContentLoaded?: (fileName: string, content: string) => void;
  /** Called when the user edits the code in the editor. Enables edit-then-analyze flow. */
  onContentChange?: (content: string) => void;
  onAnalyzeCode: () => void;
  isAnalyzing: boolean;
}

export interface AnalysisResultsProps {
  analysisResults: AnalysisResponse | null;
  isAnalyzing: boolean;
  error: string | null;
}

export interface PipelineProgressProps {
  steps: PipelineStep[];
  isActive: boolean;
  activeHandoff: HandoffEvent | null;
}
