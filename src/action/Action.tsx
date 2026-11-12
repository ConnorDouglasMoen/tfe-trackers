import { useRef, useEffect, useState } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { InjuryDisplay } from "../characterDataHelpers";
import { useOwlbearStore } from "../useOwlbearStore";
import { useSceneDisplayStore } from "../useSceneDisplayStore";
import { useTrackedTokensStore } from "../useTrackedTokensStore";
import { getTokenRecordFromItem } from "../itemMetadataHelpers";
import SegmentedControl from "../components/SegmentedControl";
import { TrackedTokenRow } from "./TrackedTokenRow";

const SIZE_OPTIONS = [
  { label: "S", value: 0.75 },
  { label: "M", value: 1 },
  { label: "L", value: 1.25 },
  { label: "XL", value: 1.5 },
];

const INJURY_OPTIONS: Array<{ label: string; value: InjuryDisplay }> = [
  { label: "All", value: "all" },
  { label: "Filled", value: "filled-only" },
  { label: "None", value: "none" },
];

const settingRowClass =
  "flex items-center justify-between text-sm text-text-primary dark:text-text-primary-dark";
const bulkButtonClass =
  "flex-1 rounded-md border border-white/10 bg-black/10 px-2 py-1 text-xs font-medium text-text-secondary hover:bg-black/20 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/5 dark:text-text-secondary-dark dark:hover:bg-white/10 dark:hover:text-text-primary-dark";
const dividerClass = "border-text-primary/10 dark:border-text-primary-dark/10";
const sectionHeadingClass = "text-sm font-semibold text-text-primary dark:text-text-primary-dark";
const helpTextClass = "text-xs text-text-secondary dark:text-text-secondary-dark";

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition duration-150 ${
        checked ? "bg-[#74649f]" : "bg-black/20 dark:bg-white/20"
      }`}
    >
      <span
        className={`inline-block size-3.5 rounded-full bg-white transition duration-150 ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/**
 * Label each item by its custom display name, else its item name. Names that
 * appear more than once get a numeric suffix ("Goblin 1", "Goblin 2").
 */
function buildDisplayNames(items: Item[]): Map<string, string> {
  const baseNames = items.map((item) => {
    const name = getTokenRecordFromItem(item).displayName.trim();
    if (name !== "") return name;
    return item.name.trim() !== "" ? item.name.trim() : `Token ${item.id.slice(0, 6)}`;
  });

  const counts = new Map<string, number>();
  for (const base of baseNames) counts.set(base, (counts.get(base) ?? 0) + 1);

  const seen = new Map<string, number>();
  const result = new Map<string, string>();
  items.forEach((item, i) => {
    const base = baseNames[i];
    if ((counts.get(base) ?? 0) > 1) {
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      result.set(item.id, `${base} ${n}`);
    } else {
      result.set(item.id, base);
    }
  });
  return result;
}

/** Action panel: the tracked-token list for everyone, plus scene settings for the GM. */
export default function Action(): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);
  const items = useOwlbearStore((state) => state.items);
  const settings = useSceneDisplayStore((state) => state.settings);
  const setSettings = useSceneDisplayStore((state) => state.setSettings);
  const initSceneDisplay = useSceneDisplayStore((state) => state.init);
  const trackedTokenIds = useTrackedTokensStore((state) => state.trackedTokenIds);
  const pruneStaleIds = useTrackedTokensStore((state) => state.pruneStaleIds);
  const trackToken = useTrackedTokensStore((state) => state.trackToken);
  const untrackToken = useTrackedTokensStore((state) => state.untrackToken);
  const reorderTokens = useTrackedTokensStore((state) => state.reorderTokens);

  useEffect(() => initSceneDisplay(), []);

  // Forget pinned tokens that were deleted from the scene. Skipped while the
  // item list is still empty so pins aren't wiped before the scene loads.
  useEffect(() => {
    if (items.length > 0) pruneStaleIds(items.map((item) => item.id));
  }, [items]);

  // Resize the popover to fit its content.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = contentRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      void OBR.action.setHeight(Math.ceil(height) + 8);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      void OBR.action.setHeight(150);
    };
  }, []);

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const trackedItems = trackedTokenIds
    .map((id) => itemsById.get(id))
    .filter((item): item is Item => item !== undefined);
  const displayNames = buildDisplayNames(trackedItems);

  // Drag-to-reorder. `dragOverIndex` is where the dragged row would land once
  // it has been removed from the list.
  const draggedId = useRef<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const draggedIndex =
    draggedId.current === null ? -1 : trackedTokenIds.indexOf(draggedId.current);

  const endDrag = () => {
    draggedId.current = null;
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromId = draggedId.current;
    const insertAt = dragOverIndex;
    endDrag();
    if (fromId === null || insertAt === null) return;
    const next = trackedTokenIds.filter((id) => id !== fromId);
    next.splice(Math.min(insertAt, next.length), 0, fromId);
    reorderTokens(next);
  };

  const handleRowDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    let insertion = insertBefore ? index : index + 1;
    // Rows below the dragged one move up a slot once it's removed.
    if (draggedIndex !== -1 && draggedIndex < index) insertion -= 1;
    setDragOverIndex(insertion);
  };

  /** Whether to draw the insertion line above the row at `index`. */
  const showIndicatorAbove = (index: number, itemId: string) => {
    if (dragOverIndex === null || draggedId.current === itemId) return false;
    const renderIndex =
      draggedIndex !== -1 && draggedIndex < index ? dragOverIndex + 1 : dragOverIndex;
    return renderIndex === index;
  };

  const pinAll = () => {
    const pinned = new Set(trackedTokenIds);
    for (const item of items) {
      const isToken =
        (item.layer === "CHARACTER" || item.layer === "MOUNT") && item.type === "IMAGE";
      if (isToken && !pinned.has(item.id)) trackToken(item.id);
    }
  };

  return (
    <div className={`${mode === "DARK" ? "dark" : ""} h-screen overflow-y-auto`}>
      <div ref={contentRef} className="flex flex-col gap-3 p-4">
        <h1 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
          TFE Trackers
        </h1>

        <hr className={dividerClass} />

        <div className="flex items-center justify-between">
          <h2 className={sectionHeadingClass}>Tracked Tokens</h2>
          {trackedItems.length > 0 && (
            <span className="text-xs text-text-disabled dark:text-text-disabled-dark">
              {trackedItems.length} pinned
            </span>
          )}
        </div>

        {role === "GM" && (
          <div className="flex gap-2">
            <button onClick={pinAll} className={bulkButtonClass}>
              Pin All
            </button>
            <button
              onClick={() => trackedTokenIds.forEach(untrackToken)}
              disabled={trackedTokenIds.length === 0}
              className={bulkButtonClass}
            >
              Unpin All
            </button>
          </div>
        )}

        {trackedItems.length > 0 ? (
          // The container also accepts drops in the gaps between rows.
          <div
            className="flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setDragOverIndex(null);
              }
            }}
          >
            {trackedItems.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  draggedId.current = item.id;
                  e.currentTarget.style.opacity = "0.4";
                }}
                onDragEnd={(e) => {
                  endDrag();
                  e.currentTarget.style.opacity = "";
                }}
                onDragOver={(e) => handleRowDragOver(e, index)}
                className="mb-2 flex flex-col"
              >
                <div
                  className={`mx-1 h-0.5 rounded-full transition-colors duration-75 ${
                    showIndicatorAbove(index, item.id) ? "mb-1 bg-white/50" : "bg-transparent"
                  }`}
                />
                <TrackedTokenRow
                  item={item}
                  displayName={displayNames.get(item.id) ?? item.name}
                />
              </div>
            ))}
            <div
              className={`mx-1 h-0.5 rounded-full transition-colors duration-75 ${
                dragOverIndex === trackedItems.length && draggedId.current !== null
                  ? "bg-white/50"
                  : "bg-transparent"
              }`}
            />
          </div>
        ) : (
          <p className={helpTextClass}>
            Right-click a token and choose{" "}
            <span className="font-semibold">Pin/Unpin to Action Panel</span> to track it here.
          </p>
        )}

        <hr className={dividerClass} />

        <h2 className={sectionHeadingClass}>Per-Token Configuration</h2>
        <p className={helpTextClass}>
          Right-click a token and open the TFE Trackers menu to configure that token&apos;s
          type, injury slots, strain, and conditions.
        </p>

        {role === "GM" && (
          <div className="flex flex-col gap-3">
            <hr className={dividerClass} />
            <h2 className={sectionHeadingClass}>Scene Display Settings</h2>
            <p className={helpTextClass}>
              Right-click a token and open the TFE Trackers menu to override the scene-level
              display settings for that token.
            </p>
            <div className="flex flex-col gap-2">
              <div className={settingRowClass}>
                <span>Show Strain</span>
                <Switch
                  checked={settings.showStrain}
                  onChange={() => setSettings({ showStrain: !settings.showStrain })}
                />
              </div>
              <div className={settingRowClass}>
                <span>Show Conditions &amp; Complications</span>
                <Switch
                  checked={settings.showConditions}
                  onChange={() => setSettings({ showConditions: !settings.showConditions })}
                />
              </div>
              <div className={settingRowClass}>
                <span>Show Token Names</span>
                <Switch
                  checked={settings.showName}
                  onChange={() => setSettings({ showName: !settings.showName })}
                />
              </div>
              <div className={settingRowClass}>
                <span>Injuries</span>
                <SegmentedControl
                  options={INJURY_OPTIONS}
                  value={settings.injuryDisplay}
                  onChange={(injuryDisplay) => setSettings({ injuryDisplay })}
                />
              </div>
              <div className={settingRowClass}>
                <span>Marker Size</span>
                <SegmentedControl
                  options={SIZE_OPTIONS}
                  value={settings.markerScale}
                  onChange={(markerScale) => setSettings({ markerScale })}
                />
              </div>
              <div className={settingRowClass}>
                <span>Text Size</span>
                <SegmentedControl
                  options={SIZE_OPTIONS}
                  value={settings.textScale}
                  onChange={(textScale) => setSettings({ textScale })}
                />
              </div>
            </div>
          </div>
        )}

        <hr className={dividerClass} />
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
