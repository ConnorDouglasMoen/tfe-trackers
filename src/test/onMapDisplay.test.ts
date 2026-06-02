import { beforeEach, describe, expect, it, vi } from "vitest";
import OBR, { Image } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import {
  createDefaultTokenRecord,
  DEFAULT_DISPLAY_SETTINGS,
  TOKEN_RECORD_METADATA_ID,
} from "../characterDataHelpers";
import { SCENE_DISPLAY_METADATA_ID } from "../useSceneDisplayStore";

function createMockImage(metadata: Record<string, unknown>): Image {
  return {
    id: "display-token",
    type: "IMAGE",
    visible: true,
    scale: { x: 1, y: 1 },
    position: { x: 0, y: 0 },
    rotation: 0,
    image: { width: 100, height: 100 },
    grid: { dpi: 150, offset: { x: 0, y: 0 } },
    metadata,
    layer: "CHARACTER",
  } as Image;
}

async function initDisplayWithItem(image: Image, sceneSettings = DEFAULT_DISPLAY_SETTINGS) {
  vi.resetModules();
  vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
  vi.mocked(OBR.scene.getMetadata).mockResolvedValue({
    [getPluginId(SCENE_DISPLAY_METADATA_ID)]: sceneSettings,
  });
  vi.mocked(OBR.scene.grid.getDpi).mockResolvedValue(150);
  vi.mocked(OBR.scene.items.getItems).mockResolvedValue([image]);

  const { initOnMapDisplay } = await import("../background/onMapDisplay");
  initOnMapDisplay();

  await vi.waitFor(() => {
    expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
  });
}

describe("onMapDisplay integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not build injury attachments when injuryDisplay is none", async () => {
    const record = createDefaultTokenRecord();
    record.survivor.seriousInjuries[0] = {
      id: "s0",
      description: "Broken arm",
      complications: [],
      treated: false,
    };

    const image = createMockImage({
      [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
    });

    await initDisplayWithItem(image, {
      ...DEFAULT_DISPLAY_SETTINGS,
      showStrain: false,
      showConditions: false,
      injuryDisplay: "none",
      showName: false,
    });

    expect(OBR.scene.local.addItems).not.toHaveBeenCalled();
  });

  it("does not build condition or complication bubbles when showConditions is false", async () => {
    const record = createDefaultTokenRecord();
    record.survivor.conditions = ["Dazed"];
    record.survivor.seriousInjuries[0] = {
      id: "s0",
      description: "Broken arm",
      complications: ["Numb"],
      treated: false,
    };

    const image = createMockImage({
      [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
    });

    await initDisplayWithItem(image, {
      ...DEFAULT_DISPLAY_SETTINGS,
      showStrain: false,
      showConditions: false,
      injuryDisplay: "none",
      showName: false,
    });

    expect(OBR.scene.local.addItems).not.toHaveBeenCalled();
  });
});
