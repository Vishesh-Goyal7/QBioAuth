import { useState } from "react";
import { useProtocolStore } from "../../store/protocolStore";

function CopyableField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — value is still visible to select/copy.
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[10px] font-medium text-amber-400 hover:text-amber-300"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="break-all rounded bg-black/30 px-2 py-1.5 font-mono text-[11px] text-amber-200">{value}</p>
    </div>
  );
}

// v4: opt-in, instructional-demo-only. This is the ONLY component in the
// app that ever renders raw derived key material, and it only ever
// appears when KEY_DERIVATION.RAW_SECRETS_REVEALED actually fires — no
// other path (settings, debug console, etc.) may surface this data.
export default function RevealedSecretsPanel() {
  const revealed = useProtocolStore((s) => s.revealedSecrets);
  const visible = useProtocolStore((s) => s.revealedSecretsVisible);
  const dismiss = useProtocolStore((s) => s.dismissRevealedSecrets);

  if (!revealed || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-xl border-2 border-amber-500 bg-panel shadow-[0_0_30px_rgba(245,158,11,0.4)]">
        <div className="flex items-center justify-between rounded-t-lg bg-amber-500 px-4 py-1.5">
          <span className="text-xs font-bold tracking-wide text-black">⚠ DEMO — SENSITIVE</span>
          <span className="text-xs font-bold tracking-wide text-black">INSTRUCTIONAL ONLY</span>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          <h2 className="mb-3 text-lg font-semibold text-amber-300">Raw session secrets revealed</h2>

          <p className="mb-4 rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
            {revealed.warning}
          </p>

          <div className="space-y-3">
            <div>
              <CopyableField
                label={`QKD-derived secret, pre-HKDF (${revealed.qkd_raw_secret_bits} bits)`}
                value={revealed.qkd_raw_secret_hex}
              />
            </div>
            <CopyableField label="Terminal → Server key" value={revealed.keys.terminal_to_server_key_hex} />
            <CopyableField label="Server → Terminal key" value={revealed.keys.server_to_terminal_key_hex} />
            <CopyableField
              label="Terminal → Server nonce base"
              value={revealed.keys.terminal_to_server_nonce_base_hex}
            />
            <CopyableField
              label="Server → Terminal nonce base"
              value={revealed.keys.server_to_terminal_nonce_base_hex}
            />
            <CopyableField label="Confirmation key" value={revealed.keys.confirmation_key_hex} />
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="mt-5 w-full rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-black transition hover:bg-amber-500"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
