import { create } from "zustand";
import {
  TokenRecord,
  CharacterData,
  CharacterType,
  InjurySlot,
  createDefaultTokenRecord,
  getActiveData,
  setActiveData,
  STRAIN_MAX,
  STRAIN_MIN,
} from "./characterDataHelpers";

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
}

const defaultRecord = createDefaultTokenRecord();

export const useCharacterDataStore = create<TokenRecordState>()((set) => ({
  record: defaultRecord,
  data: getActiveData(defaultRecord),
  writeToItem: undefined,

  setRecord: (record) => set({ record, data: getActiveData(record) }),
  setWriteToItem: (writeToItem) => set({ writeToItem }),

  setCharacterType: (type) =>
    set((state) => mutate(state, { ...state.record, activeType: type })),

  setStrainCurrent: (current) =>
    set((state) => {
      const active = getActiveData(state.record);
      const clamped = Math.max(0, Math.min(active.strainMax, current));
      return mutate(state, setActiveData(state.record, { ...active, strainCurrent: clamped }));
    }),

  setStrainMax: (max) =>
    set((state) => {
      const active = getActiveData(state.record);
      const clamped = Math.max(STRAIN_MIN, Math.min(STRAIN_MAX, max));
      const strainCurrent = Math.min(active.strainCurrent, clamped);
      return mutate(state, setActiveData(state.record, { ...active, strainMax: clamped, strainCurrent }));
    }),

  updateSeriousInjury: (index, patch) =>
    set((state) => {
      const active = getActiveData(state.record);
      const updated = [...active.seriousInjuries] as [InjurySlot, InjurySlot];
      updated[index] = { ...updated[index], ...patch };
      return mutate(state, setActiveData(state.record, { ...active, seriousInjuries: updated }));
    }),

  updateCriticalInjury: (patch) =>
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, criticalInjury: { ...active.criticalInjury, ...patch } }));
    }),

  updateLethalInjury: (patch) =>
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, lethalInjury: { ...active.lethalInjury, ...patch } }));
    }),

  setHasSerious: (hasSerious) =>
    set((state) => mutate(state, setActiveData(state.record, { ...getActiveData(state.record), hasSerious }))),

  setSeriousCount: (seriousCount) =>
    set((state) => mutate(state, setActiveData(state.record, { ...getActiveData(state.record), seriousCount }))),

  setHasCritical: (hasCritical) =>
    set((state) => mutate(state, setActiveData(state.record, { ...getActiveData(state.record), hasCritical }))),

  setHasLethal: (hasLethal) =>
    set((state) => mutate(state, setActiveData(state.record, { ...getActiveData(state.record), hasLethal }))),

  addCondition: (text) =>
    set((state) => {
      const trimmed = text.trim();
      if (trimmed === "") return state;
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, conditions: [...active.conditions, trimmed] }));
    }),

  removeCondition: (index) =>
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, conditions: active.conditions.filter((_, i) => i !== index) }));
    }),
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
