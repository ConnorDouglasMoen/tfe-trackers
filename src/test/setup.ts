/**
 * Global test setup for Vitest.
 * - Clears localStorage between tests.
 * - Mocks the OBR SDK so tests don't need a real OBR environment.
 */
import { afterEach, vi } from "vitest";

// Mock localStorage for environments/Node versions where it might be missing or conflicting.
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

const localStorageMock = new LocalStorageMock();
global.localStorage = localStorageMock;
if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
}

// Clear localStorage after every test to prevent state leakage.
afterEach(() => {
  localStorage.clear();
});

// Mock the entire OBR SDK. Individual tests can override specific methods
// with vi.mocked(OBR.player.onChange).mockImplementation(...).
vi.mock("@owlbear-rodeo/sdk", () => ({
  default: {
    player: {
      onChange: vi.fn(() => vi.fn()), // returns a no-op unsubscribe fn
      getMetadata: vi.fn(async () => ({})),
      setMetadata: vi.fn(async () => {}),
    },
    scene: {
      isReady: vi.fn(async () => false),
      onReadyChange: vi.fn(() => vi.fn()),
      items: {
        getItems: vi.fn(async () => []),
        onChange: vi.fn(() => vi.fn()),
      },
      getMetadata: vi.fn(async () => ({})),
      setMetadata: vi.fn(async () => {}),
      onMetadataChange: vi.fn(() => vi.fn()),
    },
    theme: {
      getTheme: vi.fn(async () => ({ mode: "DARK" })),
      onChange: vi.fn(() => vi.fn()),
    },
  },
}));
