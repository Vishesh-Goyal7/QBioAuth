import { useState } from "react";
import { useProtocolStore } from "../../store/protocolStore";
import type { useProtocolSession } from "../../hooks/useProtocolSession";
import { getSavedIrisCode } from "../../lib/irisCredentialStorage";
import { simulateScanNoise } from "../../lib/apiClient";
import type { QkdRunConfigurationOverrides, SimulateScanNoiseResponse } from "../../types/protocol";
import QkdConfigPanel from "./QkdConfigPanel";

interface ControlBarProps {
  session: ReturnType<typeof useProtocolSession>;
}

type Tab = "ENROLL" | "AUTHENTICATE";

export default function ControlBar({ session }: ControlBarProps) {
  const [tab, setTab] = useState<Tab>("ENROLL");
  const sessionOutcome = useProtocolStore((s) => s.sessionOutcome);
  const isReplaying = useProtocolStore((s) => s.isReplaying);
  const apiBaseUrl = useProtocolStore((s) => s.apiBaseUrl);
  const disabled = sessionOutcome === "IN_PROGRESS" || isReplaying;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [authEmail, setAuthEmail] = useState("");
  const [irisCode, setIrisCode] = useState("");
  const [irisCodeError, setIrisCodeError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [bitErrorRate, setBitErrorRate] = useState(0.01);
  const [rotationBits, setRotationBits] = useState(0);
  const [eavesdropperPresent, setEavesdropperPresent] = useState(false);

  const [noiseLoading, setNoiseLoading] = useState(false);
  const [noiseError, setNoiseError] = useState<string | null>(null);
  const [noisePreview, setNoisePreview] = useState<SimulateScanNoiseResponse | null>(null);

  const qkdConfigValues = useProtocolStore((s) => s.qkdConfigValues);
  const qkdConfigTouchedKeys = useProtocolStore((s) => s.qkdConfigTouchedKeys);
  const distanceKm = useProtocolStore((s) => s.distanceKm);
  const distanceTouched = useProtocolStore((s) => s.distanceTouched);
  const revealSecretsEnabled = useProtocolStore((s) => s.revealSecretsEnabled);

  const savedIrisCode = getSavedIrisCode(authEmail);

  function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || disabled) return;
    session.startEnroll(name.trim(), email.trim());
  }

  function handleAuthenticate(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;
    if (!authEmail.trim()) return;
    if (!irisCode.trim()) {
      setIrisCodeError("Iris code is required — MISSING_IRIS_CODE");
      return;
    }
    setIrisCodeError(null);

    // Only send configuration/distance_km if the user actually touched the
    // panel — omit them entirely so the backend uses its own defaults
    // rather than us echoing back a full object of unchanged values.
    let configuration: QkdRunConfigurationOverrides | undefined;
    if (qkdConfigTouchedKeys.length > 0) {
      configuration = {};
      for (const key of qkdConfigTouchedKeys) {
        (configuration as Record<string, number>)[key] = qkdConfigValues[key];
      }
    }

    session.startAuthenticate({
      email: authEmail.trim(),
      iris_code: irisCode.trim(),
      eavesdropper_present: eavesdropperPresent,
      ...(configuration ? { configuration } : {}),
      ...(distanceTouched ? { distance_km: distanceKm } : {}),
      // Only ever included when explicitly toggled on for this run — never
      // sent as false, and startNewSession resets the toggle immediately
      // after this fires so it can't silently carry into the next run.
      ...(revealSecretsEnabled ? { reveal_secrets: true } : {}),
    });
  }

  function handleAutofill() {
    if (savedIrisCode) {
      setIrisCode(savedIrisCode);
      setIrisCodeError(null);
    }
  }

  async function handleSimulateNoise() {
    if (!apiBaseUrl || !irisCode.trim()) return;
    setNoiseLoading(true);
    setNoiseError(null);
    setNoisePreview(null);
    try {
      const result = await simulateScanNoise(apiBaseUrl, {
        iris_code: irisCode.trim(),
        bit_error_rate: bitErrorRate,
        rotation_bits: rotationBits,
      });
      setNoisePreview(result);
    } catch (err) {
      setNoiseError(err instanceof Error ? err.message : "Failed to simulate scan noise");
    } finally {
      setNoiseLoading(false);
    }
  }

  function applyNoisyCode() {
    if (noisePreview) {
      setIrisCode(noisePreview.noisy_iris_code);
      setNoisePreview(null);
      setIrisCodeError(null);
    }
  }

  return (
    <div className="rounded-lg border border-panelborder bg-panel p-4">
      <div className="mb-4 flex gap-2 border-b border-panelborder pb-3">
        <button
          type="button"
          onClick={() => setTab("ENROLL")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === "ENROLL" ? "bg-sky-600 text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Enroll
        </button>
        <button
          type="button"
          onClick={() => setTab("AUTHENTICATE")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            tab === "AUTHENTICATE" ? "bg-sky-600 text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Authenticate
        </button>
      </div>

      {tab === "ENROLL" ? (
        <form onSubmit={handleEnroll} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={disabled}
              className="w-full rounded-md border border-panelborder bg-appbg px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 disabled:opacity-50 dark:text-gray-100"
              placeholder="Ada Lovelace"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
              className="w-full rounded-md border border-panelborder bg-appbg px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 disabled:opacity-50 dark:text-gray-100"
              placeholder="ada@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled ? "Session in progress…" : "Start enrollment"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleAuthenticate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              type="email"
              required
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              disabled={disabled}
              className="w-full rounded-md border border-panelborder bg-appbg px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-500 disabled:opacity-50 dark:text-gray-100"
              placeholder="ada@example.com"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-xs text-gray-500">
                Iris code <span className="text-red-500">*</span>
              </label>
              {savedIrisCode && (
                <button
                  type="button"
                  onClick={handleAutofill}
                  disabled={disabled}
                  className="text-[10px] font-medium text-sky-600 hover:text-sky-500 disabled:opacity-50 dark:text-sky-400 dark:hover:text-sky-300"
                >
                  Autofill from saved enrollment
                </button>
              )}
            </div>
            <textarea
              required
              rows={3}
              value={irisCode}
              onChange={(e) => {
                setIrisCode(e.target.value);
                if (e.target.value.trim()) setIrisCodeError(null);
                setNoisePreview(null);
              }}
              disabled={disabled}
              className={`w-full resize-none rounded-md border bg-appbg px-3 py-2 font-mono text-xs text-gray-900 outline-none focus:border-sky-500 disabled:opacity-50 dark:text-gray-100 ${
                irisCodeError ? "border-red-700" : "border-panelborder"
              }`}
              placeholder="The iris code shown when you enrolled…"
            />
            {irisCodeError && <p className="mt-1 text-[11px] text-red-400">{irisCodeError}</p>}
            <p className="mt-1 text-[10px] text-gray-600">
              The server never stores this — you (or this browser's saved copy) are the only
              source for it.
            </p>
          </div>

          <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
            <label className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
              <input
                type="checkbox"
                checked={eavesdropperPresent}
                onChange={(e) => setEavesdropperPresent(e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-red-500"
              />
              Simulate intercept-resend attack (Eve)
            </label>
            <p className="mt-1 text-[11px] leading-snug text-gray-400">
              Simulates a real intercept-resend attack against the quantum channel. The protocol
              should detect it via a QBER spike and abort the session — this is a genuine attack
              simulation, not a scripted failure.
            </p>
          </div>

          <QkdConfigPanel disabled={disabled} />

          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="text-xs font-medium text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300"
          >
            {advancedOpen ? "Hide advanced ▲" : "Advanced ▼"}
          </button>

          {advancedOpen && (
            <div className="space-y-3 rounded-md border border-panelborder bg-appbg p-3">
              <div>
                <div className="mb-1 text-xs font-medium text-gray-400">Simulate imperfect scan</div>
                <p className="mb-2 text-[10px] text-gray-600">
                  Calls the backend to apply scan noise to the iris code above, so you can
                  demonstrate the fuzzy extractor's error tolerance before submitting.
                </p>
                <label className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Bit error rate</span>
                  <span className="text-gray-400">{bitErrorRate.toFixed(3)}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={0.2}
                  step={0.005}
                  value={bitErrorRate}
                  onChange={(e) => setBitErrorRate(Number(e.target.value))}
                  disabled={disabled}
                  className="w-full accent-sky-500"
                />
              </div>
              <div>
                <label className="mb-1 flex justify-between text-xs text-gray-500">
                  <span>Rotation bits</span>
                  <span className="text-gray-400">{rotationBits}</span>
                </label>
                <input
                  type="range"
                  min={-8}
                  max={8}
                  step={1}
                  value={rotationBits}
                  onChange={(e) => setRotationBits(Number(e.target.value))}
                  disabled={disabled}
                  className="w-full accent-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={handleSimulateNoise}
                disabled={disabled || !irisCode.trim() || noiseLoading}
                className="w-full rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {noiseLoading ? "Simulating…" : "Simulate imperfect scan"}
              </button>

              {noiseError && <p className="text-[11px] text-red-400">{noiseError}</p>}

              {noisePreview && (
                <div className="space-y-2 rounded-md border border-violet-300 bg-violet-50 p-2 dark:border-violet-800 dark:bg-violet-950/30">
                  <p className="break-all font-mono text-[10px] text-violet-800 dark:text-violet-200">
                    {noisePreview.noisy_iris_code}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    actual BER {(noisePreview.actual_bit_error_rate * 100).toFixed(2)}% ·{" "}
                    {noisePreview.changed_bits} bits changed · rotated{" "}
                    {noisePreview.applied_rotation_bits}
                  </p>
                  <button
                    type="button"
                    onClick={applyNoisyCode}
                    className="w-full rounded-md bg-violet-700 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-violet-600"
                  >
                    Use this noisy code
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={disabled}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disabled ? "Session in progress…" : "Start authentication"}
          </button>
        </form>
      )}
    </div>
  );
}
