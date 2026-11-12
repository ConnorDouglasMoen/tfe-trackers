// Every on-map attachment gets a deterministic ID so it can be deleted and
// rebuilt on each update. Format: `${tokenId}-tfe-${category}-${index}`.

import { STRAIN_MAX } from "../characterDataHelpers";

export const getStrainBoxBgId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-strain-bg-${i}`;
export const getStrainBoxXId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-strain-x-${i}`;

export function getStrainBoxIds(tokenId: string, i: number): string[] {
  return [getStrainBoxBgId(tokenId, i), getStrainBoxXId(tokenId, i)];
}

export const getInjuryCircleBgId = (tokenId: string, slot: string) =>
  `${tokenId}-tfe-inj-bg-${slot}`;
export const getInjuryCircleIconId = (tokenId: string, slot: string) =>
  `${tokenId}-tfe-inj-icon-${slot}`;

export function getInjuryCircleIds(tokenId: string, slot: string): string[] {
  return [getInjuryCircleBgId(tokenId, slot), getInjuryCircleIconId(tokenId, slot)];
}

export const getConditionBgId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-cond-bg-${i}`;
export const getConditionTextId = (tokenId: string, i: number) =>
  `${tokenId}-tfe-cond-text-${i}`;

export function getConditionIds(tokenId: string, i: number): string[] {
  return [getConditionBgId(tokenId, i), getConditionTextId(tokenId, i)];
}

export const getNameBubbleBgId = (tokenId: string) => `${tokenId}-tfe-name-bg`;
export const getNameBubbleTextId = (tokenId: string) => `${tokenId}-tfe-name-text`;

export function getNameBubbleIds(tokenId: string): string[] {
  return [getNameBubbleBgId(tokenId), getNameBubbleTextId(tokenId)];
}

// Upper bounds used to sweep away every attachment a token could have.
export const MAX_STRAIN = STRAIN_MAX;
export const INJURY_SLOTS = ["s0", "s1", "c", "l"] as const;
export const MAX_CONDITIONS = 20;

export function getAllAttachmentIds(tokenId: string): string[] {
  const ids: string[] = [];
  for (let i = 0; i < MAX_STRAIN; i++) ids.push(...getStrainBoxIds(tokenId, i));
  for (const slot of INJURY_SLOTS) ids.push(...getInjuryCircleIds(tokenId, slot));
  for (let i = 0; i < MAX_CONDITIONS; i++) ids.push(...getConditionIds(tokenId, i));
  ids.push(...getNameBubbleIds(tokenId));
  return ids;
}
