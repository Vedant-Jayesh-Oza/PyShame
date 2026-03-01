'use client';

import { useMemo } from 'react';

interface CvssGaugeProps {
  score: number;
}

function getSeverityBand(score: number): {
  label: string;
  color: string;
  bg: string;
  barColor: string;
  description: string;
} {
  if (score >= 9.0) {
    return {
      label: 'Critical',
      color: 'text-red-700',
      bg: 'bg-red-100',
      barColor: 'bg-red-500',
      description: '9.0–10.0 Critical: Exploitation is straightforward and usually results in system-level compromise.',
    };
  }
  if (score >= 7.0) {
    return {
      label: 'High',
      color: 'text-orange-700',
      bg: 'bg-orange-100',
      barColor: 'bg-orange-500',
      description: '7.0–8.9 High: Exploitation could cause major damage and is relatively easy to achieve.',
    };
  }
  if (score >= 4.0) {
    return {
      label: 'Medium',
      color: 'text-amber-700',
      bg: 'bg-amber-100',
      barColor: 'bg-amber-500',
      description: '4.0–6.9 Medium: Exploitation requires some conditions but can lead to significant impact.',
    };
  }
  return {
    label: 'Low',
    color: 'text-green-700',
    bg: 'bg-green-100',
    barColor: 'bg-green-500',
    description: '0.1–3.9 Low: Exploitation is difficult and impact is limited.',
  };
}

export default function CvssGauge({ score }: CvssGaugeProps) {
  const band = useMemo(() => getSeverityBand(score), [score]);
  const pct = useMemo(() => Math.min(Math.max((score / 10) * 100, 0), 100), [score]);

  return (
    <div className="group relative flex items-center gap-2 min-w-[140px]">
      <span className={`text-sm font-bold tabular-nums ${band.color}`}>
        {score.toFixed(1)}
      </span>

      <div className="flex-1 relative">
        {/* Track */}
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${band.barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Severity band markers */}
        <div className="absolute inset-0 flex">
          <div className="w-[39%] border-r border-gray-300/50" />
          <div className="w-[30%] border-r border-gray-300/50" />
          <div className="w-[20%] border-r border-gray-300/50" />
          <div className="w-[11%]" />
        </div>
      </div>

      <span
        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${band.color} ${band.bg}`}
      >
        {band.label}
      </span>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
        <div className="font-semibold mb-1">CVSS {score.toFixed(1)} — {band.label}</div>
        <div className="text-gray-300 max-w-[260px] whitespace-normal">{band.description}</div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
