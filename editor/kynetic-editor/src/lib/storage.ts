const STORAGE_KEY = "kynetic_editor_aws_config";

export interface StoredAwsConfig {
  apiUrl: string;
  apiKey: string;
}

export function loadStoredAwsConfig(): StoredAwsConfig | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAwsConfig>;
    if (typeof parsed.apiUrl !== "string" || typeof parsed.apiKey !== "string") {
      return null;
    }
    return { apiUrl: parsed.apiUrl, apiKey: parsed.apiKey };
  } catch {
    return null;
  }
}

export function saveStoredAwsConfig(config: StoredAwsConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export function clearStoredAwsConfig(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
