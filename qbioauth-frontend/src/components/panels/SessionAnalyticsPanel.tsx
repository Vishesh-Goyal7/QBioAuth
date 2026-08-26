import { useMemo } from "react";
import type { ReactNode } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useProtocolStore } from "../../store/protocolStore";

const AXIS_COLOR = "#6b7280";
const GRID_COLOR = "#1f2937";
const TOOLTIP_STYLE = {
  backgroundColor: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 8,
  fontSize: 12,
  color: "#e5e7eb",
};
const AXIS_LABEL_STYLE = { fill: AXIS_COLOR, fontSize: 11 };

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-panelborder bg-[#0b0f17] p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className="h-56">{children}</div>
    </div>
  );
}

function EmptyChartNote() {
  return (
    <div className="flex h-full items-center justify-center text-xs text-gray-600">
      No data yet for this chart.
    </div>
  );
}

// Mentor-requested addition: since the backend is stateless and discards
// per-run metrics once a session ends, this history lives only in the
// Zustand store (see sessionHistory in protocolStore.ts) — it accumulates
// across every AUTHENTICATE run in this browser tab and resets on reload,
// matching the "per React session" ask.
export default function SessionAnalyticsPanel() {
  const sessionHistory = useProtocolStore((s) => s.sessionHistory);
  const clearSessionHistory = useProtocolStore((s) => s.clearSessionHistory);

  const keyLengthByRun = useMemo(
    () =>
      sessionHistory
        .filter((e) => e.keyLengthBits != null)
        .map((e) => ({ runNumber: e.runNumber, keyLengthBits: e.keyLengthBits as number })),
    [sessionHistory],
  );

  const keyLengthByEve = useMemo(
    () =>
      sessionHistory
        // Eve-on runs always plot as 0 (demo request: an active attack never
        // yields a trustworthy key, regardless of what the run's real
        // keyLengthBits happened to be) — Eve-off runs need a real completed
        // key length to plot at all.
        .filter((e) => e.eavesdropperPresent || e.keyLengthBits != null)
        .map((e) => ({
          eveLabel: e.eavesdropperPresent ? "Eve on" : "Eve off",
          keyLengthBits: e.eavesdropperPresent ? 0 : (e.keyLengthBits as number),
          runNumber: e.runNumber,
        })),
    [sessionHistory],
  );

  const qberByEve = useMemo(
    () =>
      sessionHistory
        .filter((e) => e.qberPercent != null)
        .map((e) => ({
          eveLabel: e.eavesdropperPresent ? "Eve on" : "Eve off",
          qberPercent: e.qberPercent as number,
          runNumber: e.runNumber,
        })),
    [sessionHistory],
  );

  const efficiencyByDistance = useMemo(
    () =>
      sessionHistory
        .filter((e) => e.channelEfficiency != null && e.distanceKm != null)
        .map((e) => ({
          distanceKm: e.distanceKm as number,
          efficiencyPercent: (e.channelEfficiency as number) * 100,
          runNumber: e.runNumber,
        })),
    [sessionHistory],
  );

  if (sessionHistory.length === 0) {
    return (
      <div className="rounded-lg border border-panelborder bg-panel p-4 text-sm text-gray-600">
        Session Analytics — run an authentication session to see charts here.
      </div>
    );
  }

  const completedCount = sessionHistory.filter((e) => e.outcome === "COMPLETED").length;
  const failedCount = sessionHistory.length - completedCount;

  return (
    <div className="rounded-lg border border-panelborder bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">Session Analytics</h2>
          <p className="text-xs text-gray-500">
            {sessionHistory.length} run{sessionHistory.length === 1 ? "" : "s"} this session ·{" "}
            {completedCount} completed · {failedCount} failed
          </p>
        </div>
        <button
          type="button"
          onClick={clearSessionHistory}
          className="rounded-md border border-panelborder px-2.5 py-1.5 text-xs text-gray-400 transition hover:border-red-800 hover:text-red-300"
        >
          Clear history
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Key length vs run no.">
          {keyLengthByRun.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={keyLengthByRun} margin={{ top: 5, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                <XAxis
                  dataKey="runNumber"
                  stroke={AXIS_COLOR}
                  tick={{ fontSize: 11 }}
                  label={{ value: "Run #", position: "insideBottom", offset: -2, style: AXIS_LABEL_STYLE }}
                />
                <YAxis
                  stroke={AXIS_COLOR}
                  tick={{ fontSize: 11 }}
                  width={40}
                  label={{ value: "bits", angle: -90, position: "insideLeft", style: AXIS_LABEL_STYLE }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line
                  type="monotone"
                  dataKey="keyLengthBits"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#38bdf8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartNote />
          )}
        </ChartCard>

        <ChartCard title="Key length vs Eve status">
          {keyLengthByEve.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                <XAxis dataKey="eveLabel" type="category" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="keyLengthBits"
                  stroke={AXIS_COLOR}
                  tick={{ fontSize: 11 }}
                  width={40}
                  label={{ value: "bits", angle: -90, position: "insideLeft", style: AXIS_LABEL_STYLE }}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={keyLengthByEve} fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartNote />
          )}
        </ChartCard>

        <ChartCard title="QBER vs Eve status">
          {qberByEve.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                <XAxis dataKey="eveLabel" type="category" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="qberPercent"
                  stroke={AXIS_COLOR}
                  tick={{ fontSize: 11 }}
                  width={40}
                  label={{ value: "QBER %", angle: -90, position: "insideLeft", style: AXIS_LABEL_STYLE }}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                />
                <Scatter data={qberByEve} fill="#e11d48" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartNote />
          )}
        </ChartCard>

        <ChartCard title="Channel efficiency vs distance">
          {efficiencyByDistance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 5, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
                <XAxis
                  dataKey="distanceKm"
                  type="number"
                  stroke={AXIS_COLOR}
                  tick={{ fontSize: 11 }}
                  unit="km"
                  label={{ value: "Distance (km)", position: "insideBottom", offset: -2, style: AXIS_LABEL_STYLE }}
                />
                <YAxis
                  dataKey="efficiencyPercent"
                  stroke={AXIS_COLOR}
                  tick={{ fontSize: 11 }}
                  width={40}
                  unit="%"
                  label={{ value: "Efficiency %", angle: -90, position: "insideLeft", style: AXIS_LABEL_STYLE }}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
                <Scatter data={efficiencyByDistance} fill="#a78bfa" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartNote />
          )}
        </ChartCard>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Run history</div>
        <div className="max-h-72 overflow-auto rounded-lg border border-panelborder">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-[#0b0f17] text-gray-500">
              <tr>
                <th className="px-3 py-2 font-medium">Run #</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
                <th className="px-3 py-2 font-medium">Eve</th>
                <th className="px-3 py-2 font-medium">Distance (km)</th>
                <th className="px-3 py-2 font-medium">Qubits dispatched</th>
                <th className="px-3 py-2 font-medium">Qubits received</th>
                <th className="px-3 py-2 font-medium">QBER %</th>
                <th className="px-3 py-2 font-medium">Key length (bits)</th>
                <th className="px-3 py-2 font-medium">Channel efficiency</th>
              </tr>
            </thead>
            <tbody>
              {[...sessionHistory]
                .sort((a, b) => b.runNumber - a.runNumber)
                .map((e) => (
                  <tr key={e.id} className="border-t border-panelborder text-gray-300">
                    <td className="px-3 py-1.5">{e.runNumber}</td>
                    <td
                      className={`px-3 py-1.5 font-medium ${
                        e.outcome === "COMPLETED" ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {e.outcome === "COMPLETED" ? "Completed" : "Failed"}
                    </td>
                    <td className={`px-3 py-1.5 ${e.eavesdropperPresent ? "text-rose-400" : "text-gray-500"}`}>
                      {e.eavesdropperPresent ? "On" : "Off"}
                    </td>
                    <td className="px-3 py-1.5">{e.distanceKm != null ? e.distanceKm.toFixed(1) : "—"}</td>
                    <td className="px-3 py-1.5">{e.qubitsDispatched ?? "—"}</td>
                    <td className="px-3 py-1.5">{e.qubitsReceived ?? "—"}</td>
                    <td className="px-3 py-1.5">{e.qberPercent != null ? `${e.qberPercent.toFixed(2)}%` : "—"}</td>
                    <td className="px-3 py-1.5">{e.keyLengthBits ?? "—"}</td>
                    <td className="px-3 py-1.5">
                      {e.channelEfficiency != null ? `${(e.channelEfficiency * 100).toFixed(1)}%` : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
