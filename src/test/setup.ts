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

if (typeof document !== "undefined") {
  const mockContext = {
    font: "",
    measureText: (text: string) => ({ width: text.length * 6 }),
  };
  HTMLCanvasElement.prototype.getContext = function (contextId: string) {
    if (contextId === "2d") {
      return mockContext as any;
    }
    return null;
  };
}

// Clear localStorage after every test to prevent state leakage.
afterEach(() => {
  localStorage.clear();
});

// Mock the entire OBR SDK. Individual tests can override specific methods
// with vi.mocked(OBR.player.onChange).mockImplementation(...).
vi.mock("@owlbear-rodeo/sdk", () => {
  class MockBuilder {
    private data: any = {};
    constructor(type: string) {
      this.data.type = type;
    }
    width(w: number) { this.data.width = w; return this; }
    height(h: number) { this.data.height = h; return this; }
    shapeType(t: string) { this.data.shapeType = t; return this; }
    fillColor(c: string) { this.data.fillColor = c; return this; }
    fillOpacity(o: number) { this.data.fillOpacity = o; return this; }
    strokeColor(c: string) { this.data.strokeColor = c; return this; }
    strokeOpacity(o: number) { this.data.strokeOpacity = o; return this; }
    strokeWidth(w: number) { this.data.strokeWidth = w; return this; }
    position(p: any) { this.data.position = p; return this; }
    attachedTo(id: string) { this.data.attachedTo = id; return this; }
    layer(l: string) { this.data.layer = l; return this; }
    locked(b: boolean) { this.data.locked = b; return this; }
    id(id: string) { this.data.id = id; return this; }
    visible(v: boolean) { this.data.visible = v; return this; }
    disableAttachmentBehavior(b: any) { this.data.disableAttachmentBehavior = b; return this; }
    disableHit(b: boolean) { this.data.disableHit = b; return this; }
    plainText(t: string) { this.data.plainText = t; return this; }
    textAlign(a: string) { this.data.textAlign = a; return this; }
    textAlignVertical(a: string) { this.data.textAlignVertical = a; return this; }
    fontSize(s: number) { this.data.fontSize = s; return this; }
    fontFamily(f: string) { this.data.fontFamily = f; return this; }
    textType(t: string) { this.data.textType = t; return this; }
    fontWeight(w: number) { this.data.fontWeight = w; return this; }
    commands(c: any) { this.data.commands = c; return this; }
    build() { return this.data; }
  }

  return {
    default: {
      player: {
        onChange: vi.fn(() => vi.fn()), // returns a no-op unsubscribe fn
        getMetadata: vi.fn(async () => ({})),
        setMetadata: vi.fn(async () => {}),
        getSelection: vi.fn(async () => []),
      },
      scene: {
        isReady: vi.fn(async () => false),
        onReadyChange: vi.fn(() => vi.fn()),
        items: {
          getItems: vi.fn(async () => []),
          onChange: vi.fn(() => vi.fn()),
          updateItems: vi.fn((items, callback) => callback(items)),
        },
        local: {
          deleteItems: vi.fn(async () => {}),
          addItems: vi.fn(async () => {}),
        },
        grid: {
          getDpi: vi.fn(async () => 150),
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
    buildShape: () => new MockBuilder("SHAPE"),
    buildText: () => new MockBuilder("TEXT"),
    buildPath: () => new MockBuilder("PATH"),
    isImage: (item: { type?: string }) => item.type === "IMAGE",
    Command: {
      MOVE: 0,
      LINE: 1,
      CONIC: 2,
      CLOSE: 3,
    },
    Math2: {
      add: (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: a.x + b.x, y: a.y + b.y }),
      subtract: (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: a.x - b.x, y: a.y - b.y }),
      multiply: (a: { x: number; y: number }, scalarOrVec: number | { x: number; y: number }) => {
        if (typeof scalarOrVec === "number") {
          return { x: a.x * scalarOrVec, y: a.y * scalarOrVec };
        }
        return { x: a.x * scalarOrVec.x, y: a.y * scalarOrVec.y };
      },
      rotate: (point: { x: number; y: number }, origin: { x: number; y: number }, angleDegrees: number) => {
        const rad = ((angleDegrees || 0) * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = point.x - origin.x;
        const dy = point.y - origin.y;
        return {
          x: cos * dx - sin * dy + origin.x,
          y: sin * dx + cos * dy + origin.y,
        };
      },
    },
  };
});
