/////////////////////////////////////////////////////////////////////
// TFE Character Data Types
/////////////////////////////////////////////////////////////////////

export type InjurySlot = {
  id: string;
  location: string;
  complications: string;
  treated: boolean;
};

export type CharacterType = "survivor" | "other";

/**
 * Scene-level display settings — stored in OBR scene metadata, not on tokens.
 * Changing these affects all tokens for all participants.
 */
export type DisplaySettings = {
  showStrain: boolean;
  showConditions: boolean;
  injuryDisplay: "all" | "filled-only";
};

/** Data for one character type. Stored independently per token. */
export type CharacterData = {
  characterType: CharacterType;
  strainMax: number;
  strainCurrent: number;
  hasSerious: boolean;
  seriousCount: number;
  hasCritical: boolean;
  hasLethal: boolean;
  seriousInjuries: [InjurySlot, InjurySlot];
  criticalInjury: InjurySlot;
  lethalInjury: InjurySlot;
  conditions: string[];
};

/**
 * Top-level record stored in OBR item metadata.
 * Both blobs are kept independently; activeType controls which is shown.
 */
export type TokenRecord = {
  activeType: CharacterType;
  survivor: CharacterData;
  other: CharacterData;
};

/////////////////////////////////////////////////////////////////////
// Constants
/////////////////////////////////////////////////////////////////////

export const TOKEN_RECORD_METADATA_ID = "tokenRecord";
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

export function createSurvivorData(): CharacterData {
  return {
    characterType: "survivor",
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

export function createOtherData(): CharacterData {
  return {
    characterType: "other",
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

export function createDefaultTokenRecord(): TokenRecord {
  return {
    activeType: "survivor",
    survivor: createSurvivorData(),
    other: createOtherData(),
  };
}

export function getActiveData(record: TokenRecord): CharacterData {
  return record.activeType === "survivor" ? record.survivor : record.other;
}

export function setActiveData(record: TokenRecord, data: CharacterData): TokenRecord {
  return record.activeType === "survivor"
    ? { ...record, survivor: data }
    : { ...record, other: data };
}

/////////////////////////////////////////////////////////////////////
// Type guards
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

function isCharacterData(v: unknown): v is CharacterData {
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

export function isTokenRecord(v: unknown): v is TokenRecord {
  const r = v as TokenRecord;
  return (
    (r?.activeType === "survivor" || r?.activeType === "other") &&
    isCharacterData(r?.survivor) &&
    isCharacterData(r?.other)
  );
}

/////////////////////////////////////////////////////////////////////
// Migration
/////////////////////////////////////////////////////////////////////

function migrateCharacterData(d: CharacterData): CharacterData {
  return {
    ...d,
    characterType: d.characterType ?? "survivor",
    seriousCount: d.seriousCount ?? 2,
    // Strip legacy displaySettings if present (now lives in scene metadata)
    conditions: Array.isArray(d.conditions)
      ? d.conditions
      : typeof d.conditions === "string" && (d.conditions as string).length > 0
        ? [d.conditions as string]
        : [],
  };
}

export function migrateToTokenRecord(raw: unknown): TokenRecord {
  if (isTokenRecord(raw)) {
    return {
      activeType: raw.activeType,
      survivor: migrateCharacterData(raw.survivor),
      other: migrateCharacterData(raw.other),
    };
  }
  if (isCharacterData(raw)) {
    const migrated = migrateCharacterData(raw);
    const defaults = createDefaultTokenRecord();
    if (migrated.characterType === "other") {
      return { activeType: "other", survivor: defaults.survivor, other: migrated };
    }
    return { activeType: "survivor", survivor: migrated, other: defaults.other };
  }
  return createDefaultTokenRecord();
}
