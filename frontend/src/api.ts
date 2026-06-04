import { apiBaseUrl, wsBaseUrl } from "./config";
import { getCurrentIdToken } from "./firebase";

export type UserProfile = {
  id: string;
  display_name: string;
};

export type StudyMaterial = {
  id: string;
  user_id: string;
  title: string;
  source_type: "note" | "pdf" | "url" | "other";
  created_at: string;
  storage_path?: string | null;
  storage_bucket?: string | null;
  original_filename?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  ingestion_status: "not_started" | "processing" | "completed" | "failed";
  summary?: string | null;
  key_concepts: string[];
  ingested_at?: string | null;
  ingestion_error?: string | null;
};

export type ReviewItem = {
  id: string;
  user_id: string;
  concept: string;
  status: "needs_review" | "learning" | "mastered";
  created_at: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getCurrentIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const auth = await authHeaders();

  Object.entries(auth).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    const message =
      typeof detail?.detail === "string"
        ? detail.detail
        : `Request failed with ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function getMe(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/v1/me");
}

export function listStudyMaterials(): Promise<StudyMaterial[]> {
  return apiFetch<StudyMaterial[]>("/api/v1/study-materials");
}

export function uploadStudyMaterial(file: File, title: string): Promise<StudyMaterial> {
  const formData = new FormData();
  formData.set("file", file);
  if (title.trim()) {
    formData.set("title", title.trim());
  }

  return apiFetch<StudyMaterial>("/api/v1/study-materials/upload", {
    method: "POST",
    body: formData,
  });
}

export function ingestStudyMaterial(materialId: string): Promise<StudyMaterial> {
  return apiFetch<StudyMaterial>(`/api/v1/study-materials/${materialId}/ingest`, {
    method: "POST",
  });
}

export function listReviewItems(): Promise<ReviewItem[]> {
  return apiFetch<ReviewItem[]>("/api/v1/review-items");
}

export function buildWebSocketUrl(idToken: string | null): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const base = wsBaseUrl || `${protocol}://${window.location.host}`;
  const url = new URL("/api/v1/ws/voice-session", base);

  if (idToken) {
    url.searchParams.set("id_token", idToken);
  }

  return url.toString();
}
