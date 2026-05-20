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

  setSceneReady: (sceneReady) => set((state) => ({ ...state, sceneReady })),
  setItems: (items) => set((state) => ({ ...state, items })),
  setRole: (role) => set((state) => ({ ...state, role })),
  setSelection: (selection) => set((state) => ({ ...state, selection })),
  setThemeMode: (themeMode) => set((state) => ({ ...state, themeMode })),
}));
