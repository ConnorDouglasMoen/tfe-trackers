/**
 * TokenEditor
 *
 * Shared editor UI for the character type toggle, strain, injuries, and
 * conditions sections. Used by both TokenMenu (context menu) and
 * TrackedTokenRow (GM Action panel).
 *
 * ── Design principles ────────────────────────────────────────────────────────
 *
 * All data and mutation callbacks are passed as props so the component is
 * agnostic about the persistence target:
 *   - TokenMenu supplies callbacks that dispatch to useCharacterDataStore
 *     (Zustand), which writes to the current OBR selection.
 *   - TrackedTokenRow supplies callbacks that go through its applyMutation
 *     helper, which writes directly to a specific item ID.
 *
 * Intentional differences between contexts are preserved via optional props:
 *   - `headingLevel`: "h2" in TokenMenu, "h3" in TrackedTokenRow (nesting).
 *   - `topRowExtra`: render slot for the GM "Open Editor" button shown only
 *     inside TokenMenu.
 *
 * Anything that belongs exclusively to one context (display overrides, header
 * controls, popover button) stays in the wrapper component.
 */

import { useState } from "react";
import { CharacterData, CharacterType, InjurySlot, STRAIN_MIN, STRAIN_MAX } from "../characterDataHelpers";
import StrainRow from "./StrainRow";
import InjurySlotCard from "./InjurySlotCard";

// ─── Stepper ─────────────────────────────────────────────────────────────────

/**
 * Shared +/- stepper used for strain max and injury slot tier controls.
 * Identical in both TokenMenu and TrackedTokenRow; defined once here.
 */
export function Stepper({
  onDecrement,
  onIncrement,
  disableDecrement,
  disableIncrement,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  disableDecrement: boolean;
  disableIncrement: boolean;
}): React.JSX.Element {
  const base =
    "flex size-5 items-center justify-center rounded text-sm font-bold leading-none transition duration-150";
  const active =
    "bg-black/10 text-text-secondary hover:bg-black/20 dark:bg-white/10 dark:text-text-secondary-dark dark:hover:bg-white/15";
  const disabled =
    "cursor-not-allowed text-text-disabled dark:text-text-disabled-dark";
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onDecrement}
        disabled={disableDecrement}
        className={`${base} ${disableDecrement ? disabled : active}`}
        aria-label="Decrease"
      >
        −
      </button>
      <button
        onClick={onIncrement}
        disabled={disableIncrement}
        className={`${base} ${disableIncrement ? disabled : active}`}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

// ─── ConditionsEditor ─────────────────────────────────────────────────────────

/**
 * Conditions input + saved list.
 *
 * Accepts callbacks so it can be driven from either the Zustand store
 * (TokenMenu) or the applyMutation pattern (TrackedTokenRow).
 *
 * Exported so the wrappers can render it standalone if needed.
 */
export function ConditionsEditor({
  conditions,
  headingLevel = "h2",
  onAdd,
  onRemove,
}: {
  conditions: string[];
  /** Heading element for correct document outline in each context. */
  headingLevel?: "h2" | "h3";
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
}): React.JSX.Element {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd(inputValue);
      setInputValue("");
    }
  };

  const Heading = headingLevel;

  return (
    <section>
      <Heading className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
        Conditions
      </Heading>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add condition, press Enter…"
        className="w-full rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-sm text-text-primary outline-none placeholder:text-text-disabled dark:bg-white/5 dark:text-text-primary-dark dark:placeholder:text-text-disabled-dark"
      />
      {conditions.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1">
          {conditions.map((condition, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-2 rounded-md bg-black/10 px-2 py-1 dark:bg-white/5"
            >
              <span className="text-sm text-text-primary dark:text-text-primary-dark">
                {condition}
              </span>
              <button
                onClick={() => onRemove(index)}
                aria-label={`Remove condition: ${condition}`}
                className="shrink-0 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── TokenEditor ──────────────────────────────────────────────────────────────

export interface TokenEditorCallbacks {
  /** Switch the active character type. */
  onSetCharacterType: (type: CharacterType) => void;
  /** Update strainCurrent to the new value. */
  onSetStrainCurrent: (current: number) => void;
  /** Update strainMax to the new value. */
  onSetStrainMax: (max: number) => void;
  /** Merge a partial patch into serious injury slot at index 0 or 1. */
  onUpdateSeriousInjury: (index: 0 | 1, patch: Partial<InjurySlot>) => void;
  /** Merge a partial patch into the critical injury slot. */
  onUpdateCriticalInjury: (patch: Partial<InjurySlot>) => void;
  /** Merge a partial patch into the lethal injury slot. */
  onUpdateLethalInjury: (patch: Partial<InjurySlot>) => void;
  /**
   * Advance or retreat the serious tier by delta (+1/-1).
   * Tier: 0 = none, 1 = one slot, 2 = two slots.
   */
  onAdjustSeriousTier: (delta: 1 | -1) => void;
  /** Set hasCritical. */
  onSetHasCritical: (val: boolean) => void;
  /** Set hasLethal. */
  onSetHasLethal: (val: boolean) => void;
  /** Append a condition string. */
  onAddCondition: (text: string) => void;
  /** Remove the condition at the given index. */
  onRemoveCondition: (index: number) => void;
}

interface TokenEditorProps extends TokenEditorCallbacks {
  /** Active CharacterData blob (always the currently displayed type). */
  data: CharacterData;
  /**
   * Optional extra content rendered to the right of the character type toggle.
   * Used by TokenMenu to show the GM "Open Editor" button.
   */
  topRowExtra?: React.ReactNode;
  /**
   * Heading level for all section headings.
   * TokenMenu is a top-level panel → "h2".
   * TrackedTokenRow is nested inside Action → "h3".
   */
  headingLevel?: "h2" | "h3";
}

/**
 * Core token editor: character type toggle, strain, injuries, and conditions.
 *
 * Does not include:
 *   - Name section (TokenMenu shows it as a top-level section; TrackedTokenRow
 *     uses an inline header input instead).
 *   - Token display overrides (TokenMenu only).
 *   - Popover/panel chrome (collapse header, center/unpin buttons).
 */
export function TokenEditor({
  data,
  topRowExtra,
  headingLevel = "h2",
  onSetCharacterType,
  onSetStrainCurrent,
  onSetStrainMax,
  onUpdateSeriousInjury,
  onUpdateCriticalInjury,
  onUpdateLethalInjury,
  onAdjustSeriousTier,
  onSetHasCritical,
  onSetHasLethal,
  onAddCondition,
  onRemoveCondition,
}: TokenEditorProps): React.JSX.Element {
  const Heading = headingLevel;

  const isSurvivor = data.characterType === "survivor";
  // Numeric tier used to drive stepper bounds: 0 = none, 1 = one slot, 2 = two.
  const seriousLevel = !data.hasSerious ? 0 : data.seriousCount === 2 ? 2 : 1;

  return (
    <>
      {/* ── Character Type Toggle + optional extra slot ────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-black/10 p-0.5 dark:bg-white/10 self-start">
          {(["survivor", "other"] as const).map((type: CharacterType) => (
            <button
              key={type}
              onClick={() => onSetCharacterType(type)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition duration-150 ${
                data.characterType === type
                  ? "bg-white/80 text-text-primary shadow-sm dark:bg-white/20 dark:text-text-primary-dark"
                  : "text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
              }`}
            >
              {type === "survivor" ? "Survivor" : "Other"}
            </button>
          ))}
        </div>
        {/* Renders the "Open Editor" button in TokenMenu; nothing in TrackedTokenRow. */}
        {topRowExtra}
      </div>

      {/* ── Strain ────────────────────────────────────────────────────── */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <Heading className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
            Strain
          </Heading>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-text-secondary-dark">
            <span>Max: {data.strainMax}</span>
            <Stepper
              onDecrement={() => onSetStrainMax(data.strainMax - 1)}
              onIncrement={() => onSetStrainMax(data.strainMax + 1)}
              disableDecrement={data.strainMax <= STRAIN_MIN}
              disableIncrement={data.strainMax >= STRAIN_MAX}
            />
          </div>
        </div>
        <StrainRow
          strainMax={data.strainMax}
          strainCurrent={data.strainCurrent}
          onChange={onSetStrainCurrent}
        />
        <div className="mt-0.5 text-2xs text-text-disabled dark:text-text-disabled-dark">
          {data.strainCurrent} / {data.strainMax} taken
        </div>
      </section>

      {/* ── Injuries ──────────────────────────────────────────────────── */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <Heading className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
            Injuries
          </Heading>
          {/* Injury tier steppers — only shown for "Other"; Survivors have fixed slots. */}
          {!isSurvivor && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">S</span>
                <Stepper
                  onDecrement={() => onAdjustSeriousTier(-1)}
                  onIncrement={() => onAdjustSeriousTier(1)}
                  disableDecrement={seriousLevel <= 0}
                  disableIncrement={seriousLevel >= 2}
                />
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">C</span>
                <Stepper
                  onDecrement={() => onSetHasCritical(false)}
                  onIncrement={() => onSetHasCritical(true)}
                  disableDecrement={!data.hasCritical}
                  disableIncrement={data.hasCritical}
                />
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">L</span>
                <Stepper
                  onDecrement={() => onSetHasLethal(false)}
                  onIncrement={() => onSetHasLethal(true)}
                  disableDecrement={!data.hasLethal}
                  disableIncrement={data.hasLethal}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {data.hasSerious && (
            <>
              <InjurySlotCard
                slot={data.seriousInjuries[0]}
                severity="serious"
                label={isSurvivor || data.seriousCount === 2 ? "Serious #1" : "Serious"}
                onUpdate={(patch) => onUpdateSeriousInjury(0, patch)}
              />
              {(isSurvivor || data.seriousCount === 2) && (
                <InjurySlotCard
                  slot={data.seriousInjuries[1]}
                  severity="serious"
                  label="Serious #2"
                  onUpdate={(patch) => onUpdateSeriousInjury(1, patch)}
                />
              )}
            </>
          )}
          {data.hasCritical && (
            <InjurySlotCard
              slot={data.criticalInjury}
              severity="critical"
              label="Critical"
              onUpdate={onUpdateCriticalInjury}
            />
          )}
          {data.hasLethal && (
            <InjurySlotCard
              slot={data.lethalInjury}
              severity="lethal"
              label="Lethal"
              onUpdate={onUpdateLethalInjury}
            />
          )}
          {!data.hasSerious && !data.hasCritical && !data.hasLethal && (
            <p className="text-xs text-text-disabled dark:text-text-disabled-dark">
              {isSurvivor
                ? "No injuries."
                : "No injuries. Use the +/- buttons above to add injury slots."}
            </p>
          )}
        </div>
      </section>

      {/* ── Conditions ────────────────────────────────────────────────── */}
      <ConditionsEditor
        conditions={data.conditions}
        headingLevel={headingLevel}
        onAdd={onAddCondition}
        onRemove={onRemoveCondition}
      />
    </>
  );
}
