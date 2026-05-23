import { create } from "zustand";
import {
  TokenRecord,
  CharacterData,
  CharacterType,
  DisplaySettings,
  InjurySlot,
  createDefaultTokenRecord,
  getActiveData,
  setActiveData,
  STRAIN_MAX,
  STRAIN_MIN,
} from "./characterDataHelpers";

/**
 * The store holds the full TokenRecord (both survivor and other blobs).
 * All UI actions operate on the active blob only, then write the whole
 * record back to OBR so both blobs are always persisted.
 *
 * Switching characterType simply changes record.activeType — the other
 * blob is left completely untouched.
 */
interface TokenRecordState {
  record: TokenRecord;
  writeToItem: ((record: TokenRecord) => Promise<void>) | undefined;

  /** Replace the entire record (called on item load). */
  setRecord: (record: TokenRecord) => void;
  setWriteToItem: (fn: (record: TokenRecord) => Promise<void>) => void;

  /** Convenience selector — returns the active CharacterData blob. */
  data: CharacterData;

  // --- Character type ---
  setCharacterType: (type: CharacterType) => void;

  // --- Strain ---
  setStrainCurrent: (current: number) => void;
  setStrainMax: (max: number) => void;

  // --- Injuries ---
  updateSeriousInjury: (index: 0 | 1, patch: Partial<InjurySlot>) => void;
  updateCriticalInjury: (patch: Partial<InjurySlot>) => void;
  updateLethalInjury: (patch: Partial<InjurySlot>) => void;
  setHasSerious: (val: boolean) => void;
  setSeriousCount: (count: 1 | 2) => void;
  setHasCritical: (val: boolean) => void;
  setHasLethal: (val: boolean) => void;

  // --- Conditions ---
  addCondition: (text: string) => void;
  removeCondition: (index: number) => void;

  // --- Display settings ---
  setDisplaySettings: (patch: Partial<DisplaySettings>) => void;
}

const defaultRecord = createDefaultTokenRecord();

export const useCharacterDataStore = create<TokenRecordState>()((set) => ({
  record: defaultRecord,
  data: getActiveData(defaultRecord),
  writeToItem: undefined,

  setRecord: (record) =>
    set({ record, data: getActiveData(record) }),

  setWriteToItem: (writeToItem) => set({ writeToItem }),

  /**
   * Switch active type. The previous blob is kept intact in the record;
   * only record.activeType changes. No data is carried across blobs.
   */
  setCharacterType: (type) =>
    set((state) => {
      const record = { ...state.record, activeType: type };
      return mutate(state, record);
    }),

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
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, hasSerious }));
    }),

  setSeriousCount: (seriousCount) =>
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, seriousCount }));
    }),

  setHasCritical: (hasCritical) =>
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, hasCritical }));
    }),

  setHasLethal: (hasLethal) =>
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, { ...active, hasLethal }));
    }),

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
      const conditions = active.conditions.filter((_, i) => i !== index);
      return mutate(state, setActiveData(state.record, { ...active, conditions }));
    }),

  setDisplaySettings: (patch) =>
    set((state) => {
      const active = getActiveData(state.record);
      return mutate(state, setActiveData(state.record, {
        ...active,
        displaySettings: { ...active.displaySettings, ...patch },
      }));
    }),
}));

/** Apply a full record update, persist to OBR, and return new state slice. */
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
