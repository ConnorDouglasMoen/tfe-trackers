import OBR, { Item } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./getPluginId";
import {
  CharacterData,
  CHARACTER_DATA_METADATA_ID,
  HIDDEN_METADATA_ID,
  isCharacterData,
  createDefaultCharacterData,
} from "./characterDataHelpers";

/////////////////////////////////////////////////////////////////////
// Read / Write CharacterData from OBR item metadata
/////////////////////////////////////////////////////////////////////

/** Write CharacterData to the currently selected item. */
export async function writeCharacterDataToSelection(
  data: CharacterData,
): Promise<void> {
  const selection = await OBR.player.getSelection();
  const selectedItems = await OBR.scene.items.getItems(selection);

  if (selection === undefined || selection.length !== 1) {
    throw new Error(
      `Expected 1 selected item, got ${selection?.length ?? 0}.`,
    );
  }

  OBR.scene.items.updateItems(selectedItems, (items) => {
    for (const item of items) {
      item.metadata[getPluginId(CHARACTER_DATA_METADATA_ID)] = data;
    }
  });
}

/** Read CharacterData from the currently selected item.
 *  Returns default data if none is stored yet. */
export async function getCharacterDataFromSelection(
  items?: Item[],
): Promise<CharacterData> {
  if (items === undefined) items = await OBR.scene.items.getItems();

  const selection = await OBR.player.getSelection();
  const selectedItem = items.find((item) => item.id === selection?.[0]);
  if (selectedItem === undefined) throw new TypeError("No selected item found");

  return getCharacterDataFromItem(selectedItem);
}

/** Extract and validate CharacterData from an item's metadata.
 *  Falls back to default data if the stored value is missing or invalid. */
export function getCharacterDataFromItem(item: Item): CharacterData {
  const raw = item.metadata[getPluginId(CHARACTER_DATA_METADATA_ID)];
  if (raw === undefined) return createDefaultCharacterData();
  if (!isCharacterData(raw)) {
    console.warn("Invalid CharacterData found on item, using defaults:", raw);
    return createDefaultCharacterData();
  }
  return raw;
}

/** Read the "trackers hidden" flag from an item. */
export function getHiddenFromItem(item: Item): boolean {
  const val = item.metadata[getPluginId(HIDDEN_METADATA_ID)];
  return typeof val === "boolean" ? val : false;
}

/** Write the "trackers hidden" flag to the selected item. */
export async function writeHiddenToSelection(hidden: boolean): Promise<void> {
  const selection = await OBR.player.getSelection();
  const selectedItems = await OBR.scene.items.getItems(selection);

  if (selection === undefined || selection.length !== 1) {
    throw new Error(
      `Expected 1 selected item, got ${selection?.length ?? 0}.`,
    );
  }

  OBR.scene.items.updateItems(selectedItems, (items) => {
    for (const item of items) {
      item.metadata[getPluginId(HIDDEN_METADATA_ID)] = hidden;
    }
  });
}
