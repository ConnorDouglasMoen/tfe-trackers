// @vitest-environment jsdom
import { StrictMode } from "react";
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

function resetStore() {
  useTrackedTokensStore.setState({ trackedTokenIds: [] });
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe("applyMutation plumbing", () => {
  it("calls writeTokenRecordToItem when a mutation callback fires", async () => {
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([
      makeItem(createDefaultTokenRecord()) as any,
    ]);

    const record = createDefaultTokenRecord();
    const item = makeItem(record);

    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle Goblin" }));

    const strainBox = screen.getByLabelText("Strain box 1");
    await act(async () => { fireEvent.click(strainBox); });

    expect(OBR.scene.items.getItems).toHaveBeenCalledWith(["item-abc"]);
    expect(OBR.scene.items.updateItems).toHaveBeenCalled();
  });
  it("writes once per edit under StrictMode", async () => {
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([
      makeItem(createDefaultTokenRecord()) as any,
    ]);
    const item = makeItem(createDefaultTokenRecord());

    render(
      <StrictMode>
        <TrackedTokenRow item={item} displayName="Goblin" />
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Toggle Goblin" }));
    await act(async () => { fireEvent.click(screen.getByLabelText("Strain box 1")); });

    expect(OBR.scene.items.getItems).toHaveBeenCalledTimes(1);
    expect(OBR.scene.items.updateItems).toHaveBeenCalledTimes(1);
  });
});

describe("record re-sync from item prop", () => {
  it("updates local state when the item prop changes externally", () => {
    const record = createDefaultTokenRecord();
    const item = makeItem(record);

    const { rerender } = render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByRole("button", { name: "Toggle Goblin" }));

    expect(screen.getByText("0 / 3 taken")).toBeInTheDocument();

    // Someone else edits the token.
    const updatedRecord = {
      ...record,
      survivor: { ...record.survivor, strainCurrent: 2 },
    };
    const updatedItem = makeItem(updatedRecord);
    rerender(<TrackedTokenRow item={updatedItem} displayName="Goblin" />);

    expect(screen.getByText("2 / 3 taken")).toBeInTheDocument();
  });
});

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

    expect(screen.queryByLabelText("Edit token label")).not.toBeInTheDocument();
    expect(OBR.scene.items.updateItems).toHaveBeenCalled();
  });

  it("clears displayName when committed value matches item.name", async () => {
    vi.mocked(OBR.scene.items.getItems).mockResolvedValue([
      makeItem(createDefaultTokenRecord()) as any,
    ]);

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
    fireEvent.change(input, { target: { value: "Goblin" } });

    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(writtenRecord?.displayName).toBe("");
  });
});

describe("cancelEditName", () => {
  it("exits edit mode on Escape without writing", async () => {
    const item = makeItem(createDefaultTokenRecord());
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Edit label for Goblin"));
    const input = screen.getByLabelText("Edit token label");
    fireEvent.change(input, { target: { value: "Changed Name" } });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByLabelText("Edit token label")).not.toBeInTheDocument();
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

describe("unpin button", () => {
  it("calls untrackToken with the item ID when clicked", () => {
    useTrackedTokensStore.setState({ trackedTokenIds: ["item-abc"] });

    const item = makeItem(createDefaultTokenRecord());
    render(<TrackedTokenRow item={item} displayName="Goblin" />);

    fireEvent.click(screen.getByLabelText("Unpin Goblin from Action panel"));

    expect(useTrackedTokensStore.getState().trackedTokenIds).not.toContain("item-abc");
  });
});
