import { useEffect, useRef, useState } from "react";
import { useProtocolStore } from "../../store/protocolStore";
import { getQkdConfigDefaults } from "../../lib/apiClient";

// These 3 render as 0–1 sliders; every other key from the API response
// renders as an integer number input. The label/unit/description/default
// text itself always comes from the API — this set only decides *which
// control* to draw, per the spec's explicit input-type guidance.
const PROBABILITY_KEYS = new Set(["z_basis_probability", "parameter_estimation_fraction", "qber_abort_threshold"]);

const INT_STEP: Record<string, { min: number; step: number }> = {
  security_margin_bits: { min: 0, step: 8 },
  reconciliation_passes: { min: 1, step: 1 },
  target_detected_events: { min: 128, step: 128 },
  transmission_batch_size: { min: 128, step: 128 },
  maximum_qkd_attempts: { min: 1, step: 1 },
};
const DEFAULT_INT_STEP = { min: 0, step: 1 };

interface QkdConfigPanelProps {
  disabled: boolean;
}

export default function QkdConfigPanel({ disabled }: QkdConfigPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const apiBaseUrl = useProtocolStore((s) => s.apiBaseUrl);
  const qkdConfigDefaults = useProtocolStore((s) => s.qkdConfigDefaults);
  const qkdConfigValues = useProtocolStore((s) => s.qkdConfigValues);
  const qkdConfigTouchedKeys = useProtocolStore((s) => s.qkdConfigTouchedKeys);
  const distanceKm = useProtocolStore((s) => s.distanceKm);
  const distanceTouched = useProtocolStore((s) => s.distanceTouched);
  const setQkdConfigDefaults = useProtocolStore((s) => s.setQkdConfigDefaults);
  const setQkdConfigValue = useProtocolStore((s) => s.setQkdConfigValue);
  const setDistanceKm = useProtocolStore((s) => s.setDistanceKm);
  const resetQkdConfigToDefaults = useProtocolStore((s) => s.resetQkdConfigToDefaults);
  const revealSecretsEnabled = useProtocolStore((s) => s.revealSecretsEnabled);
  const setRevealSecretsEnabled = useProtocolStore((s) => s.setRevealSecretsEnabled);

  useEffect(() => {
    if (!apiBaseUrl || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    getQkdConfigDefaults(apiBaseUrl)
      .then((res) => setQkdConfigDefaults(res))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [apiBaseUrl, setQkdConfigDefaults]);

  const touchedCount = qkdConfigTouchedKeys.length + (distanceTouched ? 1 : 0);

  return (
    <div className="rounded-md border border-panelborder bg-appbg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <span>
          Protocol configuration
          {touchedCount > 0 && (
            <span className="ml-2 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700 dark:bg-sky-900 dark:text-sky-300">
              {touchedCount} modified
            </span>
          )}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-panelborder p-3">
          {loading && <p className="text-xs text-gray-600">Loading defaults…</p>}
          {error && <p className="text-xs text-red-400">Could not load config defaults: {error}</p>}

          {qkdConfigDefaults && (
            <>
              {qkdConfigDefaults.parameters.map((param) => {
                const value = qkdConfigValues[param.key] ?? param.default;
                const touched = qkdConfigTouchedKeys.includes(param.key);
                const isProbability = PROBABILITY_KEYS.has(param.key);
                const intStep = INT_STEP[param.key] ?? DEFAULT_INT_STEP;

                return (
                  <div key={param.key}>
                    <label className="mb-1 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {param.label}
                        {param.unit && <span className="text-gray-600"> ({param.unit})</span>}
                        {touched && <span className="ml-1 text-sky-400">●</span>}
                      </span>
                      <span className="text-gray-400">
                        {isProbability ? value.toFixed(2) : value}
                      </span>
                    </label>
                    {isProbability ? (
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={value}
                        disabled={disabled}
                        onChange={(e) => setQkdConfigValue(param.key, Number(e.target.value))}
                        className="w-full accent-sky-500"
                      />
                    ) : (
                      <input
                        type="number"
                        min={intStep.min}
                        step={intStep.step}
                        value={value}
                        disabled={disabled}
                        onChange={(e) => setQkdConfigValue(param.key, Number(e.target.value))}
                        className="w-full rounded-md border border-panelborder bg-panel px-2 py-1 text-xs text-gray-900 outline-none focus:border-sky-500 disabled:opacity-50 dark:text-gray-100"
                      />
                    )}
                    <p className="mt-0.5 text-[10px] text-gray-600">{param.description}</p>
                  </div>
                );
              })}

              <div>
                <label className="mb-1 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Distance (km)
                    {distanceTouched && <span className="ml-1 text-sky-400">●</span>}
                  </span>
                  <span className="text-gray-400">{distanceKm}</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={distanceKm}
                  disabled={disabled}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="w-full rounded-md border border-panelborder bg-panel px-2 py-1 text-xs text-gray-900 outline-none focus:border-sky-500 disabled:opacity-50 dark:text-gray-100"
                />
                <p className="mt-0.5 text-[10px] text-gray-600">
                  Larger distances increase physical channel noise.
                </p>
              </div>

              <button
                type="button"
                onClick={resetQkdConfigToDefaults}
                disabled={disabled || touchedCount === 0}
                className="w-full rounded-md border border-panelborder px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Reset to defaults
              </button>
            </>
          )}

          {/* Deliberately separated from the QKD parameters above — this
              isn't a tuning knob, it's an occasional instructional action
              and is styled to read that way (amber, boxed, off by default,
              never persisted). */}
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-950/20">
            <label className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <input
                type="checkbox"
                checked={revealSecretsEnabled}
                onChange={(e) => setRevealSecretsEnabled(e.target.checked)}
                disabled={disabled}
                className="h-3.5 w-3.5 accent-amber-500"
              />
              Reveal secret material (instructional demo)
            </label>
            <p className="mt-1 text-[10px] leading-snug text-gray-500">
              Shows the actual derived keys on screen. For teaching/demo purposes only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
