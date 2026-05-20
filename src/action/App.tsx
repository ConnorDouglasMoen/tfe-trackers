import { useOwlbearStore } from "../useOwlbearStore";
import { useOwlbearStoreSync } from "../useOwlbearStoreSync";
import Action from "./Action";
import "../index.css";

/**
 * Root app for the action popover.
 * Renders a scene-not-open notice if no scene is active.
 */
export default function App(): React.JSX.Element {
  useOwlbearStoreSync();

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
