/**
 * TokenMenu
 *
 * Context-menu embed for per-token editing. Drives useCharacterDataStore
 * (Zustand) and persists to the current OBR selection.
 *
 * Shared editor content (type toggle, strain, injuries, conditions) is
 * delegated to TokenEditor. This wrapper retains:
 *   - OBR selection subscription and store initialisation
 *   - Name section (unique to this context — TrackedTokenRow uses an
 *     inline header input instead)
 *   - "Open Editor" popover button (GM only, hidden inside the popover)
 *   - Token display overrides section (not present in TrackedTokenRow)
 */

import { useEffect, useState } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { useOwlbearStore } from "../useOwlbearStore";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { getTokenRecordFromSelection } from "../itemMetadataHelpers";
import { getPluginId } from "../getPluginId";
import { TokenEditor } from "../components/TokenEditor";
import TextInput from "../components/TextInput";

// ─── Token Display Overrides ──────────────────────────────────────────────────

/**
 * Per-token on-map display overrides. Each control has three states:
 *   - Null ("Scene"): inherit from scene-level setting in the Action panel.
 *   - True/"all" ("Show" / "All"): force-show on this token.
 *   - False/"filled-only"/"none": force the chosen value on this token.
 *
 * Rendered only in the context menu — the Action panel edits scene-level
 * settings and doesn't need per-token overrides in the tracked-token rows.
 */
function TokenDisplaySection(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const overrides = useCharacterDataStore((state) => state.record.displayOverrides);
  const setDisplayOverride = useCharacterDataStore((state) => state.setDisplayOverride);

  const boolLabel = (val: boolean | null) =>
    val === null ? "Scene" : val ? "Show" : "Hide";

  const injuryOpts = [null, "all", "filled-only", "none"] as const;
  const injuryLabel = (val: typeof injuryOpts[number]) =>
    val === null ? "Scene" : val === "all" ? "All" : val === "filled-only" ? "Filled" : "None";

  const btnBase =
    "rounded-md px-2 py-0.5 text-xs font-semibold transition duration-150";
  const btnActive =
    "bg-white/80 text-text-primary shadow-sm dark:bg-white/20 dark:text-text-primary-dark";
  const btnInactive =
    "text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark";

  return (
    <section>
      {/* Collapsible header — defaults to closed */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-left"
        aria-expanded={isOpen}
      >
        <svg
          viewBox="0 0 16 16"
          width="10"
          height="10"
          aria-hidden="true"
          className={`shrink-0 text-text-secondary dark:text-text-secondary-dark transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
        >
          <path d="M5 3l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          Token Display Settings
        </h2>
      </button>
      {isOpen && <div className="mt-1.5 flex flex-col gap-2">

        {/* Strain override */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-primary dark:text-text-primary-dark">Strain</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5 dark:bg-white/10">
            {([null, true, false] as const).map((val) => (
              <button
                key={String(val)}
                onClick={() => setDisplayOverride({ showStrain: val })}
                className={`${btnBase} ${overrides.showStrain === val ? btnActive : btnInactive}`}
              >
                {boolLabel(val)}
              </button>
            ))}
          </div>
        </div>

        {/* Injuries override */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-primary dark:text-text-primary-dark">Injuries</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5 dark:bg-white/10">
            {injuryOpts.map((val) => (
              <button
                key={String(val)}
                onClick={() => setDisplayOverride({ injuryDisplay: val })}
                className={`${btnBase} ${overrides.injuryDisplay === val ? btnActive : btnInactive}`}
              >
                {injuryLabel(val)}
              </button>
            ))}
          </div>
        </div>

        {/* Conditions & Complications override */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-primary dark:text-text-primary-dark">Conditions &amp; Complications</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5 dark:bg-white/10">
            {([null, true, false] as const).map((val) => (
              <button
                key={String(val)}
                onClick={() => setDisplayOverride({ showConditions: val })}
                className={`${btnBase} ${overrides.showConditions === val ? btnActive : btnInactive}`}
              >
                {boolLabel(val)}
              </button>
            ))}
          </div>
        </div>

        {/* Name bubble override */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-primary dark:text-text-primary-dark">Token Name</span>
          <div className="flex items-center gap-0.5 rounded-lg bg-black/10 p-0.5 dark:bg-white/10">
            {([null, true, false] as const).map((val) => (
              <button
                key={String(val)}
                onClick={() => setDisplayOverride({ showName: val })}
                className={`${btnBase} ${overrides.showName === val ? btnActive : btnInactive}`}
              >
                {boolLabel(val)}
              </button>
            ))}
          </div>
        </div>

      </div>}
    </section>
  );
}

// ─── TokenMenu ────────────────────────────────────────────────────────────────

export default function TokenMenu({ isPopover }: { isPopover: boolean }): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);

  const data = useCharacterDataStore((state) => state.data);
  const record = useCharacterDataStore((state) => state.record);
  const setRecord = useCharacterDataStore((state) => state.setRecord);
  const setCharacterType = useCharacterDataStore((state) => state.setCharacterType);
  const setStrainCurrent = useCharacterDataStore((state) => state.setStrainCurrent);
  const setStrainMax = useCharacterDataStore((state) => state.setStrainMax);
  const updateSeriousInjury = useCharacterDataStore((state) => state.updateSeriousInjury);
  const updateCriticalInjury = useCharacterDataStore((state) => state.updateCriticalInjury);
  const updateLethalInjury = useCharacterDataStore((state) => state.updateLethalInjury);
  const setHasSerious = useCharacterDataStore((state) => state.setHasSerious);
  const setSeriousCount = useCharacterDataStore((state) => state.setSeriousCount);
  const setHasCritical = useCharacterDataStore((state) => state.setHasCritical);
  const setHasLethal = useCharacterDataStore((state) => state.setHasLethal);
  const addCondition = useCharacterDataStore((state) => state.addCondition);
  const removeCondition = useCharacterDataStore((state) => state.removeCondition);
  const setDisplayName = useCharacterDataStore((state) => state.setDisplayName);

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    const load = (items: Item[]) => {
      getTokenRecordFromSelection(items)
        .then((record) => { setRecord(record); setInitDone(true); })
        .catch(console.error);
    };
    OBR.scene.items.getItems().then(load);
    return OBR.scene.items.onChange(load);
  }, []);

  if (!initDone) return <></>;

  /**
   * Adapts the store's setHasSerious/setSeriousCount pair into the unified
   * tier-stepping interface expected by TokenEditor.
   * Tier: 0 = none, 1 = one slot, 2 = two slots.
   */
  const handleAdjustSeriousTier = (delta: 1 | -1) => {
    const seriousLevel = !data.hasSerious ? 0 : data.seriousCount === 2 ? 2 : 1;
    const next = seriousLevel + delta;
    if (next <= 0) setHasSerious(false);
    else if (next === 1) { setHasSerious(true); setSeriousCount(1); }
    else if (next >= 2) { setHasSerious(true); setSeriousCount(2); }
  };

  /** GM-only "Open Editor" button rendered in the type-toggle row via topRowExtra. */
  const openEditorButton =
    role === "GM" && !isPopover ? (
      <button
        onClick={() =>
          OBR.popover.open({
            id: getPluginId("token-editor"),
            url: "/src/tokenMenu/tokenMenu.html?popover=1",
            height: 600,
            width: 380,
            anchorOrigin: { horizontal: "CENTER", vertical: "CENTER" },
            transformOrigin: { horizontal: "CENTER", vertical: "CENTER" },
          })
        }
        className="rounded-lg bg-black/10 px-3 py-1 text-xs text-text-secondary hover:bg-black/20 dark:bg-white/10 dark:text-text-secondary-dark dark:hover:bg-white/15"
      >
        Open Editor
      </button>
    ) : undefined;

  return (
    <div className={`${mode === "DARK" ? "dark" : ""} h-screen overflow-y-auto`}>
      <div className="flex flex-col gap-3 px-3 py-2">

        {/* ── Shared editor: type toggle, name row, strain, injuries, conditions ─ */}
        <TokenEditor
          data={data}
          headingLevel="h2"
          topRowExtra={openEditorButton}
          belowToggleContent={
            /* Name input sits below the type toggle, above strain.
               Clear button appears only when a name is set. */
            <div className="flex items-center gap-2">
              <TextInput
                value={record.displayName}
                onConfirm={(v) => setDisplayName(v)}
                placeholder="Add displayed token name"
              />
              {record.displayName !== "" && (
                <button
                  onClick={() => setDisplayName("")}
                  className="shrink-0 rounded px-1 py-0.5 text-2xs font-semibold uppercase tracking-wide text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
                >
                  Clear
                </button>
              )}
            </div>
          }
          onSetCharacterType={setCharacterType}
          onSetStrainCurrent={setStrainCurrent}
          onSetStrainMax={setStrainMax}
          onUpdateSeriousInjury={updateSeriousInjury}
          onUpdateCriticalInjury={updateCriticalInjury}
          onUpdateLethalInjury={updateLethalInjury}
          onAdjustSeriousTier={handleAdjustSeriousTier}
          onSetHasCritical={setHasCritical}
          onSetHasLethal={setHasLethal}
          onAddCondition={addCondition}
          onRemoveCondition={removeCondition}
        />

        {/* ── Token Display Overrides ─────────────────────────────────── */}
        {/* Scene-level settings live in the Action panel (GM only).
            These per-token overrides are context-menu only. */}
        <TokenDisplaySection />

      </div>
    </div>
  );
}
