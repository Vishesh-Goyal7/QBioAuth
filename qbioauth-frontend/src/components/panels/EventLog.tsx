import { useEffect, useState } from "react";
import { useProtocolStore } from "../../store/protocolStore";
import type { EventStatus, ProtocolEvent } from "../../types/protocol";

const PILL_CLASS: Record<EventStatus, string> = {
  STARTED: "bg-amber-950 text-amber-300 border border-amber-700",
  PROGRESS: "bg-amber-950 text-amber-300 border border-amber-700",
  SUCCESS: "bg-emerald-950 text-emerald-300 border border-emerald-700",
  FAILURE: "bg-red-950 text-red-300 border border-red-700",
};

// v3: attempt_number is only known retrospectively, on the single
// TRANSMISSION_COMPLETE event for the attempt that actually succeeded —
// there's no live per-attempt event stream, so this is the only place a
// retry ever surfaces (never a real-time "retrying…" indicator).
function formatEventMessage(event: ProtocolEvent): string {
  if (event.phase === "QKD_TRANSMISSION" && event.step === "TRANSMISSION_COMPLETE") {
    const attemptNumber = (event.payload as { attempt_number?: number }).attempt_number;
    if (attemptNumber && attemptNumber > 1) {
      return `${event.message} — succeeded on attempt ${attemptNumber}`;
    }
  }
  return event.message;
}

function relativeTime(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 1) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export default function EventLog() {
  const events = useProtocolStore((s) => s.events);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col rounded-lg border border-panelborder bg-panel">
      <div className="border-b border-panelborder px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Event log
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {events.length === 0 && (
          <p className="px-2 py-4 text-sm text-gray-600">No events yet — start enrollment or authentication.</p>
        )}
        <ul className="space-y-1">
          {events.map((event) => (
            <li
              key={event.event_id}
              className="flex items-start justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-white/5"
            >
              <div className="min-w-0">
                <span className="mr-2 font-mono text-[10px] text-gray-600">{event.phase}</span>
                <span className="text-gray-200">{formatEventMessage(event)}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PILL_CLASS[event.status]}`}>
                  {event.status}
                </span>
                <span className="w-12 text-right text-[10px] text-gray-600">
                  {relativeTime(event.timestamp, now)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
