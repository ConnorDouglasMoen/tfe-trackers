import { useEffect, useState } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { useOwlbearStore } from "../useOwlbearStore";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { getCharacterDataFromSelection } from "../itemMetadataHelpers";
import { getPluginId } from "../getPluginId";
import { STRAIN_MIN, STRAIN_MAX } from "../characterDataHelpers";
import StrainRow from "../components/StrainRow";
import InjurySlotCard from "../components/InjurySlotCard";

/**
 * Small +/- stepper used for strain max and Other-mode injury tier counts.
 */
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

/**
 * Conditions section.
 *
 * A single-line input: pressing Enter saves the condition to a list.
 * Each saved condition has an X button to delete it.
 */
function ConditionsSection(): React.JSX.Element {
  const conditions = useCharacterDataStore((state) => state.data.conditions);
  const addCondition = useCharacterDataStore((state) => state.addCondition);
  const removeCondition = useCharacterDataStore((state) => state.removeCondition);

  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCondition(inputValue);
      setInputValue("");
    }
  };

  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
        Conditions
      </h2>

      {/* Single-line input — Enter to add */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add condition, press Enter…"
        className="w-full rounded-lg border border-white/10 bg-black/10 px-2 py-1 text-sm text-text-primary outline-none placeholder:text-text-disabled dark:bg-white/5 dark:text-text-primary-dark dark:placeholder:text-text-disabled-dark"
      />

      {/* Saved conditions list */}
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
                onClick={() => removeCondition(index)}
                aria-label={`Remove condition: ${condition}`}
                className="shrink-0 text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
              >
                {/* X icon */}
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

/**
 * The main token context-menu panel.
 *
 * Two modes controlled by a toggle at the top:
 *   Survivor — fixed layout: strain 1-9, all injury types, no S/C/L toggles
 *   Other    — minimal default (1 strain, 1 serious); +/- buttons to add tiers
 *
 * isPopover: when true (opened via "Open Full Editor"), hides the footer button.
 */
export default function TokenMenu({ isPopover }: { isPopover: boolean }): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);

  const data = useCharacterDataStore((state) => state.data);
  const setData = useCharacterDataStore((state) => state.setData);
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

  const [initDone, setInitDone] = useState(false);

  // Load character data whenever scene items change.
  useEffect(() => {
    const load = (items: Item[]) => {
      getCharacterDataFromSelection(items)
        .then((d) => {
          setData(d);
          setInitDone(true);
        })
        .catch(console.error);
    };
    OBR.scene.items.getItems().then(load);
    return OBR.scene.items.onChange(load);
  }, []);

  if (!initDone) return <></>;

  const isSurvivor = data.characterType === "survivor";

  // Other mode: Serious steps 0 → 1 → 2
  const seriousLevel = !data.hasSerious ? 0 : data.seriousCount === 2 ? 2 : 1;
  const adjustSerious = (delta: 1 | -1) => {
    const next = seriousLevel + delta;
    if (next === 0) { setHasSerious(false); }
    else if (next === 1) { setHasSerious(true); setSeriousCount(1); }
    else if (next === 2) { setHasSerious(true); setSeriousCount(2); }
  };
  const adjustCritical = (delta: 1 | -1) => setHasCritical(delta > 0);
  const adjustLethal = (delta: 1 | -1) => setHasLethal(delta > 0);

  return (
    <div className={`${mode === "DARK" ? "dark" : ""} h-screen overflow-y-auto`}>
      <div className="flex flex-col gap-3 px-3 py-2">

        {/* ── Character Type Toggle ──────────────────────────────── */}
        <div className="flex items-center gap-1 self-start rounded-lg bg-black/10 p-0.5 dark:bg-white/10">
          {(["survivor", "other"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setCharacterType(type)}
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

        {/* ── Strain ─────────────────────────────────────────────── */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
              Strain
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-text-secondary-dark">
              <span>Max: {data.strainMax}</span>
              <Stepper
                onDecrement={() => setStrainMax(data.strainMax - 1)}
                onIncrement={() => setStrainMax(data.strainMax + 1)}
                disableDecrement={data.strainMax <= STRAIN_MIN}
                disableIncrement={data.strainMax >= STRAIN_MAX}
              />
            </div>
          </div>
          <StrainRow
            strainMax={data.strainMax}
            strainCurrent={data.strainCurrent}
            onChange={setStrainCurrent}
          />
          <div className="mt-0.5 text-2xs text-text-disabled dark:text-text-disabled-dark">
            {data.strainCurrent} / {data.strainMax} taken
          </div>
        </section>

        {/* ── Injuries ───────────────────────────────────────────── */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
              Injuries
            </h2>
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
                    onDecrement={() => adjustCritical(-1)}
                    onIncrement={() => adjustCritical(1)}
                    disableDecrement={!data.hasCritical}
                    disableIncrement={data.hasCritical}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <span className="text-2xs text-text-disabled dark:text-text-disabled-dark">L</span>
                  <Stepper
                    onDecrement={() => adjustLethal(-1)}
                    onIncrement={() => adjustLethal(1)}
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
                onUpdate={updateCriticalInjury}
              />
            )}
            {data.hasLethal && (
              <InjurySlotCard
                slot={data.lethalInjury}
                severity="lethal"
                label="Lethal"
                onUpdate={updateLethalInjury}
              />
            )}
            {!data.hasSerious && !data.hasCritical && !data.hasLethal && (
              <p className="text-xs text-text-disabled dark:text-text-disabled-dark">
                No injuries. Use the +/- buttons above to add injury slots.
              </p>
            )}
          </div>
        </section>

        {/* ── Conditions ─────────────────────────────────────────── */}
        <ConditionsSection />

        {/* ── Footer — hidden when already inside the popover ────── */}
        {role === "GM" && !isPopover && (
          <div className="flex justify-end">
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
              Open Full Editor
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
