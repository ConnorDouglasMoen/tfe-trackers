import { useRef, useEffect } from "react";
import { useOwlbearStore } from "../useOwlbearStore";
import OBR from "@owlbear-rodeo/sdk";
import "../index.css";

/**
 * Action panel content — shown when a scene is open.
 *
 * Currently provides:
 *  - GM-only info text explaining injury-type toggles
 *  - Placeholder for future scene-level settings
 *
 * Injury type configuration (has Serious/Critical/Lethal) is done
 * per-token in the TokenMenu by the GM.
 */
export default function Action(): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);

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

  return (
    <div className={`${mode === "DARK" ? "dark" : ""} h-screen overflow-y-auto`}>
      <div ref={divRef} className="flex flex-col gap-3 p-4">

        {/* Header */}
        <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          TFE Trackers
        </h1>

        <hr className="border-text-primary/10 dark:border-text-primary-dark/10" />

        {role === "GM" ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Per-Token Configuration
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              Right-click a token and open the TFE Trackers menu to configure
              that token's injury types (Serious / Critical / Lethal) and strain
              maximum. These settings are stored on the token itself.
            </p>

            <h2 className="mt-2 text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              Default Layout
            </h2>
            <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
              New tokens default to the Survivor layout: all injury types
              enabled, strain max 9. Adjust per-token as needed for NPCs.
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
            GM access required to configure extension settings.
          </p>
        )}

        {/* Report / feedback link — placeholder */}
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
