/////////////////////////////////////////////////////////////////////
// On-Map Attachment ID Generators
//
// Every local item attached to a token needs a deterministic ID so it
// can be deleted and recreated cleanly on update.
// Naming convention: `${tokenId}-tfe-${category}-${index}`
/////////////////////////////////////////////////////////////////////

/** IDs for a single strain box (background square + X text). */
export const getStrainBoxBgId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-strain-bg-${i}`;
export const getStrainBoxXId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-strain-x-${i}`;

/** All IDs for a strain box slot. */
export function getStrainBoxIds(tokenId: string, i: number): string[] {
  return [getStrainBoxBgId(tokenId, i), getStrainBoxXId(tokenId, i)];
}

/** IDs for an injury circle (background circle + icon text). */
export const getInjuryCircleBgId = (tokenId: string, slot: string) =>
  `${tokenId}-tfe-inj-bg-${slot}`;
export const getInjuryCircleIconId = (tokenId: string, slot: string) =>
  `${tokenId}-tfe-inj-icon-${slot}`;

/** All IDs for an injury circle slot. */
export function getInjuryCircleIds(tokenId: string, slot: string): string[] {
  return [getInjuryCircleBgId(tokenId, slot), getInjuryCircleIconId(tokenId, slot)];
}

/** IDs for a condition text bubble (background + text). */
export const getConditionBgId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-cond-bg-${i}`;
export const getConditionTextId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-cond-text-${i}`;

/** All IDs for a condition bubble slot. */
export function getConditionIds(tokenId: string, i: number): string[] {
  return [getConditionBgId(tokenId, i), getConditionTextId(tokenId, i)];
}

// Maximum counts — used to sweep and delete stale attachments when counts shrink.
export const MAX_STRAIN = 9;
export const INJURY_SLOTS = ["s0", "s1", "c", "l"] as const;
export const MAX_CONDITIONS = 20;

/** Collect every possible attachment ID for a token (for full delete). */
export function getAllAttachmentIds(tokenId: string): string[] {
  const ids: string[] = [];
  for (let i = 0; i < MAX_STRAIN; i++) ids.push(...getStrainBoxIds(tokenId, i));
  for (const slot of INJURY_SLOTS) ids.push(...getInjuryCircleIds(tokenId, slot));
  for (let i = 0; i < MAX_CONDITIONS; i++) ids.push(...getConditionIds(tokenId, i));
  return ids;
}
