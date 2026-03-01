'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldPlus } from 'lucide-react';

interface RemediationChecklistProps {
  items: string[];
  storageKey: string;
}

export default function RemediationChecklist({ items, storageKey }: RemediationChecklistProps) {
  const fullKey = `pyshame-remediation-${storageKey}`;
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        setChecked(JSON.parse(stored));
      }
    } catch {
      // localStorage unavailable or corrupt — start fresh
    }
  }, [fullKey]);

  const persist = useCallback(
    (next: Record<number, boolean>) => {
      setChecked(next);
      try {
        localStorage.setItem(fullKey, JSON.stringify(next));
      } catch {
        // Quota exceeded or unavailable
      }
    },
    [fullKey]
  );

  const toggle = useCallback(
    (index: number) => {
      persist({ ...checked, [index]: !checked[index] });
    },
    [checked, persist]
  );

  const completedCount = useMemo(
    () => items.filter((_, i) => checked[i]).length,
    [items, checked]
  );

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30">
      <div className="px-4 py-3 border-b border-blue-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldPlus className="w-4 h-4 text-blue-700" />
          <h3 className="font-semibold text-blue-900">Blue Team — Remediation Priority</h3>
        </div>
        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
          {completedCount}/{items.length} done
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="p-4 space-y-1">
        {items.map((item, index) => {
          const isChecked = !!checked[index];
          return (
            <label
              key={index}
              className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-blue-50 ${
                isChecked ? 'opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(index)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              />
              <span
                className={`text-sm ${
                  isChecked
                    ? 'line-through text-gray-400'
                    : index === 0
                      ? 'text-red-700 font-medium'
                      : index < 3
                        ? 'text-amber-700'
                        : 'text-gray-700'
                }`}
              >
                {index + 1}. {item}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
