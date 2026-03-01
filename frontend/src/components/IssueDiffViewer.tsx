'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronRight, Columns2, AlignJustify } from 'lucide-react';

const ReactDiffViewer = dynamic(() => import('react-diff-viewer-continued'), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-muted-foreground text-center">Loading diff…</div>
  ),
});

interface IssueDiffViewerProps {
  oldCode: string;
  newCode: string;
}

export default function IssueDiffViewer({ oldCode, newCode }: IssueDiffViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [splitView, setSplitView] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 transition-colors py-1"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        {expanded ? 'Hide Diff' : 'Show Diff'}
      </button>

      {expanded && (
        <div className="mt-2 border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-border">
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Vulnerable → Fixed
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSplitView(true)}
                className={`p-1 rounded ${splitView ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
                title="Split view"
              >
                <Columns2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSplitView(false)}
                className={`p-1 rounded ${!splitView ? 'bg-indigo-100 text-indigo-700' : 'text-gray-400 hover:text-gray-600'}`}
                title="Unified view"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs [&_pre]:!text-xs [&_td]:!text-xs">
            <ReactDiffViewer
              oldValue={oldCode}
              newValue={newCode}
              splitView={splitView}
              leftTitle="Vulnerable Code"
              rightTitle="Fixed Code"
              useDarkTheme={false}
              styles={{
                contentText: { fontSize: '12px', lineHeight: '1.5' },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
