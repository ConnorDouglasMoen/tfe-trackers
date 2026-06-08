// @vitest-environment jsdom
/**
 * Component-level tests for TrackedTokenRow.
 *
 * Focuses on the behaviours unique to this component that are not already
 * covered by the pure mutation helper tests in tokenRecordMutations.test.ts:
 *
 *  1. applyMutation plumbing — mutation callbacks reach writeTokenRecordToItem.
 *  2. Record re-sync — local state updates when the item prop changes.
 *  3. commitName — trims, clears when matching item.name, writes via applyMutation.
 *  4. cancelEditName — exits edit mode without writing.
 *  5. Unpin button — calls useTrackedTokensStore.untrackToken.
 *
 * OBR.viewport is included in the global setup mock in src/test/setup.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Item } from "@owlbear-rodeo/sdk";
import OBR from "@owlbear-rodeo/sdk";
import { TrackedTokenRow } from "../action/TrackedTokenRow";
import { useTrackedTokensStore } from "../useTrackedTokensStore";
import { getPluginId } from "../getPluginId";
import {
  createDefaultTokenRecord,
  TOKEN_RECORD_METADATA_ID,
  TokenRecord,
} from "../characterDataHelpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal Item with an embedded TokenRecord in its metadata. */
function makeItem(record: TokenRecord, overrides: Partial<Item> = {}): Item {
  return {
    id: "item-abc",
    name: "Goblin",
    type: "IMAGE",
    layer: "CHARACTER",
    visible: true,
    position: { x: 100, y: 200 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    metadata: {
      [getPluginId(TOKEN_RECORD_METADATA_ID)]: record,
    },
    ...overrides,
  } as unknown as Item;
}

/** Reset the tracked tokens store to a clean slate between tests. */
function resetStore() {
  useTrackedTokensStore.setState({ trackedTokenIds: [] });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

// ─── applyMutation plumbing ───────────────────────────────────────────────────

describe("applyMutation plumbing", () => {
  it("calls writeTokenRecordToItem when a mutation callback fires", async () => {
    // writeTokenRecordToItem calls OBR.scene.items.getItems then updateItems.
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([
      makeItem(createDefaultTokenRecord()) as any,
    ]);

    const record = createDefaultTokenRecord();
    const item = makeItem(record);

    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    // Expand the row to reveal the editor.
    fireEvent.click(screen.getByRole("button", { name: "Toggle Goblin" }));

    // Click the first strain box to set strainCurrent = 1.
    const strainBox = screen.getByLabelText("Strain box 1");
    await act(async () => { fireEvent.click(strainBox); });

    // getItems was called by writeTokenRecordToItem.
    expect(OBR.scene.items.getItems).toHaveBeenCalledWith(["item-abc"]);
    // updateItems was called with the mutated record.
    expect(OBR.scene.items.updateItems).toHaveBeenCalled();
  });
});

// ─── Record re-sync from item prop ────────────────────────────────────────────

describe("record re-sync from item prop", () => {
  it("updates local state when the item prop changes externally", () => {
    const record = createDefaultTokenRecord();
    const item = makeItem(record);

    const { rerender } = render(<TrackedTokenRow item={item} displayName="Goblin" />);

    // Expand the row.
    fireEvent.click(screen.getByRole("button", { name: "Toggle Goblin" }));

    // Initially strainCurrent = 0.
    expect(screen.getByText("0 / 3 taken")).toBeInTheDocument();

    // Simulate an external edit: new item prop with strainCurrent = 2.
    const updatedRecord = {
      ...record,
      survivor: { ...record.survivor, strainCurrent: 2 },
    };
    const updatedItem = makeItem(updatedRecord);
    rerender(<TrackedTokenRow item={updatedItem} displayName="Goblin" />);

    expect(screen.getByText("2 / 3 taken")).toBeInTheDocument();
  });
});

// ─── commitName ───────────────────────────────────────────────────────────────

describe("commitName", () => {
  it("enters edit mode when the edit-label button is clicked", () => {
    const item = makeItem(createDefaultTokenRecord());
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Edit label for Goblin"));

    expect(screen.getByLabelText("Edit token label")).toBeInTheDocument();
  });

  it("pre-fills the name input with the current displayName when set", () => {
    const record = { ...createDefaultTokenRecord(), displayName: "Grizzled Veteran" };
    const item = makeItem(record);
    render(<TrackedTokenRow item={item} displayName="Grizzled Veteran" />);

    fireEvent.click(screen.getByLabelText("Edit label for Grizzled Veteran"));

    expect(screen.getByLabelText<HTMLInputElement>("Edit token label").value).toBe(
      "Grizzled Veteran",
    );
  });

  it("pre-fills with item.name when displayName is empty", () => {
    const record = { ...createDefaultTokenRecord(), displayName: "" };
    const item = makeItem(record, { name: "Goblin Scout" } as Partial<Item>);
    render(<TrackedTokenRow item={item} displayName="Goblin Scout" />);

    fireEvent.click(screen.getByLabelText("Edit label for Goblin Scout"));

    expect(screen.getByLabelText<HTMLInputElement>("Edit token label").value).toBe(
      "Goblin Scout",
    );
  });

  it("commits on Enter and exits edit mode", async () => {
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([
      makeItem(createDefaultTokenRecord()) as any,
    ]);

    const item = makeItem(createDefaultTokenRecord(), { name: "Goblin" } as Partial<Item>);
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Edit label for Goblin"));
    const input = screen.getByLabelText("Edit token label");
    fireEvent.change(input, { target: { value: "Big Goblin" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    // Edit mode exited — input no longer present.
    expect(screen.queryByLabelText("Edit token label")).not.toBeInTheDocument();
    // writeTokenRecordToItem was called.
    expect(OBR.scene.items.updateItems).toHaveBeenCalled();
  });

  it("clears displayName when committed value matches item.name", async () => {
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([
      makeItem(createDefaultTokenRecord()) as any,
    ]);

    // updateItems callback captures the mutated record.
    let writtenRecord: TokenRecord | undefined;
    vi.mocked(OBR.scene.items.updateItems).mockImplementationOnce(
      async (_items: any, callback: any) => {
        const draft = [{ metadata: {} as Record<string, unknown> }];
        callback(draft);
        writtenRecord = draft[0].metadata[
          getPluginId(TOKEN_RECORD_METADATA_ID)
        ] as TokenRecord;
      },
    );

    const item = makeItem(createDefaultTokenRecord(), { name: "Goblin" } as Partial<Item>);
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Edit label for Goblin"));
    const input = screen.getByLabelText("Edit token label");
    // Type the same as item.name — should clear displayName.
    fireEvent.change(input, { target: { value: "Goblin" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(writtenRecord?.displayName).toBe("");
  });
});

// ─── cancelEditName ───────────────────────────────────────────────────────────

describe("cancelEditName", () => {
  it("exits edit mode on Escape without writing", async () => {
    const item = makeItem(createDefaultTokenRecord());
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Edit label for Goblin"));
    const input = screen.getByLabelText("Edit token label");
    fireEvent.change(input, { target: { value: "Changed Name" } });

    fireEvent.keyDown(input, { key: "Escape" });

    // Edit mode exited.
    expect(screen.queryByLabelText("Edit token label")).not.toBeInTheDocument();
    // writeTokenRecordToItem was NOT called.
    expect(OBR.scene.items.updateItems).not.toHaveBeenCalled();
  });

  it("exits edit mode on cancel button click without writing", async () => {
    const item = makeItem(createDefaultTokenRecord());
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Edit label for Goblin"));
    expect(screen.getByLabelText("Edit token label")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText("Cancel edit"));

    expect(screen.queryByLabelText("Edit token label")).not.toBeInTheDocument();
    expect(OBR.scene.items.updateItems).not.toHaveBeenCalled();
  });
});

// ─── Unpin button ─────────────────────────────────────────────────────────────

describe("unpin button", () => {
  it("calls untrackToken with the item ID when clicked", () => {
    useTrackedTokensStore.setState({ trackedTokenIds: ["item-abc"] });

    const item = makeItem(createDefaultTokenRecord());
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Unpin Goblin from Action panel"));

    expect(useTrackedTokensStore.getState().trackedTokenIds).not.toContain("item-abc");
  });
});
