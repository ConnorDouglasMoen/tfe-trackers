import { create } from "zustand";
import {
  TRACKED_TOKENS_STORAGE_KEY,
  loadTrackedTokenIds,
  saveTrackedTokenIds,
} from "./trackedTokenStorage";

interface TrackedTokensState {
  /** OBR item IDs of tokens pinned to the Action panel, in display order. */
  trackedTokenIds: string[];

  /**
   * Load the list from localStorage and follow changes made by other frames
   * (e.g. the background page's pin context menu). Returns an unsubscribe fn.
   */
  init: () => () => void;
  trackToken: (id: string) => void;
  untrackToken: (id: string) => void;
  isTracked: (id: string) => boolean;

  /**
   * Drop IDs that are no longer in the scene. An empty list is ignored because
   * it means the scene items haven't loaded yet, not that every token is gone.
   */
  pruneStaleIds: (liveItemIds: string[]) => void;

  /** Apply a new ordering. Ignored unless `ids` holds exactly the current IDs. */
  reorderTokens: (ids: string[]) => void;
}

export const useTrackedTokensStore = create<TrackedTokensState>()((set, get) => {
  const update = (trackedTokenIds: string[]) => {
    saveTrackedTokenIds(trackedTokenIds);
    set({ trackedTokenIds });
  };

  return {
    trackedTokenIds: [],

    init: () => {
      set({ trackedTokenIds: loadTrackedTokenIds() });

      const handleStorage = (e: StorageEvent) => {
        if (e.key === TRACKED_TOKENS_STORAGE_KEY) {
          set({ trackedTokenIds: loadTrackedTokenIds() });
        }
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    },

    trackToken: (id) => {
      const current = get().trackedTokenIds;
      if (!current.includes(id)) update([...current, id]);
    },

    untrackToken: (id) => {
      const current = get().trackedTokenIds;
      if (current.includes(id)) update(current.filter((tid) => tid !== id));
    },

    isTracked: (id) => get().trackedTokenIds.includes(id),

    reorderTokens: (ids) => {
      const current = get().trackedTokenIds;
      if (ids.length !== current.length || !ids.every((id) => current.includes(id))) return;
      update(ids);
    },

    pruneStaleIds: (liveItemIds) => {
      if (liveItemIds.length === 0) return;
      const current = get().trackedTokenIds;
      const liveSet = new Set(liveItemIds);
      const next = current.filter((id) => liveSet.has(id));
      if (next.length !== current.length) update(next);
    },
  };
});
