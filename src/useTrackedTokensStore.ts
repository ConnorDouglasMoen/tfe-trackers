import OBR from "@owlbear-rodeo/sdk";
import { create } from "zustand";
import { getPluginId } from "./getPluginId";

/**
 * Scene metadata key for the list of token IDs pinned to the Action panel.
 * GM-only: stored in scene metadata so it persists per-scene.
 */
const TRACKED_TOKENS_METADATA_ID = "trackedTokenIds";

interface TrackedTokensState {
  /** OBR item IDs of tokens pinned to the Action panel. */
  trackedTokenIds: string[];

  /**
   * Subscribe to scene metadata and load the initial list.
   * Call once on mount inside the Action panel.
   * Returns an unsubscribe function for cleanup.
   */
  init: () => () => void;

  /** Add a token ID to the tracked list (no-op if already present). */
  trackToken: (id: string) => Promise<void>;

  /** Remove a token ID from the tracked list (no-op if not present). */
  untrackToken: (id: string) => Promise<void>;

  /** Returns true if the given token ID is currently tracked. */
  isTracked: (id: string) => boolean;
}

export const useTrackedTokensStore = create<TrackedTokensState>()((set, get) => ({
  trackedTokenIds: [],

  init: () => {
    // Read current scene metadata and start listening for changes.
    const key = getPluginId(TRACKED_TOKENS_METADATA_ID);

    const applyMetadata = (metadata: Record<string, unknown>) => {
      const raw = metadata[key];
      const ids: string[] = Array.isArray(raw)
        ? (raw as unknown[]).filter((v): v is string => typeof v === "string")
        : [];
      set({ trackedTokenIds: ids });
    };

    // Load initial value.
    void OBR.scene.getMetadata().then(applyMetadata);

    // Subscribe to future changes; returns an unsubscribe function.
    return OBR.scene.onMetadataChange(applyMetadata);
  },

  trackToken: async (id: string) => {
    const current = get().trackedTokenIds;
    if (current.includes(id)) return;
    const next = [...current, id];
    await OBR.scene.setMetadata({
      [getPluginId(TRACKED_TOKENS_METADATA_ID)]: next,
    });
    // Local state will be updated via the onMetadataChange listener.
  },

  untrackToken: async (id: string) => {
    const current = get().trackedTokenIds;
    if (!current.includes(id)) return;
    const next = current.filter((tid) => tid !== id);
    await OBR.scene.setMetadata({
      [getPluginId(TRACKED_TOKENS_METADATA_ID)]: next,
    });
  },

  isTracked: (id: string) => get().trackedTokenIds.includes(id),
}));
