import BackendUrlSetup from "./components/setup/BackendUrlSetup";
import ProtocolDiagram from "./components/diagram/ProtocolDiagram";
import MetricCards from "./components/panels/MetricCards";
import EventLog from "./components/panels/EventLog";
import SystemInfoPanel from "./components/panels/SystemInfoPanel";
import IrisCredentialModal from "./components/panels/IrisCredentialModal";
import RevealedSecretsPanel from "./components/panels/RevealedSecretsPanel";
import SessionAnalyticsPanel from "./components/panels/SessionAnalyticsPanel";
import ControlBar from "./components/controls/ControlBar";
import MessageComposer from "./components/controls/MessageComposer";
import ReplayControls from "./components/controls/ReplayControls";
import { useProtocolStore } from "./store/protocolStore";
import { useProtocolSession } from "./hooks/useProtocolSession";
import { PHASE_LABELS } from "./lib/edgeVisualState";

function SessionStatusBanner() {
  const sessionOutcome = useProtocolStore((s) => s.sessionOutcome);
  const lastFailure = useProtocolStore((s) => s.lastFailure);
  const sessionEntry = useProtocolStore((s) => s.phaseState.SESSION);
  const mode = useProtocolStore((s) => s.mode);

  if (!sessionOutcome || sessionOutcome === "IN_PROGRESS") return null;

  if (sessionOutcome === "COMPLETED") {
    const payload = sessionEntry?.latestEvent.payload as Record<string, unknown> | undefined;
    const detail =
      mode === "ENROLL"
        ? `public key fingerprint ${String(payload?.public_key_fingerprint ?? "")}`
        : `estimated QBER ${((payload?.estimated_qber as number | undefined ?? 0) * 100).toFixed(2)}% · ${payload?.final_key_bits ?? "?"}-bit session key`;
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
        {mode === "ENROLL" ? "Enrollment complete" : "Authentication complete — secure channel ready"} — {detail}
      </div>
    );
  }

  const failedAtPhase = lastFailure?.failedAtPhase;
  const phaseLabel = failedAtPhase && failedAtPhase in PHASE_LABELS ? PHASE_LABELS[failedAtPhase as keyof typeof PHASE_LABELS] : failedAtPhase;

  if (lastFailure?.code === "EAVESDROPPER_DETECTED") {
    return (
      <div className="animate-pulse rounded-lg border-2 border-rose-400 bg-rose-950 px-4 py-3 text-sm font-bold text-rose-200 shadow-[0_0_20px_rgba(225,29,72,0.5)]">
        🚨 ATTACK DETECTED — intercept-resend attack confirmed via QBER spike. Session aborted before
        any key material was derived.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300">
      Session failed{phaseLabel ? ` at ${phaseLabel}` : ""} — {lastFailure?.message ?? "Unknown failure"}
    </div>
  );
}

function RunParametersSummary() {
  const runParameters = useProtocolStore((s) => s.runParameters);
  if (!runParameters) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="rounded bg-panel px-2 py-1 font-mono">
        {runParameters.distanceKm} km · Eve: {runParameters.eavesdropperPresent ? "ON" : "off"}
      </span>
      <span className="text-gray-700">
        {runParameters.source === "requested" ? "(requested)" : "(effective)"}
      </span>
    </div>
  );
}

function ConnectionBanner({ onReconnect }: { onReconnect: () => void }) {
  const connectionStatus = useProtocolStore((s) => s.connectionStatus);
  if (connectionStatus !== "ERROR") return null;

  return (
    <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between rounded-lg border border-amber-700 bg-amber-950/90 px-4 py-2 text-sm text-amber-200 shadow-lg">
      <span>Connection lost.</span>
      <button
        type="button"
        onClick={onReconnect}
        className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-500"
      >
        Reconnect
      </button>
    </div>
  );
}

function BackendUrlFooter() {
  const apiBaseUrl = useProtocolStore((s) => s.apiBaseUrl);
  const clearApiBaseUrl = useProtocolStore((s) => s.clearApiBaseUrl);
  const connectionStatus = useProtocolStore((s) => s.connectionStatus);

  const dotClass =
    connectionStatus === "CONNECTED"
      ? "bg-emerald-400"
      : connectionStatus === "CONNECTING"
        ? "bg-amber-400 animate-pulse"
        : connectionStatus === "ERROR"
          ? "bg-red-400"
          : "bg-gray-600";

  return (
    <footer className="flex items-center justify-between border-t border-panelborder px-4 py-2 text-xs text-gray-500">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className="font-mono">{apiBaseUrl}</span>
      </div>
      <button type="button" onClick={clearApiBaseUrl} className="text-sky-400 hover:text-sky-300">
        Change backend
      </button>
    </footer>
  );
}

function MainApp() {
  const session = useProtocolSession();

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f17]">
      <header className="flex items-center justify-between border-b border-panelborder px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">QBioAuth</h1>
          <p className="text-xs text-gray-500">Biometric + PQC + QKD + AES mutual authentication — live demo</p>
        </div>
      </header>

      <main className="flex h-[calc(100vh-64px)] shrink-0 gap-4 overflow-hidden p-4">
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto">
          <SystemInfoPanel />
          <ControlBar session={session} />
        </aside>

        <section className="flex flex-1 flex-col gap-4 overflow-hidden">
          <SessionStatusBanner />
          <RunParametersSummary />
          <div className="relative min-h-0 flex-1">
            <ConnectionBanner onReconnect={session.reconnect} />
            <ProtocolDiagram />
          </div>
          <MetricCards />
          <ReplayControls />
        </section>

        <aside className="flex w-96 shrink-0 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1">
            <EventLog />
          </div>
          <div className="h-72 shrink-0">
            <MessageComposer session={session} />
          </div>
        </aside>
      </main>

      <div className="px-4 pb-4">
        <SessionAnalyticsPanel />
      </div>

      <BackendUrlFooter />
      <IrisCredentialModal />
      <RevealedSecretsPanel />
    </div>
  );
}

function App() {
  const apiBaseUrl = useProtocolStore((s) => s.apiBaseUrl);

  if (!apiBaseUrl) {
    return <BackendUrlSetup />;
  }

  return <MainApp />;
}

export default App;
