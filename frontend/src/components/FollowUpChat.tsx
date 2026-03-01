'use client';

import { useState, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { SecurityIssue } from '@/types/security';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' &&
  window.location?.hostname === 'localhost'
    ? 'http://localhost:8000'
    : '');

interface FollowUpChatProps {
  issue: SecurityIssue;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function FollowUpChat({ issue }: FollowUpChatProps) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = useCallback(async () => {
    const q = question.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, question: q }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setLoading(false);
    }
  }, [question, loading, issue]);

  return (
    <div className="mt-3 border border-blue-200 rounded-lg bg-blue-50/30 overflow-hidden">
      {messages.length > 0 && (
        <div className="max-h-48 overflow-y-auto p-3 space-y-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`text-xs leading-relaxed rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-100 text-blue-900 ml-6'
                  : 'bg-white text-gray-800 mr-6 border border-gray-100'
              }`}
            >
              <span className="font-semibold text-[10px] uppercase tracking-wide block mb-0.5 opacity-60">
                {msg.role === 'user' ? 'You' : 'Security Advisor'}
              </span>
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 px-3">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking…
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="px-3 py-1.5 text-xs text-red-700 bg-red-50">{error}</div>
      )}

      <div className="flex items-center gap-2 p-2 border-t border-blue-100">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about this vulnerability…"
          className="flex-1 text-xs bg-white border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={!question.trim() || loading}
          className="p-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
