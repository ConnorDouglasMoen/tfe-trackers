import { useState, useEffect, useRef } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { TokenRecord, getActiveData } from "../characterDataHelpers";
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
import {
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  CrosshairIcon,
  DragHandleIcon,
  PencilIcon,
} from "../components/icons";

const iconButtonClass =
  "shrink-0 rounded p-0.5 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark";

/** Center the viewport on a point without changing the zoom level. */
async function centerViewportOn(point: { x: number; y: number }) {
  const [scale, width, height] = await Promise.all([
    OBR.viewport.getScale(),
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight(),
  ]);
  // Screen position = world position * scale + viewport position.
  await OBR.viewport.animateTo({
    position: { x: width / 2 - point.x * scale, y: height / 2 - point.y * scale },
    scale,
  });
}

/**
 * A collapsible row in the Action panel's tracked-token list. Edits are written
 * straight to this token, so the GM can update any token without selecting it.
 */
export function TrackedTokenRow({
  item,
  displayName,
}: {
  item: Item;
  /** Name to show, already de-duplicated against the other rows. */
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

  // Pick up edits made elsewhere, e.g. by a player in the token menu.
  useEffect(() => {
    setRecord(getTokenRecordFromItem(item));
  }, [item]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const data = getActiveData(record);

  const applyMutation = (mutate: (r: TokenRecord) => TokenRecord) => {
    const updated = mutate(record);
    setRecord(updated);
    void writeTokenRecordToItem(item.id, updated);
  };

  const startEditingName = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameInput(record.displayName || item.name);
    setIsEditingName(true);
  };

  // Typing the item's own name back in clears the custom name.
  const commitName = () => {
    const trimmed = nameInput.trim();
    applyMutation((r) =>
      applySetDisplayName(r, trimmed === item.name ? "" : trimmed),
    );
    setIsEditingName(false);
  };

  const cancelEditName = () => setIsEditingName(false);

  return (
    <div className="rounded-lg border border-white/10 bg-black/5 dark:bg-white/5">
      <div className="flex items-center gap-1 px-2 py-1.5">
        {isEditingName ? (
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
            <button
              onMouseDown={(e) => { e.preventDefault(); commitName(); }}
              aria-label="Confirm name"
              title="Confirm"
              className="shrink-0 rounded p-0.5 text-text-secondary hover:text-text-primary dark:text-text-secondary-dark dark:hover:text-text-primary-dark"
            >
              <CheckIcon />
            </button>
            <button
              onMouseDown={(e) => { e.preventDefault(); cancelEditName(); }}
              aria-label="Cancel edit"
              title="Cancel"
              className={iconButtonClass}
            >
              <CloseIcon />
            </button>
          </>
        ) : (
          <>
            {/* Visual cue only; the draggable element is the wrapper in Action.tsx. */}
            <span className="shrink-0 cursor-grab text-text-disabled dark:text-text-disabled-dark">
              <DragHandleIcon />
            </span>
            <button
              onClick={() => setIsOpen((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-semibold text-text-primary dark:text-text-primary-dark"
              aria-expanded={isOpen}
              aria-label={`Toggle ${displayName}`}
            >
              <ChevronIcon open={isOpen} />
              <span className="truncate">{displayName}</span>
              <span className="ml-1 shrink-0 rounded px-1 py-0.5 text-2xs font-normal text-text-disabled dark:text-text-disabled-dark capitalize">
                {data.characterType}
              </span>
            </button>

            <button
              onClick={startEditingName}
              aria-label={`Edit label for ${displayName}`}
              title="Edit label"
              className={iconButtonClass}
            >
              <PencilIcon />
            </button>

            <button
              onClick={() => void centerViewportOn(item.position)}
              aria-label={`Center view on ${displayName}`}
              title="Center view on token"
              className={iconButtonClass}
            >
              <CrosshairIcon />
            </button>

            <button
              onClick={() => untrackToken(item.id)}
              aria-label={`Unpin ${displayName} from Action panel`}
              title="Unpin from Action panel"
              className={iconButtonClass}
            >
              <CloseIcon />
            </button>
          </>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-2 pb-3 pt-2">
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
