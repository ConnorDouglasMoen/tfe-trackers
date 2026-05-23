import { create } from "zustand";
import {
  CharacterData,
  CharacterType,
  InjurySlot,
  createDefaultCharacterData,
  createOtherCharacterData,
  STRAIN_MAX,
  STRAIN_MIN,
} from "./characterDataHelpers";

interface CharacterDataState {
  data: CharacterData;
  writeToItem: ((data: CharacterData) => Promise<void>) | undefined;

  setData: (data: CharacterData) => void;
  setWriteToItem: (fn: (data: CharacterData) => Promise<void>) => void;

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
  setConditions: (text: string) => void;
}

export const useCharacterDataStore = create<CharacterDataState>()((set) => ({
  data: createDefaultCharacterData(),
  writeToItem: undefined,

  setData: (data) => set({ data }),
  setWriteToItem: (writeToItem) => set({ writeToItem }),

  /**
   * Switching character type resets to the appropriate default layout,
   * but preserves injury slot text the user may have already entered.
   */
  setCharacterType: (type) =>
    set((state) => {
      const template =
        type === "survivor" ? createDefaultCharacterData() : createOtherCharacterData();
      const merged: CharacterData = {
        ...template,
        // Preserve existing injury text across type switches
        seriousInjuries: state.data.seriousInjuries,
        criticalInjury: state.data.criticalInjury,
        lethalInjury: state.data.lethalInjury,
        conditions: state.data.conditions,
      };
      return mutate(state, merged);
    }),

  setStrainCurrent: (current) =>
    set((state) => {
      const clamped = Math.max(0, Math.min(state.data.strainMax, current));
      return mutate(state, { strainCurrent: clamped });
    }),

  setStrainMax: (max) =>
    set((state) => {
      const clamped = Math.max(STRAIN_MIN, Math.min(STRAIN_MAX, max));
      const strainCurrent = Math.min(state.data.strainCurrent, clamped);
      return mutate(state, { strainMax: clamped, strainCurrent });
    }),

  updateSeriousInjury: (index, patch) =>
    set((state) => {
      const updated = [...state.data.seriousInjuries] as [InjurySlot, InjurySlot];
      updated[index] = { ...updated[index], ...patch };
      return mutate(state, { seriousInjuries: updated });
    }),

  updateCriticalInjury: (patch) =>
    set((state) =>
      mutate(state, { criticalInjury: { ...state.data.criticalInjury, ...patch } }),
    ),

  updateLethalInjury: (patch) =>
    set((state) =>
      mutate(state, { lethalInjury: { ...state.data.lethalInjury, ...patch } }),
    ),

  setHasSerious: (hasSerious) => set((state) => mutate(state, { hasSerious })),

  setSeriousCount: (seriousCount) =>
    set((state) => mutate(state, { seriousCount })),

  setHasCritical: (hasCritical) => set((state) => mutate(state, { hasCritical })),

  setHasLethal: (hasLethal) => set((state) => mutate(state, { hasLethal })),

  setConditions: (conditions) => set((state) => mutate(state, { conditions })),
}));

function mutate(
  state: CharacterDataState,
  patch: Partial<CharacterData>,
): Partial<CharacterDataState> {
  const data = { ...state.data, ...patch };
  if (state.writeToItem === undefined) {
    console.warn("writeToItem not set — changes not persisted.");
  } else {
    void state.writeToItem(data);
  }
  return { data };
}
