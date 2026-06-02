import { describe, it, expect, vi, beforeEach } from "vitest";
import OBR from "@owlbear-rodeo/sdk";
import {
  writeTokenRecordToItem,
  writeTokenRecordToSelection,
  getTokenRecordFromSelection,
  getTokenRecordFromItem,
  getActiveDataFromItem,
  clearTokenData,
  getHiddenFromItem,
  writeHiddenToSelection,
} from "../itemMetadataHelpers";
import { createDefaultTokenRecord } from "../characterDataHelpers";
import { getPluginId } from "../getPluginId";

describe("itemMetadataHelpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("writeTokenRecordToItem", () => {
    it("writes the token record to metadata on the item", async () => {
      const mockItem = {
        id: "token-1",
        metadata: {},
      } as any;

      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([mockItem]);

      const record = createDefaultTokenRecord();
      record.displayName = "Test Token";

      await writeTokenRecordToItem("token-1", record);

      expect(OBR.scene.items.getItems).toHaveBeenCalledWith(["token-1"]);
      expect(OBR.scene.items.updateItems).toHaveBeenCalled();
      expect(mockItem.metadata[getPluginId("tokenRecord")]).toEqual(record);
    });

    it("throws an error if item is not found", async () => {
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([]);
      const record = createDefaultTokenRecord();

      await expect(writeTokenRecordToItem("invalid-id", record)).rejects.toThrow(
        "Item not found: invalid-id"
      );
    });
  });

  describe("writeTokenRecordToSelection", () => {
    it("writes the token record to metadata on the selected item", async () => {
      const mockItem = {
        id: "selected-1",
        metadata: {},
      } as any;

      vi.mocked(OBR.player.getSelection).mockResolvedValue(["selected-1"]);
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([mockItem]);

      const record = createDefaultTokenRecord();
      record.displayName = "Selected Token Name";

      await writeTokenRecordToSelection(record);

      expect(OBR.player.getSelection).toHaveBeenCalled();
      expect(OBR.scene.items.getItems).toHaveBeenCalledWith(["selected-1"]);
      expect(OBR.scene.items.updateItems).toHaveBeenCalled();
      expect(mockItem.metadata[getPluginId("tokenRecord")]).toEqual(record);
    });

    it("throws an error if more than 1 item is selected", async () => {
      vi.mocked(OBR.player.getSelection).mockResolvedValue(["s1", "s2"]);
      const record = createDefaultTokenRecord();

      await expect(writeTokenRecordToSelection(record)).rejects.toThrow(
        "Expected 1 selected item, got 2."
      );
    });

    it("throws an error if no items are selected", async () => {
      vi.mocked(OBR.player.getSelection).mockResolvedValue([]);
      const record = createDefaultTokenRecord();

      await expect(writeTokenRecordToSelection(record)).rejects.toThrow(
        "Expected 1 selected item, got 0."
      );
    });
  });

  describe("getTokenRecordFromSelection", () => {
    it("retrieves the record of the selected item when items are passed", async () => {
      const record = createDefaultTokenRecord();
      record.displayName = "Direct Item";
      const mockItem = {
        id: "selected-1",
        metadata: {
          [getPluginId("tokenRecord")]: record,
        },
      } as any;

      vi.mocked(OBR.player.getSelection).mockResolvedValue(["selected-1"]);

      const result = await getTokenRecordFromSelection([mockItem]);
      expect(result.displayName).toBe("Direct Item");
    });

    it("retrieves from scene if items are not passed", async () => {
      const record = createDefaultTokenRecord();
      record.displayName = "Scene Item";
      const mockItem = {
        id: "selected-1",
        metadata: {
          [getPluginId("tokenRecord")]: record,
        },
      } as any;

      vi.mocked(OBR.player.getSelection).mockResolvedValue(["selected-1"]);
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([mockItem]);

      const result = await getTokenRecordFromSelection();
      expect(result.displayName).toBe("Scene Item");
      expect(OBR.scene.items.getItems).toHaveBeenCalled();
    });

    it("throws TypeError if selected item not in items list", async () => {
      vi.mocked(OBR.player.getSelection).mockResolvedValue(["selected-1"]);
      await expect(getTokenRecordFromSelection([])).rejects.toThrow(
        "No selected item found"
      );
    });
  });

  describe("getTokenRecordFromItem", () => {
    it("returns migrated record from raw key if present", () => {
      const record = createDefaultTokenRecord();
      record.displayName = "Active Name";
      const mockItem = {
        metadata: {
          [getPluginId("tokenRecord")]: record,
        },
      } as any;

      const result = getTokenRecordFromItem(mockItem);
      expect(result.displayName).toBe("Active Name");
    });

    it("returns migrated legacy record from characterData key if present and no active key", () => {
      const legacyData = {
        characterType: "survivor",
        strainMax: 4,
        strainCurrent: 0,
        hasSerious: true,
        hasCritical: true,
        hasLethal: true,
        seriousInjuries: [
          { id: "s0", description: "", complications: [], treated: false },
          { id: "s1", description: "", complications: [], treated: false },
        ],
        criticalInjury: { id: "c", description: "", complications: [], treated: false },
        lethalInjury: { id: "l", description: "", complications: [], treated: false },
        conditions: ["bleeding"],
      };
      const mockItem = {
        metadata: {
          [getPluginId("characterData")]: legacyData,
        },
      } as any;

      const result = getTokenRecordFromItem(mockItem);
      expect(result.survivor.strainMax).toBe(4);
      expect(result.survivor.conditions).toEqual(["bleeding"]);
    });

    it("returns default record if no metadata keys are present", () => {
      const mockItem = {
        metadata: {},
      } as any;

      const result = getTokenRecordFromItem(mockItem);
      expect(result.activeType).toBe("survivor");
      expect(result.survivor.strainMax).toBe(3);
    });

    it("prefers the new tokenRecord key over the legacy characterData key when both are present", () => {
      // If a token was somehow written with both keys, the new key should win.
      const newRecord = createDefaultTokenRecord();
      newRecord.displayName = "NewKey";
      newRecord.survivor.strainMax = 7;

      const legacyData = {
        characterType: "survivor",
        strainMax: 1,   // different value — should be ignored
        strainCurrent: 0,
        hasSerious: true,
        hasCritical: false,
        hasLethal: false,
        seriousInjuries: [
          { id: "s0", description: "", complications: [], treated: false },
          { id: "s1", description: "", complications: [], treated: false },
        ],
        criticalInjury: { id: "c", description: "", complications: [], treated: false },
        lethalInjury:   { id: "l", description: "", complications: [], treated: false },
        conditions: [],
      };

      const mockItem = {
        metadata: {
          [getPluginId("tokenRecord")]:   newRecord,
          [getPluginId("characterData")]: legacyData,
        },
      } as any;

      const result = getTokenRecordFromItem(mockItem);
      expect(result.survivor.strainMax).toBe(7);      // from new key
      expect(result.displayName).toBe("NewKey");      // from new key
    });
  });

  describe("getActiveDataFromItem", () => {
    it("gets the active character data structure directly", () => {
      const record = createDefaultTokenRecord();
      record.activeType = "other";
      record.other.strainCurrent = 5;
      const mockItem = {
        metadata: {
          [getPluginId("tokenRecord")]: record,
        },
      } as any;

      const activeData = getActiveDataFromItem(mockItem);
      expect(activeData.characterType).toBe("other");
      expect(activeData.strainCurrent).toBe(5);
    });
  });

  describe("clearTokenData", () => {
    it("deletes TFE metadata keys and deletes local attachments", async () => {
      const mockItem = {
        id: "token-to-clear",
        metadata: {
          [getPluginId("tokenRecord")]: {},
          [getPluginId("characterData")]: {},
          [getPluginId("hidden")]: true,
          "some-other-key": "keep-me",
        },
      } as any;

      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([mockItem]);

      await clearTokenData("token-to-clear");

      expect(OBR.scene.items.getItems).toHaveBeenCalledWith(["token-to-clear"]);
      expect(OBR.scene.items.updateItems).toHaveBeenCalled();
      
      // Keys should be deleted
      expect(mockItem.metadata[getPluginId("tokenRecord")]).toBeUndefined();
      expect(mockItem.metadata[getPluginId("characterData")]).toBeUndefined();
      expect(mockItem.metadata[getPluginId("hidden")]).toBeUndefined();
      // Other keys preserved
      expect(mockItem.metadata["some-other-key"]).toBe("keep-me");

      // Verify deletion of attachments
      expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
      const deletedIds = vi.mocked(OBR.scene.local.deleteItems).mock.calls[0][0];
      expect(deletedIds).toContain("token-to-clear-tfe-name-bg");
      expect(deletedIds).toContain("token-to-clear-tfe-strain-bg-0");
    });

    it("throws error if item to clear is not found", async () => {
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([]);
      await expect(clearTokenData("invalid")).rejects.toThrow("Item not found: invalid");
    });
  });

  describe("hidden flag functions", () => {
    it("getHiddenFromItem reads boolean correctly", () => {
      expect(getHiddenFromItem({ metadata: { [getPluginId("hidden")]: true } } as any)).toBe(true);
      expect(getHiddenFromItem({ metadata: { [getPluginId("hidden")]: false } } as any)).toBe(false);
      expect(getHiddenFromItem({ metadata: {} } as any)).toBe(false);
      expect(getHiddenFromItem({ metadata: { [getPluginId("hidden")]: "invalid" } } as any)).toBe(false);
    });

    it("writeHiddenToSelection updates metadata for selection", async () => {
      const mockItem = {
        id: "sel-id",
        metadata: {},
      } as any;

      vi.mocked(OBR.player.getSelection).mockResolvedValue(["sel-id"]);
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([mockItem]);

      await writeHiddenToSelection(true);

      expect(OBR.player.getSelection).toHaveBeenCalled();
      expect(OBR.scene.items.updateItems).toHaveBeenCalled();
      expect(mockItem.metadata[getPluginId("hidden")]).toBe(true);
    });

    it("writeHiddenToSelection throws error if selection is not exactly 1", async () => {
      vi.mocked(OBR.player.getSelection).mockResolvedValue([]);
      await expect(writeHiddenToSelection(true)).rejects.toThrow(
        "Expected 1 selected item, got 0."
      );
    });
  });
});
