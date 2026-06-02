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
  createOtherData,
  DisplaySettings,
} from "../characterDataHelpers";

// ─── Test fixtures ────────────────────────────────────────────────────────────

/** Creates a minimal mock Image token suitable for all builder helpers. */
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

// ─── buildStrainItems ─────────────────────────────────────────────────────────

describe("buildStrainItems", () => {
  it("creates 2 items per strain box (bg shape + x text)", () => {
    const image = createMockImage();
    const data = createSurvivorData(); // strainMax = 3
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, defaultSceneSettings, addItems);

    // 3 boxes × 2 items each = 6
    expect(addItems).toHaveLength(6);
  });

  it("filled boxes (strainCurrent index) use dark-red fill and ✕ text", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.strainCurrent = 1;
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, defaultSceneSettings, addItems);

    const bg = addItems.find((i: any) => i.id.includes("strain-bg-0")) as any;
    const text = addItems.find((i: any) => i.id.includes("strain-x-0")) as any;

    expect(bg.fillColor).toBe("#b42828");
    expect(bg.fillOpacity).toBeCloseTo(0.95);
    expect(text.plainText).toBe("✕");
  });

  it("empty boxes use near-black fill and empty text", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.strainCurrent = 0; // none filled
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, defaultSceneSettings, addItems);

    const bg = addItems.find((i: any) => i.id.includes("strain-bg-0")) as any;
    const text = addItems.find((i: any) => i.id.includes("strain-x-0")) as any;

    expect(bg.fillColor).toBe("#1a0000");
    expect(text.plainText).toBe("");
  });

  it("renders exactly strainMax boxes", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.strainMax = 5;
    data.strainCurrent = 2;
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, defaultSceneSettings, addItems);

    expect(addItems).toHaveLength(10); // 5 × 2
  });

  it("boxes are RECTANGLE shapes attached to the image", () => {
    const image = createMockImage("tok-1");
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, defaultSceneSettings, addItems);

    const shapes = addItems.filter((i: any) => i.type === "SHAPE");
    for (const s of shapes) {
      expect((s as any).shapeType).toBe("RECTANGLE");
      expect((s as any).attachedTo).toBe("tok-1");
    }
  });

  it("applies markerScale: BOX_SIZE (14) × scale", () => {
    const image = createMockImage();
    const data = createSurvivorData();

    const addItemsM: Item[] = [];
    buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 1.0 }, addItemsM);
    const bgM = addItemsM.find((i: any) => i.type === "SHAPE") as any;
    expect(bgM.width).toBe(14);

    const addItemsL: Item[] = [];
    buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 1.25 }, addItemsL);
    const bgL = addItemsL.find((i: any) => i.type === "SHAPE") as any;
    expect(bgL.width).toBe(14 * 1.25);
  });

  it("clamps markerScale below 0.5 → 0.5", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 0.1 }, addItems);

    const bg = addItems.find((i: any) => i.type === "SHAPE") as any;
    expect(bg.width).toBe(14 * 0.5); // 7
  });

  it("clamps markerScale above 2.0 → 2.0", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 5.0 }, addItems);

    const bg = addItems.find((i: any) => i.type === "SHAPE") as any;
    expect(bg.width).toBe(14 * 2.0); // 28
  });

  it("clamps non-finite markerScale (NaN/Infinity) to 1", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: NaN }, addItems);

    const bg = addItems.find((i: any) => i.type === "SHAPE") as any;
    expect(bg.width).toBe(14 * 1.0);
  });

  it("only exactly strainCurrent boxes are filled", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.strainMax = 4;
    data.strainCurrent = 2;
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, defaultSceneSettings, addItems);

    // Boxes 0 and 1 filled, 2 and 3 empty
    const bg0 = addItems.find((i: any) => i.id.includes("strain-bg-0")) as any;
    const bg1 = addItems.find((i: any) => i.id.includes("strain-bg-1")) as any;
    const bg2 = addItems.find((i: any) => i.id.includes("strain-bg-2")) as any;
    const bg3 = addItems.find((i: any) => i.id.includes("strain-bg-3")) as any;

    expect(bg0.fillColor).toBe("#b42828");
    expect(bg1.fillColor).toBe("#b42828");
    expect(bg2.fillColor).toBe("#1a0000");
    expect(bg3.fillColor).toBe("#1a0000");
  });
});

// ─── buildInjuryItems ─────────────────────────────────────────────────────────

describe("buildInjuryItems", () => {
  it("injuryDisplay='all' renders empty injury circles for a survivor", () => {
    const image = createMockImage();
    const data = createSurvivorData(); // 4 slots (s0, s1, c, l), all empty
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "all" }, addItems);

    // 4 slots × 2 items (bg + icon) = 8
    expect(addItems).toHaveLength(8);
  });

  it("injuryDisplay='filled-only' hides empty circles", () => {
    const image = createMockImage();
    const data = createSurvivorData(); // all empty
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

    expect(addItems).toHaveLength(0);
  });

  it("filled untreated injury uses '!' icon", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.seriousInjuries[0] = { id: "s0", description: "Broken Ribs", complications: [], treated: false };
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

    const icon = addItems.find((i: any) => i.id.includes("inj-icon-s0")) as any;
    expect(icon.plainText).toBe("!");
  });

  it("filled treated injury uses '✓' icon", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.criticalInjury = { id: "c", description: "Concussion", complications: [], treated: true };
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

    const icon = addItems.find((i: any) => i.id.includes("inj-icon-c")) as any;
    expect(icon.plainText).toBe("✓");
  });

  it("empty slot icon is '' (no text)", () => {
    const image = createMockImage();
    const data = createSurvivorData(); // all empty
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "all" }, addItems);

    const icon = addItems.find((i: any) => i.id.includes("inj-icon-s0")) as any;
    expect(icon.plainText).toBe("");
  });

  it("injury circles are CIRCLE shapes attached to the image", () => {
    const image = createMockImage("tok-2");
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, defaultSceneSettings, addItems);

    const shapes = addItems.filter((i: any) => i.type === "SHAPE");
    for (const s of shapes) {
      expect((s as any).shapeType).toBe("CIRCLE");
      expect((s as any).attachedTo).toBe("tok-2");
    }
  });

  it("serious injury uses correct fill color", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.seriousInjuries[0] = { id: "s0", description: "Arm", complications: [], treated: false };
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

    const bg = addItems.find((i: any) => i.id.includes("inj-bg-s0")) as any;
    expect(bg.fillColor).toBe("#d68e68");
    expect(bg.strokeColor).toBe("#a44f27");
  });

  it("critical injury uses correct fill color", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.criticalInjury = { id: "c", description: "Head", complications: [], treated: false };
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

    const bg = addItems.find((i: any) => i.id.includes("inj-bg-c")) as any;
    expect(bg.fillColor).toBe("#db7777");
    expect(bg.strokeColor).toBe("#94272c");
  });

  it("lethal injury uses correct fill color", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.lethalInjury = { id: "l", description: "Heart", complications: [], treated: false };
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

    const bg = addItems.find((i: any) => i.id.includes("inj-bg-l")) as any;
    expect(bg.fillColor).toBe("#7c4291");
    expect(bg.strokeColor).toBe("#501e64");
  });

  it("other type with seriousCount=1 renders only one serious slot", () => {
    const image = createMockImage();
    const data = createOtherData(); // seriousCount=1, no critical, no lethal
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "all" }, addItems);

    // 1 serious slot × 2 items = 2
    expect(addItems).toHaveLength(2);
    const ids = addItems.map((i: any) => i.id);
    expect(ids.some((id: string) => id.includes("inj-bg-s0"))).toBe(true);
    expect(ids.some((id: string) => id.includes("inj-bg-s1"))).toBe(false);
  });

  it("other type with seriousCount=2 renders two serious slots", () => {
    const image = createMockImage();
    const data = createOtherData();
    data.seriousCount = 2;
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "all" }, addItems);

    // 2 serious slots × 2 items = 4
    expect(addItems).toHaveLength(4);
  });

  it("other type with hasSerious=false renders no injury circles", () => {
    const image = createMockImage();
    const data = createOtherData();
    data.hasSerious = false;
    data.hasCritical = false;
    data.hasLethal = false;
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "all" }, addItems);

    expect(addItems).toHaveLength(0);
  });

  it("applies markerScale to circle size", () => {
    const image = createMockImage();
    const data = createSurvivorData(); // 4 slots

    const addItemsM: Item[] = [];
    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, markerScale: 1.0 }, addItemsM);
    const bgM = addItemsM.find((i: any) => i.type === "SHAPE") as any;
    expect(bgM.width).toBe(16); // CIRCLE_SIZE=16 × 1.0

    const addItemsL: Item[] = [];
    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, markerScale: 1.25 }, addItemsL);
    const bgL = addItemsL.find((i: any) => i.type === "SHAPE") as any;
    expect(bgL.width).toBe(16 * 1.25);
  });

  it("filled-only: renders filled slots only (mixed scenario)", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.seriousInjuries[0] = { id: "s0", description: "Arm",  complications: [], treated: false };
    data.seriousInjuries[1] = { id: "s1", description: "",     complications: [], treated: false }; // empty
    data.criticalInjury = { id: "c", description: "Head", complications: [], treated: true };  // filled + treated
    data.lethalInjury   = { id: "l", description: "",    complications: [], treated: false };  // empty
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, injuryDisplay: "filled-only" }, addItems);

    // s0 (filled untreated) + c (filled treated) = 2 slots × 2 items = 4
    expect(addItems).toHaveLength(4);

    const s0Icon = addItems.find((i: any) => i.id.includes("inj-icon-s0")) as any;
    const cIcon  = addItems.find((i: any) => i.id.includes("inj-icon-c"))  as any;
    expect(s0Icon.plainText).toBe("!");
    expect(cIcon.plainText).toBe("✓");
  });
});

// ─── buildConditionItems ──────────────────────────────────────────────────────

describe("buildConditionItems", () => {
  it("renders one bubble (2 items) per unique string", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["Dazed", "Bleeding"];
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    // 2 unique strings × 2 items (path bg + text) = 4
    expect(addItems).toHaveLength(4);
  });

  it("deduplicates the same string from conditions", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["Dazed", "Dazed"];
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    expect(addItems).toHaveLength(2); // only one bubble
    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    expect(text.plainText).toBe("Dazed");
  });

  it("deduplicates the same string from condition and untreated complication", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["Dazed"];
    data.seriousInjuries[0] = {
      id: "s0", description: "Shock", complications: ["Dazed"], treated: false,
    };
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    expect(addItems).toHaveLength(2);
  });

  it("dedup: injury severity color wins over condition color", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["Bleeding"];
    data.lethalInjury = {
      id: "l", description: "Artery", complications: ["Bleeding"], treated: false,
    };
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    expect(addItems).toHaveLength(2);
    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    // Lethal color wins over condition white
    expect(text.fillColor).toBe("#7c4291");
  });

  it("dedup: critical color wins over serious color", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.seriousInjuries[0]  = { id: "s0", description: "Arm",  complications: ["Pain"], treated: false };
    data.criticalInjury      = { id: "c",  description: "Neck", complications: ["Pain"], treated: false };
    data.conditions = [];
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    expect(addItems).toHaveLength(2);
    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    // Critical color wins
    expect(text.fillColor).toBe("#db7777");
  });

  it("dedup: lethal color wins over critical and condition colors", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["Pain"];
    data.criticalInjury = { id: "c", description: "Head", complications: ["Pain"], treated: false };
    data.lethalInjury   = { id: "l", description: "Heart", complications: ["Pain"], treated: false };
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    expect(addItems).toHaveLength(2);
    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    expect(text.fillColor).toBe("#7c4291");
  });

  it("treated injury complications are hidden", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = [];
    data.seriousInjuries[0] = {
      id: "s0", description: "Leg", complications: ["Limp"], treated: true,
    };
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    expect(addItems).toHaveLength(0);
  });

  it("conditions are hidden when showConditions=false", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["Dazed", "Bleeding"];
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, false);

    // showConditions=false suppresses condition strings
    expect(addItems).toHaveLength(0);
  });

  it("empty conditions and no complications produces no items", () => {
    const image = createMockImage();
    const data = createSurvivorData(); // all empty
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    expect(addItems).toHaveLength(0);
  });

  it("condition bubbles are PATH items attached to the image", () => {
    const image = createMockImage("tok-3");
    const data = createSurvivorData();
    data.conditions = ["Tired"];
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    const path = addItems.find((i: any) => i.type === "PATH") as any;
    expect(path).toBeDefined();
    expect(path.attachedTo).toBe("tok-3");
  });

  it("conditions render in white (#ffffff)", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["Afraid"];
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    expect(text.fillColor).toBe("#ffffff");
  });

  it("serious complication renders in serious color", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = [];
    data.seriousInjuries[0] = {
      id: "s0", description: "Arm", complications: ["Fumble"], treated: false,
    };
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    expect(text.fillColor).toBe("#d68e68");
  });

  it("case-insensitive dedup preserves first-seen text casing", () => {
    // "DAZED" and "dazed" should collapse to one bubble.
    const image = createMockImage();
    const data = createSurvivorData();
    data.conditions = ["DAZED"];
    // Complication with different casing
    data.criticalInjury = {
      id: "c", description: "Head", complications: ["dazed"], treated: false,
    };
    const addItems: Item[] = [];

    buildConditionItems(image, 150, data, defaultSceneSettings, addItems, true);

    // Only one bubble
    const texts = addItems.filter((i: any) => i.type === "TEXT");
    expect(texts).toHaveLength(1);
  });
});

// ─── buildNameBubble ──────────────────────────────────────────────────────────

describe("buildNameBubble", () => {
  it("creates 2 items (PATH bg + TEXT) for a non-empty display name", () => {
    const image = createMockImage();
    const addItems: Item[] = [];

    buildNameBubble(image, 150, "Cactus Jack", defaultSceneSettings, addItems);

    expect(addItems).toHaveLength(2);
    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    expect(text.plainText).toBe("Cactus Jack");
  });

  it("creates no items for an empty display name", () => {
    const image = createMockImage();
    const addItems: Item[] = [];

    buildNameBubble(image, 150, "", defaultSceneSettings, addItems);

    expect(addItems).toHaveLength(0);
  });

  it("creates no items for a whitespace-only display name", () => {
    const image = createMockImage();
    const addItems: Item[] = [];

    buildNameBubble(image, 150, "   ", defaultSceneSettings, addItems);

    expect(addItems).toHaveLength(0);
  });

  it("name bubble text uses parchment color (#e8d8a0)", () => {
    const image = createMockImage();
    const addItems: Item[] = [];

    buildNameBubble(image, 150, "Survivor", defaultSceneSettings, addItems);

    const text = addItems.find((i: any) => i.type === "TEXT") as any;
    expect(text.fillColor).toBe("#e8d8a0");
  });

  it("name bubble PATH is attached to the image", () => {
    const image = createMockImage("tok-name");
    const addItems: Item[] = [];

    buildNameBubble(image, 150, "Hero", defaultSceneSettings, addItems);

    const path = addItems.find((i: any) => i.type === "PATH") as any;
    expect(path.attachedTo).toBe("tok-name");
  });

  it("name bubble PATH uses IDs from onMapItemIds helpers", () => {
    const image = createMockImage("tok-id-check");
    const addItems: Item[] = [];

    buildNameBubble(image, 150, "Name", defaultSceneSettings, addItems);

    const ids = addItems.map((i: any) => i.id);
    expect(ids).toContain("tok-id-check-tfe-name-bg");
    expect(ids).toContain("tok-id-check-tfe-name-text");
  });

  it("applies textScale to name bubble font size", () => {
    const image = createMockImage();

    const addItemsM: Item[] = [];
    buildNameBubble(image, 150, "Name", { ...defaultSceneSettings, textScale: 1.0 }, addItemsM);
    const textM = addItemsM.find((i: any) => i.type === "TEXT") as any;

    const addItemsL: Item[] = [];
    buildNameBubble(image, 150, "Name", { ...defaultSceneSettings, textScale: 1.5 }, addItemsL);
    const textL = addItemsL.find((i: any) => i.type === "TEXT") as any;

    expect(textL.fontSize).toBeGreaterThan(textM.fontSize);
  });

  it("name bubble PATH stroke color matches parchment color", () => {
    const image = createMockImage();
    const addItems: Item[] = [];

    buildNameBubble(image, 150, "Hero", defaultSceneSettings, addItems);

    const path = addItems.find((i: any) => i.type === "PATH") as any;
    expect(path.strokeColor).toBe("#e8d8a0");
  });
});

// ─── Defensive scaling limits (shared across builders) ───────────────────────

describe("defensive scaling limits", () => {
  it("strain boxes: scale 0.1 clamps to 0.5 → box width 7", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 0.1 }, addItems);

    const bg = addItems.find((i: any) => i.type === "SHAPE") as any;
    expect(bg.width).toBe(7);
  });

  it("strain boxes: scale 5.0 clamps to 2.0 → box width 28", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildStrainItems(image, 150, data, { ...defaultSceneSettings, markerScale: 5.0 }, addItems);

    const bg = addItems.find((i: any) => i.type === "SHAPE") as any;
    expect(bg.width).toBe(28);
  });

  it("injury circles: scale 0.1 clamps to 0.5 → circle size 8", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, markerScale: 0.1, injuryDisplay: "all" }, addItems);

    const bg = addItems.find((i: any) => i.type === "SHAPE") as any;
    expect(bg.width).toBe(16 * 0.5); // 8
  });

  it("injury circles: scale 5.0 clamps to 2.0 → circle size 32", () => {
    const image = createMockImage();
    const data = createSurvivorData();
    const addItems: Item[] = [];

    buildInjuryItems(image, 150, data, { ...defaultSceneSettings, markerScale: 5.0, injuryDisplay: "all" }, addItems);

    const bg = addItems.find((i: any) => i.type === "SHAPE") as any;
    expect(bg.width).toBe(16 * 2.0); // 32
  });
});
