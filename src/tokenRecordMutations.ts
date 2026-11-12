// Pure, immutable updates to a TokenRecord. Each function acts on the active
// character data and returns a new record. Shared by the token menu store and
// the Action panel's tracked-token rows.

import {
  TokenRecord,
  CharacterData,
  CharacterType,
  InjurySlot,
  STRAIN_MIN,
  STRAIN_LIMITS,
  getActiveData,
  setActiveData,
} from "./characterDataHelpers";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Merge a patch into the active character data. */
export function applyDataPatch(record: TokenRecord, patch: Partial<CharacterData>): TokenRecord {
  return setActiveData(record, { ...getActiveData(record), ...patch });
}

// ─── Strain ───────────────────────────────────────────────────────────────────

/** Set current strain, clamped to [0, strainMax]. */
export function applyStrainCurrent(record: TokenRecord, current: number): TokenRecord {
  const { strainMax } = getActiveData(record);
  return applyDataPatch(record, { strainCurrent: clamp(current, 0, strainMax) });
}

/**
 * Set max strain, clamped between STRAIN_MIN and the character type's limit.
 * Current strain is lowered to fit.
 */
export function applyStrainMax(record: TokenRecord, max: number): TokenRecord {
  const active = getActiveData(record);
  const strainMax = clamp(max, STRAIN_MIN, STRAIN_LIMITS[active.characterType]);
  const strainCurrent = Math.min(active.strainCurrent, strainMax);
  return applyDataPatch(record, { strainMax, strainCurrent });
}

// ─── Character type ───────────────────────────────────────────────────────────

/** Switch which character data is active. Both sets of data are kept. */
export function applyCharacterType(record: TokenRecord, type: CharacterType): TokenRecord {
  return { ...record, activeType: type };
}

// ─── Conditions ───────────────────────────────────────────────────────────────

/** Append a condition. Blank input is ignored. */
export function applyAddCondition(record: TokenRecord, text: string): TokenRecord {
  const trimmed = text.trim();
  if (trimmed === "") return record;
  return applyDataPatch(record, { conditions: [...getActiveData(record).conditions, trimmed] });
}

export function applyRemoveCondition(record: TokenRecord, index: number): TokenRecord {
  return applyDataPatch(record, {
    conditions: getActiveData(record).conditions.filter((_, i) => i !== index),
  });
}

// ─── Injury slots ─────────────────────────────────────────────────────────────

export function applyUpdateSeriousInjury(
  record: TokenRecord,
  index: 0 | 1,
  patch: Partial<InjurySlot>,
): TokenRecord {
  const seriousInjuries = [...getActiveData(record).seriousInjuries] as [InjurySlot, InjurySlot];
  seriousInjuries[index] = { ...seriousInjuries[index], ...patch };
  return applyDataPatch(record, { seriousInjuries });
}

export function applyUpdateCriticalInjury(
  record: TokenRecord,
  patch: Partial<InjurySlot>,
): TokenRecord {
  const { criticalInjury } = getActiveData(record);
  return applyDataPatch(record, { criticalInjury: { ...criticalInjury, ...patch } });
}

export function applyUpdateLethalInjury(
  record: TokenRecord,
  patch: Partial<InjurySlot>,
): TokenRecord {
  const { lethalInjury } = getActiveData(record);
  return applyDataPatch(record, { lethalInjury: { ...lethalInjury, ...patch } });
}

export function applySetHasSerious(record: TokenRecord, hasSerious: boolean): TokenRecord {
  return applyDataPatch(record, { hasSerious });
}

export function applySetSeriousCount(record: TokenRecord, seriousCount: 1 | 2): TokenRecord {
  return applyDataPatch(record, { seriousCount });
}

export function applySetHasCritical(record: TokenRecord, hasCritical: boolean): TokenRecord {
  return applyDataPatch(record, { hasCritical });
}

export function applySetHasLethal(record: TokenRecord, hasLethal: boolean): TokenRecord {
  return applyDataPatch(record, { hasLethal });
}

/** Number of serious injury slots in use: 0, 1, or 2. */
export function getSeriousTier(data: CharacterData): 0 | 1 | 2 {
  if (!data.hasSerious) return 0;
  return data.seriousCount === 2 ? 2 : 1;
}

/** Step the number of serious injury slots up or down, staying within 0–2. */
export function applyAdjustSeriousTier(record: TokenRecord, delta: 1 | -1): TokenRecord {
  const next = clamp(getSeriousTier(getActiveData(record)) + delta, 0, 2);
  if (next === 0) return applyDataPatch(record, { hasSerious: false });
  return applyDataPatch(record, { hasSerious: true, seriousCount: next });
}

// ─── Display name ─────────────────────────────────────────────────────────────

/** Set the custom display name. An empty name hides the on-map name bubble. */
export function applySetDisplayName(record: TokenRecord, displayName: string): TokenRecord {
  return { ...record, displayName: displayName.trim() };
}
