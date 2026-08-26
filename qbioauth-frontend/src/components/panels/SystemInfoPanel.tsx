import { useEffect, useState } from "react";
import { getSystemInfo } from "../../lib/apiClient";
import { useProtocolStore } from "../../store/protocolStore";
import type { SystemInfo } from "../../types/protocol";

export default function SystemInfoPanel() {
  const apiBaseUrl = useProtocolStore((s) => s.apiBaseUrl);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiBaseUrl) return;
    let cancelled = false;
    getSystemInfo(apiBaseUrl)
      .then((res) => {
        if (!cancelled) setInfo(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  if (error) {
    return (
      <div className="rounded-lg border border-panelborder bg-panel p-4 text-sm text-red-400">
        Could not load protocol info: {error}
      </div>
    );
  }

  if (!info) {
    return (
      <div className="rounded-lg border border-panelborder bg-panel p-4 text-sm text-gray-600">
        Loading protocol info…
      </div>
    );
  }

  const rows: [string, string | number][] = [
    ["Protocol", `${info.protocol_name} v${info.protocol_version}`],
    ["Signature algorithm", info.signature_algorithm],
    ["Iris code length", `${info.iris_code_length_bits} bits`],
    ["AES algorithm", info.aes_algorithm],
    ["KDF", info.kdf],
    ["Terminal ID", info.terminal_id],
    ["Server ID", info.server_id],
  ];

  return (
    <div className="rounded-lg border border-panelborder bg-panel p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        About this protocol
      </div>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-gray-500">{label}</dt>
            <dd className="truncate text-right font-mono text-gray-700 dark:text-gray-300">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
