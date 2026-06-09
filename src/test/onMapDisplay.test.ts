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
  const cleanup = initOnMapDisplay();

  await vi.waitFor(() => {
    expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
  });

  cleanup();
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
  const cleanup = initOnMapDisplay();

  // Wait for initial refresh so startListeners() has been called and the
  // items.onChange / onMetadataChange callbacks are registered.
  await vi.waitFor(() => {
    expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
  });

  // Cancel the EXTRA_REFRESH_DELAY timer so it doesn't fire during subsequent
  // tests and call into the shared mocks after this module instance is stale.
  cleanup();

  // The last call to items.onChange is the one registered by startListeners().
  const itemsOnChangeCalls = vi.mocked(OBR.scene.items.onChange).mock.calls;
  const onItemsChange = itemsOnChangeCalls[itemsOnChangeCalls.length - 1][0] as (items: Item[]) => void;

  // onMetadataChange is called once during initOnMapDisplay setup.
  const metaCalls = vi.mocked(OBR.scene.onMetadataChange).mock.calls;
  const onMetaChange = metaCalls[metaCalls.length - 1][0] as (meta: Record<string, unknown>) => void;

  return { onItemsChange, onMetaChange };
}

/**
 * Helper: captures the onReadyChange callbacks registered during init.
 * Returns both the top-level one (registered before any await) and the
 * inner one registered by startListeners(), plus the items.onChange
 * callback and metadata.onChange callback.
 *
 * This version waits for the initial refresh then reads all registrations
 * so tests can invoke each callback directly.
 */
async function initAndCaptureAllListeners(image: Image, sceneSettings = DEFAULT_DISPLAY_SETTINGS) {
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

  // onReadyChange is called twice: once in initOnMapDisplay (top-level),
  // once in startListeners(). We want both.
  const readyChangeCalls = vi.mocked(OBR.scene.onReadyChange).mock.calls;
  // First registration: top-level async handler
  const onReadyChangeOuter = readyChangeCalls[0][0] as (ready: boolean) => void;
  // Second registration (if present): startListeners() inner handler
  const onReadyChangeInner = readyChangeCalls.length > 1
    ? (readyChangeCalls[1][0] as (ready: boolean) => void)
    : null;

  const itemsOnChangeCalls = vi.mocked(OBR.scene.items.onChange).mock.calls;
  const onItemsChange = itemsOnChangeCalls[itemsOnChangeCalls.length - 1][0] as (items: Item[]) => void;

  const metaCalls = vi.mocked(OBR.scene.onMetadataChange).mock.calls;
  const onMetaChange = metaCalls[metaCalls.length - 1][0] as (meta: Record<string, unknown>) => void;

  return { onReadyChangeOuter, onReadyChangeInner, onItemsChange, onMetaChange };
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

    it("triggers redraw when items.onChange contains a TFE-relevant token", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });
      const { onItemsChange } = await initAndCaptureListeners(image);

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      // A moved token is TFE-relevant (has metadata) and differs from itemsLast,
      // so hasTfeRelevantItems passes and getChangedItems finds a real change.
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
        // Use a moved image so getChangedItems detects a change (itemsLast was
        // populated by the initial refreshAll — an identical image would be a no-op).
        const movedImage = { ...image, position: { x: 50, y: 50 } } as Image;

        // Fire 5 rapid onChange events before the debounce window expires.
        for (let i = 0; i < 5; i++) onItemsChange([movedImage as unknown as Item]);

        // Advance only past the debounce delay (150ms). EXTRA_REFRESH_DELAY was
        // already cancelled by initAndCaptureListeners cleanup, so no stale
        // timers exist to accidentally flush.
        await vi.advanceTimersByTimeAsync(200);

        // Only one deleteItems call should have been made despite 5 firings.
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

  // ─── generation-counter abort ───────────────────────────────────────────────
  describe("generation-counter abort", () => {
    it("aborts a stale refreshAll when a newer one starts before the first await resolves", async () => {
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

      // Make the first getDpi call hang indefinitely so the first refreshAll
      // pauses at its first await, giving the second call time to increment
      // refreshGeneration before the first resumes.
      let resolveDpi!: (dpi: number) => void;
      const hangingDpi = new Promise<number>((res) => { resolveDpi = res; });
      vi.mocked(OBR.scene.grid.getDpi)
        .mockReturnValueOnce(hangingDpi)           // first refreshAll hangs
        .mockResolvedValue(150);                    // subsequent calls resolve normally

      const { initOnMapDisplay } = await import("../background/onMapDisplay");
      const cleanup = initOnMapDisplay();

      // Allow the first refreshAll to start and stall at getDpi.
      await new Promise((r) => setTimeout(r, 0));

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();

      // Trigger a second refreshAll by firing onReadyChange(true) via the
      // outer handler, which also calls getMetadata + refreshAll synchronously.
      // Capture the outer handler from the first registration.
      const outerHandler = vi.mocked(OBR.scene.onReadyChange).mock.calls[0][0] as
        (ready: boolean) => void | Promise<void>;
      void outerHandler(true);

      // Let the second refreshAll complete (getDpi returns 150 now).
      await vi.waitFor(() => {
        expect(OBR.scene.local.deleteItems).toHaveBeenCalledTimes(1);
      });

      // Now let the first stalled refreshAll resume — it should find
      // generation !== refreshGeneration and return without calling deleteItems again.
      resolveDpi(150);
      await new Promise((r) => setTimeout(r, 50));

      // deleteItems should still be exactly 1 — the stale run was aborted.
      expect(OBR.scene.local.deleteItems).toHaveBeenCalledTimes(1);

      cleanup();
    });
  });

  // ─── sceneListenersSet guard ─────────────────────────────────────────────────
  describe("sceneListenersSet guard", () => {
    it("does not double-subscribe items.onChange when startListeners is called twice", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });

      const { onReadyChangeOuter } = await initAndCaptureAllListeners(image);

      // Record how many times items.onChange has been subscribed after initial setup.
      const subscribeCountBefore = vi.mocked(OBR.scene.items.onChange).mock.calls.length;

      // Fire onReadyChange(true) again — startListeners() should guard with
      // sceneListenersSet and NOT register a second items.onChange subscription.
      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.local.addItems).mockClear();
      void onReadyChangeOuter(true);

      await vi.waitFor(() => {
        expect(OBR.scene.local.deleteItems).toHaveBeenCalled();
      });

      const subscribeCountAfter = vi.mocked(OBR.scene.items.onChange).mock.calls.length;
      // No new items.onChange subscription should have been added.
      expect(subscribeCountAfter).toBe(subscribeCountBefore);
    });
  });

  // ─── onReadyChange → not-ready teardown ─────────────────────────────────────
  describe("onReadyChange → not-ready teardown", () => {
    it("unsubscribes the items listener and resets sceneListenersSet when scene goes not-ready", async () => {
      const record = createDefaultTokenRecord();
      const image = createMockImage({
        [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
      });

      // Provide a spy unsubscribe function so we can assert it was called.
      const unsubSpy = vi.fn();
      vi.mocked(OBR.scene.items.onChange).mockReturnValue(unsubSpy);

      const { onReadyChangeInner } = await initAndCaptureAllListeners(image);

      expect(onReadyChangeInner).not.toBeNull();

      vi.mocked(OBR.scene.local.deleteItems).mockClear();
      vi.mocked(OBR.scene.items.onChange).mockClear();

      // Fire the inner onReadyChange(false) to simulate scene going not-ready.
      onReadyChangeInner!(false);

      // The items.onChange unsubscribe function should have been called.
      expect(unsubSpy).toHaveBeenCalledTimes(1);

      // sceneListenersSet is reset, so a subsequent startListeners() call
      // (triggered by a new onReadyChange(true)) re-subscribes items.onChange.
      vi.mocked(OBR.scene.items.onChange).mockReturnValue(vi.fn());
      vi.mocked(OBR.scene.local.deleteItems).mockClear();

      // Trigger re-init via the inner handler going true again.
      void onReadyChangeInner!(true);

      await vi.waitFor(() => {
        expect(OBR.scene.items.onChange).toHaveBeenCalled();
      });
    });
  });
});
