import { useState, useRef, useEffect, useId } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Wrench,
  Trash2,
  Plane,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import type { ChatMessage } from '../types';
import { ErrorAlert } from '../components/ErrorAlert';

const PROMPT_STARTERS = [
  'Plan a 4-day weekend trip from SIN to Bangkok with a budget under S$1,000.',
  'Check traffic on PIE to Changi for flight at 6pm.',
  'Compare SGD to JPY and recommend 5 top attractions in Tokyo.',
  'What is the current weather in Singapore at Changi compared to Bali?',
];

export function ChatView() {
  const chatInputId = useId();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I am your Singapore Travel Concierge. I can search live flights from SIN, verify hotel prices in S$, calculate your Changi 'Leave By' time based on LTA expressway traffic, convert FX rates, and check weather forecasts.",
      tools_used: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; source?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setInput('');
    setError(null);

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError({
          message: data.error || 'Failed to get response from AI planner',
          source: data.source || 'gemini-2.5-flash / Smithery MCP',
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.text || 'No response generated.',
            tools_used: data.tools_used || [],
          },
        ]);
      }
    } catch (err: any) {
      setError({
        message: err.message || 'Network error communicating with AI service',
        source: 'gemini-2.5-flash',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "Chat reset. How can I help you plan your next trip from Singapore?",
        tools_used: [],
      },
    ]);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-24">
      {/* Header */}
      <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 p-2 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold">AI Singapore Travel Concierge</h1>
            <p className="text-xs text-slate-300">
              Gemini 2.5 Flash orchestrated with live Smithery MCP tools
            </p>
          </div>
        </div>

        <button
          onClick={clearChat}
          title="Clear chat"
          className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Suggested Starters */}
      {messages.length <= 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-2">Try asking:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROMPT_STARTERS.map((starter, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(starter)}
                className="text-left rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-700 font-medium transition hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-950"
              >
                "{starter}"
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorAlert error={error.message} source={error.source} />}

      {/* Messages Scroll Area */}
      <div className="space-y-4 min-h-[300px]">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="h-8 w-8 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 mt-1 shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white shadow-xs rounded-tr-xs'
                    : 'border border-slate-200 bg-white text-slate-800 shadow-xs rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Used tools line as specified: "used: kiwi, exchange-mcp" */}
                {!isUser && msg.tools_used && msg.tools_used.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
                    <Wrench className="h-3 w-3 text-rose-500" />
                    <span>used: {msg.tools_used.join(', ')}</span>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 shrink-0 mt-1">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="h-8 w-8 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-xs flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <span>Consulting MCP tools & planning response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="sticky bottom-16 sm:bottom-4 z-20 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <label htmlFor={chatInputId} className="sr-only">Ask travel planner</label>
          <input
            id={chatInputId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask about flights from SIN, Changi leave-by timing, FX rates, or hotel deals..."
            className="flex-1 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-hidden text-slate-900"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-rose-600 p-2.5 text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
