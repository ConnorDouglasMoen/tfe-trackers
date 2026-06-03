// Token Record Mutation Helpers
//
// Pure functions for all common TokenRecord and CharacterData mutations.
// Both the Zustand store (useCharacterDataStore) and TrackedTokenRow use
// these helpers so the logic is defined once and tested in isolation.
//
// All functions are immutable: they return new objects and never mutate
// their arguments.

import {
  TokenRecord,
  CharacterData,
  CharacterType,
  InjurySlot,
  STRAIN_MIN,
  STRAIN_MAX,
  getActiveData,
  setActiveData,
} from "./characterDataHelpers";

// ─── Strain

/*
 * Set strainCurrent on the active CharacterData, clamped to [0, strainMax].
 */
export function applyStrainCurrent(record: TokenRecord, current: number): TokenRecord {
  const active = getActiveData(record);
  const clamped = Math.max(0, Math.min(active.strainMax, current));
  return setActiveData(record, { ...active, strainCurrent: clamped });
}

/*
 * Set strainMax on the active CharacterData, clamped to [STRAIN_MIN, STRAIN_MAX].
 * Also clamps strainCurrent down if it would exceed the new max.
 */
export function applyStrainMax(record: TokenRecord, max: number): TokenRecord {
  const active = getActiveData(record);
  const clamped = Math.max(STRAIN_MIN, Math.min(STRAIN_MAX, max));
  const strainCurrent = Math.min(active.strainCurrent, clamped);
  return setActiveData(record, { ...active, strainMax: clamped, strainCurrent });
}

// ─── Character type

/*
 * Switch the active character type. Both blobs are preserved; only activeType
 * changes so the UI shows the other blob's data.
 */
export function applyCharacterType(record: TokenRecord, type: CharacterType): TokenRecord {
  return { ...record, activeType: type };
}

// ─── Conditions

/*
 * Append a condition string to the active CharacterData's conditions list.
 * Trims whitespace; returns the record unchanged if the trimmed string is empty.
 */
export function applyAddCondition(record: TokenRecord, text: string): TokenRecord {
  const trimmed = text.trim();
  if (trimmed === "") return record;
  const active = getActiveData(record);
  return setActiveData(record, { ...active, conditions: [...active.conditions, trimmed] });
}

/*
 * Remove the condition at the given index from the active CharacterData.
 * No-ops silently if the index is out of range.
 */
export function applyRemoveCondition(record: TokenRecord, index: number): TokenRecord {
  const active = getActiveData(record);
  return setActiveData(record, {
    ...active,
    conditions: active.conditions.filter((_, i) => i !== index),
  });
}

// ─── Injury slots

/*
 * Merge a partial patch into a specific serious injury slot (index 0 or 1).
 * All other slots are unchanged.
 */
export function applyUpdateSeriousInjury(
  record: TokenRecord,
  index: 0 | 1,
  patch: Partial<InjurySlot>,
): TokenRecord {
  const active = getActiveData(record);
  const updated = [...active.seriousInjuries] as [InjurySlot, InjurySlot];
  updated[index] = { ...updated[index], ...patch };
  return setActiveData(record, { ...active, seriousInjuries: updated });
}

/*
 * Merge a partial patch into the critical injury slot.
 */
export function applyUpdateCriticalInjury(
  record: TokenRecord,
  patch: Partial<InjurySlot>,
): TokenRecord {
  const active = getActiveData(record);
  return setActiveData(record, {
    ...active,
    criticalInjury: { ...active.criticalInjury, ...patch },
  });
}

/*
 * Merge a partial patch into the lethal injury slot.
 */
export function applyUpdateLethalInjury(
  record: TokenRecord,
  patch: Partial<InjurySlot>,
): TokenRecord {
  const active = getActiveData(record);
  return setActiveData(record, {
    ...active,
    lethalInjury: { ...active.lethalInjury, ...patch },
  });
}

// ─── Injury tier toggles

/*
 * Set hasSerious on the active CharacterData.
 */
export function applySetHasSerious(record: TokenRecord, hasSerious: boolean): TokenRecord {
  const active = getActiveData(record);
  return setActiveData(record, { ...active, hasSerious });
}

/*
 * Set seriousCount (1 or 2) on the active CharacterData.
 */
export function applySetSeriousCount(record: TokenRecord, count: 1 | 2): TokenRecord {
  const active = getActiveData(record);
  return setActiveData(record, { ...active, seriousCount: count });
}

/*
 * Set hasCritical on the active CharacterData.
 */
export function applySetHasCritical(record: TokenRecord, hasCritical: boolean): TokenRecord {
  const active = getActiveData(record);
  return setActiveData(record, { ...active, hasCritical });
}

/*
 * Set hasLethal on the active CharacterData.
 */
export function applySetHasLethal(record: TokenRecord, hasLethal: boolean): TokenRecord {
  const active = getActiveData(record);
  return setActiveData(record, { ...active, hasLethal });
}

// ─── Serious tier stepper

/*
 * Advance or retreat the "serious injury tier" by one step.
 * The tier is: 0 (none) → 1 (one serious slot) → 2 (two serious slots).
 *
 * delta +1 increments, -1 decrements. No-ops when already at the boundary.
 * This encapsulates the three-way toggle used by both TokenMenu and TrackedTokenRow.
 */
export function applyAdjustSeriousTier(record: TokenRecord, delta: 1 | -1): TokenRecord {
  const active = getActiveData(record);
  const current = !active.hasSerious ? 0 : active.seriousCount === 2 ? 2 : 1;
  const next = current + delta;
  if (next <= 0) return setActiveData(record, { ...active, hasSerious: false });
  if (next === 1) return setActiveData(record, { ...active, hasSerious: true, seriousCount: 1 });
  if (next >= 2) return setActiveData(record, { ...active, hasSerious: true, seriousCount: 2 });
  return record; // unreachable but satisfies TS
}

// ─── Display name

/*
 * Set the custom on-map name bubble text.
 * An empty string hides the bubble on the map.
 */
export function applySetDisplayName(record: TokenRecord, displayName: string): TokenRecord {
  return { ...record, displayName };
}

// ─── Generic active-data patch

/*
 * Apply an arbitrary partial patch to the active CharacterData.
 * Useful in TrackedTokenRow for operations not covered by the named helpers
 * above. Prefer the specific helpers where possible so intent is clear.
 */
export function applyDataPatch(record: TokenRecord, patch: Partial<CharacterData>): TokenRecord {
  return setActiveData(record, { ...getActiveData(record), ...patch });
}
