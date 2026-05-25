import OBR, { Item } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./getPluginId";
import {
  TokenRecord,
  TOKEN_RECORD_METADATA_ID,
  HIDDEN_METADATA_ID,
  migrateToTokenRecord,
  createDefaultTokenRecord,
  getActiveData,
  CharacterData,
} from "./characterDataHelpers";

/////////////////////////////////////////////////////////////////////
// TokenRecord read / write
/////////////////////////////////////////////////////////////////////

/**
 * Write a TokenRecord to a specific item by its OBR item ID.
 * Used by the Action panel tracked-token rows, which target arbitrary tokens
 * rather than the current selection.
 */
export async function writeTokenRecordToItem(
  itemId: string,
  record: TokenRecord,
): Promise<void> {
  const items = await OBR.scene.items.getItems([itemId]);
  if (items.length === 0) {
    throw new Error(`Item not found: ${itemId}`);
  }
  OBR.scene.items.updateItems(items, (mutableItems) => {
    for (const item of mutableItems) {
      item.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)] = record;
    }
  });
}

/** Write a TokenRecord to the currently selected item. */
export async function writeTokenRecordToSelection(
  record: TokenRecord,
): Promise<void> {
  const selection = await OBR.player.getSelection();
  const selectedItems = await OBR.scene.items.getItems(selection);

  if (selection === undefined || selection.length !== 1) {
    throw new Error(`Expected 1 selected item, got ${selection?.length ?? 0}.`);
  }

  OBR.scene.items.updateItems(selectedItems, (items) => {
    for (const item of items) {
      item.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)] = record;
    }
  });
}

/** Read and migrate a TokenRecord from the currently selected item. */
export async function getTokenRecordFromSelection(
  items?: Item[],
): Promise<TokenRecord> {
  if (items === undefined) items = await OBR.scene.items.getItems();
  const selection = await OBR.player.getSelection();
  const selectedItem = items.find((item) => item.id === selection?.[0]);
  if (selectedItem === undefined) throw new TypeError("No selected item found");
  return getTokenRecordFromItem(selectedItem);
}

/**
 * Extract and migrate a TokenRecord from an item's metadata.
 * Also handles legacy CharacterData blobs saved before TokenRecord existed.
 * Falls back to a fresh default record if nothing is stored.
 */
export function getTokenRecordFromItem(item: Item): TokenRecord {
  // Check new key first
  const raw = item.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)];
  if (raw !== undefined) return migrateToTokenRecord(raw);

  // Fall back to legacy key (CHARACTER_DATA_METADATA_ID) for old tokens
  const legacy = item.metadata[getPluginId("characterData")];
  if (legacy !== undefined) return migrateToTokenRecord(legacy);

  return createDefaultTokenRecord();
}

/** Convenience: get only the active CharacterData from an item (used by on-map display). */
export function getActiveDataFromItem(item: Item): CharacterData {
  return getActiveData(getTokenRecordFromItem(item));
}

/////////////////////////////////////////////////////////////////////
// Hidden flag
/////////////////////////////////////////////////////////////////////

export function getHiddenFromItem(item: Item): boolean {
  const val = item.metadata[getPluginId(HIDDEN_METADATA_ID)];
  return typeof val === "boolean" ? val : false;
}

export async function writeHiddenToSelection(hidden: boolean): Promise<void> {
  const selection = await OBR.player.getSelection();
  const selectedItems = await OBR.scene.items.getItems(selection);

  if (selection === undefined || selection.length !== 1) {
    throw new Error(`Expected 1 selected item, got ${selection?.length ?? 0}.`);
  }

  OBR.scene.items.updateItems(selectedItems, (items) => {
    for (const item of items) {
      item.metadata[getPluginId(HIDDEN_METADATA_ID)] = hidden;
    }
  });
}
