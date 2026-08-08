// Convenience cache only — not the source of truth for a user's iris
// credential. The user is meant to hold onto the code themselves (that's
// the whole point of the v2 "server never retains raw biometrics" change).
// This just saves them re-pasting it within the same browser/session.
const STORAGE_KEY = "qbioauth_iris_credentials";

interface StoredIrisCredential {
  iris_code: string;
  iris_fingerprint: string;
  saved_at: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAll(): Record<string, StoredIrisCredential> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredIrisCredential>) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, StoredIrisCredential>): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveIrisCredential(email: string, irisCode: string, irisFingerprint: string): void {
  const all = readAll();
  all[normalizeEmail(email)] = {
    iris_code: irisCode,
    iris_fingerprint: irisFingerprint,
    saved_at: new Date().toISOString(),
  };
  writeAll(all);
}

export function getSavedIrisCode(email: string): string | null {
  if (!email.trim()) return null;
  return readAll()[normalizeEmail(email)]?.iris_code ?? null;
}
