// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  TRACKED_TOKENS_STORAGE_KEY,
  loadTrackedTokenIds,
  removeTrackedTokenId,
  saveTrackedTokenIds,
  toggleTrackedTokenId,
} from "../trackedTokenStorage";

beforeEach(() => {
  localStorage.removeItem(TRACKED_TOKENS_STORAGE_KEY);
});

describe("loadTrackedTokenIds", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(loadTrackedTokenIds()).toEqual([]);
  });

  it("ignores malformed data", () => {
    localStorage.setItem(TRACKED_TOKENS_STORAGE_KEY, "{not json");
    expect(loadTrackedTokenIds()).toEqual([]);

    localStorage.setItem(TRACKED_TOKENS_STORAGE_KEY, JSON.stringify(["a", 3, null, "b"]));
    expect(loadTrackedTokenIds()).toEqual(["a", "b"]);
  });
});

describe("toggleTrackedTokenId", () => {
  it("pins a token that isn't pinned", () => {
    saveTrackedTokenIds(["a"]);
    toggleTrackedTokenId("b");
    expect(loadTrackedTokenIds()).toEqual(["a", "b"]);
  });

  it("unpins a token that is pinned", () => {
    saveTrackedTokenIds(["a", "b", "c"]);
    toggleTrackedTokenId("b");
    expect(loadTrackedTokenIds()).toEqual(["a", "c"]);
  });
});

describe("removeTrackedTokenId", () => {
  it("removes only the given token", () => {
    saveTrackedTokenIds(["a", "b", "c"]);
    removeTrackedTokenId("b");
    expect(loadTrackedTokenIds()).toEqual(["a", "c"]);
  });

  it("does not write when the token isn't pinned", () => {
    removeTrackedTokenId("a");
    expect(localStorage.getItem(TRACKED_TOKENS_STORAGE_KEY)).toBeNull();
  });
});
