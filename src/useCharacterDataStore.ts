import { create } from "zustand";
import {
  TokenRecord,
  CharacterData,
  CharacterType,
  InjurySlot,
  TokenDisplayOverrides,
  createDefaultTokenRecord,
  getActiveData,
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
  applyAdjustSeriousTier,
  applySetDisplayName,
} from "./tokenRecordMutations";

/**
 * The record being edited in the token context menu. Every mutation is
 * persisted through `writeToItem`, which the token menu points at the
 * current selection.
 */
interface TokenRecordState {
  record: TokenRecord;
  /** Always equal to getActiveData(record). */
  data: CharacterData;
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
  adjustSeriousTier: (delta: 1 | -1) => void;
  setHasCritical: (val: boolean) => void;
  setHasLethal: (val: boolean) => void;
  addCondition: (text: string) => void;
  removeCondition: (index: number) => void;
  /** Merge per-token display overrides; `null` reverts a field to the scene setting. */
  setDisplayOverride: (patch: Partial<TokenDisplayOverrides>) => void;
  setDisplayName: (name: string) => void;
}

const defaultRecord = createDefaultTokenRecord();

export const useCharacterDataStore = create<TokenRecordState>()((set, get) => {
  const mutate = (fn: (record: TokenRecord) => TokenRecord) => {
    const { record, writeToItem } = get();
    const next = fn(record);
    if (writeToItem === undefined) {
      console.warn("writeToItem not set — changes not persisted.");
    } else {
      void writeToItem(next);
    }
    set({ record: next, data: getActiveData(next) });
  };

  return {
    record: defaultRecord,
    data: getActiveData(defaultRecord),
    writeToItem: undefined,

    setRecord: (record) => set({ record, data: getActiveData(record) }),
    setWriteToItem: (writeToItem) => set({ writeToItem }),

    setCharacterType: (type) => mutate((r) => applyCharacterType(r, type)),
    setStrainCurrent: (current) => mutate((r) => applyStrainCurrent(r, current)),
    setStrainMax: (max) => mutate((r) => applyStrainMax(r, max)),
    updateSeriousInjury: (index, patch) => mutate((r) => applyUpdateSeriousInjury(r, index, patch)),
    updateCriticalInjury: (patch) => mutate((r) => applyUpdateCriticalInjury(r, patch)),
    updateLethalInjury: (patch) => mutate((r) => applyUpdateLethalInjury(r, patch)),
    setHasSerious: (hasSerious) => mutate((r) => applySetHasSerious(r, hasSerious)),
    setSeriousCount: (count) => mutate((r) => applySetSeriousCount(r, count)),
    adjustSeriousTier: (delta) => mutate((r) => applyAdjustSeriousTier(r, delta)),
    setHasCritical: (hasCritical) => mutate((r) => applySetHasCritical(r, hasCritical)),
    setHasLethal: (hasLethal) => mutate((r) => applySetHasLethal(r, hasLethal)),
    addCondition: (text) => mutate((r) => applyAddCondition(r, text)),
    removeCondition: (index) => mutate((r) => applyRemoveCondition(r, index)),
    setDisplayOverride: (patch) =>
      mutate((r) => ({ ...r, displayOverrides: { ...r.displayOverrides, ...patch } })),
    setDisplayName: (name) => mutate((r) => applySetDisplayName(r, name)),
  };
});
