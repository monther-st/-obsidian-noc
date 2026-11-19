/*
 * Data adapter boundary.
 * Demo mode returns local data. Replace these functions with REST calls
 * when a backend exists. Keep the same response shape for the UI.
 */
import { seedSites, seedIncidents } from "./data.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

async function request(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) throw new Error(`API ${response.status}: ${path}`);
  return response.json();
}

export async function loadSites() {
  if (USE_MOCK) return structuredClone(seedSites);
  return request("/api/v1/sites");
}

export async function loadIncidents() {
  if (USE_MOCK) return structuredClone(seedIncidents);
  return request("/api/v1/incidents");
}

export function openTelemetryStream(onMessage, onStatus) {
  if (USE_MOCK) {
    onStatus?.("simulated");
    return { close() {} };
  }
  const socket = new WebSocket(import.meta.env.VITE_WS_URL);
  socket.addEventListener("open", () => onStatus?.("connected"));
  socket.addEventListener("message", event => {
    try { onMessage(JSON.parse(event.data)); } catch { /* ignore malformed payload */ }
  });
  socket.addEventListener("close", () => onStatus?.("disconnected"));
  socket.addEventListener("error", () => onStatus?.("disconnected"));
  return socket;
}
