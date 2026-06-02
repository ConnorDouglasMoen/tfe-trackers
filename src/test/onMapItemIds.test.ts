import { describe, it, expect } from "vitest";
import {
  getStrainBoxBgId,
  getStrainBoxXId,
  getStrainBoxIds,
  getInjuryCircleBgId,
  getInjuryCircleIconId,
  getInjuryCircleIds,
  getConditionBgId,
  getConditionTextId,
  getConditionIds,
  getNameBubbleBgId,
  getNameBubbleTextId,
  getNameBubbleIds,
  getAllAttachmentIds,
  MAX_STRAIN,
  INJURY_SLOTS,
  MAX_CONDITIONS,
} from "../background/onMapItemIds";

const TOKEN_ID = "test-token-abc";

describe("onMapItemIds", () => {

  // ─── Exported constants ───────────────────────────────────────────────────

  describe("exported constants", () => {
    it("MAX_STRAIN is 9", () => {
      expect(MAX_STRAIN).toBe(9);
    });

    it("INJURY_SLOTS covers all four slots", () => {
      expect(INJURY_SLOTS).toEqual(["s0", "s1", "c", "l"]);
    });

    it("MAX_CONDITIONS is at least 10 (practical minimum for dedup)", () => {
      expect(MAX_CONDITIONS).toBeGreaterThanOrEqual(10);
    });
  });

  // ─── Strain box ID generators ─────────────────────────────────────────────

  describe("strain box IDs", () => {
    it("getStrainBoxBgId embeds token ID and index", () => {
      expect(getStrainBoxBgId(TOKEN_ID, 0)).toBe(`${TOKEN_ID}-tfe-strain-bg-0`);
      expect(getStrainBoxBgId(TOKEN_ID, 8)).toBe(`${TOKEN_ID}-tfe-strain-bg-8`);
    });

    it("getStrainBoxXId embeds token ID and index", () => {
      expect(getStrainBoxXId(TOKEN_ID, 0)).toBe(`${TOKEN_ID}-tfe-strain-x-0`);
      expect(getStrainBoxXId(TOKEN_ID, 5)).toBe(`${TOKEN_ID}-tfe-strain-x-5`);
    });

    it("getStrainBoxIds returns both bg and x IDs", () => {
      const ids = getStrainBoxIds(TOKEN_ID, 3);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(getStrainBoxBgId(TOKEN_ID, 3));
      expect(ids).toContain(getStrainBoxXId(TOKEN_ID, 3));
    });

    it("IDs for different indices are distinct", () => {
      expect(getStrainBoxBgId(TOKEN_ID, 0)).not.toBe(getStrainBoxBgId(TOKEN_ID, 1));
      expect(getStrainBoxXId(TOKEN_ID, 2)).not.toBe(getStrainBoxXId(TOKEN_ID, 3));
    });

    it("IDs for different token IDs are distinct", () => {
      expect(getStrainBoxBgId("token-a", 0)).not.toBe(getStrainBoxBgId("token-b", 0));
    });
  });

  // ─── Injury circle ID generators ─────────────────────────────────────────

  describe("injury circle IDs", () => {
    it("getInjuryCircleBgId embeds token ID and slot", () => {
      expect(getInjuryCircleBgId(TOKEN_ID, "s0")).toBe(`${TOKEN_ID}-tfe-inj-bg-s0`);
      expect(getInjuryCircleBgId(TOKEN_ID, "l")).toBe(`${TOKEN_ID}-tfe-inj-bg-l`);
    });

    it("getInjuryCircleIconId embeds token ID and slot", () => {
      expect(getInjuryCircleIconId(TOKEN_ID, "c")).toBe(`${TOKEN_ID}-tfe-inj-icon-c`);
      expect(getInjuryCircleIconId(TOKEN_ID, "s1")).toBe(`${TOKEN_ID}-tfe-inj-icon-s1`);
    });

    it("getInjuryCircleIds returns both bg and icon IDs", () => {
      const ids = getInjuryCircleIds(TOKEN_ID, "c");
      expect(ids).toHaveLength(2);
      expect(ids).toContain(getInjuryCircleBgId(TOKEN_ID, "c"));
      expect(ids).toContain(getInjuryCircleIconId(TOKEN_ID, "c"));
    });

    it("IDs for different slots are distinct", () => {
      expect(getInjuryCircleBgId(TOKEN_ID, "s0")).not.toBe(getInjuryCircleBgId(TOKEN_ID, "s1"));
      expect(getInjuryCircleBgId(TOKEN_ID, "c")).not.toBe(getInjuryCircleBgId(TOKEN_ID, "l"));
    });
  });

  // ─── Condition bubble ID generators ──────────────────────────────────────

  describe("condition bubble IDs", () => {
    it("getConditionBgId embeds token ID and index", () => {
      expect(getConditionBgId(TOKEN_ID, 0)).toBe(`${TOKEN_ID}-tfe-cond-bg-0`);
      expect(getConditionBgId(TOKEN_ID, 7)).toBe(`${TOKEN_ID}-tfe-cond-bg-7`);
    });

    it("getConditionTextId embeds token ID and index", () => {
      expect(getConditionTextId(TOKEN_ID, 0)).toBe(`${TOKEN_ID}-tfe-cond-text-0`);
      expect(getConditionTextId(TOKEN_ID, 3)).toBe(`${TOKEN_ID}-tfe-cond-text-3`);
    });

    it("getConditionIds returns both bg and text IDs", () => {
      const ids = getConditionIds(TOKEN_ID, 2);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(getConditionBgId(TOKEN_ID, 2));
      expect(ids).toContain(getConditionTextId(TOKEN_ID, 2));
    });
  });

  // ─── Name bubble ID generators ────────────────────────────────────────────

  describe("name bubble IDs", () => {
    it("getNameBubbleBgId embeds token ID", () => {
      expect(getNameBubbleBgId(TOKEN_ID)).toBe(`${TOKEN_ID}-tfe-name-bg`);
    });

    it("getNameBubbleTextId embeds token ID", () => {
      expect(getNameBubbleTextId(TOKEN_ID)).toBe(`${TOKEN_ID}-tfe-name-text`);
    });

    it("getNameBubbleIds returns both bg and text IDs", () => {
      const ids = getNameBubbleIds(TOKEN_ID);
      expect(ids).toHaveLength(2);
      expect(ids).toContain(getNameBubbleBgId(TOKEN_ID));
      expect(ids).toContain(getNameBubbleTextId(TOKEN_ID));
    });

    it("IDs for different token IDs are distinct", () => {
      expect(getNameBubbleBgId("token-a")).not.toBe(getNameBubbleBgId("token-b"));
    });
  });

  // ─── getAllAttachmentIds ───────────────────────────────────────────────────

  describe("getAllAttachmentIds", () => {
    it("returns a non-empty array", () => {
      const ids = getAllAttachmentIds(TOKEN_ID);
      expect(ids.length).toBeGreaterThan(0);
    });

    it("includes all MAX_STRAIN strain box IDs (bg + x each)", () => {
      const ids = getAllAttachmentIds(TOKEN_ID);
      for (let i = 0; i < MAX_STRAIN; i++) {
        expect(ids).toContain(getStrainBoxBgId(TOKEN_ID, i));
        expect(ids).toContain(getStrainBoxXId(TOKEN_ID, i));
      }
    });

    it("includes all four injury slot IDs (bg + icon each)", () => {
      const ids = getAllAttachmentIds(TOKEN_ID);
      for (const slot of INJURY_SLOTS) {
        expect(ids).toContain(getInjuryCircleBgId(TOKEN_ID, slot));
        expect(ids).toContain(getInjuryCircleIconId(TOKEN_ID, slot));
      }
    });

    it("includes all MAX_CONDITIONS condition bubble IDs (bg + text each)", () => {
      const ids = getAllAttachmentIds(TOKEN_ID);
      for (let i = 0; i < MAX_CONDITIONS; i++) {
        expect(ids).toContain(getConditionBgId(TOKEN_ID, i));
        expect(ids).toContain(getConditionTextId(TOKEN_ID, i));
      }
    });

    it("includes name bubble IDs", () => {
      const ids = getAllAttachmentIds(TOKEN_ID);
      expect(ids).toContain(getNameBubbleBgId(TOKEN_ID));
      expect(ids).toContain(getNameBubbleTextId(TOKEN_ID));
    });

    it("total count matches: (MAX_STRAIN * 2) + (4 slots * 2) + (MAX_CONDITIONS * 2) + 2", () => {
      const expected = MAX_STRAIN * 2 + INJURY_SLOTS.length * 2 + MAX_CONDITIONS * 2 + 2;
      expect(getAllAttachmentIds(TOKEN_ID)).toHaveLength(expected);
    });

    it("contains no duplicate IDs", () => {
      const ids = getAllAttachmentIds(TOKEN_ID);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all IDs start with the token ID prefix", () => {
      const ids = getAllAttachmentIds(TOKEN_ID);
      for (const id of ids) {
        expect(id.startsWith(TOKEN_ID)).toBe(true);
      }
    });

    it("returns different IDs for different token IDs", () => {
      const idsA = getAllAttachmentIds("token-a");
      const idsB = getAllAttachmentIds("token-b");
      // No overlap — all IDs are token-specific
      const setA = new Set(idsA);
      for (const id of idsB) {
        expect(setA.has(id)).toBe(false);
      }
    });
  });
});
