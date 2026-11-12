import { useEffect, useState } from "react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { InjuryDisplay } from "../characterDataHelpers";
import { useOwlbearStore } from "../useOwlbearStore";
import { useCharacterDataStore } from "../useCharacterDataStore";
import { getTokenRecordFromSelection } from "../itemMetadataHelpers";
import { getPluginId } from "../getPluginId";
import { TokenEditor } from "../components/TokenEditor";
import TextInput from "../components/TextInput";
import SegmentedControl from "../components/SegmentedControl";
import { ChevronIcon } from "../components/icons";

const VISIBILITY_OPTIONS = [
  { value: null, label: "Scene" },
  { value: true, label: "Show" },
  { value: false, label: "Hide" },
] as const;

const INJURY_OPTIONS: ReadonlyArray<{ value: InjuryDisplay | null; label: string }> = [
  { value: null, label: "Scene" },
  { value: "all", label: "All" },
  { value: "filled-only", label: "Filled" },
  { value: "none", label: "None" },
];

function OverrideRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-primary dark:text-text-primary-dark">{label}</span>
      {children}
    </div>
  );
}

/**
 * Per-token overrides of the scene display settings. "Scene" means the token
 * follows whatever the GM set in the Action panel.
 */
export function TokenDisplaySection(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const overrides = useCharacterDataStore((state) => state.record.displayOverrides);
  const setDisplayOverride = useCharacterDataStore((state) => state.setDisplayOverride);

  return (
    <section>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-left"
        aria-expanded={isOpen}
      >
        <ChevronIcon
          size={10}
          open={isOpen}
          className="text-text-secondary dark:text-text-secondary-dark"
        />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
          Token Display Settings
        </h2>
      </button>
      {isOpen && (
        <div className="mt-1.5 flex flex-col gap-2">
          <OverrideRow label="Strain">
            <SegmentedControl
              options={VISIBILITY_OPTIONS}
              value={overrides.showStrain}
              onChange={(showStrain) => setDisplayOverride({ showStrain })}
            />
          </OverrideRow>
          <OverrideRow label="Injuries">
            <SegmentedControl
              options={INJURY_OPTIONS}
              value={overrides.injuryDisplay}
              onChange={(injuryDisplay) => setDisplayOverride({ injuryDisplay })}
            />
          </OverrideRow>
          <OverrideRow label="Conditions & Complications">
            <SegmentedControl
              options={VISIBILITY_OPTIONS}
              value={overrides.showConditions}
              onChange={(showConditions) => setDisplayOverride({ showConditions })}
            />
          </OverrideRow>
          <OverrideRow label="Token Name">
            <SegmentedControl
              options={VISIBILITY_OPTIONS}
              value={overrides.showName}
              onChange={(showName) => setDisplayOverride({ showName })}
            />
          </OverrideRow>
        </div>
      )}
    </section>
  );
}

function openEditorPopover() {
  void OBR.popover.open({
    id: getPluginId("token-editor"),
    url: "/src/tokenMenu/tokenMenu.html?popover=1",
    height: 600,
    width: 380,
    anchorOrigin: { horizontal: "CENTER", vertical: "CENTER" },
    transformOrigin: { horizontal: "CENTER", vertical: "CENTER" },
  });
}

/** Context-menu editor for the selected token. Edits are written back to the selection. */
export default function TokenMenu({ isPopover }: { isPopover: boolean }): React.JSX.Element {
  const mode = useOwlbearStore((state) => state.themeMode);
  const role = useOwlbearStore((state) => state.role);
  const store = useCharacterDataStore();

  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    const load = (items: Item[]) => {
      getTokenRecordFromSelection(items)
        .then((record) => {
          store.setRecord(record);
          setInitDone(true);
        })
        .catch(console.error);
    };
    void OBR.scene.items.getItems().then(load);
    return OBR.scene.items.onChange(load);
  }, []);

  if (!initDone) return <></>;

  return (
    <div className={`${mode === "DARK" ? "dark" : ""} h-screen overflow-y-auto`}>
      <div className="flex flex-col gap-3 px-3 py-2">
        <TokenEditor
          data={store.data}
          headingLevel="h2"
          topRowExtra={
            role === "GM" && !isPopover ? (
              <button
                onClick={openEditorPopover}
                className="rounded-lg bg-black/10 px-3 py-1 text-xs text-text-secondary hover:bg-black/20 dark:bg-white/10 dark:text-text-secondary-dark dark:hover:bg-white/15"
              >
                Open Editor
              </button>
            ) : undefined
          }
          belowToggleContent={
            <div className="flex items-center gap-2">
              <TextInput
                value={store.record.displayName}
                onConfirm={store.setDisplayName}
                placeholder="Add displayed token name"
              />
              {store.record.displayName !== "" && (
                <button
                  onClick={() => store.setDisplayName("")}
                  className="shrink-0 rounded px-1 py-0.5 text-2xs font-semibold uppercase tracking-wide text-text-disabled hover:text-text-secondary dark:text-text-disabled-dark dark:hover:text-text-secondary-dark"
                >
                  Clear
                </button>
              )}
            </div>
          }
          onSetCharacterType={store.setCharacterType}
          onSetStrainCurrent={store.setStrainCurrent}
          onSetStrainMax={store.setStrainMax}
          onUpdateSeriousInjury={store.updateSeriousInjury}
          onUpdateCriticalInjury={store.updateCriticalInjury}
          onUpdateLethalInjury={store.updateLethalInjury}
          onAdjustSeriousTier={store.adjustSeriousTier}
          onSetHasCritical={store.setHasCritical}
          onSetHasLethal={store.setHasLethal}
          onAddCondition={store.addCondition}
          onRemoveCondition={store.removeCondition}
        />
        <TokenDisplaySection />
      </div>
    </div>
  );
}
