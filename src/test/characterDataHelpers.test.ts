import { describe, it, expect } from "vitest";
import {
  resolveDisplaySettings,
  createInjurySlot,
  createSurvivorData,
  createOtherData,
  createDefaultTokenRecord,
  getActiveData,
  setActiveData,
  isTokenRecord,
  migrateToTokenRecord,
} from "../characterDataHelpers";

describe("characterDataHelpers", () => {
  describe("resolveDisplaySettings", () => {
    it("inherits from scene settings when overrides are null", () => {
      const scene = {
        showStrain: true,
        showConditions: false,
        injuryDisplay: "all" as const,
        showName: true,
        markerScale: 1.25,
        textScale: 1.5,
      };
      const overrides = {
        showStrain: null,
        showConditions: null,
        injuryDisplay: null,
        showName: null,
      };

      const resolved = resolveDisplaySettings(scene, overrides);

      expect(resolved.showStrain).toBe(true);
      expect(resolved.showConditions).toBe(false);
      expect(resolved.injuryDisplay).toBe("all");
      expect(resolved.showName).toBe(true);
      expect(resolved.markerScale).toBe(1.25);
      expect(resolved.textScale).toBe(1.5);
    });

    it("overrides scene settings with non-null values", () => {
      const scene = {
        showStrain: true,
        showConditions: true,
        injuryDisplay: "all" as const,
        showName: true,
        markerScale: 1.0,
        textScale: 1.0,
      };
      const overrides = {
        showStrain: false,
        showConditions: false,
        injuryDisplay: "filled-only" as const,
        showName: false,
      };

      const resolved = resolveDisplaySettings(scene, overrides);

      expect(resolved.showStrain).toBe(false);
      expect(resolved.showConditions).toBe(false);
      expect(resolved.injuryDisplay).toBe("filled-only");
      expect(resolved.showName).toBe(false);
    });
  });

  describe("factory helpers", () => {
    it("creates an injury slot with unique IDs and default values", () => {
      const slot1 = createInjurySlot();
      const slot2 = createInjurySlot();

      expect(slot1.id).toBeDefined();
      expect(slot2.id).toBeDefined();
      expect(slot1.id).not.toEqual(slot2.id);
      expect(slot1.description).toBe("");
      expect(slot1.complications).toEqual([]);
      expect(slot1.treated).toBe(false);
    });

    it("creates survivor character data defaults", () => {
      const data = createSurvivorData();
      expect(data.characterType).toBe("survivor");
      expect(data.strainMax).toBe(3);
      expect(data.strainCurrent).toBe(0);
      expect(data.hasSerious).toBe(true);
      expect(data.seriousCount).toBe(2);
      expect(data.hasCritical).toBe(true);
      expect(data.hasLethal).toBe(true);
      expect(data.seriousInjuries).toHaveLength(2);
      expect(data.conditions).toEqual([]);
    });

    it("creates other character data defaults", () => {
      const data = createOtherData();
      expect(data.characterType).toBe("other");
      expect(data.strainMax).toBe(1);
      expect(data.strainCurrent).toBe(0);
      expect(data.hasSerious).toBe(true);
      expect(data.seriousCount).toBe(1);
      expect(data.hasCritical).toBe(false);
      expect(data.hasLethal).toBe(false);
      expect(data.conditions).toEqual([]);
    });

    it("gets and sets active character data correctly", () => {
      let record = createDefaultTokenRecord();
      expect(record.activeType).toBe("survivor");

      // Verify active data is survivor initially
      let active = getActiveData(record);
      expect(active.characterType).toBe("survivor");

      // Set and verify active data
      const newSurvivor = { ...active, strainCurrent: 2 };
      record = setActiveData(record, newSurvivor);
      expect(record.survivor.strainCurrent).toBe(2);

      // Switch type and verify get/set
      record.activeType = "other";
      active = getActiveData(record);
      expect(active.characterType).toBe("other");

      const newOther = { ...active, strainCurrent: 1 };
      record = setActiveData(record, newOther);
      expect(record.other.strainCurrent).toBe(1);
    });
  });

  describe("type guards", () => {
    it("isTokenRecord correctly identifies valid records", () => {
      const record = createDefaultTokenRecord();
      expect(isTokenRecord(record)).toBe(true);
      expect(isTokenRecord({})).toBe(false);
      expect(isTokenRecord(null)).toBe(false);
    });
  });

  describe("migration to TokenRecord", () => {
    it("migrates legacy location and string complications in injury slots", () => {
      const legacyRecord = {
        activeType: "survivor",
        survivor: {
          characterType: "survivor",
          strainMax: 3,
          strainCurrent: 0,
          hasSerious: true,
          seriousCount: 2,
          hasCritical: true,
          hasLethal: true,
          seriousInjuries: [
            { id: "1", location: "Left arm", complications: "Fumble on attack", treated: false },
            { id: "2", description: "Right leg", complications: ["Limp"], treated: true },
          ],
          criticalInjury: { id: "3", location: "Chest", complications: "", treated: false },
          lethalInjury: { id: "4", description: "Head", complications: [], treated: false },
          conditions: "dazed", // legacy string condition
        },
        other: createOtherData(),
        displayName: "",
        displayAlias: "Hero", // legacy displayAlias
      };

      const migrated = migrateToTokenRecord(legacyRecord);

      expect(isTokenRecord(migrated)).toBe(true);
      expect(migrated.displayName).toBe("Hero");
      expect(migrated.survivor.conditions).toEqual(["dazed"]);

      // seriousInjuries[0]: location -> description, string complications -> string[]
      expect(migrated.survivor.seriousInjuries[0].description).toBe("Left arm");
      expect(migrated.survivor.seriousInjuries[0].complications).toEqual(["Fumble on attack"]);

      // seriousInjuries[1]: preserved
      expect(migrated.survivor.seriousInjuries[1].description).toBe("Right leg");
      expect(migrated.survivor.seriousInjuries[1].complications).toEqual(["Limp"]);

      // criticalInjury: location -> description
      expect(migrated.survivor.criticalInjury.description).toBe("Chest");
      expect(migrated.survivor.criticalInjury.complications).toEqual([]);
    });

    it("migrates legacy CharacterData blob into a full TokenRecord", () => {
      const legacySurvivorData = {
        characterType: "survivor" as const,
        strainMax: 3,
        strainCurrent: 1,
        hasSerious: true,
        seriousCount: 2,
        hasCritical: true,
        hasLethal: true,
        seriousInjuries: [createInjurySlot(), createInjurySlot()],
        criticalInjury: createInjurySlot(),
        lethalInjury: createInjurySlot(),
        conditions: ["bleeding"],
      };

      const record = migrateToTokenRecord(legacySurvivorData);

      expect(record.activeType).toBe("survivor");
      expect(record.survivor.strainCurrent).toBe(1);
      expect(record.survivor.conditions).toEqual(["bleeding"]);
      expect(record.other.characterType).toBe("other");
      expect(record.other.strainMax).toBe(1);
      expect(record.other.strainCurrent).toBe(0);
      expect(record.other.hasSerious).toBe(true);
      expect(record.other.seriousCount).toBe(1);
      expect(record.other.hasCritical).toBe(false);
      expect(record.other.hasLethal).toBe(false);
      expect(record.other.conditions).toEqual([]);
    });

    it("handles completely invalid/null inputs by returning defaults", () => {
      const record = migrateToTokenRecord(null);
      expect(record.activeType).toBe("survivor");
      expect(record.survivor.strainMax).toBe(3);
      expect(record.other.strainMax).toBe(1);
    });
  });
});
