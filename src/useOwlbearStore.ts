import { Item, Player } from "@owlbear-rodeo/sdk";
import { create } from "zustand";

/** Global OBR state synced to Zustand so components can subscribe reactively. */
interface OwlbearState {
  sceneReady: boolean;
  items: Item[];
  role: Player["role"];
  selection: Player["selection"];
  themeMode: "DARK" | "LIGHT";

  setSceneReady: (ready: boolean) => void;
  setItems: (items: Item[]) => void;
  setRole: (role: Player["role"]) => void;
  setSelection: (selection: Player["selection"]) => void;
  setThemeMode: (mode: "DARK" | "LIGHT") => void;
}

export const useOwlbearStore = create<OwlbearState>()((set) => ({
  items: [],
  role: "PLAYER",
  sceneReady: false,
  selection: undefined,
  themeMode: "LIGHT",

  setSceneReady: (sceneReady) => set({ sceneReady }),
  setItems: (items) => set({ items }),
  setRole: (role) => set({ role }),
  setSelection: (selection) => set({ selection }),
  setThemeMode: (themeMode) => set({ themeMode }),
}));
