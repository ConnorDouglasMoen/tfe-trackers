import { useRef, useEffect } from "react";
import { Item } from "@owlbear-rodeo/sdk";
import { useOwlbearStore } from "../useOwlbearStore";
import { useSceneDisplayStore } from "../useSceneDisplayStore";
import { useTrackedTokensStore } from "../useTrackedTokensStore";
import { TrackedTokenRow } from "./TrackedTokenRow";
import { getTokenRecordFromItem } from "../itemMetadataHelpers";
import OBR from "@owlbear-rodeo/sdk";

/**
 * Action panel content — shown when a scene is open.
 *
 * GM-only: Tracked Tokens list (per-token editing) at top,
 * followed by On-Map Display settings (scene-level).
 * Players see a notice that GM access is required.
 */
export default function Action(): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);
  const items = useOwlbearStore((state) => state.items);
  const settings = useSceneDisplayStore((state) => state.settings);
  const setSettings = useSceneDisplayStore((state) => state.setSettings);
  const initSceneDisplay = useSceneDisplayStore((state) => state.init);
  const trackedTokenIds = useTrackedTokensStore((state) => state.trackedTokenIds);
  const initTrackedTokens = useTrackedTokensStore((state) => state.init);

  // Wire up scene metadata listeners once.
  useEffect(() => {
    initSceneDisplay();
    return initTrackedTokens();
  }, []);

  // Resolve live Item objects for pinned token IDs.
  // Filters out IDs whose items have been deleted from the scene.
  const trackedItems = trackedTokenIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);

  // Build display names: prefer the token's stored displayName over its OBR item name.
  // If multiple tokens share the same resolved base name, append a 1-based
  // numeric suffix to each duplicate (e.g. "Goblin 1", "Goblin 2").
  const displayNames: Map<string, string> = (() => {
    const result = new Map<string, string>();
    const baseName = (item: Item) => {
      const name = getTokenRecordFromItem(item).displayName.trim();
      return name || item.name.trim() || `Token ${item.id.slice(0, 6)}`;
    };
    // Count occurrences of each base name.
    const nameCounts = new Map<string, number>();
    for (const item of trackedItems) {
      const base = baseName(item);
      nameCounts.set(base, (nameCounts.get(base) ?? 0) + 1);
    }
    // Assign suffixes only where names collide.
    const nameIndex = new Map<string, number>();
    for (const item of trackedItems) {
      const base = baseName(item);
      const count = nameCounts.get(base) ?? 1;
      if (count > 1) {
        const idx = (nameIndex.get(base) ?? 0) + 1;
        nameIndex.set(base, idx);
        result.set(item.id, `${base} ${idx}`);
      } else {
        result.set(item.id, base);
      }
    }
    return result;
  })();

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
  const sizeOptions = [
    { label: "S", value: 0.75 },
    { label: "M", value: 1 },
    { label: "L", value: 1.25 },
    { label: "XL", value: 1.5 },
  ] as const;
  const segmentedClass =
    "flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5 dark:bg-white/10";
  const segmentClass = (active: boolean) =>
    `rounded-md px-2 py-0.5 text-xs font-semibold transition duration-150 ${
      active
        ? "bg-white/80 text-text-primary shadow-sm dark:bg-white/20 dark:text-text-primary-dark"
        : "text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
    }`;
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

            {/* ── Tracked Tokens ──────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                Tracked Tokens
              </h2>
              {trackedItems.length > 0 && (
                <span className="text-xs text-text-disabled dark:text-text-disabled-dark">
                  {trackedItems.length} pinned
                </span>
              )}
            </div>

            {trackedItems.length > 0 ? (
              <div className="flex flex-col gap-2">
                {trackedItems.map((item) => (
                  <TrackedTokenRow
                    key={item.id}
                    item={item}
                    displayName={displayNames.get(item.id) ?? item.name}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary dark:text-text-secondary-dark">
                Right-click a token and choose{" "}
                <span className="font-semibold">Pin to Action Panel</span> to
                track it here.
              </p>
            )}

            <hr className="border-text-primary/10 dark:border-text-primary-dark/10" />

            {/* ── On-Map Display settings ──────────────────────────────── */}
            <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
              On-Map Display Settings
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
                <span>Show Conditions &amp; Complications</span>
                <Toggle
                  checked={settings.showConditions}
                  onChange={() => setSettings({ showConditions: !settings.showConditions })}
                />
              </div>
              <div className={rowClass}>
                <span>Show Token Names</span>
                <Toggle
                  checked={settings.showName}
                  onChange={() => setSettings({ showName: !settings.showName })}
                />
              </div>
              <div className={rowClass}>
                <span>Injuries</span>
                <div className={segmentedClass}>
                  {(["all", "filled-only", "none"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSettings({ injuryDisplay: opt })}
                      className={segmentClass(settings.injuryDisplay === opt)}
                    >
                      {opt === "all" ? "All" : opt === "filled-only" ? "Filled" : "None"}
                    </button>
                  ))}
                </div>
              </div>
              <div className={rowClass}>
                <span>Marker Size</span>
                <div className={segmentedClass}>
                  {sizeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings({ markerScale: opt.value })}
                      className={segmentClass(settings.markerScale === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={rowClass}>
                <span>Text Size</span>
                <div className={segmentedClass}>
                  {sizeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSettings({ textScale: opt.value })}
                      className={segmentClass(settings.textScale === opt.value)}
                    >
                      {opt.label}
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
            Right-click a token and open the TFE Trackers menu to configure that token's type, injury slots, strain, and conditions.
          </p>
        )}

        <hr className="border-text-primary/10 dark:border-text-primary-dark/10" />
        <a
          href="https://discord.gg/QVCEFhd7"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-text-secondary underline hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
        >
          Report a bug
        </a>
      </div>
    </div>
  );
}
