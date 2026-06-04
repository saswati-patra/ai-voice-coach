export type FrontendAuthMode = "dev" | "firebase";

function readAuthMode(): FrontendAuthMode {
  return import.meta.env.VITE_AUTH_MODE === "firebase" ? "firebase" : "dev";
}

export const authMode = readAuthMode();
export const requiresFirebaseAuth = authMode === "firebase";
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
export const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || "";

export function displayTarget(value: string): string {
  return value || "same origin";
}
