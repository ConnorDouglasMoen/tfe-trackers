// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import OBR, { Item } from "@owlbear-rodeo/sdk";
import { useOwlbearStoreSync } from "../useOwlbearStoreSync";
import { useOwlbearStore } from "../useOwlbearStore";

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

describe("stale-promise guard (item 1 regression)", () => {
  it("does not overwrite items=[] if getItems resolves after sceneReady goes false", async () => {
    vi.mocked(OBR.scene.isReady).mockResolvedValue(true);

    let resolveItems!: (items: Item[]) => void;
    const hangingItems = new Promise<Item[]>((res) => { resolveItems = res; });
    vi.mocked(OBR.scene.items.getItems).mockReturnValue(hangingItems);

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
    expect(useOwlbearStore.getState().items).toHaveLength(0);

    await act(async () => {
      resolveItems([makeItem("stale-item")]);
    });

    // The late result must not overwrite the cleared list.
    expect(useOwlbearStore.getState().items).toHaveLength(0);

    unmount();
  });
});

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
