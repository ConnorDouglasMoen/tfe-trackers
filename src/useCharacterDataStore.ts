import { create } from "zustand";
import {
  CharacterData,
  InjurySlot,
  createDefaultCharacterData,
  STRAIN_MAX,
  STRAIN_MIN,
} from "./characterDataHelpers";

/**
 * Zustand store for the character data of the currently selected token.
 *
 * `writeToItem` is injected by the entry-point App so the store can persist
 * changes back to OBR without knowing the OBR API directly.
 */
interface CharacterDataState {
  data: CharacterData;
  writeToItem: ((data: CharacterData) => Promise<void>) | undefined;

  /** Replace the entire data object (e.g. when the item selection changes). */
  setData: (data: CharacterData) => void;
  /** Inject the OBR write function from the App component. */
  setWriteToItem: (fn: (data: CharacterData) => Promise<void>) => void;

  // --- Strain ---
  setStrainCurrent: (current: number) => void;
  setStrainMax: (max: number) => void;

  // --- Injuries ---
  updateSeriousInjury: (index: 0 | 1, patch: Partial<InjurySlot>) => void;
  updateCriticalInjury: (patch: Partial<InjurySlot>) => void;
  updateLethalInjury: (patch: Partial<InjurySlot>) => void;
  setHasSerious: (val: boolean) => void;
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

  setStrainCurrent: (current) =>
    set((state) => {
      // Clamp to [0, strainMax]
      const clamped = Math.max(0, Math.min(state.data.strainMax, current));
      return mutate(state, { strainCurrent: clamped });
    }),

  setStrainMax: (max) =>
    set((state) => {
      const clamped = Math.max(STRAIN_MIN, Math.min(STRAIN_MAX, max));
      // Also clamp current strain if it now exceeds new max
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

  setHasSerious: (hasSerious) =>
    set((state) => mutate(state, { hasSerious })),

  setHasCritical: (hasCritical) =>
    set((state) => mutate(state, { hasCritical })),

  setHasLethal: (hasLethal) =>
    set((state) => mutate(state, { hasLethal })),

  setConditions: (conditions) =>
    set((state) => mutate(state, { conditions })),
}));

/**
 * Apply a partial patch to state.data, trigger the OBR write side-effect,
 * and return the new state slice.
 */
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
