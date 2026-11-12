// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import OBR from "@owlbear-rodeo/sdk";
import { useTrackedTokensStore } from "../useTrackedTokensStore";
import { getPluginId } from "../getPluginId";

const STORAGE_KEY = getPluginId("trackedTokenIds");

function resetStore() {
  useTrackedTokensStore.setState({ trackedTokenIds: [] });
}

/** Write IDs the way another frame or an earlier session would have. */
function seedStorage(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function readStorage(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw !== null ? (JSON.parse(raw) as string[]) : [];
}

beforeEach(() => {
  resetStore();
});

describe("persistence across page refresh", () => {
  it("init() loads IDs that were saved in a previous session", () => {
    seedStorage(["token-1", "token-2"]);

    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([
      "token-1",
      "token-2",
    ]);

    cleanup();
  });

  it("init() with empty localStorage starts with an empty list", () => {
    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([]);

    cleanup();
  });

  it("init() is synchronous — state is set before any await", () => {
    // The list must be available as soon as init() returns, with no async gap.
    seedStorage(["token-abc"]);

    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(useTrackedTokensStore.getState().trackedTokenIds).toContain("token-abc");

    cleanup();
  });
});

describe("trackToken", () => {
  it("adds an ID to the store and localStorage", () => {
    const { init, trackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    trackToken("token-1");

    expect(useTrackedTokensStore.getState().trackedTokenIds).toContain("token-1");
    expect(readStorage()).toContain("token-1");

    cleanup();
  });

  it("does not add a duplicate ID", () => {
    const { init, trackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    trackToken("token-1");
    trackToken("token-1");

    const ids = useTrackedTokensStore.getState().trackedTokenIds;
    expect(ids.filter((id) => id === "token-1")).toHaveLength(1);
    expect(readStorage().filter((id) => id === "token-1")).toHaveLength(1);

    cleanup();
  });

  it("preserves existing IDs when adding a new one", () => {
    seedStorage(["token-existing"]);
    const { init, trackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    trackToken("token-new");

    const ids = useTrackedTokensStore.getState().trackedTokenIds;
    expect(ids).toContain("token-existing");
    expect(ids).toContain("token-new");

    cleanup();
  });
});

describe("untrackToken", () => {
  it("removes an ID from the store and localStorage", () => {
    seedStorage(["token-1", "token-2"]);
    const { init, untrackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    untrackToken("token-1");

    expect(useTrackedTokensStore.getState().trackedTokenIds).not.toContain("token-1");
    expect(readStorage()).not.toContain("token-1");

    cleanup();
  });

  it("leaves other IDs intact", () => {
    seedStorage(["token-1", "token-2", "token-3"]);
    const { init, untrackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    untrackToken("token-2");

    const ids = useTrackedTokensStore.getState().trackedTokenIds;
    expect(ids).toContain("token-1");
    expect(ids).not.toContain("token-2");
    expect(ids).toContain("token-3");

    cleanup();
  });

  it("is a no-op if the ID is not present", () => {
    seedStorage(["token-1"]);
    const { init, untrackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    untrackToken("token-does-not-exist");

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual(["token-1"]);

    cleanup();
  });
});

describe("isTracked", () => {
  it("returns true for a tracked ID", () => {
    const { init, trackToken, isTracked } = useTrackedTokensStore.getState();
    const cleanup = init();

    trackToken("token-x");

    expect(isTracked("token-x")).toBe(true);

    cleanup();
  });

  it("returns false for an untracked ID", () => {
    const { init, isTracked } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(isTracked("token-missing")).toBe(false);

    cleanup();
  });

  it("returns false after untracking", () => {
    const { init, trackToken, untrackToken, isTracked } =
      useTrackedTokensStore.getState();
    const cleanup = init();

    trackToken("token-y");
    untrackToken("token-y");

    expect(isTracked("token-y")).toBe(false);

    cleanup();
  });
});

describe("StorageEvent sync (cross-frame writes)", () => {
  it("re-reads localStorage when a storage event fires for the key", () => {
    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    // What the background page's pin menu does from another frame.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["token-from-bg"]));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify(["token-from-bg"]),
      }),
    );

    expect(useTrackedTokensStore.getState().trackedTokenIds).toContain(
      "token-from-bg",
    );

    cleanup();
  });

  it("ignores storage events for unrelated keys", () => {
    const { init, trackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    trackToken("token-original");

    localStorage.setItem("some-other-key", JSON.stringify(["unrelated"]));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "some-other-key",
        newValue: JSON.stringify(["unrelated"]),
      }),
    );

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([
      "token-original",
    ]);

    cleanup();
  });

  it("cleanup removes the storage event listener", () => {
    const { init, trackToken } = useTrackedTokensStore.getState();
    const cleanup = init();

    trackToken("token-before-cleanup");
    cleanup();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(["token-after-cleanup"]));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue: JSON.stringify(["token-after-cleanup"]),
      }),
    );

    expect(useTrackedTokensStore.getState().trackedTokenIds).toContain(
      "token-before-cleanup",
    );
    expect(useTrackedTokensStore.getState().trackedTokenIds).not.toContain(
      "token-after-cleanup",
    );
  });

  it("does not register an OBR player onChange listener (removed as redundant)", () => {
    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(vi.mocked(OBR.player.onChange)).not.toHaveBeenCalled();

    cleanup();
  });
});

describe("resilience to malformed localStorage data", () => {
  it("treats invalid JSON as an empty list", () => {
    localStorage.setItem(STORAGE_KEY, "this is not json");
    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([]);

    cleanup();
  });

  it("filters out non-string values from the stored array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, "valid-id", null, true]));
    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual(["valid-id"]);

    cleanup();
  });

  it("treats a non-array stored value as an empty list", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: "token-1" }));
    const { init } = useTrackedTokensStore.getState();
    const cleanup = init();

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([]);

    cleanup();
  });
});

describe("pruneStaleIds", () => {
  it("removes IDs not present in the live item list", () => {
    seedStorage(["token-1", "token-2", "token-deleted"]);
    const { init, pruneStaleIds } = useTrackedTokensStore.getState();
    const cleanup = init();

    pruneStaleIds(["token-1", "token-2"]);

    const ids = useTrackedTokensStore.getState().trackedTokenIds;
    expect(ids).toContain("token-1");
    expect(ids).toContain("token-2");
    expect(ids).not.toContain("token-deleted");

    cleanup();
  });

  it("persists the pruned list to localStorage", () => {
    seedStorage(["token-1", "token-stale"]);
    const { init, pruneStaleIds } = useTrackedTokensStore.getState();
    const cleanup = init();

    pruneStaleIds(["token-1"]);

    expect(readStorage()).toEqual(["token-1"]);
    expect(readStorage()).not.toContain("token-stale");

    cleanup();
  });

  it("is a no-op when all tracked IDs are still live", () => {
    seedStorage(["token-1", "token-2"]);
    const { init, pruneStaleIds } = useTrackedTokensStore.getState();
    const cleanup = init();

    const beforeIds = useTrackedTokensStore.getState().trackedTokenIds;
    pruneStaleIds(["token-1", "token-2", "token-3"]);
    const afterIds = useTrackedTokensStore.getState().trackedTokenIds;

    expect(afterIds).toEqual(["token-1", "token-2"]);
    // Same array reference, so subscribers don't re-render.
    expect(afterIds).toBe(beforeIds);

    cleanup();
  });

  it("is a no-op when the tracked list is already empty", () => {
    const { init, pruneStaleIds } = useTrackedTokensStore.getState();
    const cleanup = init();

    pruneStaleIds(["token-1", "token-2"]);

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([]);

    cleanup();
  });

  it("does not wipe tracked tokens when called with an empty live list", () => {
    // The Action panel's item list is [] until the scene loads.
    seedStorage(["token-1", "token-2"]);
    const { init, pruneStaleIds } = useTrackedTokensStore.getState();
    const cleanup = init();

    pruneStaleIds([]);

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([
      "token-1",
      "token-2",
    ]);
    expect(readStorage()).toEqual(["token-1", "token-2"]);

    cleanup();
  });

  it("removes multiple stale IDs in one pass", () => {
    seedStorage(["token-a", "token-b", "token-c", "token-d"]);
    const { init, pruneStaleIds } = useTrackedTokensStore.getState();
    const cleanup = init();

    pruneStaleIds(["token-b"]);

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual(["token-b"]);

    cleanup();
  });
});

describe("reorderTokens", () => {
  it("reorders the list and persists to localStorage", () => {
    seedStorage(["token-1", "token-2", "token-3"]);
    const { init, reorderTokens } = useTrackedTokensStore.getState();
    const cleanup = init();

    reorderTokens(["token-3", "token-1", "token-2"]);

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([
      "token-3",
      "token-1",
      "token-2",
    ]);
    expect(readStorage()).toEqual(["token-3", "token-1", "token-2"]);

    cleanup();
  });

  it("is a no-op when the incoming array has a different length", () => {
    seedStorage(["token-1", "token-2", "token-3"]);
    const { init, reorderTokens } = useTrackedTokensStore.getState();
    const cleanup = init();

    reorderTokens(["token-1", "token-2"]);

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([
      "token-1",
      "token-2",
      "token-3",
    ]);
    expect(readStorage()).toEqual(["token-1", "token-2", "token-3"]);

    cleanup();
  });

  it("is a no-op when the incoming array contains an unrecognised ID", () => {
    seedStorage(["token-1", "token-2", "token-3"]);
    const { init, reorderTokens } = useTrackedTokensStore.getState();
    const cleanup = init();

    reorderTokens(["token-1", "token-2", "token-UNKNOWN"]);

    expect(useTrackedTokensStore.getState().trackedTokenIds).toEqual([
      "token-1",
      "token-2",
      "token-3",
    ]);

    cleanup();
  });

  it("moving an item to the front updates both store and storage", () => {
    seedStorage(["token-a", "token-b", "token-c"]);
    const { init, reorderTokens } = useTrackedTokensStore.getState();
    const cleanup = init();

    reorderTokens(["token-c", "token-a", "token-b"]);

    const ids = useTrackedTokensStore.getState().trackedTokenIds;
    expect(ids[0]).toBe("token-c");
    expect(readStorage()[0]).toBe("token-c");

    cleanup();
  });

  it("moving an item to the end updates both store and storage", () => {
    seedStorage(["token-a", "token-b", "token-c"]);
    const { init, reorderTokens } = useTrackedTokensStore.getState();
    const cleanup = init();

    reorderTokens(["token-b", "token-c", "token-a"]);

    const ids = useTrackedTokensStore.getState().trackedTokenIds;
    expect(ids[ids.length - 1]).toBe("token-a");
    expect(readStorage().at(-1)).toBe("token-a");

    cleanup();
  });
});
