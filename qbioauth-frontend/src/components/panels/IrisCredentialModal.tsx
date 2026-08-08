import { useState } from "react";
import { useProtocolStore } from "../../store/protocolStore";

// The v2 proof point: the server never retains the raw iris code, so this
// is the ONLY place it's ever shown. Deliberately weighted like a modal
// (not a quiet event-log row) so it can't be missed or scrolled past.
export default function IrisCredentialModal() {
  const credential = useProtocolStore((s) => s.issuedIrisCredential);
  const dismiss = useProtocolStore((s) => s.dismissIssuedIrisCredential);
  const [copied, setCopied] = useState(false);

  if (!credential) return null;

  async function handleCopy() {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(credential.iris_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the code is still visible to
      // select/copy manually, so this isn't fatal.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-emerald-800 bg-panel p-6 shadow-2xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">🔑</span>
          <h2 className="text-lg font-semibold text-gray-100">Your iris credential</h2>
        </div>

        <p className="mb-3 rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-sm text-amber-300">
          {credential.warning}
        </p>

        <label className="mb-1 block text-xs text-gray-500">
          Iris code {credential.email && <span className="text-gray-600">— {credential.email}</span>}
        </label>
        <div className="mb-2 max-h-32 overflow-y-auto rounded-md border border-panelborder bg-[#0b0f17] p-3">
          <p className="break-all font-mono text-xs text-emerald-300">{credential.iris_code}</p>
        </div>

        <p className="mb-4 text-[11px] text-gray-600">
          Fingerprint: <span className="font-mono">{credential.iris_fingerprint}</span>
        </p>

        <p className="mb-4 text-xs text-gray-500">
          This has also been cached in this browser's local storage so you don't have to re-paste
          it to authenticate in this session — but that's a convenience, not a backup. The server
          holds none of it, and this browser is not guaranteed to either.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
          >
            {copied ? "Copied ✓" : "Copy to clipboard"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
          >
            Got it — I've saved this
          </button>
        </div>
      </div>
    </div>
  );
}
