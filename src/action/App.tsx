import { useEffect } from "react";
import { useOwlbearStore } from "../useOwlbearStore";
import { useOwlbearStoreSync } from "../useOwlbearStoreSync";
import { useTrackedTokensStore } from "../useTrackedTokensStore";
import Action from "./Action";

/**
 * Root app for the action popover.
 * Renders a scene-not-open notice if no scene is active.
 *
 * Tracked tokens init runs here (not inside Action) so player metadata is
 * loaded immediately on OBR.onReady, independent of scene state.
 */
export default function App(): React.JSX.Element {
  useOwlbearStoreSync();

  // Init tracked tokens at the app level so it loads on page open,
  // not deferred until the scene is ready.
  const initTrackedTokens = useTrackedTokensStore((state) => state.init);
  useEffect(() => {
    return initTrackedTokens();
  }, []);

  const sceneReady = useOwlbearStore((state) => state.sceneReady);
  const mode = useOwlbearStore((state) => state.themeMode);

  if (!sceneReady) {
    return (
      <div className={`${mode === "DARK" ? "dark" : ""} h-screen`}>
        <div className="flex flex-col gap-2 p-4">
          <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
            TFE Trackers
          </h1>
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            Open a scene to use the extension.
          </p>
        </div>
      </div>
    );
  }

  return <Action />;
}
