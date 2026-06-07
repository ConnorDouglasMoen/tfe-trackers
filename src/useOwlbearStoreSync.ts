import OBR, { Player, Theme } from "@owlbear-rodeo/sdk";
import { useEffect } from "react";
import { useOwlbearStore } from "./useOwlbearStore";

/**
 * Hook that keeps the Zustand OwlbearStore in sync with live OBR events.
 * Mount once near the root of each entry-point app.
 */
export function useOwlbearStoreSync() {
  const setSceneReady = useOwlbearStore((state) => state.setSceneReady);
  useEffect(() => {
    OBR.scene.isReady().then(setSceneReady);
    return OBR.scene.onReadyChange(setSceneReady);
  }, []);

  const sceneReady = useOwlbearStore((state) => state.sceneReady);
  const setItems = useOwlbearStore((state) => state.setItems);
  useEffect(() => {
    if (sceneReady) {
      OBR.scene.items.getItems().then(setItems);
      return OBR.scene.items.onChange(setItems);
    } else {
      setItems([]);
    }
  }, [sceneReady, setItems]);

  const setRole = useOwlbearStore((state) => state.setRole);
  const setSelection = useOwlbearStore((state) => state.setSelection);
  useEffect(() => {
    const handlePlayerChange = (player: Player) => {
      setRole(player.role);
      setSelection(player.selection);
    };
    OBR.player.getRole().then(setRole);
    OBR.player.getSelection().then(setSelection);
    return OBR.player.onChange(handlePlayerChange);
  }, []);

  const setThemeMode = useOwlbearStore((state) => state.setThemeMode);
  useEffect(() => {
    const handleThemeChange = (theme: Theme) => setThemeMode(theme.mode);
    OBR.theme.getTheme().then(handleThemeChange);
    return OBR.theme.onChange(handleThemeChange);
  }, []);
}
