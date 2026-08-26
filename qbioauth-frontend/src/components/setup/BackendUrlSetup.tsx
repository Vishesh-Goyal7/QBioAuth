import { useState } from "react";
import { checkHealth } from "../../lib/apiClient";
import { useProtocolStore } from "../../store/protocolStore";
import { useThemeStore } from "../../store/themeStore";
import type { HealthResponse } from "../../types/protocol";

interface BackendUrlSetupProps {
  onConnected?: (health: HealthResponse) => void;
}

export default function BackendUrlSetup({ onConnected }: BackendUrlSetupProps) {
  const setApiBaseUrl = useProtocolStore((s) => s.setApiBaseUrl);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setStatus("checking");
    setErrorMessage(null);
    try {
      const health = await checkHealth(url);
      if (health.status !== "ok") {
        throw new Error("Backend responded but reported an unhealthy status.");
      }
      setApiBaseUrl(url);
      setStatus("idle");
      onConnected?.(health);
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? `Could not reach that backend: ${err.message}`
          : "Could not reach that backend.",
      );
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-appbg px-4">
      <button
        type="button"
        onClick={toggleTheme}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="absolute right-4 top-4 rounded-md border border-panelborder px-2.5 py-1.5 text-sm transition hover:bg-black/5 dark:hover:bg-white/5"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>
      <div className="w-full max-w-md rounded-xl border border-panelborder bg-panel p-8 shadow-2xl">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Connect to QBioAuth backend</h1>
        <p className="mt-2 text-sm text-gray-500">
          Paste the current tunnel URL from your Colab runtime (e.g.{" "}
          <span className="font-mono text-gray-700 dark:text-gray-300">https://random-words.trycloudflare.com</span>).
          This changes every time the Colab runtime restarts, so you'll do this at the start of
          every session.
        </p>
        <form onSubmit={handleConnect} className="mt-6 space-y-3">
          <input
            type="url"
            required
            placeholder="https://your-tunnel.trycloudflare.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-panelborder bg-appbg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-sky-500 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={status === "checking"}
            className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "checking" ? "Connecting…" : "Connect"}
          </button>
        </form>
        {status === "error" && errorMessage && (
          <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
