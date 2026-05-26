/////////////////////////////////////////////////////////////////////
// TFE Character Data Types
/////////////////////////////////////////////////////////////////////

export type InjurySlot = {
  id: string;
  location: string;
  complications: string[]; // list of complication strings, like conditions
  treated: boolean;
};

export type CharacterType = "survivor" | "other";

export type DisplaySettings = {
  showStrain: boolean;
  showConditions: boolean;
  // "all" = show empty + filled circles; "filled-only" = filled only; "none" = hide row entirely
  injuryDisplay: "all" | "filled-only" | "none";
};

/**
 * Per-token display overrides. Each field is either a value that overrides
 * the scene-level DisplaySettings, or null to inherit from the scene default.
 */
export type TokenDisplayOverrides = {
  showStrain: boolean | null;
  showConditions: boolean | null;
  injuryDisplay: "all" | "filled-only" | "none" | null;
};

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

export type TokenRecord = {
  activeType: CharacterType;
  survivor: CharacterData;
  other: CharacterData;
  /** Per-token display overrides; null fields fall back to scene DisplaySettings. */
  displayOverrides: TokenDisplayOverrides;
  /**
   * Optional alias shown in the Action panel tracked-tokens list.
   * Does not affect the OBR item name — only visible to the GM in the Action panel.
   * Undefined means fall back to the item's actual OBR name.
   */
  displayAlias?: string;
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
  injuryDisplay: "all", // show all injury circles by default
};

/** Default overrides — all null means "use scene settings". */
export const DEFAULT_TOKEN_DISPLAY_OVERRIDES: TokenDisplayOverrides = {
  showStrain: null,
  showConditions: null,
  injuryDisplay: null,
};

/**
 * Merge scene-level settings with per-token overrides.
 * Token override wins when non-null; otherwise scene setting is used.
 */
export function resolveDisplaySettings(
  scene: DisplaySettings,
  overrides: TokenDisplayOverrides,
): DisplaySettings {
  return {
    showStrain: overrides.showStrain ?? scene.showStrain,
    showConditions: overrides.showConditions ?? scene.showConditions,
    injuryDisplay: overrides.injuryDisplay ?? scene.injuryDisplay,
  };
}

/////////////////////////////////////////////////////////////////////
// Factory helpers
/////////////////////////////////////////////////////////////////////

export function createInjurySlot(): InjurySlot {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    location: "",
    complications: [],
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
    displayOverrides: { ...DEFAULT_TOKEN_DISPLAY_OVERRIDES },
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
    typeof s?.treated === "boolean" &&
    // complications may be legacy string or new string[]
    (Array.isArray(s?.complications) || typeof s?.complications === "string")
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
    // displayOverrides is added by migration, so we don't require it here
  );
}

/////////////////////////////////////////////////////////////////////
// Migration
/////////////////////////////////////////////////////////////////////

/** Migrate a single InjurySlot — converts legacy string complications to string[]. */
function migrateInjurySlot(s: InjurySlot): InjurySlot {
  return {
    ...s,
    complications: Array.isArray(s.complications)
      ? s.complications
      : typeof s.complications === "string" && (s.complications as string).length > 0
        ? [s.complications as string]
        : [],
  };
}

function migrateCharacterData(d: CharacterData): CharacterData {
  return {
    ...d,
    characterType: d.characterType ?? "survivor",
    seriousCount: d.seriousCount ?? 2,
    conditions: Array.isArray(d.conditions)
      ? d.conditions
      : typeof d.conditions === "string" && (d.conditions as string).length > 0
        ? [d.conditions as string]
        : [],
    seriousInjuries: [
      migrateInjurySlot(d.seriousInjuries[0]),
      migrateInjurySlot(d.seriousInjuries[1]),
    ],
    criticalInjury: migrateInjurySlot(d.criticalInjury),
    lethalInjury: migrateInjurySlot(d.lethalInjury),
  };
}

/** Migrate a TokenDisplayOverrides blob — fills in missing null fields. */
function migrateDisplayOverrides(raw: unknown): TokenDisplayOverrides {
  const r = raw as Partial<TokenDisplayOverrides>;
  return {
    showStrain: r?.showStrain ?? null,
    showConditions: r?.showConditions ?? null,
    injuryDisplay: r?.injuryDisplay ?? null,
  };
}

export function migrateToTokenRecord(raw: unknown): TokenRecord {
  if (isTokenRecord(raw)) {
    return {
      activeType: raw.activeType,
      survivor: migrateCharacterData(raw.survivor),
      other: migrateCharacterData(raw.other),
      displayOverrides: migrateDisplayOverrides((raw as TokenRecord).displayOverrides),
      displayAlias: (raw as TokenRecord).displayAlias,
    };
  }
  if (isCharacterData(raw)) {
    const migrated = migrateCharacterData(raw);
    const defaults = createDefaultTokenRecord();
    if (migrated.characterType === "other") {
      return { activeType: "other", survivor: defaults.survivor, other: migrated, displayOverrides: { ...DEFAULT_TOKEN_DISPLAY_OVERRIDES } };
    }
    return { activeType: "survivor", survivor: migrated, other: defaults.other, displayOverrides: { ...DEFAULT_TOKEN_DISPLAY_OVERRIDES } };
  }
  return createDefaultTokenRecord();
}
