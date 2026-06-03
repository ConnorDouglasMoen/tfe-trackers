import { create } from "zustand";
import {
  TokenRecord,
  CharacterData,
  CharacterType,
  InjurySlot,
  TokenDisplayOverrides,
  createDefaultTokenRecord,
  getActiveData,
  STRAIN_MAX,
  STRAIN_MIN,
} from "./characterDataHelpers";
import {
  applyStrainCurrent,
  applyStrainMax,
  applyCharacterType,
  applyAddCondition,
  applyRemoveCondition,
  applyUpdateSeriousInjury,
  applyUpdateCriticalInjury,
  applyUpdateLethalInjury,
  applySetHasSerious,
  applySetSeriousCount,
  applySetHasCritical,
  applySetHasLethal,
  applySetDisplayName,
} from "./tokenRecordMutations";

// Re-export for consumers that import these from the store file.
export { STRAIN_MAX, STRAIN_MIN };

interface TokenRecordState {
  record: TokenRecord;
  data: CharacterData; // derived: always equals getActiveData(record)
  writeToItem: ((record: TokenRecord) => Promise<void>) | undefined;

  setRecord: (record: TokenRecord) => void;
  setWriteToItem: (fn: (record: TokenRecord) => Promise<void>) => void;

  setCharacterType: (type: CharacterType) => void;
  setStrainCurrent: (current: number) => void;
  setStrainMax: (max: number) => void;
  updateSeriousInjury: (index: 0 | 1, patch: Partial<InjurySlot>) => void;
  updateCriticalInjury: (patch: Partial<InjurySlot>) => void;
  updateLethalInjury: (patch: Partial<InjurySlot>) => void;
  setHasSerious: (val: boolean) => void;
  setSeriousCount: (count: 1 | 2) => void;
  setHasCritical: (val: boolean) => void;
  setHasLethal: (val: boolean) => void;
  addCondition: (text: string) => void;
  removeCondition: (index: number) => void;
  setDisplayOverride: (patch: Partial<TokenDisplayOverrides>) => void;
  /** Set the custom on-map name bubble text. Empty string hides the bubble. */
  setDisplayName: (name: string) => void;
}

const defaultRecord = createDefaultTokenRecord();

export const useCharacterDataStore = create<TokenRecordState>()((set) => ({
  record: defaultRecord,
  data: getActiveData(defaultRecord),
  writeToItem: undefined,

  setRecord: (record) => set({ record, data: getActiveData(record) }),
  setWriteToItem: (writeToItem) => set({ writeToItem }),

  // Delegate all mutations to pure helpers in tokenRecordMutations.ts.
  setCharacterType: (type) =>
    set((state) => mutate(state, applyCharacterType(state.record, type))),

  setStrainCurrent: (current) =>
    set((state) => mutate(state, applyStrainCurrent(state.record, current))),

  setStrainMax: (max) =>
    set((state) => mutate(state, applyStrainMax(state.record, max))),

  updateSeriousInjury: (index, patch) =>
    set((state) => mutate(state, applyUpdateSeriousInjury(state.record, index, patch))),

  updateCriticalInjury: (patch) =>
    set((state) => mutate(state, applyUpdateCriticalInjury(state.record, patch))),

  updateLethalInjury: (patch) =>
    set((state) => mutate(state, applyUpdateLethalInjury(state.record, patch))),

  setHasSerious: (hasSerious) =>
    set((state) => mutate(state, applySetHasSerious(state.record, hasSerious))),

  setSeriousCount: (seriousCount) =>
    set((state) => mutate(state, applySetSeriousCount(state.record, seriousCount))),

  setHasCritical: (hasCritical) =>
    set((state) => mutate(state, applySetHasCritical(state.record, hasCritical))),

  setHasLethal: (hasLethal) =>
    set((state) => mutate(state, applySetHasLethal(state.record, hasLethal))),

  addCondition: (text) =>
    set((state) => mutate(state, applyAddCondition(state.record, text))),

  removeCondition: (index) =>
    set((state) => mutate(state, applyRemoveCondition(state.record, index))),

  // Patch one or more per-token display overrides (null = revert to scene default).
  setDisplayOverride: (patch) =>
    set((state) => mutate(state, {
      ...state.record,
      displayOverrides: { ...state.record.displayOverrides, ...patch },
    })),

  // Update the custom on-map name bubble.
  setDisplayName: (displayName) =>
    set((state) => mutate(state, applySetDisplayName(state.record, displayName))),
}));

function mutate(
  state: TokenRecordState,
  record: TokenRecord,
): Partial<TokenRecordState> {
  if (state.writeToItem === undefined) {
    console.warn("writeToItem not set — changes not persisted.");
  } else {
    void state.writeToItem(record);
  }
  return { record, data: getActiveData(record) };
}
