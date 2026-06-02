// @vitest-environment jsdom
/**
 * Tests for useSceneDisplayStore.
 *
 * Covers:
 *  - Initial state matches DEFAULT_DISPLAY_SETTINGS.
 *  - setSettings patches individual fields and writes to OBR scene metadata.
 *  - init() reads current scene metadata and applies defaults for missing fields.
 *  - init() wires OBR.scene.onMetadataChange to keep settings reactive.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import OBR from "@owlbear-rodeo/sdk";
import { useSceneDisplayStore, SCENE_DISPLAY_METADATA_ID } from "../useSceneDisplayStore";
import { DEFAULT_DISPLAY_SETTINGS } from "../characterDataHelpers";
import { getPluginId } from "../getPluginId";

/** Reset store to default state before each test. */
function resetStore() {
  useSceneDisplayStore.setState({ settings: { ...DEFAULT_DISPLAY_SETTINGS } });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

// ─── Initial state ─────────────────────────────────────────────────────────────

describe("initial state", () => {
  it("matches DEFAULT_DISPLAY_SETTINGS", () => {
    const state = useSceneDisplayStore.getState();
    expect(state.settings).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });
});

// ─── setSettings ───────────────────────────────────────────────────────────────

describe("setSettings", () => {
  it("patches a single boolean field", () => {
    useSceneDisplayStore.getState().setSettings({ showStrain: false });
    expect(useSceneDisplayStore.getState().settings.showStrain).toBe(false);
  });

  it("patches injuryDisplay to each valid value", () => {
    useSceneDisplayStore.getState().setSettings({ injuryDisplay: "filled-only" });
    expect(useSceneDisplayStore.getState().settings.injuryDisplay).toBe("filled-only");

    useSceneDisplayStore.getState().setSettings({ injuryDisplay: "none" });
    expect(useSceneDisplayStore.getState().settings.injuryDisplay).toBe("none");

    useSceneDisplayStore.getState().setSettings({ injuryDisplay: "all" });
    expect(useSceneDisplayStore.getState().settings.injuryDisplay).toBe("all");
  });

  it("patches markerScale", () => {
    useSceneDisplayStore.getState().setSettings({ markerScale: 1.25 });
    expect(useSceneDisplayStore.getState().settings.markerScale).toBe(1.25);
  });

  it("patches textScale", () => {
    useSceneDisplayStore.getState().setSettings({ textScale: 0.75 });
    expect(useSceneDisplayStore.getState().settings.textScale).toBe(0.75);
  });

  it("patches multiple fields in one call", () => {
    useSceneDisplayStore.getState().setSettings({
      showStrain: false,
      showConditions: false,
      markerScale: 1.5,
    });

    const s = useSceneDisplayStore.getState().settings;
    expect(s.showStrain).toBe(false);
    expect(s.showConditions).toBe(false);
    expect(s.markerScale).toBe(1.5);
  });

  it("does not affect unpatched fields", () => {
    useSceneDisplayStore.getState().setSettings({ showStrain: false });

    const s = useSceneDisplayStore.getState().settings;
    expect(s.showConditions).toBe(DEFAULT_DISPLAY_SETTINGS.showConditions);
    expect(s.injuryDisplay).toBe(DEFAULT_DISPLAY_SETTINGS.injuryDisplay);
    expect(s.showName).toBe(DEFAULT_DISPLAY_SETTINGS.showName);
    expect(s.markerScale).toBe(DEFAULT_DISPLAY_SETTINGS.markerScale);
    expect(s.textScale).toBe(DEFAULT_DISPLAY_SETTINGS.textScale);
  });

  it("writes updated settings to OBR scene metadata", () => {
    useSceneDisplayStore.getState().setSettings({ showStrain: false });

    expect(OBR.scene.setMetadata).toHaveBeenCalledOnce();
    const calledWith = vi.mocked(OBR.scene.setMetadata).mock.calls[0][0];
    const written = calledWith[getPluginId(SCENE_DISPLAY_METADATA_ID)] as any;
    expect(written.showStrain).toBe(false);
  });

  it("each setSettings call writes to OBR scene metadata", () => {
    useSceneDisplayStore.getState().setSettings({ showStrain: false });
    useSceneDisplayStore.getState().setSettings({ markerScale: 1.5 });

    expect(OBR.scene.setMetadata).toHaveBeenCalledTimes(2);
  });
});

// ─── init() ────────────────────────────────────────────────────────────────────

describe("init", () => {
  it("reads current scene metadata on init and applies it", async () => {
    const mockSettings = {
      showStrain: false,
      showConditions: false,
      injuryDisplay: "filled-only",
      showName: false,
      markerScale: 1.25,
      textScale: 0.75,
    };

    vi.mocked(OBR.scene.getMetadata).mockResolvedValue({
      [getPluginId(SCENE_DISPLAY_METADATA_ID)]: mockSettings,
    });

    useSceneDisplayStore.getState().init();

    // Allow the promise to resolve
    await vi.waitFor(() => {
      const s = useSceneDisplayStore.getState().settings;
      expect(s.showStrain).toBe(false);
    });

    const s = useSceneDisplayStore.getState().settings;
    expect(s.showConditions).toBe(false);
    expect(s.injuryDisplay).toBe("filled-only");
    expect(s.markerScale).toBe(1.25);
    expect(s.textScale).toBe(0.75);
  });

  it("merges defaults for missing fields in scene metadata", async () => {
    // Metadata only specifies showStrain=false; other fields should fall back
    // to DEFAULT_DISPLAY_SETTINGS.
    vi.mocked(OBR.scene.getMetadata).mockResolvedValue({
      [getPluginId(SCENE_DISPLAY_METADATA_ID)]: { showStrain: false },
    });

    useSceneDisplayStore.getState().init();

    await vi.waitFor(() => {
      expect(useSceneDisplayStore.getState().settings.showStrain).toBe(false);
    });

    const s = useSceneDisplayStore.getState().settings;
    expect(s.showConditions).toBe(DEFAULT_DISPLAY_SETTINGS.showConditions);
    expect(s.injuryDisplay).toBe(DEFAULT_DISPLAY_SETTINGS.injuryDisplay);
    expect(s.markerScale).toBe(DEFAULT_DISPLAY_SETTINGS.markerScale);
  });

  it("does not update state if scene metadata key is absent", async () => {
    vi.mocked(OBR.scene.getMetadata).mockResolvedValue({});

    useSceneDisplayStore.getState().init();

    await new Promise((r) => setTimeout(r, 0)); // flush microtasks

    // State unchanged from defaults
    expect(useSceneDisplayStore.getState().settings).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it("does not update state if metadata value is null", async () => {
    vi.mocked(OBR.scene.getMetadata).mockResolvedValue({
      [getPluginId(SCENE_DISPLAY_METADATA_ID)]: null,
    });

    useSceneDisplayStore.getState().init();

    await new Promise((r) => setTimeout(r, 0));

    expect(useSceneDisplayStore.getState().settings).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it("registers an OBR.scene.onMetadataChange listener", () => {
    useSceneDisplayStore.getState().init();
    expect(OBR.scene.onMetadataChange).toHaveBeenCalledOnce();
  });

  it("onMetadataChange callback applies new settings", () => {
    let capturedCallback: ((meta: any) => void) | undefined;

    vi.mocked(OBR.scene.onMetadataChange).mockImplementation((cb) => {
      capturedCallback = cb;
      return () => {};
    });

    useSceneDisplayStore.getState().init();

    expect(capturedCallback).toBeDefined();

    // Simulate a metadata change event from another participant
    capturedCallback!({
      [getPluginId(SCENE_DISPLAY_METADATA_ID)]: {
        ...DEFAULT_DISPLAY_SETTINGS,
        showStrain: false,
        markerScale: 1.5,
      },
    });

    const s = useSceneDisplayStore.getState().settings;
    expect(s.showStrain).toBe(false);
    expect(s.markerScale).toBe(1.5);
  });

  it("onMetadataChange ignores updates with absent or null metadata key", () => {
    let capturedCallback: ((meta: any) => void) | undefined;

    vi.mocked(OBR.scene.onMetadataChange).mockImplementation((cb) => {
      capturedCallback = cb;
      return () => {};
    });

    // Set a known non-default state first
    useSceneDisplayStore.setState({
      settings: { ...DEFAULT_DISPLAY_SETTINGS, showStrain: false },
    });

    useSceneDisplayStore.getState().init();

    capturedCallback!({});  // no display settings key

    // State should be unchanged from what we set
    expect(useSceneDisplayStore.getState().settings.showStrain).toBe(false);
  });
});
