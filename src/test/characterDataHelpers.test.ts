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
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_TOKEN_DISPLAY_OVERRIDES,
  STRAIN_MIN,
  STRAIN_MAX,
} from "../characterDataHelpers";

describe("characterDataHelpers", () => {

  // ─── Constants ────────────────────────────────────────────────────────────

  describe("exported constants", () => {
    it("STRAIN_MIN is 1", () => {
      expect(STRAIN_MIN).toBe(1);
    });

    it("STRAIN_MAX is 9", () => {
      expect(STRAIN_MAX).toBe(9);
    });

    it("DEFAULT_DISPLAY_SETTINGS has expected defaults", () => {
      expect(DEFAULT_DISPLAY_SETTINGS).toEqual({
        showStrain: true,
        showConditions: true,
        injuryDisplay: "all",
        showName: true,
        markerScale: 1,
        textScale: 1,
      });
    });

    it("DEFAULT_TOKEN_DISPLAY_OVERRIDES has all-null fields", () => {
      expect(DEFAULT_TOKEN_DISPLAY_OVERRIDES).toEqual({
        showStrain: null,
        showConditions: null,
        injuryDisplay: null,
        showName: null,
      });
    });
  });

  // ─── resolveDisplaySettings ───────────────────────────────────────────────

  describe("resolveDisplaySettings", () => {
    const scene = {
      showStrain: true,
      showConditions: false,
      injuryDisplay: "all" as const,
      showName: true,
      markerScale: 1.25,
      textScale: 1.5,
    };

    it("inherits all fields from scene when all overrides are null", () => {
      const overrides = { showStrain: null, showConditions: null, injuryDisplay: null, showName: null };
      const resolved = resolveDisplaySettings(scene, overrides);

      expect(resolved.showStrain).toBe(true);
      expect(resolved.showConditions).toBe(false);
      expect(resolved.injuryDisplay).toBe("all");
      expect(resolved.showName).toBe(true);
      expect(resolved.markerScale).toBe(1.25);
      expect(resolved.textScale).toBe(1.5);
    });

    it("overrides individual fields when token values are non-null", () => {
      const overrides = {
        showStrain: false,
        showConditions: true,
        injuryDisplay: "filled-only" as const,
        showName: false,
      };
      const resolved = resolveDisplaySettings(scene, overrides);

      expect(resolved.showStrain).toBe(false);
      expect(resolved.showConditions).toBe(true);
      expect(resolved.injuryDisplay).toBe("filled-only");
      expect(resolved.showName).toBe(false);
    });

    it("always inherits markerScale and textScale from scene regardless of overrides", () => {
      // markerScale and textScale are not per-token-overridable; they always
      // come from the scene settings.
      const overrides = { showStrain: false, showConditions: false, injuryDisplay: "none" as const, showName: false };
      const resolved = resolveDisplaySettings(scene, overrides);

      expect(resolved.markerScale).toBe(scene.markerScale);
      expect(resolved.textScale).toBe(scene.textScale);
    });

    it("handles mixed null and non-null overrides", () => {
      const overrides = {
        showStrain: null,      // inherit scene: true
        showConditions: true,  // override scene: false → true
        injuryDisplay: null,   // inherit scene: "all"
        showName: false,       // override scene: true → false
      };
      const resolved = resolveDisplaySettings(scene, overrides);

      expect(resolved.showStrain).toBe(true);
      expect(resolved.showConditions).toBe(true);
      expect(resolved.injuryDisplay).toBe("all");
      expect(resolved.showName).toBe(false);
    });

    it("false override wins over true scene setting", () => {
      const overrides = { showStrain: false, showConditions: null, injuryDisplay: null, showName: null };
      const resolved = resolveDisplaySettings({ ...scene, showStrain: true }, overrides);
      expect(resolved.showStrain).toBe(false);
    });

    it("true override wins over false scene setting", () => {
      const overrides = { showStrain: null, showConditions: true, injuryDisplay: null, showName: null };
      const resolved = resolveDisplaySettings({ ...scene, showConditions: false }, overrides);
      expect(resolved.showConditions).toBe(true);
    });

    it("injuryDisplay 'none' override hides all injuries", () => {
      const overrides = { showStrain: null, showConditions: null, injuryDisplay: "none" as const, showName: null };
      const resolved = resolveDisplaySettings(scene, overrides);
      expect(resolved.injuryDisplay).toBe("none");
    });
  });

  // ─── Factory helpers ──────────────────────────────────────────────────────

  describe("factory helpers", () => {
    it("createInjurySlot produces unique IDs and default values", () => {
      const slot1 = createInjurySlot();
      const slot2 = createInjurySlot();

      expect(slot1.id).toBeDefined();
      expect(slot2.id).toBeDefined();
      expect(slot1.id).not.toEqual(slot2.id);
      expect(slot1.description).toBe("");
      expect(slot1.complications).toEqual([]);
      expect(slot1.treated).toBe(false);
    });

    it("createSurvivorData has correct defaults", () => {
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

    it("createOtherData has correct defaults", () => {
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

    it("createDefaultTokenRecord defaults to survivor active type", () => {
      const record = createDefaultTokenRecord();

      expect(record.activeType).toBe("survivor");
      expect(record.displayName).toBe("");
      expect(record.displayOverrides).toEqual(DEFAULT_TOKEN_DISPLAY_OVERRIDES);
    });

    it("createDefaultTokenRecord contains independent survivor and other blobs", () => {
      const record = createDefaultTokenRecord();

      // Mutating one blob should not affect the other
      record.survivor.strainCurrent = 5;
      expect(record.other.strainCurrent).toBe(0);
    });
  });

  // ─── getActiveData / setActiveData ────────────────────────────────────────

  describe("getActiveData / setActiveData", () => {
    it("getActiveData returns survivor data when activeType is 'survivor'", () => {
      const record = createDefaultTokenRecord();
      record.activeType = "survivor";

      const active = getActiveData(record);
      expect(active.characterType).toBe("survivor");
    });

    it("getActiveData returns other data when activeType is 'other'", () => {
      const record = createDefaultTokenRecord();
      record.activeType = "other";

      const active = getActiveData(record);
      expect(active.characterType).toBe("other");
    });

    it("setActiveData updates survivor blob and returns new record", () => {
      const record = createDefaultTokenRecord();
      record.activeType = "survivor";

      const newSurvivor = { ...record.survivor, strainCurrent: 2 };
      const updated = setActiveData(record, newSurvivor);

      expect(updated.survivor.strainCurrent).toBe(2);
      expect(updated.other.strainCurrent).toBe(0); // other unchanged
      expect(record.survivor.strainCurrent).toBe(0); // original immutable
    });

    it("setActiveData updates other blob when activeType is 'other'", () => {
      const record = { ...createDefaultTokenRecord(), activeType: "other" as const };

      const newOther = { ...record.other, strainCurrent: 1 };
      const updated = setActiveData(record, newOther);

      expect(updated.other.strainCurrent).toBe(1);
      expect(updated.survivor.strainCurrent).toBe(0); // survivor unchanged
    });

    it("setActiveData does not mutate the original record", () => {
      const record = createDefaultTokenRecord();
      const originalStrainCurrent = record.survivor.strainCurrent;

      setActiveData(record, { ...record.survivor, strainCurrent: 9 });

      expect(record.survivor.strainCurrent).toBe(originalStrainCurrent);
    });
  });

  // ─── isTokenRecord ────────────────────────────────────────────────────────

  describe("isTokenRecord", () => {
    it("returns true for a valid default TokenRecord", () => {
      expect(isTokenRecord(createDefaultTokenRecord())).toBe(true);
    });

    it("returns false for an empty object", () => {
      expect(isTokenRecord({})).toBe(false);
    });

    it("returns false for null", () => {
      expect(isTokenRecord(null)).toBe(false);
    });

    it("returns false for a CharacterData blob (not a TokenRecord)", () => {
      expect(isTokenRecord(createSurvivorData())).toBe(false);
    });

    it("returns false when activeType is missing", () => {
      const r = { ...createDefaultTokenRecord() } as any;
      delete r.activeType;
      expect(isTokenRecord(r)).toBe(false);
    });

    it("returns false when activeType is an invalid string", () => {
      const r = { ...createDefaultTokenRecord(), activeType: "monster" } as any;
      expect(isTokenRecord(r)).toBe(false);
    });

    it("returns false when survivor blob is missing", () => {
      const r = { ...createDefaultTokenRecord() } as any;
      delete r.survivor;
      expect(isTokenRecord(r)).toBe(false);
    });

    it("returns true even when displayOverrides is absent (legacy tolerance)", () => {
      // displayOverrides is added by migration and is not required by isTokenRecord
      const r = { ...createDefaultTokenRecord() } as any;
      delete r.displayOverrides;
      expect(isTokenRecord(r)).toBe(true);
    });
  });

  // ─── migrateToTokenRecord ─────────────────────────────────────────────────

  describe("migrateToTokenRecord", () => {
    it("returns defaults for null input", () => {
      const record = migrateToTokenRecord(null);
      expect(record.activeType).toBe("survivor");
      expect(record.survivor.strainMax).toBe(3);
      expect(record.other.strainMax).toBe(1);
    });

    it("returns defaults for completely invalid input", () => {
      const record = migrateToTokenRecord("garbage");
      expect(isTokenRecord(record)).toBe(true);
      expect(record.activeType).toBe("survivor");
    });

    it("preserves a valid TokenRecord with no changes needed", () => {
      const original = createDefaultTokenRecord();
      original.survivor.strainCurrent = 2;
      original.displayName = "Hero";

      const migrated = migrateToTokenRecord(original);

      expect(migrated.survivor.strainCurrent).toBe(2);
      expect(migrated.displayName).toBe("Hero");
      expect(isTokenRecord(migrated)).toBe(true);
    });

    it("migrates legacy displayAlias into displayName when displayName is empty", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        displayName: "",
        displayAlias: "The Veteran",
      };
      const migrated = migrateToTokenRecord(raw);
      expect(migrated.displayName).toBe("The Veteran");
    });

    it("does not overwrite a non-empty displayName with displayAlias", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        displayName: "Existing Name",
        displayAlias: "Old Alias",
      };
      const migrated = migrateToTokenRecord(raw);
      expect(migrated.displayName).toBe("Existing Name");
    });

    it("fills missing displayOverrides fields with null defaults", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        displayOverrides: { showStrain: true },  // incomplete — missing other fields
      };
      const migrated = migrateToTokenRecord(raw);

      expect(migrated.displayOverrides.showStrain).toBe(true);
      expect(migrated.displayOverrides.showConditions).toBeNull();
      expect(migrated.displayOverrides.injuryDisplay).toBeNull();
      expect(migrated.displayOverrides.showName).toBeNull();
    });

    it("fills absent displayOverrides with all-null defaults", () => {
      const raw = { ...createDefaultTokenRecord() } as any;
      delete raw.displayOverrides;
      const migrated = migrateToTokenRecord(raw);

      expect(migrated.displayOverrides).toEqual(DEFAULT_TOKEN_DISPLAY_OVERRIDES);
    });

    it("migrates legacy location field to description in injury slots", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        survivor: {
          ...createSurvivorData(),
          seriousInjuries: [
            { id: "s0", location: "Left arm", complications: [], treated: false },
            { id: "s1", description: "", complications: [], treated: false },
          ],
          criticalInjury: { id: "c", location: "Spine", complications: [], treated: false },
          lethalInjury:   { id: "l", description: "Head", complications: [], treated: false },
        },
      };
      const migrated = migrateToTokenRecord(raw);

      expect(migrated.survivor.seriousInjuries[0].description).toBe("Left arm");
      expect(migrated.survivor.criticalInjury.description).toBe("Spine");
      expect(migrated.survivor.lethalInjury.description).toBe("Head");
    });

    it("migrates legacy string complications to string array", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        survivor: {
          ...createSurvivorData(),
          seriousInjuries: [
            { id: "s0", description: "Arm", complications: "Fumble on attack", treated: false },
            { id: "s1", description: "",    complications: "",                 treated: false },
          ],
          criticalInjury: { id: "c", description: "Chest", complications: "Winded", treated: false },
          lethalInjury:   { id: "l", description: "",      complications: [],        treated: false },
        },
      };
      const migrated = migrateToTokenRecord(raw);

      expect(migrated.survivor.seriousInjuries[0].complications).toEqual(["Fumble on attack"]);
      expect(migrated.survivor.seriousInjuries[1].complications).toEqual([]);  // empty string → []
      expect(migrated.survivor.criticalInjury.complications).toEqual(["Winded"]);
    });

    it("preserves existing string[] complications unchanged", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        survivor: {
          ...createSurvivorData(),
          seriousInjuries: [
            { id: "s0", description: "Leg", complications: ["Limp", "Slow"], treated: true },
            { id: "s1", description: "", complications: [], treated: false },
          ],
          criticalInjury: createInjurySlot(),
          lethalInjury:   createInjurySlot(),
        },
      };
      const migrated = migrateToTokenRecord(raw);
      expect(migrated.survivor.seriousInjuries[0].complications).toEqual(["Limp", "Slow"]);
    });

    it("migrates legacy string conditions to string array", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        survivor: {
          ...createSurvivorData(),
          conditions: "dazed",  // legacy single-string format
        },
      };
      const migrated = migrateToTokenRecord(raw);
      expect(migrated.survivor.conditions).toEqual(["dazed"]);
    });

    it("normalises empty string conditions to empty array", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        survivor: {
          ...createSurvivorData(),
          conditions: "",
        },
      };
      const migrated = migrateToTokenRecord(raw);
      expect(migrated.survivor.conditions).toEqual([]);
    });

    it("fills in missing seriousCount defaulting to 2", () => {
      const raw = {
        ...createDefaultTokenRecord(),
        survivor: {
          ...createSurvivorData(),
          seriousCount: undefined,
        },
      };
      const migrated = migrateToTokenRecord(raw as any);
      // seriousCount ?? 2 → 2
      expect(migrated.survivor.seriousCount).toBe(2);
    });

    it("migrates legacy CharacterData (survivor type) into a full TokenRecord", () => {
      const legacySurvivor = {
        characterType: "survivor" as const,
        strainMax: 4,
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

      const record = migrateToTokenRecord(legacySurvivor);

      expect(record.activeType).toBe("survivor");
      expect(record.survivor.strainMax).toBe(4);
      expect(record.survivor.strainCurrent).toBe(1);
      expect(record.survivor.conditions).toEqual(["bleeding"]);
      // Other blob should be a fresh default
      expect(record.other.characterType).toBe("other");
      expect(record.other.strainMax).toBe(1);
      expect(record.other.strainCurrent).toBe(0);
      expect(record.other.conditions).toEqual([]);
      expect(isTokenRecord(record)).toBe(true);
    });

    it("migrates legacy CharacterData (other type) into a full TokenRecord", () => {
      const legacyOther = {
        characterType: "other" as const,
        strainMax: 2,
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

      const record = migrateToTokenRecord(legacyOther);

      expect(record.activeType).toBe("other");
      expect(record.other.strainMax).toBe(2);
      // Survivor blob should be a fresh default
      expect(record.survivor.strainMax).toBe(3);
      expect(isTokenRecord(record)).toBe(true);
    });

    it("migrates combined legacy fields in a single pass (location + string complications + string conditions)", () => {
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
          lethalInjury:   { id: "4", description: "Head", complications: [], treated: false },
          conditions: "dazed",
        },
        other: createOtherData(),
        displayOverrides: {},
        displayName: "",
        displayAlias: "Hero",
      };

      const migrated = migrateToTokenRecord(legacyRecord);

      expect(isTokenRecord(migrated)).toBe(true);
      expect(migrated.displayName).toBe("Hero");
      expect(migrated.survivor.conditions).toEqual(["dazed"]);
      expect(migrated.survivor.seriousInjuries[0].description).toBe("Left arm");
      expect(migrated.survivor.seriousInjuries[0].complications).toEqual(["Fumble on attack"]);
      expect(migrated.survivor.seriousInjuries[1].complications).toEqual(["Limp"]);
      expect(migrated.survivor.criticalInjury.description).toBe("Chest");
      expect(migrated.survivor.criticalInjury.complications).toEqual([]);
    });
  });
});
