import { create } from "zustand";
import {
  CharacterData,
  CharacterType,
  DisplaySettings,
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

  /** Merge a partial DisplaySettings patch and persist. */
  setDisplaySettings: (patch: Partial<DisplaySettings>) => void;
}

export const useCharacterDataStore = create<CharacterDataState>()((set) => ({
  data: createDefaultCharacterData(),
  writeToItem: undefined,

  setData: (data) => set({ data }),
  setWriteToItem: (writeToItem) => set({ writeToItem }),

  setCharacterType: (type) =>
    set((state) => {
      const template =
        type === "survivor" ? createDefaultCharacterData() : createOtherCharacterData();
      const merged: CharacterData = {
        ...template,
        displaySettings: state.data.displaySettings,
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
  setSeriousCount: (seriousCount) => set((state) => mutate(state, { seriousCount })),
  setHasCritical: (hasCritical) => set((state) => mutate(state, { hasCritical })),
  setHasLethal: (hasLethal) => set((state) => mutate(state, { hasLethal })),

  addCondition: (text) =>
    set((state) => {
      const trimmed = text.trim();
      if (trimmed === "") return state;
      return mutate(state, { conditions: [...state.data.conditions, trimmed] });
    }),

  removeCondition: (index) =>
    set((state) => {
      const updated = state.data.conditions.filter((_, i) => i !== index);
      return mutate(state, { conditions: updated });
    }),

  setDisplaySettings: (patch) =>
    set((state) =>
      mutate(state, {
        displaySettings: { ...state.data.displaySettings, ...patch },
      }),
    ),
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
