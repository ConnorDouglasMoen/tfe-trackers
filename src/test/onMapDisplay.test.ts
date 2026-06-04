// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import OBR, { Image, Item } from "@owlbear-rodeo/sdk";
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

/**
 * Sets up a fresh module instance and returns the registered items.onChange
 * and scene.onMetadataChange callbacks so individual tests can invoke them
 * directly without going through OBR's event bus.
 */
async function initAndCaptureListeners(image: Image, sceneSettings = DEFAULT_DISPLAY_SETTINGS) {
  vi.resetModules();
  vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
  vi.mocked(OBR.scene.getMetadata).mockResolvedValue({
    [getPluginId(SCENE_DISPLAY_METADATA_ID)]: sceneSettings,
  });
  vi.mocked(OBR.scene.grid.getDpi).mockResolvedValue(150);
  vi.mocked(OBR.scene.items.getItems).mockResolvedValue([image]);

  const { initOnMapDisplay } = await import("../background/onMapDisplay");
  initOnMapDisplay();

  // Wait for initial refresh so startListeners() has been called and the
  // items.onChange / onMetadataChange callbacks are registered.
  await vi.waitFor(() => {
    expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
  });

  // The last call to items.onChange is the one registered by startListeners().
  const itemsOnChangeCalls = vi.mocked(OBR.scene.items.onChange).mock.calls;
  const onItemsChange = itemsOnChangeCalls[itemsOnChangeCalls.length - 1][0] as (items: Item[]) => void;

  // onMetadataChange is called once during initOnMapDisplay setup.
  const metaCalls = vi.mocked(OBR.scene.onMetadataChange).mock.calls;
  const onMetaChange = metaCalls[metaCalls.length - 1][0] as (meta: Record<string, unknown>) => void;

  return { onItemsChange, onMetaChange };
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

  describe("performance guardrails", () => {
    it("skips redraw when items.onChange contains no TFE-relevant items", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onItemsChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      // Fire onChange with a completely unrelated item (no TFE metadata, no -tfe- ID).
      const unrelatedItem = {
        id: "some-prop-item",
        type: "IMAGE",
        layer: "PROP",
        visible: true,
        scale: { x: 1, y: 1 },
        position: { x: 0, y: 0 },
        metadata: {},
      } as unknown as Item;
      onItemsChange([unrelatedItem]);

      // No async work should have been scheduled — deleteItems and addItems untouched.
      await new Promise((r) => setTimeout(r, 200));
      expect(OBR.scene.local.deleteItems).not.toHaveBeenCalled();
      expect(OBR.scene.local.addItems).not.toHaveBeenCalled();
    });

    it("triggers redraw when items.onChange contains a TFE attachment ID", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onItemsChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      // An item whose ID contains "-tfe-" is a TFE local attachment and should
      // count as TFE-relevant even though it carries no token metadata.
      const tfeAttachment = {
        id: "display-token-tfe-strain-bg-0",
        type: "SHAPE",
        layer: "ATTACHMENT",
        visible: true,
        scale: { x: 1, y: 1 },
        position: { x: 0, y: 0 },
        metadata: {},
      } as unknown as Item;
      // Include the original image so getChangedItems finds it unchanged (no-op
      // add/delete), but the relevance filter must still pass.
      onItemsChange([image as unknown as Item, tfeAttachment]);

      await vi.waitFor(() => {
        // deleteItems is always called (to sweep stale attachments) once a
        // TFE-relevant item triggers the debounced handler.
        expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
      });
    });

    it("debounces rapid items.onChange calls into a single redraw", async () => {
      vi.useFakeTimers();
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onItemsChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      // Fire 5 rapid onChange events before the debounce window expires.
      for (let i = 0; i < 5; i++) onItemsChange([image as unknown as Item]);

      // Advance past the debounce delay to flush the single scheduled handler.
      await vi.runAllTimersAsync();
      vi.useRealTimers();

      // Only one deleteItems call should have been made despite 5 firings.
      expect(OBR.scene.local.deleteItems).toHaveBeenCalledTimes(1);
    });

    it("does not redraw when scene metadata changes but DisplaySettings are identical", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onMetaChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      // Fire onMetadataChange with the exact same DisplaySettings that were
      // used during init — should be a no-op.
      onMetaChange({
        [getPluginId(SCENE_DISPLAY_METADATA_ID)]: { ...DEFAULT_DISPLAY_SETTINGS },
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(OBR.scene.local.deleteItems).not.toHaveBeenCalled();
    });

    it("redraws when scene metadata changes with new DisplaySettings", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onMetaChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      // Fire onMetadataChange with a genuinely changed setting.
      onMetaChange({
        [getPluginId(SCENE_DISPLAY_METADATA_ID)]: {
          ...DEFAULT_DISPLAY_SETTINGS,
          showStrain: !DEFAULT_DISPLAY_SETTINGS.showStrain,
        },
      });

      await vi.waitFor(() => {
        expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
      });
    });
  });
});
