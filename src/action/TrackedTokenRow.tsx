import { useState, useEffect, useCallback } from "react";
import { Item } from "@owlbear-rodeo/sdk";
import {
  TokenRecord,
  CharacterData,
  InjurySlot,
  CharacterType,
  STRAIN_MIN,
  STRAIN_MAX,
  getActiveData,
  setActiveData,
} from "../characterDataHelpers";
import { getTokenRecordFromItem, writeTokenRecordToItem } from "../itemMetadataHelpers";
import { useTrackedTokensStore } from "../useTrackedTokensStore";
import StrainRow from "../components/StrainRow";
import InjurySlotCard from "../components/InjurySlotCard";

// ─── Small helper components ────────────────────────────────────────────────

/** +/- stepper, same styling as TokenMenu. */
function Stepper({
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

// ─── Conditions sub-section ──────────────────────────────────────────────────

function ConditionsSection({
  conditions,
  onAdd,
  onRemove,
}: {
  conditions: string[];
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

  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
        Conditions
      </h3>
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

// ─── Main row component ──────────────────────────────────────────────────────

/**
 * A collapsible row in the Action panel's Tracked Tokens list.
 *
 * Manages its own local TokenRecord state and writes changes directly to the
 * OBR item by ID (not via selection), so the GM can edit any token without
 * needing to select it first.
 *
 * The row header shows the token's name and an unpin button.
 * The body is an inline version of the TokenMenu editor (strain, injuries,
 * conditions) without the display-override section.
 */
export function TrackedTokenRow({
  item,
}: {
  item: Item;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [record, setRecord] = useState<TokenRecord>(() =>
    getTokenRecordFromItem(item),
  );
  const untrackToken = useTrackedTokensStore((state) => state.untrackToken);

  // Keep local record in sync when the underlying OBR item changes externally
  // (e.g. a player edits the token via the context menu while the row is open).
  useEffect(() => {
    setRecord(getTokenRecordFromItem(item));
  }, [item]);

  // Derive active CharacterData from the record.
  const data: CharacterData = getActiveData(record);

  /**
   * Apply a patch to the active CharacterData, persist to OBR, and update
   * local state. All mutation in this row flows through this function.
   */
  const applyDataPatch = useCallback(
    (patch: Partial<CharacterData>) => {
      setRecord((prev) => {
        const active = getActiveData(prev);
        const updated = setActiveData(prev, { ...active, ...patch });
        void writeTokenRecordToItem(item.id, updated);
        return updated;
      });
    },
    [item.id],
  );

  /** Apply a patch at the TokenRecord level (e.g. characterType). */
  const applyRecordPatch = useCallback(
    (patch: Partial<TokenRecord>) => {
      setRecord((prev) => {
        const updated = { ...prev, ...patch };
        void writeTokenRecordToItem(item.id, updated);
        return updated;
      });
    },
    [item.id],
  );

  // ── Derived injury helpers ─────────────────────────────────────────────────

  const isSurvivor = data.characterType === "survivor";
  const seriousLevel = !data.hasSerious ? 0 : data.seriousCount === 2 ? 2 : 1;

  const adjustSerious = (delta: 1 | -1) => {
    const next = seriousLevel + delta;
    if (next === 0) applyDataPatch({ hasSerious: false });
    else if (next === 1) applyDataPatch({ hasSerious: true, seriousCount: 1 });
    else if (next === 2) applyDataPatch({ hasSerious: true, seriousCount: 2 });
  };

  const updateSeriousInjury = (index: 0 | 1, patch: Partial<InjurySlot>) => {
    const updated = [...data.seriousInjuries] as [InjurySlot, InjurySlot];
    updated[index] = { ...updated[index], ...patch };
    applyDataPatch({ seriousInjuries: updated });
  };

  // ── Token name for the row header ─────────────────────────────────────────

  // OBR items have a `name` field on the top-level object.
  const tokenName =
    (item as unknown as { name?: string }).name?.trim() ||
    `Token ${item.id.slice(0, 6)}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-white/10 bg-black/5 dark:bg-white/5">
      {/* ── Row header: toggle open/close + token name + unpin button ── */}
      <div className="flex items-center justify-between px-2 py-1.5">
        {/* Chevron + name */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex flex-1 items-center gap-1.5 text-left text-sm font-semibold text-text-primary dark:text-text-primary-dark"
          aria-expanded={isOpen}
        >
          {/* Chevron rotates 90° when open */}
          <svg
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
          >
            <path d="M5 3l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="truncate">{tokenName}</span>
          {/* Dim type badge */}
          <span className="ml-1 rounded px-1 py-0.5 text-2xs font-normal text-text-disabled dark:text-text-disabled-dark capitalize">
            {data.characterType}
          </span>
        </button>

        {/* Unpin button */}
        <button
          onClick={() => void untrackToken(item.id)}
          aria-label={`Unpin ${tokenName} from Action panel`}
          title="Unpin from Action panel"
          className="ml-2 shrink-0 rounded p-0.5 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
        >
          {/* Pin-with-slash icon (simple SVG) */}
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 2l4 4-2 2-4-4z M8 10l-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Expanded body: inline token editor ─────────────────────── */}
      {isOpen && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-2 pb-3 pt-2">

          {/* Character type toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-black/10 p-0.5 dark:bg-white/10 self-start">
            {(["survivor", "other"] as const).map((type: CharacterType) => (
              <button
                key={type}
                onClick={() => applyRecordPatch({ activeType: type })}
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

          {/* ── Strain ────────────────────────────────────────────────── */}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
                Strain
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-text-secondary-dark">
                <span>Max: {data.strainMax}</span>
                <Stepper
                  onDecrement={() => applyDataPatch({ strainMax: Math.max(STRAIN_MIN, data.strainMax - 1) })}
                  onIncrement={() => applyDataPatch({ strainMax: Math.min(STRAIN_MAX, data.strainMax + 1) })}
                  disableDecrement={data.strainMax <= STRAIN_MIN}
                  disableIncrement={data.strainMax >= STRAIN_MAX}
                />
              </div>
            </div>
            <StrainRow
              strainMax={data.strainMax}
              strainCurrent={data.strainCurrent}
              onChange={(current) =>
                applyDataPatch({
                  strainCurrent: Math.max(0, Math.min(data.strainMax, current)),
                })
              }
            />
            <div className="mt-0.5 text-2xs text-text-disabled dark:text-text-disabled-dark">
              {data.strainCurrent} / {data.strainMax} taken
            </div>
          </section>

          {/* ── Injuries ──────────────────────────────────────────────── */}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
                Injuries
              </h3>
              {/* Injury slot steppers — only shown for "Other" type */}
              {!isSurvivor && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">S</span>
                    <Stepper
                      onDecrement={() => adjustSerious(-1)}
                      onIncrement={() => adjustSerious(1)}
                      disableDecrement={seriousLevel <= 0}
                      disableIncrement={seriousLevel >= 2}
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">C</span>
                    <Stepper
                      onDecrement={() => applyDataPatch({ hasCritical: false })}
                      onIncrement={() => applyDataPatch({ hasCritical: true })}
                      disableDecrement={!data.hasCritical}
                      disableIncrement={data.hasCritical}
                    />
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">L</span>
                    <Stepper
                      onDecrement={() => applyDataPatch({ hasLethal: false })}
                      onIncrement={() => applyDataPatch({ hasLethal: true })}
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
                    onUpdate={(patch) => updateSeriousInjury(0, patch)}
                  />
                  {(isSurvivor || data.seriousCount === 2) && (
                    <InjurySlotCard
                      slot={data.seriousInjuries[1]}
                      severity="serious"
                      label="Serious #2"
                      onUpdate={(patch) => updateSeriousInjury(1, patch)}
                    />
                  )}
                </>
              )}
              {data.hasCritical && (
                <InjurySlotCard
                  slot={data.criticalInjury}
                  severity="critical"
                  label="Critical"
                  onUpdate={(patch) => applyDataPatch({ criticalInjury: { ...data.criticalInjury, ...patch } })}
                />
              )}
              {data.hasLethal && (
                <InjurySlotCard
                  slot={data.lethalInjury}
                  severity="lethal"
                  label="Lethal"
                  onUpdate={(patch) => applyDataPatch({ lethalInjury: { ...data.lethalInjury, ...patch } })}
                />
              )}
              {!data.hasSerious && !data.hasCritical && !data.hasLethal && (
                <p className="text-xs text-text-disabled dark:text-text-disabled-dark">
                  No injuries.
                </p>
              )}
            </div>
          </section>

          {/* ── Conditions ────────────────────────────────────────────── */}
          <ConditionsSection
            conditions={data.conditions}
            onAdd={(text) => {
              const trimmed = text.trim();
              if (trimmed === "") return;
              applyDataPatch({ conditions: [...data.conditions, trimmed] });
            }}
            onRemove={(index) =>
              applyDataPatch({
                conditions: data.conditions.filter((_, i) => i !== index),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
