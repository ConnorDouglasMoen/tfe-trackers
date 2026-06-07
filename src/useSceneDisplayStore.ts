import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { create } from "zustand";
import { DisplaySettings, DEFAULT_DISPLAY_SETTINGS } from "./characterDataHelpers";
import { getPluginId } from "./getPluginId";

export const SCENE_DISPLAY_METADATA_ID = "sceneDisplaySettings";

interface SceneDisplayState {
  settings: DisplaySettings;
  setSettings: (patch: Partial<DisplaySettings>) => void;
  /** Called once on mount to wire up OBR.scene.metadata listeners. Returns unsubscribe fn. */
  init: () => () => void;
}

export const useSceneDisplayStore = create<SceneDisplayState>()((set) => ({
  settings: { ...DEFAULT_DISPLAY_SETTINGS },

  setSettings: (patch) => {
    set((state) => {
      const settings = { ...state.settings, ...patch };
      // Write to scene metadata so all participants receive the update.
      void OBR.scene.setMetadata({
        [getPluginId(SCENE_DISPLAY_METADATA_ID)]: settings,
      });
      return { settings };
    });
  },

  init: () => {
    const apply = (meta: Metadata) => {
      const raw = meta[getPluginId(SCENE_DISPLAY_METADATA_ID)];
      if (raw !== null && typeof raw === "object") {
        const merged: DisplaySettings = {
          ...DEFAULT_DISPLAY_SETTINGS,
          ...(raw as Partial<DisplaySettings>),
        };
        set({ settings: merged });
      }
    };

    // Load current value immediately.
    void OBR.scene.getMetadata().then(apply);
    // Subscribe to changes from any participant; return unsubscribe for cleanup.
    return OBR.scene.onMetadataChange(apply);
  },
}));
