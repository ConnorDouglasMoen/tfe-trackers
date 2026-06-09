// @vitest-environment jsdom
/**
 * Tests for useOwlbearStoreSync.
 *
 * The hook mounts once per entry-point app and keeps the Zustand
 * OwlbearStore in sync with live OBR SDK events. Covers:
 *
 *  1. Scene ready / not-ready lifecycle:
 *       - sceneReady flips to true when OBR.scene.isReady() resolves true.
 *       - sceneReady flips to true when onReadyChange fires with true.
 *       - sceneReady flips to false when onReadyChange fires with false.
 *
 *  2. Items subscription lifecycle:
 *       - getItems() is called on mount when sceneReady is true.
 *       - items are set from the resolved getItems() value.
 *       - onChange subscription is registered when sceneReady is true.
 *       - items are cleared to [] when sceneReady becomes false.
 *       - onChange unsubscribe is called when sceneReady becomes false.
 *
 *  3. Stale-promise guard (item 1 regression):
 *       - If getItems() resolves after sceneReady has gone false, the
 *         resolved value must NOT overwrite the [] that was already set.
 *
 *  4. Player sync: role and selection are loaded and updated via onChange.
 *
 *  5. Theme sync: themeMode is loaded and updated via onChange.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { useOwlbearStoreSync } from "../useOwlbearStoreSync";
import { useOwlbearStore } from "../useOwlbearStore";

// ─── Store reset ──────────────────────────────────────────────────────────────

function resetStore() {
  useOwlbearStore.setState({
    sceneReady: false,
    items: [],
    role: "PLAYER",
    selection: undefined,
    themeMode: "LIGHT",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(id: string): Item {
  return {
    id,
    type: "IMAGE",
    layer: "CHARACTER",
    visible: true,
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    metadata: {},
  } as unknown as Item;
}

// ─── Scene ready / not-ready lifecycle ───────────────────────────────────────

describe("scene ready / not-ready lifecycle", () => {
  it("sets sceneReady=true when OBR.scene.isReady() resolves true on mount", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().sceneReady).toBe(true);
    });

    unmount();
  });

  it("leaves sceneReady=false when OBR.scene.isReady() resolves false", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(false);

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    expect(useOwlbearStore.getState().sceneReady).toBe(false);

    unmount();
  });

  it("sets sceneReady=true when onReadyChange fires with true", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(false);

    let capturedReadyChange: ((ready: boolean) => void) | undefined;
    vi.mocked(OBR.scene.onReadyChange).mockImplementation((cb) => {
      capturedReadyChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await new Promise((r) => setTimeout(r, 0));
    expect(capturedReadyChange).toBeDefined();

    await act(async () => {
      capturedReadyChange!(true);
    });

    expect(useOwlbearStore.getState().sceneReady).toBe(true);
    unmount();
  });

  it("sets sceneReady=false when onReadyChange fires with false", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);

    let capturedReadyChange: ((ready: boolean) => void) | undefined;
    vi.mocked(OBR.scene.onReadyChange).mockImplementation((cb) => {
      capturedReadyChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().sceneReady).toBe(true);
    });

    await act(async () => {
      capturedReadyChange!(false);
    });

    expect(useOwlbearStore.getState().sceneReady).toBe(false);
    unmount();
  });
});

// ─── Items subscription lifecycle ─────────────────────────────────────────────

describe("items subscription lifecycle", () => {
  it("calls getItems() when sceneReady is true and sets items in the store", async () => {
    const item = makeItem("item-1");
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([item]);

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().items).toHaveLength(1);
    });

    expect(useOwlbearStore.getState().items[0].id).toBe("item-1");
    unmount();
  });

  it("registers an items.onChange subscription when scene is ready", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(OBR.scene.items.onChange).toHaveBeenCalled();
    });

    unmount();
  });

  it("items.onChange callback updates the store", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([]);

    let capturedOnChange: ((items: Item[]) => void) | undefined;
    vi.mocked(OBR.scene.items.onChange).mockImplementation((cb) => {
      capturedOnChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(capturedOnChange).toBeDefined();
    });

    const newItem = makeItem("item-from-event");
    await act(async () => {
      capturedOnChange!([newItem]);
    });

    expect(useOwlbearStore.getState().items[0].id).toBe("item-from-event");
    unmount();
  });

  it("clears items to [] when sceneReady becomes false", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([makeItem("item-1")]);

    let capturedReadyChange: ((ready: boolean) => void) | undefined;
    vi.mocked(OBR.scene.onReadyChange).mockImplementation((cb) => {
      capturedReadyChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().items).toHaveLength(1);
    });

    await act(async () => {
      capturedReadyChange!(false);
    });

    expect(useOwlbearStore.getState().items).toHaveLength(0);
    unmount();
  });

  it("calls the items.onChange unsubscribe function when sceneReady becomes false", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([]);

    const unsubSpy = vi.fn();
    vi.mocked(OBR.scene.items.onChange).mockReturnValue(unsubSpy);

    let capturedReadyChange: ((ready: boolean) => void) | undefined;
    vi.mocked(OBR.scene.onReadyChange).mockImplementation((cb) => {
      capturedReadyChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(OBR.scene.items.onChange).toHaveBeenCalled();
    });

    await act(async () => {
      capturedReadyChange!(false);
    });

    expect(unsubSpy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("does not call getItems() when sceneReady is false on mount", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(false);

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await new Promise((r) => setTimeout(r, 0));
    expect(OBR.scene.items.getItems).not.toHaveBeenCalled();

    unmount();
  });
});

// ─── Stale-promise guard ──────────────────────────────────────────────────────

describe("stale-promise guard (item 1 regression)", () => {
  it("does not overwrite items=[] if getItems resolves after sceneReady goes false", async () => {
    // Set up: scene starts ready, then immediately goes not-ready before
    // the getItems() promise resolves.
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);

    // Make getItems hang until we manually resolve it.
    let resolveItems!: (items: Item[]) => void;
    const hangingItems = new Promise<Item[]>((res) => { resolveItems = res; });
    vi.mocked(OBR.scene.items.getItems).mockReturnValue(hangingItems);

    let capturedReadyChange: ((ready: boolean) => void) | undefined;
    vi.mocked(OBR.scene.onReadyChange).mockImplementation((cb) => {
      capturedReadyChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    // Let the effect run (sceneReady=true triggers the items effect).
    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().sceneReady).toBe(true);
    });

    // Scene goes not-ready before getItems resolves — store should clear.
    await act(async () => {
      capturedReadyChange!(false);
    });
    expect(useOwlbearStore.getState().items).toHaveLength(0);

    // Now resolve the stale getItems promise with data.
    await act(async () => {
      resolveItems([makeItem("stale-item")]);
    });

    // The stale result must NOT have overwritten the [] that was set.
    expect(useOwlbearStore.getState().items).toHaveLength(0);

    unmount();
  });
});

// ─── Player sync ──────────────────────────────────────────────────────────────

describe("player sync", () => {
  it("sets role from OBR.player.getRole() on mount", async () => {
    vi.mocked(OBR.player.getRole).mockResolvedValue("GM");

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().role).toBe("GM");
    });

    unmount();
  });

  it("sets selection from OBR.player.getSelection() on mount", async () => {
    vi.mocked(OBR.player.getSelection).mockResolvedValue(["token-1", "token-2"]);

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().selection).toEqual(["token-1", "token-2"]);
    });

    unmount();
  });

  it("updates role and selection when OBR.player.onChange fires", async () => {
    let capturedPlayerChange: ((player: any) => void) | undefined;
    vi.mocked(OBR.player.onChange).mockImplementation((cb) => {
      capturedPlayerChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(capturedPlayerChange).toBeDefined();
    });

    await act(async () => {
      capturedPlayerChange!({ role: "GM", selection: ["token-x"] });
    });

    expect(useOwlbearStore.getState().role).toBe("GM");
    expect(useOwlbearStore.getState().selection).toEqual(["token-x"]);
    unmount();
  });

  it("registers an OBR.player.onChange subscription on mount", () => {
    renderHook(() => useOwlbearStoreSync());
    expect(OBR.player.onChange).toHaveBeenCalled();
  });
});

// ─── Theme sync ───────────────────────────────────────────────────────────────

describe("theme sync", () => {
  it("sets themeMode from OBR.theme.getTheme() on mount", async () => {
    vi.mocked(OBR.theme.getTheme).mockResolvedValue({ mode: "LIGHT" } as any);

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(useOwlbearStore.getState().themeMode).toBe("LIGHT");
    });

    unmount();
  });

  it("updates themeMode when OBR.theme.onChange fires", async () => {
    let capturedThemeChange: ((theme: any) => void) | undefined;
    vi.mocked(OBR.theme.onChange).mockImplementation((cb) => {
      capturedThemeChange = cb;
      return vi.fn();
    });

    const { unmount } = renderHook(() => useOwlbearStoreSync());

    await vi.waitFor(() => {
      expect(capturedThemeChange).toBeDefined();
    });

    await act(async () => {
      capturedThemeChange!({ mode: "DARK" });
    });

    expect(useOwlbearStore.getState().themeMode).toBe("DARK");
    unmount();
  });

  it("registers an OBR.theme.onChange subscription on mount", () => {
    renderHook(() => useOwlbearStoreSync());
    expect(OBR.theme.onChange).toHaveBeenCalled();
  });
});
