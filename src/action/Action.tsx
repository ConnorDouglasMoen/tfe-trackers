import { useRef, useEffect } from "react";
import { useOwlbearStore } from "../useOwlbearStore";
import { useSceneDisplayStore } from "../useSceneDisplayStore";
import OBR from "@owlbear-rodeo/sdk";
import "../index.css";

/**
 * Action panel content — shown when a scene is open.
 *
 * GM-only: On-Map Display settings (scene-level, affects all participants).
 * Players see a notice that GM access is required.
 */
export default function Action(): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);
  const settings = useSceneDisplayStore((state) => state.settings);
  const setSettings = useSceneDisplayStore((state) => state.setSettings);
  const initSceneDisplay = useSceneDisplayStore((state) => state.init);

  // Wire up scene metadata listener once.
  useEffect(() => { initSceneDisplay(); }, []);

  // Resize the action popover dynamically to fit content.
  const divRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = divRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      OBR.action.setHeight(Math.ceil(height) + 8);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      OBR.action.setHeight(150);
    };
  }, []);

  const rowClass =
    "flex items-center justify-between text-sm text-text-primary dark:text-text-primary-dark";
  const trackClass = (on: boolean) =>
    `relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition duration-150 ${
      on ? "bg-[#74649f]" : "bg-black/20 dark:bg-white/20"
    }`;
  const thumbClass = (on: boolean) =>
    `inline-block h-3.5 w-3.5 transform rounded-full bg-white transition duration-150 ${
      on ? "translate-x-5" : "translate-x-1"
    }`;

  const Toggle = ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={trackClass(checked)}
    >
      <span className={thumbClass(checked)} />
    </button>
  );

  return (
    <div className={`${mode === "DARK" ? "dark" : ""} h-screen overflow-y-auto`}>
      <div ref={divRef} className="flex flex-col gap-3 p-4">

        {/* Header */}
        <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          TFE Trackers
        </h1>

        <hr className="border-text-primary/10 dark:border-text-primary-dark/10" />

        {role === "GM" ? (
          <div className="flex flex-col gap-3">

            {/* On-Map Display settings */}
            <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              On-Map Display
            </h2>
            <div className="flex flex-col gap-2">
              <div className={rowClass}>
                <span>Show Strain</span>
                <Toggle
                  checked={settings.showStrain}
                  onChange={() => setSettings({ showStrain: !settings.showStrain })}
                />
              </div>
              <div className={rowClass}>
                <span>Show Conditions</span>
                <Toggle
                  checked={settings.showConditions}
                  onChange={() => setSettings({ showConditions: !settings.showConditions })}
                />
              </div>
              <div className={rowClass}>
                <span>Injuries</span>
                <div className="flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5 dark:bg-white/10">
                  {(["all", "filled-only"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSettings({ injuryDisplay: mode })}
                      className={`rounded-md px-2 py-0.5 text-xs font-semibold transition duration-150 ${
                        settings.injuryDisplay === mode
                          ? "bg-white/80 text-text-primary shadow-sm dark:bg-white/20 dark:text-text-primary-dark"
                          : "text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
                      }`}
                    >
                      {mode === "all" ? "All" : "Filled Only"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-text-primary/10 dark:border-text-primary-dark/10" />

            {/* Per-token config reminder */}
            <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Per-Token Configuration
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Right-click a token and open the TFE Trackers menu to configure
              that token's type, injury slots, strain, and conditions.
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            GM access required to configure display settings.
          </p>
        )}

        <hr className="border-text-primary/10 dark:border-text-primary-dark/10" />
        <a
          href="https://github.com/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-text-secondary underline hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
          onClick={(e) => {
            e.preventDefault();
            void OBR.browser.openUrl("https://github.com/");
          }}
        >
          Report a bug / GitHub
        </a>
      </div>
    </div>
  );
}
