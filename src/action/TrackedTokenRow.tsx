/**
 * TrackedTokenRow
 *
 * A collapsible row in the Action panel's Tracked Tokens list.
 *
 * Manages its own local TokenRecord state and writes changes directly to the
 * OBR item by ID (not via selection), so the GM can edit any token without
 * needing to select it first.
 *
 * All record mutations are delegated to pure helpers in tokenRecordMutations.ts
 * so the logic stays consistent with TokenMenu and is tested independently.
 *
 * Shared editor content (type toggle, strain, injuries, conditions) is
 * rendered via TokenEditor. This wrapper retains:
 *   - Collapsible row chrome (header, chevron, center/unpin buttons)
 *   - Inline name editing in the header row (TokenMenu uses a dedicated
 *     Name section instead)
 *   - applyMutation pattern for writing by item ID
 */

import { useState, useEffect, useCallback, useRef } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import {
  TokenRecord,
  CharacterData,
  getActiveData,
} from "../characterDataHelpers";
import {
  applyStrainCurrent,
  applyStrainMax,
  applyCharacterType,
  applyAddCondition,
  applyRemoveCondition,
  applyUpdateSeriousInjury,
  applyUpdateCriticalInjury,
  applyUpdateLethalInjury,
  applySetHasCritical,
  applySetHasLethal,
  applyAdjustSeriousTier,
  applySetDisplayName,
} from "../tokenRecordMutations";
import { getTokenRecordFromItem, writeTokenRecordToItem } from "../itemMetadataHelpers";
import { useTrackedTokensStore } from "../useTrackedTokensStore";
import { TokenEditor } from "../components/TokenEditor";

// ─── Main row component ──────────────────────────────────────────────────────

/**
 * A collapsible row in the Action panel's Tracked Tokens list.
 *
 * The row header contains inline name editing, a center-on-token button, and
 * an unpin button. The expanded body delegates to TokenEditor for all shared
 * character editing UI.
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
   * Apply a mutation function to the current record, persist to OBR, and
   * update local state. All mutations in this row flow through this function.
   *
   * The mutation function receives the current record and returns the new
   * record — matching the signature of all helpers in tokenRecordMutations.ts.
   */
  const applyMutation = useCallback(
    (mutate: (r: TokenRecord) => TokenRecord) => {
      setRecord((prev) => {
        const updated = mutate(prev);
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
    applyMutation((r) =>
      applySetDisplayName(r, trimmed === item.name ? "" : trimmed),
    );
    setIsEditingName(false);
  };

  const cancelEditName = () => setIsEditingName(false);

  // ── Viewport helper ───────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

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

      {/* ── Expanded body: shared TokenEditor ───────────────────────── */}
      {isOpen && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-2 pb-3 pt-2">
          {/*
           * No topRowExtra here — TrackedTokenRow has no "Open Editor" button.
           * Name editing is handled in the header row above, not as a section.
           * No TokenDisplaySection — display overrides are context-menu only.
           */}
          <TokenEditor
            data={data}
            headingLevel="h3"
            onSetCharacterType={(type) => applyMutation((r) => applyCharacterType(r, type))}
            onSetStrainCurrent={(current) => applyMutation((r) => applyStrainCurrent(r, current))}
            onSetStrainMax={(max) => applyMutation((r) => applyStrainMax(r, max))}
            onUpdateSeriousInjury={(index, patch) => applyMutation((r) => applyUpdateSeriousInjury(r, index, patch))}
            onUpdateCriticalInjury={(patch) => applyMutation((r) => applyUpdateCriticalInjury(r, patch))}
            onUpdateLethalInjury={(patch) => applyMutation((r) => applyUpdateLethalInjury(r, patch))}
            onAdjustSeriousTier={(delta) => applyMutation((r) => applyAdjustSeriousTier(r, delta))}
            onSetHasCritical={(val) => applyMutation((r) => applySetHasCritical(r, val))}
            onSetHasLethal={(val) => applyMutation((r) => applySetHasLethal(r, val))}
            onAddCondition={(text) => applyMutation((r) => applyAddCondition(r, text))}
            onRemoveCondition={(index) => applyMutation((r) => applyRemoveCondition(r, index))}
          />
        </div>
      )}
    </div>
  );
}
