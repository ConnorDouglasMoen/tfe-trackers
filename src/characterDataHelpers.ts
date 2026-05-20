/////////////////////////////////////////////////////////////////////
// TFE Character Data Types
//
// Characters in Tales from Elsewhere track:
//   - Strain (1-9 checkboxes; Survivors start at 3-9)
//   - Injuries (Serious x2, Critical x1, Lethal x1)
//   - Conditions (free text)
//
// Not all stat blocks have all injury tiers. The has* flags control
// which sections render in the UI.
/////////////////////////////////////////////////////////////////////

/** One injury slot — location, complications note, and treated flag. */
export type InjurySlot = {
  id: string;
  location: string;       // e.g. "Left Arm", "Chest"
  complications: string;  // free-text complication note
  treated: boolean;       // checked when the injury has been treated
};

/** Full character data stored in OBR item metadata. */
export type CharacterData = {
  // --- Strain ---
  strainMax: number;       // maximum strain boxes (1-9)
  strainCurrent: number;   // how many boxes are currently filled (0-strainMax)

  // --- Injury type availability ---
  hasSerious: boolean;     // whether this token has Serious Injury slots
  hasCritical: boolean;    // whether this token has a Critical Injury slot
  hasLethal: boolean;      // whether this token has a Lethal Injury slot

  // --- Injury slots (always present in data; rendered based on has* flags) ---
  seriousInjuries: [InjurySlot, InjurySlot]; // two Serious Injury slots
  criticalInjury: InjurySlot;
  lethalInjury: InjurySlot;

  // --- Conditions ---
  conditions: string;      // free-text temporary statuses
};

/////////////////////////////////////////////////////////////////////
// Constants
/////////////////////////////////////////////////////////////////////

export const CHARACTER_DATA_METADATA_ID = "characterData";
export const HIDDEN_METADATA_ID = "hidden";

export const STRAIN_MIN = 1;
export const STRAIN_MAX = 9;
export const SURVIVOR_STRAIN_MIN = 3;

/////////////////////////////////////////////////////////////////////
// Factory helpers
/////////////////////////////////////////////////////////////////////

/** Create a blank InjurySlot with a unique ID. */
export function createInjurySlot(): InjurySlot {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    location: "",
    complications: "",
    treated: false,
  };
}

/** Create a default CharacterData for a Survivor (all injury types, strain 3-9). */
export function createDefaultCharacterData(): CharacterData {
  return {
    strainMax: 9,
    strainCurrent: 0,
    hasSerious: true,
    hasCritical: true,
    hasLethal: true,
    seriousInjuries: [createInjurySlot(), createInjurySlot()],
    criticalInjury: createInjurySlot(),
    lethalInjury: createInjurySlot(),
    conditions: "",
  };
}

/////////////////////////////////////////////////////////////////////
// Type guard
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

/** Runtime validation of a CharacterData object read from OBR metadata. */
export function isCharacterData(v: unknown): v is CharacterData {
  const d = v as CharacterData;
  if (typeof d?.strainMax !== "number") return false;
  if (typeof d?.strainCurrent !== "number") return false;
  if (typeof d?.hasSerious !== "boolean") return false;
  if (typeof d?.hasCritical !== "boolean") return false;
  if (typeof d?.hasLethal !== "boolean") return false;
  if (!Array.isArray(d?.seriousInjuries) || d.seriousInjuries.length !== 2)
    return false;
  if (!d.seriousInjuries.every(isInjurySlot)) return false;
  if (!isInjurySlot(d?.criticalInjury)) return false;
  if (!isInjurySlot(d?.lethalInjury)) return false;
  if (typeof d?.conditions !== "string") return false;
  return true;
}
