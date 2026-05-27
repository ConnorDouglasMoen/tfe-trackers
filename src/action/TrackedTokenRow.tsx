import { useState, useEffect, useCallback, useRef } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
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
 * The row header shows the token's name (with a numeric suffix when there are
 * duplicates), a "center on token" button, and an unpin button.
 * The body is an inline version of the TokenMenu editor (strain, injuries,
 * conditions) without the display-override section.
 */
export function TrackedTokenRow({
  item,
  displayName,
}: {
  item: Item;
  /** Pre-computed display name with optional numeric suffix for deduplication. */
  displayName: string;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [record, setRecord] = useState<TokenRecord>(() =>
    getTokenRecordFromItem(item),
  );
  const untrackToken = useTrackedTokensStore((state) => state.untrackToken);

  // Keep local record in sync when the underlying OBR item changes externally.
  useEffect(() => {
    setRecord(getTokenRecordFromItem(item));
  }, [item]);

  // Focus the name input whenever edit mode is entered.
  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

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

  /** Apply a patch at the TokenRecord level (e.g. characterType, displayAlias). */
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

  /** Enter name-edit mode, pre-filling with the current displayName or item name. */
  const startEditingName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(record.displayName || item.name);
    setIsEditingName(true);
  };

  /** Commit the edited name — empty or matching item name clears displayName. */
  const commitName = () => {
    const trimmed = nameInput.trim();
    applyRecordPatch({ displayName: trimmed === item.name ? "" : trimmed });
    setIsEditingName(false);
  };

  const cancelEditName = () => setIsEditingName(false);

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

  // ── Render ────────────────────────────────────────────────────────────────

  /**
   * Animate the viewport to center on this token at the current zoom level.
   *
   * OBR viewport transform: screen = world * scale + position
   * To place world point P at screen center (w/2, h/2):
   *   position.x = w/2 - P.x * scale
   *   position.y = h/2 - P.y * scale
   */
  const handleCenterOnToken = async () => {
    const [scale, width, height] = await Promise.all([
      OBR.viewport.getScale(),
      OBR.viewport.getWidth(),
      OBR.viewport.getHeight(),
    ]);
    const pos = item.position;
    await OBR.viewport.animateTo({
      position: {
        x: width / 2 - pos.x * scale,
        y: height / 2 - pos.y * scale,
      },
      scale,
    });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-black/5 dark:bg-white/5">
      {/* ── Row header: collapse toggle / name edit + center + unpin ── */}
      <div className="flex items-center gap-1 px-2 py-1.5">

        {isEditingName ? (
          /* ── Name edit mode ── */
          <>
            <input
              ref={nameInputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commitName(); }
                if (e.key === "Escape") { e.preventDefault(); cancelEditName(); }
              }}
              onBlur={commitName}
              className="min-w-0 flex-1 rounded bg-black/20 px-1.5 py-0.5 text-sm font-semibold text-text-primary outline-none dark:bg-white/10 dark:text-text-primary-dark"
              aria-label="Edit token label"
            />
            {/* Confirm button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); commitName(); }}
              aria-label="Confirm name"
              title="Confirm"
              className="shrink-0 rounded p-0.5 text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,8 6,12 14,4" />
              </svg>
            </button>
            {/* Cancel button */}
            <button
              onMouseDown={(e) => { e.preventDefault(); cancelEditName(); }}
              aria-label="Cancel edit"
              title="Cancel"
              className="shrink-0 rounded p-0.5 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </>
        ) : (
          /* ── Normal mode ── */
          <>
            {/* Chevron + name (collapse toggle) */}
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-semibold text-text-primary dark:text-text-primary-dark"
              aria-expanded={isOpen}
            >
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                aria-hidden="true"
                className={`shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
              >
                <path d="M5 3l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="truncate">{displayName}</span>
              <span className="ml-1 shrink-0 rounded px-1 py-0.5 text-2xs font-normal text-text-disabled dark:text-text-disabled-dark capitalize">
                {data.characterType}
              </span>
            </button>

            {/* Edit name button */}
            <button
              onClick={startEditingName}
              aria-label={`Edit label for ${displayName}`}
              title="Edit label"
              className="shrink-0 rounded p-0.5 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 2l3 3-8 8H3v-3l8-8z" />
              </svg>
            </button>

            {/* Center-on-token button */}
            <button
              onClick={() => void handleCenterOnToken()}
              aria-label={`Center view on ${displayName}`}
              title="Center view on token"
              className="shrink-0 rounded p-0.5 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="3" />
                <line x1="8" y1="1" x2="8" y2="4" />
                <line x1="8" y1="12" x2="8" y2="15" />
                <line x1="1" y1="8" x2="4" y2="8" />
                <line x1="12" y1="8" x2="15" y2="8" />
              </svg>
            </button>

            {/* Unpin button */}
            <button
              onClick={() => void untrackToken(item.id)}
              aria-label={`Unpin ${displayName} from Action panel`}
              title="Unpin from Action panel"
              className="shrink-0 rounded p-0.5 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
            >
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </>
        )}
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
