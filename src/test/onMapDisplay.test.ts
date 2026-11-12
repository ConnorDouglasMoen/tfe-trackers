// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import OBR, { Image, Item } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import {
  createDefaultTokenRecord,
  DEFAULT_DISPLAY_SETTINGS,
  TOKEN_RECORD_METADATA_ID,
  SCENE_DISPLAY_METADATA_ID,
} from "../characterDataHelpers";

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
  const cleanup = initOnMapDisplay();

  await vi.waitFor(() => {
    expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
  });

  cleanup();
}

/** Initializes a fresh module instance and returns its item and metadata callbacks. */
async function initAndCaptureListeners(image: Image, sceneSettings = DEFAULT_DISPLAY_SETTINGS) {
  vi.resetModules();
  vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
  vi.mocked(OBR.scene.getMetadata).mockResolvedValue({
    [getPluginId(SCENE_DISPLAY_METADATA_ID)]: sceneSettings,
  });
  vi.mocked(OBR.scene.grid.getDpi).mockResolvedValue(150);
  vi.mocked(OBR.scene.items.getItems).mockResolvedValue([image]);

  const { initOnMapDisplay } = await import("../background/onMapDisplay");
  const cleanup = initOnMapDisplay();

  // Wait for the first redraw, after which the item listener is registered.
  await vi.waitFor(() => {
    expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
  });

  // Cancel the font-refresh timer so it can't fire into later tests. The
  // captured callbacks below still work after cleanup.
  cleanup();

  const itemsOnChangeCalls = vi.mocked(OBR.scene.items.onChange).mock.calls;
  const onItemsChange = itemsOnChangeCalls[itemsOnChangeCalls.length - 1][0] as (items: Item[]) => void;

  const metaCalls = vi.mocked(OBR.scene.onMetadataChange).mock.calls;
  const onMetaChange = metaCalls[metaCalls.length - 1][0] as (meta: Record<string, unknown>) => void;

  return { onItemsChange, onMetaChange };
}

/**
 * Initializes a fresh module instance and returns its onReadyChange callback.
 * Unlike initAndCaptureListeners, this leaves the listeners in place; call
 * the returned cleanup when done.
 */
async function initAndCaptureReadyListener(image: Image) {
  vi.resetModules();
  vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
  vi.mocked(OBR.scene.getMetadata).mockResolvedValue({});
  vi.mocked(OBR.scene.grid.getDpi).mockResolvedValue(150);
  vi.mocked(OBR.scene.items.getItems).mockResolvedValue([image]);

  const { initOnMapDisplay } = await import("../background/onMapDisplay");
  const cleanup = initOnMapDisplay();

  await vi.waitFor(() => {
    expect(OBR.scene.items.onChange).toHaveBeenCalled();
  });

  const readyCalls = vi.mocked(OBR.scene.onReadyChange).mock.calls;
  expect(readyCalls).toHaveLength(1);
  const onReadyChange = readyCalls[0][0] as (ready: boolean) => void;

  return { onReadyChange, cleanup };
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

      await new Promise((r) => setTimeout(r, 200));
      expect(OBR.scene.local.deleteItems).not.toHaveBeenCalled();
      expect(OBR.scene.local.addItems).not.toHaveBeenCalled();
    });

    it("triggers redraw when items.onChange contains a TFE-relevant token", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onItemsChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      const movedImage = { ...image, position: { x: 99, y: 99 } } as Image;
      onItemsChange([movedImage as unknown as Item]);

      await vi.waitFor(() => {
        expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
      });
    });

    it("debounces rapid items.onChange calls into a single redraw", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onItemsChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      vi.useFakeTimers();
      try {
        // Moved, so it differs from the snapshot taken by the initial redraw.
        const movedImage = { ...image, position: { x: 50, y: 50 } } as Image;

        for (let i = 0; i < 5; i++) onItemsChange([movedImage as unknown as Item]);

        await vi.advanceTimersByTimeAsync(200);

        expect(OBR.scene.local.deleteItems).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("does not redraw when scene metadata changes but DisplaySettings are identical", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onMetaChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

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

    it("redraws when settings loaded on scene open are changed back to the defaults", async () => {
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: createDefaultTokenRecord(),
      });
      const { onMetaChange } = await initAndCaptureListeners(image, {
        ...DEFAULT_DISPLAY_SETTINGS,
        markerScale: 2,
      });

      vi.mocked(OBR.scene.local.deleteItems).mockClear();

      onMetaChange({
        [getPluginId(SCENE_DISPLAY_METADATA_ID)]: { ...DEFAULT_DISPLAY_SETTINGS },
      });

      await vi.waitFor(() => {
        expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
      });
    });
  });

  describe("generation-counter abort", () => {
    it("aborts a stale full redraw when a newer one starts before the first await resolves", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });

      vi.resetModules();
      vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
      vi.mocked(OBR.scene.getMetadata).mockResolvedValue({
        [getPluginId(SCENE_DISPLAY_METADATA_ID)]: DEFAULT_DISPLAY_SETTINGS,
      });
      vi.mocked(OBR.scene.items.getItems).mockResolvedValue([image]);

      // Stall the first refresh at getDpi so a second refresh starts first.
      let resolveDpi!: (dpi: number) => void;
      const hangingDpi = new Promise<number>((res) => { resolveDpi = res; });
      vi.mocked(OBR.scene.grid.getDpi)
        .mockReturnValueOnce(hangingDpi)           // first redraw hangs
        .mockResolvedValue(150);                    // subsequent calls resolve normally

      const { initOnMapDisplay } = await import("../background/onMapDisplay");
      const cleanup = initOnMapDisplay();

      await new Promise((r) => setTimeout(r, 0));

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      const outerHandler = vi.mocked(OBR.scene.onReadyChange).mock.calls[0][0] as
        (ready: boolean) => void | Promise<void>;
      void outerHandler(true);

      await vi.waitFor(() => {
        expect(OBR.scene.local.deleteItems).toHaveBeenCalledTimes(1);
      });

      resolveDpi(150);
      await new Promise((r) => setTimeout(r, 50));

      // The stale first refresh must not draw.
      expect(OBR.scene.local.deleteItems).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });

  describe("scene ready lifecycle", () => {
    it("does not subscribe to item changes twice when the scene becomes ready again", async () => {
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: createDefaultTokenRecord(),
      });
      const { onReadyChange, cleanup } = await initAndCaptureReadyListener(image);
      const subscribeCount = vi.mocked(OBR.scene.items.onChange).mock.calls.length;

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      onReadyChange(true);
      await vi.waitFor(() => {
        expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
      });

      expect(vi.mocked(OBR.scene.items.onChange).mock.calls.length).toBe(subscribeCount);
      expect(vi.mocked(OBR.scene.onReadyChange).mock.calls).toHaveLength(1);
      cleanup();
    });

    it("unsubscribes from item changes when the scene closes and resubscribes when it reopens", async () => {
      const unsubscribe = vi.fn();
      vi.mocked(OBR.scene.items.onChange).mockReturnValue(unsubscribe);
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: createDefaultTokenRecord(),
      });
      const { onReadyChange, cleanup } = await initAndCaptureReadyListener(image);

      onReadyChange(false);
      expect(unsubscribe).toHaveBeenCalledTimes(1);

      vi.mocked(OBR.scene.items.onChange).mockClear();
      vi.mocked(OBR.scene.items.onChange).mockReturnValue(vi.fn());
      onReadyChange(true);
      await vi.waitFor(() => {
        expect(OBR.scene.items.onChange).toHaveBeenCalledTimes(1);
      });
      cleanup();
    });
  });
});
