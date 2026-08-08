import type {
  HealthResponse,
  QkdConfigDefaultsResponse,
  SimulateScanNoiseRequest,
  SimulateScanNoiseResponse,
  SystemInfo,
  UsersResponse,
} from "../types/protocol";

export function toWsBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/^http/, "ws").replace(/\/+$/, "");
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export async function checkHealth(apiBaseUrl: string): Promise<HealthResponse> {
  const res = await fetch(`${normalizeBaseUrl(apiBaseUrl)}/health`);
  if (!res.ok) {
    throw new Error(`Health check failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function getSystemInfo(apiBaseUrl: string): Promise<SystemInfo> {
  const res = await fetch(`${normalizeBaseUrl(apiBaseUrl)}/system-info`);
  if (!res.ok) {
    throw new Error(`Failed to fetch system info: HTTP ${res.status}`);
  }
  return res.json();
}

export async function getUsers(apiBaseUrl: string): Promise<UsersResponse> {
  const res = await fetch(`${normalizeBaseUrl(apiBaseUrl)}/users`);
  if (!res.ok) {
    throw new Error(`Failed to fetch users: HTTP ${res.status}`);
  }
  return res.json();
}

export async function simulateScanNoise(
  apiBaseUrl: string,
  request: SimulateScanNoiseRequest,
): Promise<SimulateScanNoiseResponse> {
  const res = await fetch(`${normalizeBaseUrl(apiBaseUrl)}/demo/simulate-scan-noise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw new Error(`Failed to simulate scan noise: HTTP ${res.status}`);
  }
  return res.json();
}

export async function getQkdConfigDefaults(apiBaseUrl: string): Promise<QkdConfigDefaultsResponse> {
  const res = await fetch(`${normalizeBaseUrl(apiBaseUrl)}/qkd-config/defaults`);
  if (!res.ok) {
    throw new Error(`Failed to fetch QKD config defaults: HTTP ${res.status}`);
  }
  return res.json();
}

export { normalizeBaseUrl };
