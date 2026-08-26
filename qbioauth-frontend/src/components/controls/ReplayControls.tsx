import { useRef, useState } from "react";
import { useProtocolStore } from "../../store/protocolStore";

export default function ReplayControls() {
  const events = useProtocolStore((s) => s.events);
  const sessionOutcome = useProtocolStore((s) => s.sessionOutcome);
  const isReplaying = useProtocolStore((s) => s.isReplaying);
  const startReplay = useProtocolStore((s) => s.startReplay);
  const setReplaying = useProtocolStore((s) => s.setReplaying);
  const ingestEvent = useProtocolStore((s) => s.ingestEvent);

  const [speed, setSpeed] = useState(1);
  const timeoutIdsRef = useRef<number[]>([]);

  const canReplay = events.length > 0 && sessionOutcome !== "IN_PROGRESS" && !isReplaying;

  function handleReplay() {
    if (!canReplay) return;
    const snapshot = [...events];
    startReplay();

    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];

    let cumulativeMs = 0;
    snapshot.forEach((event, index) => {
      if (index > 0) {
        const prevMs = Date.parse(snapshot[index - 1].timestamp);
        const curMs = Date.parse(event.timestamp);
        const deltaMs = Number.isFinite(prevMs) && Number.isFinite(curMs) ? Math.max(0, curMs - prevMs) : 300;
        cumulativeMs += Math.min(deltaMs, 2000) / speed;
      }
      const id = window.setTimeout(() => {
        ingestEvent(event);
        if (index === snapshot.length - 1) {
          setReplaying(false);
        }
      }, cumulativeMs);
      timeoutIdsRef.current.push(id);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-panelborder bg-panel px-4 py-3">
      <button
        type="button"
        onClick={handleReplay}
        disabled={!canReplay}
        className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ↻ Replay
      </button>

      <div className="flex flex-1 items-center gap-2">
        <span className="text-xs text-gray-500">Speed</span>
        <input
          type="range"
          min={0.5}
          max={4}
          step={0.5}
          value={speed}
          disabled={isReplaying}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="flex-1 accent-violet-500"
        />
        <span className="w-10 text-xs text-gray-400">{speed}x</span>
      </div>

      {isReplaying && (
        <span className="animate-pulse rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          Replaying
        </span>
      )}
    </div>
  );
}
