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
      // Guard against stale promise resolution: if the effect cleans up before
      // getItems() resolves (e.g. sceneReady flips false before the fetch
      // completes), the resolved value must not overwrite the cleared items[]
      // that setItems([]) already wrote.
      let cancelled = false;
      OBR.scene.items.getItems().then((items) => {
        if (!cancelled) setItems(items);
      });
      const unsubscribe = OBR.scene.items.onChange(setItems);
      return () => {
        cancelled = true;
        unsubscribe();
      };
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
