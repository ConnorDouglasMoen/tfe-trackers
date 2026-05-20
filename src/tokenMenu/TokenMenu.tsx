import { useEffect, useRef, useState } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { useOwlbearStore } from "../useOwlbearStore";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { getCharacterDataFromSelection } from "../itemMetadataHelpers";
import { getPluginId } from "../getPluginId";
import StrainRow from "../components/StrainRow";
import InjurySlotCard from "../components/InjurySlotCard";
import ToggleButton from "../components/ToggleButton";
import TextInput from "../components/TextInput";
import { STRAIN_MAX, STRAIN_MIN } from "../characterDataHelpers";

/**
 * The main token context-menu panel.
 *
 * Sections (top to bottom):
 *   1. Strain — row of checkboxes + editable max
 *   2. Injuries — Serious (x2), Critical, Lethal (shown based on has* flags)
 *   3. Conditions — free-text textarea
 *   4. Footer — GM visibility toggle + open-editor button (future)
 */
export default function TokenMenu(): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);

  const data = useCharacterDataStore((state) => state.data);
  const setData = useCharacterDataStore((state) => state.setData);
  const setStrainCurrent = useCharacterDataStore((state) => state.setStrainCurrent);
  const setStrainMax = useCharacterDataStore((state) => state.setStrainMax);
  const updateSeriousInjury = useCharacterDataStore((state) => state.updateSeriousInjury);
  const updateCriticalInjury = useCharacterDataStore((state) => state.updateCriticalInjury);
  const updateLethalInjury = useCharacterDataStore((state) => state.updateLethalInjury);
  const setHasSerious = useCharacterDataStore((state) => state.setHasSerious);
  const setHasCritical = useCharacterDataStore((state) => state.setHasCritical);
  const setHasLethal = useCharacterDataStore((state) => state.setHasLethal);
  const setConditions = useCharacterDataStore((state) => state.setConditions);

  const [initDone, setInitDone] = useState(false);

  // --- Load character data when the selected item changes ---
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

  // --- Resize the embed to match content height ---
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (el === null) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 0;
      // OBR embed height must be set explicitly; add small padding buffer.
      OBR.contextMenu.setEmbedHeight(Math.ceil(height) + 8);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!initDone) return <></>;

  return (
    <div className={`${mode === "DARK" ? "dark" : ""} h-screen overflow-y-auto`}>
      <div ref={containerRef} className="flex flex-col gap-3 px-3 py-2">

        {/* ── Strain ─────────────────────────────────────────────── */}
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
              Strain
            </h2>
            {/* Strain max editor — small numeric input */}
            <div className="flex items-center gap-1 text-xs text-text-secondary dark:text-text-secondary-dark">
              <span>Max:</span>
              <TextInput
                value={data.strainMax.toString()}
                onConfirm={(v) => {
                  const n = parseInt(v, 10);
                  if (!isNaN(n)) setStrainMax(n);
                }}
                className="w-8 text-center"
              />
              <span className="text-text-disabled dark:text-text-disabled-dark">
                ({STRAIN_MIN}–{STRAIN_MAX})
              </span>
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
            {/* GM only: toggle which injury types this token has */}
            {role === "GM" && (
              <div className="flex gap-2">
                <ToggleButton
                  isChecked={data.hasSerious}
                  onChange={setHasSerious}
                  label="S"
                />
                <ToggleButton
                  isChecked={data.hasCritical}
                  onChange={setHasCritical}
                  label="C"
                />
                <ToggleButton
                  isChecked={data.hasLethal}
                  onChange={setHasLethal}
                  label="L"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {/* Serious Injuries */}
            {data.hasSerious && (
              <>
                <InjurySlotCard
                  slot={data.seriousInjuries[0]}
                  severity="serious"
                  label="Serious #1"
                  onUpdate={(patch) => updateSeriousInjury(0, patch)}
                />
                <InjurySlotCard
                  slot={data.seriousInjuries[1]}
                  severity="serious"
                  label="Serious #2"
                  onUpdate={(patch) => updateSeriousInjury(1, patch)}
                />
              </>
            )}

            {/* Critical Injury */}
            {data.hasCritical && (
              <InjurySlotCard
                slot={data.criticalInjury}
                severity="critical"
                label="Critical"
                onUpdate={updateCriticalInjury}
              />
            )}

            {/* Lethal Injury */}
            {data.hasLethal && (
              <InjurySlotCard
                slot={data.lethalInjury}
                severity="lethal"
                label="Lethal"
                onUpdate={updateLethalInjury}
              />
            )}

            {/* Fallback when all injury types are disabled */}
            {!data.hasSerious && !data.hasCritical && !data.hasLethal && (
              <p className="text-xs text-text-disabled dark:text-text-disabled-dark">
                No injury types enabled.
                {role === "GM" && " Use the toggles above to enable them."}
              </p>
            )}
          </div>
        </section>

        {/* ── Conditions ─────────────────────────────────────────── */}
        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
            Conditions
          </h2>
          <textarea
            value={data.conditions}
            onChange={(e) => setConditions(e.target.value)}
            onBlur={(e) => setConditions(e.target.value)}
            placeholder="Active conditions…"
            rows={3}
            className="w-full resize-none rounded-lg border border-white/10 bg-black/10 p-2 text-sm text-text-primary outline-none placeholder:text-text-disabled dark:bg-white/5 dark:text-text-primary-dark dark:placeholder:text-text-disabled-dark"
          />
        </section>

        {/* ── Footer ─────────────────────────────────────────────── */}
        {role === "GM" && (
          <div className="flex justify-end">
            <button
              onClick={() =>
                OBR.popover.open({
                  id: getPluginId("token-editor"),
                  url: "/src/tokenMenu/tokenMenu.html",
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
