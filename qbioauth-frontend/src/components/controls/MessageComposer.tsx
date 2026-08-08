import { useState } from "react";
import { useProtocolStore } from "../../store/protocolStore";
import type { useProtocolSession } from "../../hooks/useProtocolSession";

interface MessageComposerProps {
  session: ReturnType<typeof useProtocolSession>;
}

// Colors mirror the diagram's node colors so a viewer can carry the same
// mental model from the network diagram into the chat thread: Terminal is
// amber (TerminalNode), Server is sky (ServerNode).
const BUBBLE_CLASS: Record<"T->S" | "S->T", string> = {
  "T->S": "bg-amber-950 text-amber-100",
  "S->T": "bg-sky-950 text-sky-100",
};

export default function MessageComposer({ session }: MessageComposerProps) {
  const channelEstablished = useProtocolStore((s) => s.channelEstablished);
  const chatMessages = useProtocolStore((s) => s.chatMessages);
  const chatError = useProtocolStore((s) => s.chatError);
  const clearChatError = useProtocolStore((s) => s.clearChatError);

  const [direction, setDirection] = useState<"T->S" | "S->T">("T->S");
  const [text, setText] = useState("");
  const [autoReply, setAutoReply] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (!channelEstablished) {
    return (
      <div className="rounded-lg border border-panelborder bg-panel p-4 text-sm text-gray-600">
        Secure channel not established yet. Complete an authentication run to unlock encrypted
        messaging.
      </div>
    );
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    session.sendChatMessage(direction, text.trim(), autoReply);
    setText("");
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-panelborder bg-panel">
      <div className="border-b border-panelborder px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Encrypted channel
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {chatMessages.length === 0 && (
          <p className="text-sm text-gray-600">No messages yet.</p>
        )}
        {chatMessages.map((m) => {
          const expanded = expandedIds.has(m.id);
          return (
            <div key={m.id} className={`flex ${m.direction === "T->S" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${BUBBLE_CLASS[m.direction]}`}>
                <div className="mb-1 text-[10px] uppercase tracking-wide opacity-60">
                  {m.direction === "T->S" ? "Terminal → Server" : "Server → Terminal"}
                </div>
                <div>{m.text}</div>
                <div className="mt-1 flex items-center gap-2 text-[10px] opacity-60">
                  <span>
                    {m.verified === null ? "sending…" : m.verified ? "verified ✓" : "verification failed ✗"}
                  </span>
                  {m.ciphertext && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(m.id)}
                      className="underline decoration-dotted opacity-80 hover:opacity-100"
                    >
                      {expanded ? "hide ciphertext" : "show ciphertext"}
                    </button>
                  )}
                </div>
                {expanded && m.ciphertext && (
                  <div className="mt-2 space-y-1 rounded bg-black/30 p-2 font-mono text-[10px] leading-relaxed">
                    <div className="break-all">
                      <span className="opacity-60">nonce: </span>
                      {m.ciphertext.nonce_b64}
                    </div>
                    <div className="break-all">
                      <span className="opacity-60">ciphertext: </span>
                      {m.ciphertext.ciphertext_b64}
                    </div>
                    <div className="break-all">
                      <span className="opacity-60">aad: </span>
                      {m.ciphertext.associated_data_b64}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {chatError && (
        <p className="border-t border-red-900 bg-red-950/50 px-3 py-2 text-xs text-red-300">
          {chatError}
        </p>
      )}

      <form onSubmit={handleSend} className="space-y-2 border-t border-panelborder p-3">
        <label className="flex items-center gap-2 text-[11px] text-gray-400">
          <input
            type="checkbox"
            checked={autoReply}
            onChange={(e) => setAutoReply(e.target.checked)}
            className="accent-sky-500"
          />
          Simulate a live reply
        </label>
        <div className="flex gap-2">
          <select
            value={direction}
            onChange={(e) => {
              setDirection(e.target.value as "T->S" | "S->T");
              clearChatError();
            }}
            className="rounded-md border border-panelborder bg-[#0b0f17] px-2 py-2 text-xs text-gray-200 outline-none"
          >
            <option value="T->S">T → S</option>
            <option value="S->T">S → T</option>
          </select>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message…"
            className="flex-1 rounded-md border border-panelborder bg-[#0b0f17] px-3 py-2 text-sm text-gray-100 outline-none focus:border-sky-500"
          />
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
