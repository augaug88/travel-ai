import { type FormEvent, useState } from "react";
import type { ChatMessage, ChatResponse } from "../../lib/types";
import { ErrorBox, Loading } from "../components/Status";
import { ApiError, apiPost } from "../lib/api";

interface Turn extends ChatMessage {
  tools_used?: string[];
}

export default function ChatPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const messages: ChatMessage[] = next.map(({ role, content: c }) => ({ role, content: c }));
      const res = await apiPost<ChatResponse>("/api/chat", { messages });
      setTurns([...next, { role: "assistant", content: res.text, tools_used: res.tools_used }]);
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(String(err), "network", 0));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="chat">
      <h2>Chat</h2>
      {turns.length === 0 && !loading && (
        <div className="state empty">Ask e.g. “Cheapest weekend in Bangkok next month, with hotel and S$ budget?” Gemini will call the toolbox for live facts.</div>
      )}
      <ol className="turns">
        {turns.map((t, i) => (
          <li key={i} className={`turn ${t.role}`}>
            <div className="bubble">{t.content || <em>(empty reply)</em>}</div>
            {t.role === "assistant" && (
              <div className="used">used: {t.tools_used && t.tools_used.length ? t.tools_used.join(", ") : "no tools"}</div>
            )}
          </li>
        ))}
      </ol>
      {loading && <Loading label="Gemini is planning…" />}
      {error && <ErrorBox error={error} />}
      <form className="chat-input" onSubmit={submit}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Plan my trip…" aria-label="Message" disabled={loading} />
        <button type="submit" disabled={loading || !input.trim()}>Send</button>
      </form>
    </section>
  );
}
