'use client'

import { useState, useCallback, useRef } from 'react';
import {
  AnalysisResponse,
  PipelineStep,
  StreamAgentEvent,
  StreamAgentCompleteEvent,
  SemgrepFindingEvent,
  HandoffEvent,
} from '@/types/security';
import CodeInput from '@/components/CodeInput';
import AnalysisResults from '@/components/AnalysisResults';
import PipelineProgress from '@/components/PipelineProgress';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && window.location?.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : '');

const DEFAULT_AGENTS = [
  'Triage Agent',
  'Static Analysis Agent',
  'Code Review Agent',
  'Red Team Agent',
  'Blue Team Agent',
  'Report Synthesizer',
];

function buildInitialSteps(): PipelineStep[] {
  return DEFAULT_AGENTS.map((agent, i) => ({
    agent,
    step: i + 1,
    status: 'pending',
    thoughts: [],
    elapsedMs: null,
    summary: null,
    toolActivity: [],
    semgrepFindings: [],
    startedAt: null,
  }));
}

export default function Home() {
  const [codeContent, setCodeContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [analysisResults, setAnalysisResults] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(buildInitialSteps());
  const [activeHandoff, setActiveHandoff] = useState<HandoffEvent | null>(null);
  const handoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.py')) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCodeContent(content);
        setAnalysisResults(null);
        setError(null);
        setPipelineSteps(buildInitialSteps());
      };
      reader.readAsText(file);
    } else {
      alert('Please select a Python (.py) file');
    }
  };

  const handleFileContentLoaded = useCallback((name: string, content: string) => {
    setFileName(name);
    setCodeContent(content);
    setAnalysisResults(null);
    setError(null);
    setPipelineSteps(buildInitialSteps());
  }, []);

  const updateStep = useCallback(
    (agentName: string, updater: (step: PipelineStep) => Partial<PipelineStep>) => {
      setPipelineSteps(prev =>
        prev.map(s => (s.agent === agentName ? { ...s, ...updater(s) } : s))
      );
    },
    []
  );

  const handleAnalyzeCode = async () => {
    if (!codeContent) {
      alert('Please upload a Python file first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResults(null);
    setPipelineSteps(buildInitialSteps());

    try {
      const response = await fetch(`${API_BASE_URL}/api/analyze/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeContent }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch {
              // skip malformed JSON
            }
            eventType = '';
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSSEEvent = (eventType: string, data: Record<string, unknown>) => {
    switch (eventType) {
      case 'agent_start': {
        const ev = data as unknown as StreamAgentEvent;
        updateStep(ev.agent, () => ({
          status: 'running',
          startedAt: Date.now(),
        }));
        break;
      }
      case 'agent_thought': {
        const { agent, text } = data as { agent: string; text: string };
        updateStep(agent, (s) => ({
          thoughts: [...s.thoughts, text],
        }));
        break;
      }
      case 'tool_called': {
        const { agent, tool } = data as { agent: string; tool: string };
        updateStep(agent, (s) => ({
          toolActivity: [...s.toolActivity, tool],
        }));
        break;
      }
      case 'semgrep_finding': {
        const finding = data as unknown as SemgrepFindingEvent;
        updateStep('Static Analysis Agent', (s) => ({
          semgrepFindings: [...s.semgrepFindings, finding],
        }));
        break;
      }
      case 'agent_complete': {
        const ev = data as unknown as StreamAgentCompleteEvent;
        updateStep(ev.agent, (s) => ({
          status: 'complete',
          elapsedMs: ev.elapsed_ms ?? null,
          summary: s.thoughts.length > 0
            ? s.thoughts[s.thoughts.length - 1].slice(0, 80)
            : null,
        }));
        break;
      }
      case 'handoff': {
        const handoff = data as unknown as HandoffEvent;
        if (handoffTimerRef.current) clearTimeout(handoffTimerRef.current);
        setActiveHandoff(handoff);
        handoffTimerRef.current = setTimeout(() => setActiveHandoff(null), 2000);
        break;
      }
      case 'analysis_complete': {
        setPipelineSteps(prev => prev.map(s => ({ ...s, status: 'complete' as const })));
        setAnalysisResults(data as unknown as AnalysisResponse);
        break;
      }
      case 'error': {
        const msg = (data as { message?: string }).message || 'Analysis failed';
        setError(msg);
        break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Cybersecurity Analyst</h1>
          <p className="text-accent mt-1">Multi-agent Python code security analysis pipeline</p>
        </header>

        <div className="flex flex-col gap-4 min-h-[calc(100vh-160px)]">
          <CodeInput
            codeContent={codeContent}
            fileName={fileName}
            onFileUpload={handleFileUpload}
            onFileContentLoaded={handleFileContentLoaded}
            onContentChange={setCodeContent}
            onAnalyzeCode={handleAnalyzeCode}
            isAnalyzing={isAnalyzing}
          />

          <PipelineProgress
            steps={pipelineSteps}
            isActive={isAnalyzing}
            activeHandoff={activeHandoff}
          />

          <div className="flex-1 min-h-0">
            <AnalysisResults
              analysisResults={analysisResults}
              isAnalyzing={isAnalyzing}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
