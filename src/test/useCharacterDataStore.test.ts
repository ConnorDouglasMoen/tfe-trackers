// @vitest-environment jsdom
/**
 * Tests for useCharacterDataStore.
 *
 * The store owns all in-memory mutation of the active TokenRecord for the
 * token context menu and is used indirectly by TrackedTokenRow via its own
 * local state. These tests verify:
 *  - Each action produces the correct state shape.
 *  - Strain clamping (0 ≤ current ≤ max, STRAIN_MIN ≤ max ≤ STRAIN_MAX).
 *  - Survivor / Other type switching preserves both blobs independently.
 *  - Condition add / remove behaves correctly.
 *  - Display overrides and displayName mutations work.
 *  - writeToItem is called with the updated record after each mutation.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCharacterDataStore } from "../useCharacterDataStore";
import {
  createDefaultTokenRecord,
  STRAIN_MIN,
  STRAIN_MAX,
  getActiveData,
} from "../characterDataHelpers";

/** Reset the store to a fresh default record before each test. */
function resetStore() {
  const record = createDefaultTokenRecord();
  useCharacterDataStore.setState({
    record,
    data: getActiveData(record),
    writeToItem: undefined,
  });
}

beforeEach(resetStore);

// ─── setRecord ────────────────────────────────────────────────────────────────

describe("setRecord", () => {
  it("replaces the record and updates the derived data field", () => {
    const record = createDefaultTokenRecord();
    record.survivor.strainCurrent = 2;
    record.survivor.strainMax = 5;

    useCharacterDataStore.getState().setRecord(record);

    const state = useCharacterDataStore.getState();
    expect(state.record.survivor.strainCurrent).toBe(2);
    expect(state.data.strainCurrent).toBe(2); // derived field kept in sync
  });

  it("data reflects the activeType's blob", () => {
    const record = createDefaultTokenRecord();
    record.activeType = "other";
    record.other.strainCurrent = 1;

    useCharacterDataStore.getState().setRecord(record);

    const state = useCharacterDataStore.getState();
    expect(state.data.characterType).toBe("other");
    expect(state.data.strainCurrent).toBe(1);
  });
});

// ─── setCharacterType ─────────────────────────────────────────────────────────

describe("setCharacterType", () => {
  it("switches activeType to 'other' and updates derived data", () => {
    useCharacterDataStore.getState().setCharacterType("other");

    const state = useCharacterDataStore.getState();
    expect(state.record.activeType).toBe("other");
    expect(state.data.characterType).toBe("other");
  });

  it("switching type does not mutate the other blob", () => {
    // Set some survivor state
    useCharacterDataStore.getState().setStrainCurrent(2);
    // Switch to other
    useCharacterDataStore.getState().setCharacterType("other");
    // Switch back
    useCharacterDataStore.getState().setCharacterType("survivor");

    const state = useCharacterDataStore.getState();
    // Survivor blob should still have strainCurrent = 2
    expect(state.record.survivor.strainCurrent).toBe(2);
  });

  it("other blob is independent from survivor blob after switch", () => {
    useCharacterDataStore.getState().setCharacterType("other");
    // Set other's strainMax to a value that differs from survivor's default (3)
    useCharacterDataStore.getState().setStrainMax(5);

    const state = useCharacterDataStore.getState();
    expect(state.record.other.strainMax).toBe(5);
    expect(state.record.survivor.strainMax).toBe(3); // survivor default, untouched
  });
});

// ─── setStrainCurrent ─────────────────────────────────────────────────────────

describe("setStrainCurrent", () => {
  it("sets strain within bounds", () => {
    useCharacterDataStore.getState().setStrainCurrent(2);
    expect(useCharacterDataStore.getState().data.strainCurrent).toBe(2);
  });

  it("clamps to 0 when given a negative value", () => {
    useCharacterDataStore.getState().setStrainCurrent(-5);
    expect(useCharacterDataStore.getState().data.strainCurrent).toBe(0);
  });

  it("clamps to strainMax when given a value exceeding strainMax", () => {
    // Default survivor strainMax = 3
    useCharacterDataStore.getState().setStrainCurrent(99);
    expect(useCharacterDataStore.getState().data.strainCurrent).toBe(3);
  });

  it("sets strain to exactly 0", () => {
    useCharacterDataStore.getState().setStrainCurrent(2);
    useCharacterDataStore.getState().setStrainCurrent(0);
    expect(useCharacterDataStore.getState().data.strainCurrent).toBe(0);
  });

  it("sets strain to exactly strainMax", () => {
    useCharacterDataStore.getState().setStrainCurrent(3); // default max = 3
    expect(useCharacterDataStore.getState().data.strainCurrent).toBe(3);
  });
});

// ─── setStrainMax ─────────────────────────────────────────────────────────────

describe("setStrainMax", () => {
  it("sets strainMax within bounds", () => {
    useCharacterDataStore.getState().setStrainMax(7);
    expect(useCharacterDataStore.getState().data.strainMax).toBe(7);
  });

  it("clamps to STRAIN_MIN when given a value below STRAIN_MIN", () => {
    useCharacterDataStore.getState().setStrainMax(0);
    expect(useCharacterDataStore.getState().data.strainMax).toBe(STRAIN_MIN);
  });

  it("clamps to STRAIN_MAX when given a value above STRAIN_MAX", () => {
    useCharacterDataStore.getState().setStrainMax(99);
    expect(useCharacterDataStore.getState().data.strainMax).toBe(STRAIN_MAX);
  });

  it("reduces strainCurrent when it would exceed the new max", () => {
    useCharacterDataStore.getState().setStrainCurrent(3); // set current to 3
    useCharacterDataStore.getState().setStrainMax(2);      // lower max below current

    const state = useCharacterDataStore.getState();
    expect(state.data.strainMax).toBe(2);
    expect(state.data.strainCurrent).toBe(2); // clamped down
  });

  it("does not change strainCurrent when new max is above current", () => {
    useCharacterDataStore.getState().setStrainCurrent(2);
    useCharacterDataStore.getState().setStrainMax(5);

    expect(useCharacterDataStore.getState().data.strainCurrent).toBe(2);
  });
});

// ─── updateSeriousInjury ──────────────────────────────────────────────────────

describe("updateSeriousInjury", () => {
  it("patches slot 0 without affecting slot 1", () => {
    const slot1Id = useCharacterDataStore.getState().data.seriousInjuries[1].id;

    useCharacterDataStore.getState().updateSeriousInjury(0, { description: "Broken arm" });

    const state = useCharacterDataStore.getState();
    expect(state.data.seriousInjuries[0].description).toBe("Broken arm");
    expect(state.data.seriousInjuries[1].id).toBe(slot1Id); // slot 1 unchanged
  });

  it("patches slot 1 without affecting slot 0", () => {
    const slot0Id = useCharacterDataStore.getState().data.seriousInjuries[0].id;

    useCharacterDataStore.getState().updateSeriousInjury(1, { treated: true });

    const state = useCharacterDataStore.getState();
    expect(state.data.seriousInjuries[1].treated).toBe(true);
    expect(state.data.seriousInjuries[0].id).toBe(slot0Id);
  });

  it("merges partial patch — existing fields are preserved", () => {
    useCharacterDataStore.getState().updateSeriousInjury(0, {
      description: "Arm",
      complications: ["Numb"],
    });
    useCharacterDataStore.getState().updateSeriousInjury(0, { treated: true });

    const slot = useCharacterDataStore.getState().data.seriousInjuries[0];
    expect(slot.description).toBe("Arm");
    expect(slot.complications).toEqual(["Numb"]);
    expect(slot.treated).toBe(true);
  });
});

// ─── updateCriticalInjury / updateLethalInjury ────────────────────────────────

describe("updateCriticalInjury", () => {
  it("patches the critical injury slot", () => {
    useCharacterDataStore.getState().updateCriticalInjury({ description: "Head wound" });
    expect(useCharacterDataStore.getState().data.criticalInjury.description).toBe("Head wound");
  });

  it("does not affect serious or lethal slots", () => {
    const s0Id = useCharacterDataStore.getState().data.seriousInjuries[0].id;
    const lId  = useCharacterDataStore.getState().data.lethalInjury.id;

    useCharacterDataStore.getState().updateCriticalInjury({ treated: true });

    expect(useCharacterDataStore.getState().data.seriousInjuries[0].id).toBe(s0Id);
    expect(useCharacterDataStore.getState().data.lethalInjury.id).toBe(lId);
  });
});

describe("updateLethalInjury", () => {
  it("patches the lethal injury slot", () => {
    useCharacterDataStore.getState().updateLethalInjury({ description: "Gut wound" });
    expect(useCharacterDataStore.getState().data.lethalInjury.description).toBe("Gut wound");
  });
});

// ─── setHasSerious / setSeriousCount / setHasCritical / setHasLethal ─────────

describe("injury slot toggles", () => {
  it("setHasSerious(false) disables serious injuries", () => {
    useCharacterDataStore.getState().setHasSerious(false);
    expect(useCharacterDataStore.getState().data.hasSerious).toBe(false);
  });

  it("setSeriousCount(1) reduces to one serious slot", () => {
    useCharacterDataStore.getState().setSeriousCount(1);
    expect(useCharacterDataStore.getState().data.seriousCount).toBe(1);
  });

  it("setSeriousCount(2) allows two serious slots", () => {
    useCharacterDataStore.getState().setSeriousCount(1);
    useCharacterDataStore.getState().setSeriousCount(2);
    expect(useCharacterDataStore.getState().data.seriousCount).toBe(2);
  });

  it("setHasCritical(false) disables critical injury", () => {
    useCharacterDataStore.getState().setHasCritical(false);
    expect(useCharacterDataStore.getState().data.hasCritical).toBe(false);
  });

  it("setHasCritical(true) enables critical injury", () => {
    useCharacterDataStore.getState().setHasCritical(false);
    useCharacterDataStore.getState().setHasCritical(true);
    expect(useCharacterDataStore.getState().data.hasCritical).toBe(true);
  });

  it("setHasLethal(false) disables lethal injury", () => {
    useCharacterDataStore.getState().setHasLethal(false);
    expect(useCharacterDataStore.getState().data.hasLethal).toBe(false);
  });
});

// ─── addCondition / removeCondition ──────────────────────────────────────────

describe("addCondition", () => {
  it("appends a condition to the list", () => {
    useCharacterDataStore.getState().addCondition("Dazed");
    expect(useCharacterDataStore.getState().data.conditions).toEqual(["Dazed"]);
  });

  it("appends multiple conditions in order", () => {
    useCharacterDataStore.getState().addCondition("Dazed");
    useCharacterDataStore.getState().addCondition("Bleeding");
    expect(useCharacterDataStore.getState().data.conditions).toEqual(["Dazed", "Bleeding"]);
  });

  it("trims whitespace from added conditions", () => {
    useCharacterDataStore.getState().addCondition("  Frightened  ");
    expect(useCharacterDataStore.getState().data.conditions).toEqual(["Frightened"]);
  });

  it("ignores empty or whitespace-only input", () => {
    useCharacterDataStore.getState().addCondition("   ");
    useCharacterDataStore.getState().addCondition("");
    expect(useCharacterDataStore.getState().data.conditions).toEqual([]);
  });
});

describe("removeCondition", () => {
  it("removes the condition at the specified index", () => {
    useCharacterDataStore.getState().addCondition("Dazed");
    useCharacterDataStore.getState().addCondition("Bleeding");
    useCharacterDataStore.getState().removeCondition(0);
    expect(useCharacterDataStore.getState().data.conditions).toEqual(["Bleeding"]);
  });

  it("removes the correct condition when multiple exist", () => {
    useCharacterDataStore.getState().addCondition("A");
    useCharacterDataStore.getState().addCondition("B");
    useCharacterDataStore.getState().addCondition("C");
    useCharacterDataStore.getState().removeCondition(1);
    expect(useCharacterDataStore.getState().data.conditions).toEqual(["A", "C"]);
  });

  it("removing the last condition results in an empty list", () => {
    useCharacterDataStore.getState().addCondition("Solo");
    useCharacterDataStore.getState().removeCondition(0);
    expect(useCharacterDataStore.getState().data.conditions).toEqual([]);
  });
});

// ─── setDisplayOverride ───────────────────────────────────────────────────────

describe("setDisplayOverride", () => {
  it("patches a single override field", () => {
    useCharacterDataStore.getState().setDisplayOverride({ showStrain: false });

    const state = useCharacterDataStore.getState();
    expect(state.record.displayOverrides.showStrain).toBe(false);
    // Other fields remain null
    expect(state.record.displayOverrides.showConditions).toBeNull();
    expect(state.record.displayOverrides.injuryDisplay).toBeNull();
    expect(state.record.displayOverrides.showName).toBeNull();
  });

  it("patches multiple fields in one call", () => {
    useCharacterDataStore.getState().setDisplayOverride({
      showStrain: true,
      injuryDisplay: "filled-only",
    });

    const state = useCharacterDataStore.getState();
    expect(state.record.displayOverrides.showStrain).toBe(true);
    expect(state.record.displayOverrides.injuryDisplay).toBe("filled-only");
  });

  it("setting a field to null reverts it to the inherit-from-scene default", () => {
    useCharacterDataStore.getState().setDisplayOverride({ showStrain: false });
    useCharacterDataStore.getState().setDisplayOverride({ showStrain: null });

    expect(useCharacterDataStore.getState().record.displayOverrides.showStrain).toBeNull();
  });

  it("does not affect other TokenRecord fields", () => {
    const beforeDisplayName = useCharacterDataStore.getState().record.displayName;
    useCharacterDataStore.getState().setDisplayOverride({ showName: true });
    expect(useCharacterDataStore.getState().record.displayName).toBe(beforeDisplayName);
  });
});

// ─── setDisplayName ───────────────────────────────────────────────────────────

describe("setDisplayName", () => {
  it("sets the displayName on the record", () => {
    useCharacterDataStore.getState().setDisplayName("The Veteran");
    expect(useCharacterDataStore.getState().record.displayName).toBe("The Veteran");
  });

  it("clears the displayName with an empty string", () => {
    useCharacterDataStore.getState().setDisplayName("Hero");
    useCharacterDataStore.getState().setDisplayName("");
    expect(useCharacterDataStore.getState().record.displayName).toBe("");
  });

  it("does not affect the active CharacterData blob", () => {
    const beforeStrainMax = useCharacterDataStore.getState().data.strainMax;
    useCharacterDataStore.getState().setDisplayName("New Name");
    expect(useCharacterDataStore.getState().data.strainMax).toBe(beforeStrainMax);
  });
});

// ─── writeToItem integration ──────────────────────────────────────────────────

describe("writeToItem callback", () => {
  it("calls writeToItem with the updated record after setStrainCurrent", async () => {
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    useCharacterDataStore.getState().setWriteToItem(mockWrite);

    useCharacterDataStore.getState().setStrainCurrent(2);

    expect(mockWrite).toHaveBeenCalledOnce();
    const calledRecord = mockWrite.mock.calls[0][0];
    // The record passed reflects the updated strain
    expect(getActiveData(calledRecord).strainCurrent).toBe(2);
  });

  it("calls writeToItem after addCondition", async () => {
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    useCharacterDataStore.getState().setWriteToItem(mockWrite);

    useCharacterDataStore.getState().addCondition("Bleeding");

    expect(mockWrite).toHaveBeenCalledOnce();
    const calledRecord = mockWrite.mock.calls[0][0];
    expect(getActiveData(calledRecord).conditions).toContain("Bleeding");
  });

  it("calls writeToItem after setDisplayName", async () => {
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    useCharacterDataStore.getState().setWriteToItem(mockWrite);

    useCharacterDataStore.getState().setDisplayName("Mira");

    expect(mockWrite).toHaveBeenCalledOnce();
    const calledRecord = mockWrite.mock.calls[0][0];
    expect(calledRecord.displayName).toBe("Mira");
  });

  it("does not call writeToItem when writeToItem is undefined", () => {
    // No mock set — ensure no crash
    expect(() => {
      useCharacterDataStore.getState().setStrainCurrent(1);
    }).not.toThrow();
  });
});
