import { describe, it, expect } from "vitest";
import { Image, Item } from "@owlbear-rodeo/sdk";
import {
  buildStrainItems,
  buildInjuryItems,
  buildConditionItems,
  buildNameBubble,
} from "../background/onMapHelpers";
import {
  createSurvivorData,
  DisplaySettings,
} from "../characterDataHelpers";

// Helper to create a mock Image token
function createMockImage(id = "test-token"): Image {
  return {
    id,
    type: "IMAGE",
    visible: true,
    scale: { x: 1, y: 1 },
    position: { x: 100, y: 100 },
    rotation: 0,
    image: { width: 64, height: 64 },
    grid: { dpi: 150, offset: { x: 0, y: 0 } },
  } as any;
}

const defaultSceneSettings: DisplaySettings = {
  showStrain: true,
  showConditions: true,
  injuryDisplay: "all",
  showName: true,
  markerScale: 1.0,
  textScale: 1.0,
};

describe("onMapHelpers", () => {
  describe("buildStrainItems", () => {
    it("builds the correct number of boxes representing max strain", () => {
      const image = createMockImage();
      const data = createSurvivorData(); // strainMax = 3
      data.strainCurrent = 1;
      const addItems: Item[] = [];

      buildStrainItems(image, 150, data, defaultSceneSettings, addItems);

      // Each strain box adds a SHAPE (background) and a TEXT (inside it)
      // So 3 boxes should add 6 items.
      expect(addItems).toHaveLength(6);

      // Verify the first box (filled, since strainCurrent = 1)
      const firstBoxBg = addItems.find(
        (item: any) => item.type === "SHAPE" && item.id.includes("strain-bg-0")
      ) as any;
      const firstBoxText = addItems.find(
        (item: any) => item.type === "TEXT" && item.id.includes("strain-x-0")
      ) as any;

      expect(firstBoxBg.fillColor).toBe("#b42828"); // filled strain color
      expect(firstBoxBg.fillOpacity).toBe(0.95);
      expect(firstBoxText.plainText).toBe("✕");

      // Verify the second box (empty)
      const secondBoxBg = addItems.find(
        (item: any) => item.type === "SHAPE" && item.id.includes("strain-bg-1")
      ) as any;
      const secondBoxText = addItems.find(
        (item: any) => item.type === "TEXT" && item.id.includes("strain-x-1")
      ) as any;

      expect(secondBoxBg.fillColor).toBe("#1a0000"); // empty strain color
      expect(secondBoxBg.fillOpacity).toBe(0.4);
      expect(secondBoxText.plainText).toBe("");
    });
  });

  describe("buildInjuryItems", () => {
    it("respects empty-vs-filled injuryDisplay settings", () => {
      const image = createMockImage();
      const data = createSurvivorData();

      // Clear all injuries so they are empty
      data.seriousInjuries[0] = { id: "s0", description: "", complications: [], treated: false };
      data.seriousInjuries[1] = { id: "s1", description: "", complications: [], treated: false };
      data.criticalInjury = { id: "c", description: "", complications: [], treated: false };
      data.lethalInjury = { id: "l", description: "", complications: [], treated: false };

      // Case 1: injuryDisplay = "all" (should render empty circles)
      const addItemsAll: Item[] = [];
      buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "all" }, addItemsAll);
      // Survivor has 4 injury slots (2 serious, 1 critical, 1 lethal).
      // Each slot creates 1 SHAPE (bg) and 1 TEXT (icon) = 8 items.
      expect(addItemsAll).toHaveLength(8);

      // Case 2: injuryDisplay = "filled-only" (should render nothing since all are empty)
      const addItemsFilled: Item[] = [];
      buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItemsFilled);
      expect(addItemsFilled).toHaveLength(0);

      // Case 3: injuryDisplay = "none" (renders nothing)
      const addItemsNone: Item[] = [];
      buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "none" }, addItemsNone);
      expect(addItemsNone).toHaveLength(0);
    });

    it("renders filled and treated symbols correctly", () => {
      const image = createMockImage();
      const data = createSurvivorData();

      // Set one filled serious injury (untreated) and one treated critical injury
      data.seriousInjuries[0] = { id: "s0", description: "Broken Ribs", complications: [], treated: false };
      data.seriousInjuries[1] = { id: "s1", description: "", complications: [], treated: false };
      data.criticalInjury = { id: "c", description: "Concussion", complications: [], treated: true };
      data.lethalInjury = { id: "l", description: "", complications: [], treated: false };

      const addItems: Item[] = [];
      buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

      // Should only show filled slots: s0 and c (2 slots = 4 items)
      expect(addItems).toHaveLength(4);

      // Verify serious injury s0 (filled, untreated -> "!")
      const s0Text = addItems.find((item: any) => item.id.includes("inj-icon-s0")) as any;
      expect(s0Text.plainText).toBe("!");

      // Verify critical injury c (treated -> "✓")
      const cText = addItems.find((item: any) => item.id.includes("inj-icon-c")) as any;
      expect(cText.plainText).toBe("✓");
    });
  });

  describe("buildConditionItems", () => {
    it("deduplicates complication/condition strings", () => {
      const image = createMockImage();
      const data = createSurvivorData();

      // Set duplicate condition and untreated complication
      data.conditions = ["Dazed", "Dazed"];
      data.seriousInjuries[0] = {
        id: "s0",
        description: "Shock",
        complications: ["Dazed"], // Untreated complication
        treated: false,
      };

      const addItems: Item[] = [];
      buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

      // "Dazed" is deduplicated, so it should render exactly once.
      // 1 bubble = 1 PATH (bg) and 1 TEXT = 2 items.
      expect(addItems).toHaveLength(2);
      const textItem = addItems.find((item: any) => item.type === "TEXT") as any;
      expect(textItem.plainText).toBe("Dazed");
    });

    it("prioritizes injury severity color during deduplication", () => {
      const image = createMockImage();
      const data = createSurvivorData();

      // "Bleeding" as a standard condition (normal color = #ffffff)
      data.conditions = ["Bleeding"];

      // "Bleeding" also as a Lethal injury complication (color = #7c4291)
      data.lethalInjury = {
        id: "l",
        description: "Severed Artery",
        complications: ["Bleeding"],
        treated: false,
      };

      const addItems: Item[] = [];
      buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

      expect(addItems).toHaveLength(2);
      const textItem = addItems.find((item: any) => item.type === "TEXT") as any;
      expect(textItem.plainText).toBe("Bleeding");
      expect(textItem.fillColor).toBe("#7c4291"); // lethal color wins!
    });

    it("hides complications for treated injuries", () => {
      const image = createMockImage();
      const data = createSurvivorData();

      data.conditions = [];
      data.seriousInjuries[0] = {
        id: "s0",
        description: "Broken leg",
        complications: ["Limp"],
        treated: true, // treated!
      };

      const addItems: Item[] = [];
      buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

      // Limp should be hidden because the injury is treated.
      expect(addItems).toHaveLength(0);
    });
  });

  describe("buildNameBubble", () => {
    it("creates name bubble when displayName is non-empty", () => {
      const image = createMockImage();
      const addItems: Item[] = [];

      buildNameBubble(image, 150, "Cactus Jack", defaultSceneSettings, addItems);

      // Name bubble adds 1 PATH (bg) and 1 TEXT = 2 items.
      expect(addItems).toHaveLength(2);
      const textItem = addItems.find((item: any) => item.type === "TEXT") as any;
      expect(textItem.plainText).toBe("Cactus Jack");
      expect(textItem.fillColor).toBe("#e8d8a0"); // name bubble color
    });

    it("creates no bubble when displayName is empty or only whitespace", () => {
      const image = createMockImage();
      const addItems: Item[] = [];

      buildNameBubble(image, 150, "   ", defaultSceneSettings, addItems);
      expect(addItems).toHaveLength(0);
    });
  });

  describe("defensive scaling limits", () => {
    it("clamps scene scale settings to reasonable boundaries (0.5 to 2.0)", () => {
      const image = createMockImage();
      const data = createSurvivorData();

      // Case 1: Under scaling limit (0.1 should clamp to 0.5)
      const addItemsSmall: Item[] = [];
      buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 0.1 }, addItemsSmall);
      
      const smallBg = addItemsSmall.find((item: any) => item.type === "SHAPE") as any;
      // Default BOX_SIZE = 14. Clamped to scale 0.5 -> 14 * 0.5 = 7.
      expect(smallBg.width).toBe(7);

      // Case 2: Over scaling limit (5.0 should clamp to 2.0)
      const addItemsLarge: Item[] = [];
      buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 5.0 }, addItemsLarge);

      const largeBg = addItemsLarge.find((item: any) => item.type === "SHAPE") as any;
      // Default BOX_SIZE = 14. Clamped to scale 2.0 -> 14 * 2.0 = 28.
      expect(largeBg.width).toBe(28);
    });
  });
});
