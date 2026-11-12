import OBR, { Metadata } from "@owlbear-rodeo/sdk";
import { create } from "zustand";
import {
  DisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  SCENE_DISPLAY_METADATA_ID,
  parseDisplaySettings,
} from "./characterDataHelpers";
import { getPluginId } from "./getPluginId";

const METADATA_KEY = getPluginId(SCENE_DISPLAY_METADATA_ID);

interface SceneDisplayState {
  settings: DisplaySettings;
  /** Merge a patch into the settings and broadcast it through scene metadata. */
  setSettings: (patch: Partial<DisplaySettings>) => void;
  /** Load settings and follow scene metadata changes. Returns an unsubscribe fn. */
  init: () => () => void;
}

export const useSceneDisplayStore = create<SceneDisplayState>()((set, get) => ({
  settings: { ...DEFAULT_DISPLAY_SETTINGS },

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void OBR.scene.setMetadata({ [METADATA_KEY]: settings });
  },

  init: () => {
    const apply = (meta: Metadata) => {
      const raw = meta[METADATA_KEY];
      if (raw !== null && typeof raw === "object") {
        set({ settings: parseDisplaySettings(raw) });
      }
    };
    void OBR.scene.getMetadata().then(apply);
    return OBR.scene.onMetadataChange(apply);
  },
}));
