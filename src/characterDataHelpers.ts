/////////////////////////////////////////////////////////////////////
// TFE Character Data Types
/////////////////////////////////////////////////////////////////////

/** One injury slot — location, complications note, and treated flag. */
export type InjurySlot = {
  id: string;
  location: string;
  complications: string;
  treated: boolean;
};

/**
 * Character type determines the default layout:
 *   "survivor" — full Survivor layout (strainMax 3-9, all injury types)
 *   "other"    — minimal layout (strainMax 1, only Serious by default)
 */
export type CharacterType = "survivor" | "other";

/**
 * Controls what is shown on the map above the token.
 *   showStrain       — render the strain checkbox row
 *   showConditions   — render condition text bubbles
 *   injuryDisplay    — "all" shows every enabled slot; "filled-only" hides empty slots
 */
export type DisplaySettings = {
  showStrain: boolean;
  showConditions: boolean;
  injuryDisplay: "all" | "filled-only";
};

/** Full character data stored in OBR item metadata. */
export type CharacterData = {
  characterType: CharacterType;
  displaySettings: DisplaySettings;

  // --- Strain ---
  strainMax: number;
  strainCurrent: number;

  // --- Injury type availability ---
  hasSerious: boolean;
  seriousCount: number;   // 1 or 2
  hasCritical: boolean;
  hasLethal: boolean;

  // --- Injury slots ---
  seriousInjuries: [InjurySlot, InjurySlot];
  criticalInjury: InjurySlot;
  lethalInjury: InjurySlot;

  // --- Conditions ---
  conditions: string[];
};

/////////////////////////////////////////////////////////////////////
// Constants
/////////////////////////////////////////////////////////////////////

export const CHARACTER_DATA_METADATA_ID = "characterData";
export const HIDDEN_METADATA_ID = "hidden";

export const STRAIN_MIN = 1;
export const STRAIN_MAX = 9;

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showStrain: true,
  showConditions: true,
  injuryDisplay: "all",
};

/////////////////////////////////////////////////////////////////////
// Factory helpers
/////////////////////////////////////////////////////////////////////

export function createInjurySlot(): InjurySlot {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    location: "",
    complications: "",
    treated: false,
  };
}

/** Default Survivor layout: all injury types, strain max 3. */
export function createDefaultCharacterData(): CharacterData {
  return {
    characterType: "survivor",
    displaySettings: { ...DEFAULT_DISPLAY_SETTINGS },
    strainMax: 3,
    strainCurrent: 0,
    hasSerious: true,
    seriousCount: 2,
    hasCritical: true,
    hasLethal: true,
    seriousInjuries: [createInjurySlot(), createInjurySlot()],
    criticalInjury: createInjurySlot(),
    lethalInjury: createInjurySlot(),
    conditions: [],
  };
}

/** Default Other layout: 1 strain, 1 serious injury only. */
export function createOtherCharacterData(): CharacterData {
  return {
    characterType: "other",
    displaySettings: { ...DEFAULT_DISPLAY_SETTINGS },
    strainMax: 1,
    strainCurrent: 0,
    hasSerious: true,
    seriousCount: 1,
    hasCritical: false,
    hasLethal: false,
    seriousInjuries: [createInjurySlot(), createInjurySlot()],
    criticalInjury: createInjurySlot(),
    lethalInjury: createInjurySlot(),
    conditions: [],
  };
}

/////////////////////////////////////////////////////////////////////
// Type guard + migration
/////////////////////////////////////////////////////////////////////

function isInjurySlot(v: unknown): v is InjurySlot {
  const s = v as InjurySlot;
  return (
    typeof s?.id === "string" &&
    typeof s?.location === "string" &&
    typeof s?.complications === "string" &&
    typeof s?.treated === "boolean"
  );
}

export function isCharacterData(v: unknown): v is CharacterData {
  const d = v as CharacterData;
  if (typeof d?.strainMax !== "number") return false;
  if (typeof d?.strainCurrent !== "number") return false;
  if (typeof d?.hasSerious !== "boolean") return false;
  if (typeof d?.hasCritical !== "boolean") return false;
  if (typeof d?.hasLethal !== "boolean") return false;
  if (!Array.isArray(d?.seriousInjuries) || d.seriousInjuries.length !== 2) return false;
  if (!d.seriousInjuries.every(isInjurySlot)) return false;
  if (!isInjurySlot(d?.criticalInjury)) return false;
  if (!isInjurySlot(d?.lethalInjury)) return false;
  if (d?.conditions === undefined) return false;
  return true;
}

/** Fill in any fields added after initial save. */
export function migrateCharacterData(d: CharacterData): CharacterData {
  return {
    ...d,
    characterType: d.characterType ?? "survivor",
    seriousCount: d.seriousCount ?? 2,
    displaySettings: {
      ...DEFAULT_DISPLAY_SETTINGS,
      ...(d.displaySettings ?? {}),
    },
    conditions: Array.isArray(d.conditions)
      ? d.conditions
      : typeof d.conditions === "string" && (d.conditions as string).length > 0
        ? [d.conditions as string]
        : [],
  };
}
