import { describe, it, expect } from "vitest";
import {
  createDefaultTokenRecord,
  createSurvivorData,
  createOtherData,
  createInjurySlot,
  getActiveData,
  STRAIN_MIN,
  STRAIN_MAX,
} from "../characterDataHelpers";
import {
  applyStrainCurrent,
  applyStrainMax,
  applyCharacterType,
  applyAddCondition,
  applyRemoveCondition,
  applyUpdateSeriousInjury,
  applyUpdateCriticalInjury,
  applyUpdateLethalInjury,
  applySetHasSerious,
  applySetSeriousCount,
  applySetHasCritical,
  applySetHasLethal,
  applyAdjustSeriousTier,
  applySetDisplayName,
  applyDataPatch,
} from "../tokenRecordMutations";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shorthand: active CharacterData from a record. */
const active = getActiveData;

// ─── applyStrainCurrent ───────────────────────────────────────────────────────

describe("applyStrainCurrent", () => {
  it("sets strainCurrent within [0, strainMax]", () => {
    const r = createDefaultTokenRecord(); // strainMax = 3
    expect(active(applyStrainCurrent(r, 2)).strainCurrent).toBe(2);
  });

  it("clamps to 0 for negative values", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyStrainCurrent(r, -99)).strainCurrent).toBe(0);
  });

  it("clamps to strainMax when value exceeds strainMax", () => {
    const r = createDefaultTokenRecord(); // strainMax = 3
    expect(active(applyStrainCurrent(r, 99)).strainCurrent).toBe(3);
  });

  it("sets to exactly 0", () => {
    const r = createDefaultTokenRecord();
    const after1 = applyStrainCurrent(r, 2);
    expect(active(applyStrainCurrent(after1, 0)).strainCurrent).toBe(0);
  });

  it("sets to exactly strainMax", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyStrainCurrent(r, 3)).strainCurrent).toBe(3);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyStrainCurrent(r, 2);
    expect(active(r).strainCurrent).toBe(0);
  });

  it("only affects the active blob (survivor)", () => {
    const r = createDefaultTokenRecord(); // activeType = survivor
    const after = applyStrainCurrent(r, 2);
    expect(after.other.strainCurrent).toBe(0); // other blob untouched
  });
});

// ─── applyStrainMax ───────────────────────────────────────────────────────────

describe("applyStrainMax", () => {
  it("sets strainMax within [STRAIN_MIN, STRAIN_MAX]", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyStrainMax(r, 7)).strainMax).toBe(7);
  });

  it("clamps to STRAIN_MIN when value is below STRAIN_MIN", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyStrainMax(r, 0)).strainMax).toBe(STRAIN_MIN);
  });

  it("clamps to STRAIN_MAX when value exceeds STRAIN_MAX", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyStrainMax(r, 99)).strainMax).toBe(STRAIN_MAX);
  });

  it("reduces strainCurrent when it exceeds the new max", () => {
    const r = applyStrainCurrent(createDefaultTokenRecord(), 3); // current = 3
    const after = applyStrainMax(r, 2); // new max = 2 < current
    expect(active(after).strainMax).toBe(2);
    expect(active(after).strainCurrent).toBe(2); // clamped
  });

  it("does not change strainCurrent when new max is above current", () => {
    const r = applyStrainCurrent(createDefaultTokenRecord(), 2); // current = 2
    const after = applyStrainMax(r, 5);
    expect(active(after).strainCurrent).toBe(2);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyStrainMax(r, 7);
    expect(active(r).strainMax).toBe(3); // original unchanged
  });

  it("only affects the active blob", () => {
    const r = createDefaultTokenRecord(); // activeType = survivor
    const after = applyStrainMax(r, 6);
    expect(after.other.strainMax).toBe(1); // other blob untouched
  });
});

// ─── applyCharacterType ───────────────────────────────────────────────────────

describe("applyCharacterType", () => {
  it("switches activeType to 'other'", () => {
    const r = createDefaultTokenRecord();
    expect(applyCharacterType(r, "other").activeType).toBe("other");
  });

  it("switches activeType back to 'survivor'", () => {
    const r = { ...createDefaultTokenRecord(), activeType: "other" as const };
    expect(applyCharacterType(r, "survivor").activeType).toBe("survivor");
  });

  it("does not mutate either CharacterData blob", () => {
    const r = createDefaultTokenRecord();
    const after = applyCharacterType(r, "other");
    // Both blobs are the same references — no data was touched
    expect(after.survivor).toBe(r.survivor);
    expect(after.other).toBe(r.other);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyCharacterType(r, "other");
    expect(r.activeType).toBe("survivor");
  });
});

// ─── applyAddCondition ────────────────────────────────────────────────────────

describe("applyAddCondition", () => {
  it("appends a condition to the list", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyAddCondition(r, "Dazed")).conditions).toEqual(["Dazed"]);
  });

  it("appends multiple conditions in order", () => {
    const r0 = createDefaultTokenRecord();
    const r1 = applyAddCondition(r0, "Dazed");
    const r2 = applyAddCondition(r1, "Bleeding");
    expect(active(r2).conditions).toEqual(["Dazed", "Bleeding"]);
  });

  it("trims whitespace from the added condition", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyAddCondition(r, "  Frightened  ")).conditions).toEqual(["Frightened"]);
  });

  it("returns the record unchanged for empty input", () => {
    const r = createDefaultTokenRecord();
    const after = applyAddCondition(r, "");
    expect(after).toBe(r); // same reference — no allocation
  });

  it("returns the record unchanged for whitespace-only input", () => {
    const r = createDefaultTokenRecord();
    const after = applyAddCondition(r, "   ");
    expect(after).toBe(r);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyAddCondition(r, "Bleeding");
    expect(active(r).conditions).toEqual([]);
  });

  it("only affects the active blob", () => {
    const r = createDefaultTokenRecord(); // activeType = survivor
    const after = applyAddCondition(r, "Dazed");
    expect(after.other.conditions).toEqual([]);
  });
});

// ─── applyRemoveCondition ─────────────────────────────────────────────────────

describe("applyRemoveCondition", () => {
  it("removes the condition at the specified index", () => {
    const r0 = applyAddCondition(createDefaultTokenRecord(), "Dazed");
    const r1 = applyAddCondition(r0, "Bleeding");
    expect(active(applyRemoveCondition(r1, 0)).conditions).toEqual(["Bleeding"]);
  });

  it("removes the correct item when multiple conditions exist", () => {
    let r = createDefaultTokenRecord();
    r = applyAddCondition(r, "A");
    r = applyAddCondition(r, "B");
    r = applyAddCondition(r, "C");
    expect(active(applyRemoveCondition(r, 1)).conditions).toEqual(["A", "C"]);
  });

  it("results in an empty list after removing the last condition", () => {
    const r = applyAddCondition(createDefaultTokenRecord(), "Solo");
    expect(active(applyRemoveCondition(r, 0)).conditions).toEqual([]);
  });

  it("does not mutate the original record", () => {
    const r = applyAddCondition(createDefaultTokenRecord(), "Dazed");
    applyRemoveCondition(r, 0);
    expect(active(r).conditions).toEqual(["Dazed"]);
  });
});

// ─── applyUpdateSeriousInjury ─────────────────────────────────────────────────

describe("applyUpdateSeriousInjury", () => {
  it("patches slot 0 without affecting slot 1", () => {
    const r = createDefaultTokenRecord();
    const slot1Id = r.survivor.seriousInjuries[1].id;
    const after = applyUpdateSeriousInjury(r, 0, { description: "Broken arm" });
    expect(active(after).seriousInjuries[0].description).toBe("Broken arm");
    expect(active(after).seriousInjuries[1].id).toBe(slot1Id);
  });

  it("patches slot 1 without affecting slot 0", () => {
    const r = createDefaultTokenRecord();
    const slot0Id = r.survivor.seriousInjuries[0].id;
    const after = applyUpdateSeriousInjury(r, 1, { treated: true });
    expect(active(after).seriousInjuries[1].treated).toBe(true);
    expect(active(after).seriousInjuries[0].id).toBe(slot0Id);
  });

  it("merges partial patch while preserving existing fields", () => {
    const r0 = applyUpdateSeriousInjury(createDefaultTokenRecord(), 0, {
      description: "Arm",
      complications: ["Numb"],
    });
    const r1 = applyUpdateSeriousInjury(r0, 0, { treated: true });
    const slot = active(r1).seriousInjuries[0];
    expect(slot.description).toBe("Arm");
    expect(slot.complications).toEqual(["Numb"]);
    expect(slot.treated).toBe(true);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyUpdateSeriousInjury(r, 0, { description: "Leg" });
    expect(active(r).seriousInjuries[0].description).toBe("");
  });
});

// ─── applyUpdateCriticalInjury / applyUpdateLethalInjury ─────────────────────

describe("applyUpdateCriticalInjury", () => {
  it("patches the critical injury slot", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyUpdateCriticalInjury(r, { description: "Head wound" })).criticalInjury.description).toBe("Head wound");
  });

  it("does not affect serious or lethal slots", () => {
    const r = createDefaultTokenRecord();
    const s0Id = r.survivor.seriousInjuries[0].id;
    const lId  = r.survivor.lethalInjury.id;
    const after = applyUpdateCriticalInjury(r, { treated: true });
    expect(active(after).seriousInjuries[0].id).toBe(s0Id);
    expect(active(after).lethalInjury.id).toBe(lId);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyUpdateCriticalInjury(r, { description: "Spine" });
    expect(active(r).criticalInjury.description).toBe("");
  });
});

describe("applyUpdateLethalInjury", () => {
  it("patches the lethal injury slot", () => {
    const r = createDefaultTokenRecord();
    expect(active(applyUpdateLethalInjury(r, { description: "Gut wound" })).lethalInjury.description).toBe("Gut wound");
  });

  it("does not affect serious or critical slots", () => {
    const r = createDefaultTokenRecord();
    const s0Id = r.survivor.seriousInjuries[0].id;
    const cId  = r.survivor.criticalInjury.id;
    const after = applyUpdateLethalInjury(r, { treated: true });
    expect(active(after).seriousInjuries[0].id).toBe(s0Id);
    expect(active(after).criticalInjury.id).toBe(cId);
  });
});

// ─── applySetHasSerious / applySetSeriousCount / applySetHasCritical / applySetHasLethal ──

describe("injury tier toggles", () => {
  it("applySetHasSerious(false) disables serious injuries", () => {
    const r = createDefaultTokenRecord();
    expect(active(applySetHasSerious(r, false)).hasSerious).toBe(false);
  });

  it("applySetHasSerious(true) enables serious injuries", () => {
    const r = applySetHasSerious(createDefaultTokenRecord(), false);
    expect(active(applySetHasSerious(r, true)).hasSerious).toBe(true);
  });

  it("applySetSeriousCount(1) sets count to 1", () => {
    const r = createDefaultTokenRecord();
    expect(active(applySetSeriousCount(r, 1)).seriousCount).toBe(1);
  });

  it("applySetSeriousCount(2) sets count to 2", () => {
    const r = applySetSeriousCount(createDefaultTokenRecord(), 1);
    expect(active(applySetSeriousCount(r, 2)).seriousCount).toBe(2);
  });

  it("applySetHasCritical(false) disables critical injury", () => {
    const r = createDefaultTokenRecord();
    expect(active(applySetHasCritical(r, false)).hasCritical).toBe(false);
  });

  it("applySetHasCritical(true) enables critical injury", () => {
    const r = applySetHasCritical(createDefaultTokenRecord(), false);
    expect(active(applySetHasCritical(r, true)).hasCritical).toBe(true);
  });

  it("applySetHasLethal(false) disables lethal injury", () => {
    const r = createDefaultTokenRecord();
    expect(active(applySetHasLethal(r, false)).hasLethal).toBe(false);
  });

  it("applySetHasLethal(true) enables lethal injury", () => {
    const r = applySetHasLethal(createDefaultTokenRecord(), false);
    expect(active(applySetHasLethal(r, true)).hasLethal).toBe(true);
  });
});

// ─── applyAdjustSeriousTier ───────────────────────────────────────────────────

describe("applyAdjustSeriousTier", () => {
  // Tier values: 0 = none, 1 = one slot, 2 = two slots

  it("increments from 0 to 1 (enables hasSerious, seriousCount = 1)", () => {
    // Start with hasSerious = false (tier 0)
    const r = applySetHasSerious(createDefaultTokenRecord(), false);
    const after = applyAdjustSeriousTier(r, 1);
    expect(active(after).hasSerious).toBe(true);
    expect(active(after).seriousCount).toBe(1);
  });

  it("increments from 1 to 2 (seriousCount becomes 2)", () => {
    const r = applySetSeriousCount(
      applySetHasSerious(createDefaultTokenRecord(), true),
      1,
    );
    const after = applyAdjustSeriousTier(r, 1);
    expect(active(after).hasSerious).toBe(true);
    expect(active(after).seriousCount).toBe(2);
  });

  it("decrements from 2 to 1 (seriousCount becomes 1)", () => {
    // Default survivor has seriousCount = 2
    const r = createDefaultTokenRecord();
    const after = applyAdjustSeriousTier(r, -1);
    expect(active(after).hasSerious).toBe(true);
    expect(active(after).seriousCount).toBe(1);
  });

  it("decrements from 1 to 0 (disables hasSerious)", () => {
    const r = applySetSeriousCount(
      applySetHasSerious(createDefaultTokenRecord(), true),
      1,
    );
    const after = applyAdjustSeriousTier(r, -1);
    expect(active(after).hasSerious).toBe(false);
  });

  it("is a no-op when already at tier 0 and decrementing", () => {
    // Caller should disable the button at this boundary, but the function
    // must still be safe to call.
    const r = applySetHasSerious(createDefaultTokenRecord(), false);
    const after = applyAdjustSeriousTier(r, -1);
    expect(active(after).hasSerious).toBe(false);
  });

  it("clamps at tier 2 when incrementing beyond the maximum", () => {
    // Default survivor: hasSerious = true, seriousCount = 2 (already at tier 2)
    const r = createDefaultTokenRecord();
    const after = applyAdjustSeriousTier(r, 1);
    expect(active(after).hasSerious).toBe(true);
    expect(active(after).seriousCount).toBe(2);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyAdjustSeriousTier(r, -1);
    expect(active(r).seriousCount).toBe(2);
  });

  it("only affects the active blob", () => {
    const r = createDefaultTokenRecord(); // activeType = survivor
    const after = applyAdjustSeriousTier(r, -1); // tier 2 → 1 on survivor
    expect(after.other.seriousCount).toBe(1); // other blob default unchanged
  });
});

// ─── applySetDisplayName ──────────────────────────────────────────────────────

describe("applySetDisplayName", () => {
  it("sets the displayName on the record", () => {
    const r = createDefaultTokenRecord();
    expect(applySetDisplayName(r, "The Veteran").displayName).toBe("The Veteran");
  });

  it("clears the displayName with an empty string", () => {
    const r = applySetDisplayName(createDefaultTokenRecord(), "Hero");
    expect(applySetDisplayName(r, "").displayName).toBe("");
  });

  it("does not affect either CharacterData blob", () => {
    const r = createDefaultTokenRecord();
    const after = applySetDisplayName(r, "New Name");
    expect(after.survivor).toBe(r.survivor);
    expect(after.other).toBe(r.other);
  });

  it("trims leading and trailing whitespace before storing", () => {
    const r = createDefaultTokenRecord();
    expect(applySetDisplayName(r, "  The Veteran  ").displayName).toBe("The Veteran");
  });

  it("whitespace-only input is stored as empty string", () => {
    const r = createDefaultTokenRecord();
    expect(applySetDisplayName(r, "   ").displayName).toBe("");
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applySetDisplayName(r, "X");
    expect(r.displayName).toBe("");
  });
});

// ─── applyDataPatch ───────────────────────────────────────────────────────────

describe("applyDataPatch", () => {
  it("applies an arbitrary partial patch to the active CharacterData", () => {
    const r = createDefaultTokenRecord();
    const after = applyDataPatch(r, { strainCurrent: 2, strainMax: 5 });
    expect(active(after).strainCurrent).toBe(2);
    expect(active(after).strainMax).toBe(5);
  });

  it("merges the patch — unspecified fields are preserved", () => {
    const r = createDefaultTokenRecord();
    const after = applyDataPatch(r, { strainCurrent: 1 });
    expect(active(after).strainMax).toBe(3); // original survivor default
    expect(active(after).hasSerious).toBe(true);
  });

  it("only affects the active blob", () => {
    const r = createDefaultTokenRecord(); // activeType = survivor
    const after = applyDataPatch(r, { strainCurrent: 2 });
    expect(after.other.strainCurrent).toBe(0);
  });

  it("does not mutate the original record", () => {
    const r = createDefaultTokenRecord();
    applyDataPatch(r, { strainCurrent: 3 });
    expect(active(r).strainCurrent).toBe(0);
  });
});

// ─── Mutation helpers preserve pre-populated slot content ──────────────────────
// These tests use createSurvivorData, createOtherData, and createInjurySlot to
// build records with specific initial slot content, verifying that mutations
// target only the intended field and leave everything else intact.

describe("mutation helpers preserve pre-populated slot content", () => {
  it("applyUpdateSeriousInjury preserves existing complications when patching description", () => {
    // Build a record whose slot 0 already has complications.
    const slot0 = { ...createInjurySlot(), description: "Arm", complications: ["Numb", "Weak"] };
    const slot1 = createInjurySlot();
    const survivor = { ...createSurvivorData(), seriousInjuries: [slot0, slot1] as [typeof slot0, typeof slot1] };
    const r = { ...createDefaultTokenRecord(), survivor };

    const after = applyUpdateSeriousInjury(r, 0, { treated: true });
    const result = active(after).seriousInjuries[0];

    // Only treated changed; complications and description are untouched.
    expect(result.treated).toBe(true);
    expect(result.description).toBe("Arm");
    expect(result.complications).toEqual(["Numb", "Weak"]);
  });

  it("applyUpdateCriticalInjury preserves existing slot content on other blob", () => {
    // Build an "other" record with a pre-filled critical slot.
    const criticalSlot = { ...createInjurySlot(), description: "Chest", complications: ["Winded"] };
    const other = { ...createOtherData(), hasCritical: true, criticalInjury: criticalSlot };
    const r = { ...createDefaultTokenRecord(), activeType: "other" as const, other };

    const after = applyUpdateCriticalInjury(r, { treated: true });
    const result = active(after).criticalInjury;

    expect(result.treated).toBe(true);
    expect(result.description).toBe("Chest");
    expect(result.complications).toEqual(["Winded"]);
  });

  it("applyUpdateLethalInjury preserves existing slot content on other blob", () => {
    const lethalSlot = { ...createInjurySlot(), description: "Head", treated: false };
    const other = { ...createOtherData(), hasLethal: true, lethalInjury: lethalSlot };
    const r = { ...createDefaultTokenRecord(), activeType: "other" as const, other };

    const after = applyUpdateLethalInjury(r, { description: "Head wound" });
    const result = active(after).lethalInjury;

    // description updated; treated still false.
    expect(result.description).toBe("Head wound");
    expect(result.treated).toBe(false);
  });

  it("applyStrainMax on other blob clamps its own strainCurrent independently", () => {
    // Build an other blob with strainCurrent = 3.
    const other = { ...createOtherData(), strainMax: 5, strainCurrent: 3 };
    const r = { ...createDefaultTokenRecord(), activeType: "other" as const, other };

    // Lower max to 2 — should clamp strainCurrent to 2.
    const after = applyStrainMax(r, 2);
    expect(active(after).strainMax).toBe(2);
    expect(active(after).strainCurrent).toBe(2);
    // Survivor blob unaffected.
    expect(after.survivor.strainMax).toBe(3);
    expect(after.survivor.strainCurrent).toBe(0);
  });
});

// ─── Cross-blob isolation ─────────────────────────────────────────────────────

describe("cross-blob isolation", () => {
  it("mutations on survivor blob do not affect other blob", () => {
    const r = createDefaultTokenRecord(); // activeType = survivor
    const after = applyStrainCurrent(
      applyStrainMax(
        applyAddCondition(r, "Bleeding"),
        7,
      ),
      5,
    );
    // other blob completely untouched
    expect(after.other.strainMax).toBe(1);
    expect(after.other.strainCurrent).toBe(0);
    expect(after.other.conditions).toEqual([]);
  });

  it("mutations on other blob do not affect survivor blob", () => {
    const r = { ...createDefaultTokenRecord(), activeType: "other" as const };
    const after = applyAddCondition(applyStrainMax(r, 4), "Dazed");
    expect(after.survivor.strainMax).toBe(3);
    expect(after.survivor.conditions).toEqual([]);
  });
});
