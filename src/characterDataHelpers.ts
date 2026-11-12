// ─── Types ────────────────────────────────────────────────────────────────────

export type InjurySlot = {
  id: string;
  description: string;
  complications: string[];
  treated: boolean;
};

export type CharacterType = "survivor" | "other";

export type InjuryDisplay = "all" | "filled-only" | "none";

/** Scene-wide on-map display settings, stored in scene metadata. */
export type DisplaySettings = {
  showStrain: boolean;
  showConditions: boolean;
  /** "all" shows empty slots too, "filled-only" hides them, "none" hides the row. */
  injuryDisplay: InjuryDisplay;
  showName: boolean;
  /** Scales strain boxes and injury circles. */
  markerScale: number;
  /** Scales condition, complication, and name bubbles. */
  textScale: number;
};

/** Per-token visibility overrides. `null` inherits the scene setting. */
export type TokenDisplayOverrides = {
  showStrain: boolean | null;
  showConditions: boolean | null;
  injuryDisplay: InjuryDisplay | null;
  showName: boolean | null;
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

/**
 * Everything stored on a token. Survivor and Other data are kept separately
 * so switching types never loses either one.
 */
export type TokenRecord = {
  activeType: CharacterType;
  survivor: CharacterData;
  other: CharacterData;
  displayOverrides: TokenDisplayOverrides;
  /**
   * Custom name for the Action panel list and the on-map name bubble. When
   * empty, the Action panel falls back to the item name and no bubble is drawn.
   */
  displayName: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const TOKEN_RECORD_METADATA_ID = "tokenRecord";
/** Pre-TokenRecord key that held a bare CharacterData blob. */
export const LEGACY_CHARACTER_DATA_METADATA_ID = "characterData";
export const HIDDEN_METADATA_ID = "hidden";
export const SCENE_DISPLAY_METADATA_ID = "sceneDisplaySettings";

export const STRAIN_MIN = 1;
/** Highest max strain each character type can be given. */
export const STRAIN_LIMITS: Record<CharacterType, number> = { survivor: 9, other: 18 };
/** Highest max strain of any character type. */
export const STRAIN_MAX = Math.max(...Object.values(STRAIN_LIMITS));

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  showStrain: true,
  showConditions: true,
  injuryDisplay: "all",
  showName: true,
  markerScale: 1,
  textScale: 1,
};

export const DEFAULT_TOKEN_DISPLAY_OVERRIDES: TokenDisplayOverrides = {
  showStrain: null,
  showConditions: null,
  injuryDisplay: null,
  showName: null,
};

// ─── Display settings ─────────────────────────────────────────────────────────

/** Read scene display settings from raw metadata, filling in any missing fields. */
export function parseDisplaySettings(raw: unknown): DisplaySettings {
  if (raw !== null && typeof raw === "object") {
    return { ...DEFAULT_DISPLAY_SETTINGS, ...(raw as Partial<DisplaySettings>) };
  }
  return { ...DEFAULT_DISPLAY_SETTINGS };
}

/** Apply a token's overrides on top of the scene settings. */
export function resolveDisplaySettings(
  scene: DisplaySettings,
  overrides: TokenDisplayOverrides,
): DisplaySettings {
  return {
    showStrain: overrides.showStrain ?? scene.showStrain,
    showConditions: overrides.showConditions ?? scene.showConditions,
    injuryDisplay: overrides.injuryDisplay ?? scene.injuryDisplay,
    showName: overrides.showName ?? scene.showName,
    markerScale: scene.markerScale,
    textScale: scene.textScale,
  };
}

// ─── Factories ────────────────────────────────────────────────────────────────

export function createInjurySlot(): InjurySlot {
  return {
    id: crypto.randomUUID(),
    description: "",
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
    displayName: "",
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

// ─── Type guards ──────────────────────────────────────────────────────────────
// These accept older shapes too; migrateToTokenRecord normalizes them.

type LegacyInjurySlot = InjurySlot & { location?: string };

function isInjurySlot(v: unknown): v is InjurySlot {
  const s = v as LegacyInjurySlot;
  return (
    typeof s?.id === "string" &&
    (typeof s?.description === "string" || typeof s?.location === "string") &&
    typeof s?.treated === "boolean" &&
    (Array.isArray(s?.complications) || typeof s?.complications === "string")
  );
}

function isCharacterData(v: unknown): v is CharacterData {
  const d = v as CharacterData;
  return (
    typeof d?.strainMax === "number" &&
    typeof d?.strainCurrent === "number" &&
    typeof d?.hasSerious === "boolean" &&
    typeof d?.hasCritical === "boolean" &&
    typeof d?.hasLethal === "boolean" &&
    Array.isArray(d?.seriousInjuries) &&
    d.seriousInjuries.length === 2 &&
    d.seriousInjuries.every(isInjurySlot) &&
    isInjurySlot(d?.criticalInjury) &&
    isInjurySlot(d?.lethalInjury) &&
    d?.conditions !== undefined
  );
}

export function isTokenRecord(v: unknown): v is TokenRecord {
  const r = v as TokenRecord;
  return (
    (r?.activeType === "survivor" || r?.activeType === "other") &&
    isCharacterData(r?.survivor) &&
    isCharacterData(r?.other)
  );
}

// ─── Migration ────────────────────────────────────────────────────────────────

/** Older versions stored conditions and complications as a single string. */
function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  return typeof value === "string" && value.length > 0 ? [value] : [];
}

function migrateInjurySlot(s: LegacyInjurySlot): InjurySlot {
  return {
    ...s,
    description: s.description ?? s.location ?? "",
    complications: toStringList(s.complications),
  };
}

function migrateCharacterData(d: CharacterData): CharacterData {
  return {
    ...d,
    characterType: d.characterType ?? "survivor",
    seriousCount: d.seriousCount ?? 2,
    conditions: toStringList(d.conditions),
    seriousInjuries: [
      migrateInjurySlot(d.seriousInjuries[0]),
      migrateInjurySlot(d.seriousInjuries[1]),
    ],
    criticalInjury: migrateInjurySlot(d.criticalInjury),
    lethalInjury: migrateInjurySlot(d.lethalInjury),
  };
}

function migrateDisplayOverrides(raw: unknown): TokenDisplayOverrides {
  const r = raw as Partial<TokenDisplayOverrides> | undefined;
  return {
    showStrain: r?.showStrain ?? null,
    showConditions: r?.showConditions ?? null,
    injuryDisplay: r?.injuryDisplay ?? null,
    showName: r?.showName ?? null,
  };
}

/**
 * Normalize whatever is stored on a token into a current TokenRecord. Handles
 * older TokenRecords, bare CharacterData blobs, and missing or invalid data.
 */
export function migrateToTokenRecord(raw: unknown): TokenRecord {
  if (isTokenRecord(raw)) {
    // Older records may lack displayName, or carry it under `displayAlias`.
    const r = raw as Omit<TokenRecord, "displayName"> & {
      displayName?: string;
      displayAlias?: string;
    };
    const hasDisplayName = typeof r.displayName === "string" && r.displayName !== "";
    return {
      activeType: r.activeType,
      survivor: migrateCharacterData(r.survivor),
      other: migrateCharacterData(r.other),
      displayOverrides: migrateDisplayOverrides(r.displayOverrides),
      displayName: hasDisplayName ? (r.displayName as string) : r.displayAlias ?? "",
    };
  }

  const record = createDefaultTokenRecord();
  if (isCharacterData(raw)) {
    const migrated = migrateCharacterData(raw);
    record.activeType = migrated.characterType;
    record[migrated.characterType] = migrated;
  }
  return record;
}
