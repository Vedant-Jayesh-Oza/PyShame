'use client';

import { useCallback, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { CodeInputProps } from '@/types/security';
import FileUpload from './FileUpload';
import { SAMPLE_SNIPPETS } from '@/data/sampleSnippets';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex-1 min-h-[320px] rounded-lg border border-border bg-input-bg flex items-center justify-center text-muted-foreground text-sm">
      Loading editor…
    </div>
  ),
});

/** Rough token estimate: ~4 chars per token (GPT-style heuristic). */
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function getLineCount(text: string): number {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

export default function CodeInput({
  codeContent,
  fileName,
  onFileUpload,
  onFileContentLoaded,
  onContentChange,
  onAnalyzeCode,
  isAnalyzing,
}: CodeInputProps) {
  const [isDragging, setIsDragging] = useState(false);

  const lineCount = useMemo(() => getLineCount(codeContent), [codeContent]);
  const tokenEstimate = useMemo(() => estimateTokens(codeContent), [codeContent]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.name.toLowerCase().endsWith('.py')) {
        return;
      }
      const syntheticEv = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      onFileUpload(syntheticEv);
    },
    [onFileUpload]
  );

  const handleLoadExample = useCallback(
    (snippet: (typeof SAMPLE_SNIPPETS)[number]) => {
      if (onFileContentLoaded) {
        onFileContentLoaded(snippet.fileName, snippet.content);
      }
    },
    [onFileContentLoaded]
  );

  return (
    <div className="bg-white rounded-lg border border-border shadow-sm p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0 flex-wrap gap-2">
        <label htmlFor="code-input" className="text-lg font-semibold text-foreground">
          Code to analyze
        </label>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="border border-border rounded-lg px-3 py-2 text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (!id) return;
              const snippet = SAMPLE_SNIPPETS.find((s) => s.id === id);
              if (snippet) handleLoadExample(snippet);
              e.target.value = '';
            }}
            title="Load a sample vulnerable Python snippet"
          >
            <option value="">Load example…</option>
            {SAMPLE_SNIPPETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <FileUpload
            fileName={fileName}
            onFileUpload={onFileUpload}
            onAnalyzeCode={onAnalyzeCode}
            isAnalyzing={isAnalyzing}
            hasCode={!!codeContent}
          />
        </div>
      </div>

      {(fileName || codeContent) && (
        <div className="flex flex-wrap items-center gap-3 mb-2 text-sm text-muted-foreground">
          {fileName && (
            <span className="font-medium text-foreground truncate max-w-[200px]" title={fileName}>
              {fileName}
            </span>
          )}
          <span>{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
          <span>~{tokenEstimate} tokens</span>
        </div>
      )}

      {/* Drag-drop zone + Monaco */}
      <div
        className={`relative flex-1 min-h-[320px] h-[380px] rounded-lg border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-input-bg/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!codeContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground text-sm text-center px-4">
            Drop a <code className="bg-secondary/30 px-1 rounded">.py</code> file here or use &quot;Open python file…&quot; / &quot;Load example…&quot;
          </div>
        )}
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          <MonacoEditor
            height="380px"
            language="python"
            value={codeContent}
            onChange={(value) => onContentChange?.(value ?? '')}
            options={{
              readOnly: false,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              fontSize: 13,
              wordWrap: 'on',
              padding: { top: 8 },
            }}
            loading={null}
          />
        </div>
      </div>
    </div>
  );
}
