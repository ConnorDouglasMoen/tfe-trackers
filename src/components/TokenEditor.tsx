import { useState } from "react";
import { CharacterData, CharacterType, InjurySlot, STRAIN_MIN, STRAIN_MAX } from "../characterDataHelpers";
import { getSeriousTier } from "../tokenRecordMutations";
import StrainRow from "./StrainRow";
import InjurySlotCard from "./InjurySlotCard";
import { CloseIcon } from "./icons";
import { segmentActiveClass, segmentInactiveClass } from "./SegmentedControl";

const sectionHeadingClass =
  "text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark";

/** A pair of −/+ buttons. */
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

function ConditionsEditor({
  conditions,
  headingLevel = "h2",
  onAdd,
  onRemove,
}: {
  conditions: string[];
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
      <Heading className={`mb-1 ${sectionHeadingClass}`}>
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
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface TokenEditorCallbacks {
  onSetCharacterType: (type: CharacterType) => void;
  onSetStrainCurrent: (current: number) => void;
  onSetStrainMax: (max: number) => void;
  onUpdateSeriousInjury: (index: 0 | 1, patch: Partial<InjurySlot>) => void;
  onUpdateCriticalInjury: (patch: Partial<InjurySlot>) => void;
  onUpdateLethalInjury: (patch: Partial<InjurySlot>) => void;
  onAdjustSeriousTier: (delta: 1 | -1) => void;
  onSetHasCritical: (val: boolean) => void;
  onSetHasLethal: (val: boolean) => void;
  onAddCondition: (text: string) => void;
  onRemoveCondition: (index: number) => void;
}

interface TokenEditorProps extends TokenEditorCallbacks {
  data: CharacterData;
  /** Rendered to the right of the Survivor/Other toggle. */
  topRowExtra?: React.ReactNode;
  /** Rendered on its own row below the Survivor/Other toggle. */
  belowToggleContent?: React.ReactNode;
  /** "h3" when the editor is nested under another heading. */
  headingLevel?: "h2" | "h3";
}

/**
 * Editing UI for a token's character type, strain, injuries, and conditions.
 * Persistence is up to the caller: the token menu writes to the selection,
 * while the Action panel writes to a specific token.
 */
export function TokenEditor({
  data,
  topRowExtra,
  belowToggleContent,
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
  const seriousTier = getSeriousTier(data);
  const hasTwoSerious = isSurvivor || data.seriousCount === 2;

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 rounded-lg bg-black/10 p-0.5 dark:bg-white/10 self-start">
          {(["survivor", "other"] as const).map((type: CharacterType) => (
            <button
              key={type}
              onClick={() => onSetCharacterType(type)}
              className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition duration-150 ${
                data.characterType === type ? segmentActiveClass : segmentInactiveClass
              }`}
            >
              {type === "survivor" ? "Survivor" : "Other"}
            </button>
          ))}
        </div>
        {topRowExtra}
      </div>

      {belowToggleContent}

      <section>
        <div className="mb-1 flex items-center justify-between">
          <Heading className={sectionHeadingClass}>
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

      <section>
        <div className="mb-1 flex items-center justify-between">
          <Heading className={sectionHeadingClass}>
            Injuries
          </Heading>
          {/* Survivors always have every slot; Others choose theirs. */}
          {!isSurvivor && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">S</span>
                <Stepper
                  onDecrement={() => onAdjustSeriousTier(-1)}
                  onIncrement={() => onAdjustSeriousTier(1)}
                  disableDecrement={seriousTier === 0}
                  disableIncrement={seriousTier === 2}
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
                label={hasTwoSerious ? "Serious #1" : "Serious"}
                onUpdate={(patch) => onUpdateSeriousInjury(0, patch)}
              />
              {hasTwoSerious && (
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

      <ConditionsEditor
        conditions={data.conditions}
        headingLevel={headingLevel}
        onAdd={onAddCondition}
        onRemove={onRemoveCondition}
      />
    </>
  );
}
