import OBR from "@owlbear-rodeo/sdk";
import { create } from "zustand";
import { getPluginId } from "./getPluginId";

/**
 * localStorage key for the list of token IDs pinned to the Action panel.
 *
 * We use localStorage (not OBR player metadata) because player metadata is
 * session-scoped and does not persist across page refreshes. localStorage is
 * private per-browser, persists indefinitely, and requires no OBR API calls.
 *
 * The key is namespaced by plugin ID to avoid collisions.
 */
const STORAGE_KEY = getPluginId("trackedTokenIds");

/** Read the tracked token ID list from localStorage. */
function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

/** Write the tracked token ID list to localStorage. */
function saveToStorage(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage errors (e.g. private browsing quota exceeded).
  }
}

interface TrackedTokensState {
  /** OBR item IDs of tokens pinned to the Action panel by this user. */
  trackedTokenIds: string[];

  /**
   * Load initial state from localStorage and subscribe to OBR player changes
   * to prune stale IDs when the player reconnects to a different scene.
   * Call once on mount. Returns an unsubscribe function for cleanup.
   */
  init: () => () => void;

  /** Add a token ID to the tracked list (no-op if already present). */
  trackToken: (id: string) => void;

  /** Remove a token ID from the tracked list (no-op if not present). */
  untrackToken: (id: string) => void;

  /** Returns true if the given token ID is currently tracked. */
  isTracked: (id: string) => boolean;

  /**
   * Remove any tracked IDs that are no longer present in the live scene.
   *
   * Called by the Action panel whenever the items list changes. This prevents
   * stale IDs from accumulating in localStorage when tokens are deleted from
   * the scene. Silent and automatic — no user-visible confirmation required.
   *
   * @param liveItemIds - The full set of item IDs currently in the scene.
   */
  pruneStaleIds: (liveItemIds: string[]) => void;
}

export const useTrackedTokensStore = create<TrackedTokensState>()((set, get) => ({
  trackedTokenIds: [],

  init: () => {
    // Load immediately from localStorage — synchronous, no async wait.
    set({ trackedTokenIds: loadFromStorage() });

    // Listen for storage events fired by other frames (e.g. the background
    // script's context menu onClick writes to localStorage, which triggers
    // a 'storage' event in the Action panel iframe).
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        set({ trackedTokenIds: loadFromStorage() });
      }
    };
    window.addEventListener("storage", handleStorage);

    // Also re-read on any player change as a secondary sync mechanism
    // (covers same-frame writes that don't fire storage events).
    const unsubscribePlayer = OBR.player.onChange(() => {
      set({ trackedTokenIds: loadFromStorage() });
    });

    return () => {
      window.removeEventListener("storage", handleStorage);
      unsubscribePlayer();
    };
  },

  trackToken: (id: string) => {
    const current = get().trackedTokenIds;
    if (current.includes(id)) return;
    const next = [...current, id];
    saveToStorage(next);
    set({ trackedTokenIds: next });
  },

  untrackToken: (id: string) => {
    const current = get().trackedTokenIds;
    if (!current.includes(id)) return;
    const next = current.filter((tid) => tid !== id);
    saveToStorage(next);
    set({ trackedTokenIds: next });
  },

  isTracked: (id: string) => get().trackedTokenIds.includes(id),

  pruneStaleIds: (liveItemIds: string[]) => {
    const current = get().trackedTokenIds;
    const liveSet = new Set(liveItemIds);
    const next = current.filter((id) => liveSet.has(id));
    // Skip the write if nothing changed to avoid unnecessary re-renders and
    // localStorage churn.
    if (next.length === current.length) return;
    saveToStorage(next);
    set({ trackedTokenIds: next });
  },
}));
