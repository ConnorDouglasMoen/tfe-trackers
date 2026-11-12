import { getPluginId } from "./getPluginId";

/**
 * Pinned token IDs live in localStorage rather than player metadata: player
 * metadata is cleared on refresh, while localStorage persists and stays
 * private to each user's browser. The background page and the Action panel
 * share an origin, so writes from one fire a `storage` event in the other.
 */
export const TRACKED_TOKENS_STORAGE_KEY = getPluginId("trackedTokenIds");

export function loadTrackedTokenIds(): string[] {
  try {
    const raw = localStorage.getItem(TRACKED_TOKENS_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveTrackedTokenIds(ids: string[]): void {
  try {
    localStorage.setItem(TRACKED_TOKENS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage can be unavailable (private browsing, quota); pinning is best-effort.
  }
}

/** Pin the token if it isn't pinned, otherwise unpin it. */
export function toggleTrackedTokenId(id: string): void {
  const current = loadTrackedTokenIds();
  saveTrackedTokenIds(
    current.includes(id) ? current.filter((tid) => tid !== id) : [...current, id],
  );
}

export function removeTrackedTokenId(id: string): void {
  const current = loadTrackedTokenIds();
  if (current.includes(id)) saveTrackedTokenIds(current.filter((tid) => tid !== id));
}
