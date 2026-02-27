'use client'

import { useState, useEffect, useRef } from 'react';

export function useElapsedTimer(
  startedAt: number | null,
  isRunning: boolean,
): string {
  const [elapsed, setElapsed] = useState('0.0s');
  const rafRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRunning || startedAt === null) {
      if (rafRef.current) {
        clearInterval(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const ms = Date.now() - startedAt;
      if (ms < 1000) {
        setElapsed(`${(ms / 1000).toFixed(1)}s`);
      } else if (ms < 60_000) {
        setElapsed(`${(ms / 1000).toFixed(1)}s`);
      } else {
        const mins = Math.floor(ms / 60_000);
        const secs = ((ms % 60_000) / 1000).toFixed(0);
        setElapsed(`${mins}m ${secs}s`);
      }
    };

    tick();
    rafRef.current = setInterval(tick, 100);

    return () => {
      if (rafRef.current) {
        clearInterval(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isRunning, startedAt]);

  return elapsed;
}
