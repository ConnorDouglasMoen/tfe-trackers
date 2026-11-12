import OBR, { Item } from "@owlbear-rodeo/sdk";
import { getPluginId } from "./getPluginId";
import {
  TokenRecord,
  CharacterData,
  TOKEN_RECORD_METADATA_ID,
  LEGACY_CHARACTER_DATA_METADATA_ID,
  HIDDEN_METADATA_ID,
  migrateToTokenRecord,
  createDefaultTokenRecord,
  getActiveData,
} from "./characterDataHelpers";
import { getAllAttachmentIds } from "./background/onMapItemIds";

// ─── TokenRecord read / write ─────────────────────────────────────────────────

async function getItemById(itemId: string): Promise<Item[]> {
  const items = await OBR.scene.items.getItems([itemId]);
  if (items.length === 0) throw new Error(`Item not found: ${itemId}`);
  return items;
}

async function getSingleSelectedItem(): Promise<Item[]> {
  const selection = await OBR.player.getSelection();
  if (selection === undefined || selection.length !== 1) {
    throw new Error(`Expected 1 selected item, got ${selection?.length ?? 0}.`);
  }
  return OBR.scene.items.getItems(selection);
}

async function setMetadata(items: Item[], key: string, value: unknown): Promise<void> {
  await OBR.scene.items.updateItems(items, (mutableItems) => {
    for (const item of mutableItems) item.metadata[getPluginId(key)] = value;
  });
}

/** Write a record to a specific token, regardless of the current selection. */
export async function writeTokenRecordToItem(
  itemId: string,
  record: TokenRecord,
): Promise<void> {
  await setMetadata(await getItemById(itemId), TOKEN_RECORD_METADATA_ID, record);
}

export async function writeTokenRecordToSelection(record: TokenRecord): Promise<void> {
  await setMetadata(await getSingleSelectedItem(), TOKEN_RECORD_METADATA_ID, record);
}

/**
 * Read the record of the selected token. Takes the scene items the caller
 * already has so it doesn't need to fetch them again.
 */
export async function getTokenRecordFromSelection(items: Item[]): Promise<TokenRecord> {
  const selection = await OBR.player.getSelection();
  const selectedItem = items.find((item) => item.id === selection?.[0]);
  if (selectedItem === undefined) throw new TypeError("No selected item found");
  return getTokenRecordFromItem(selectedItem);
}

/** Read a token's record, falling back to the legacy key and then to defaults. */
export function getTokenRecordFromItem(item: Item): TokenRecord {
  const raw =
    item.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)] ??
    item.metadata[getPluginId(LEGACY_CHARACTER_DATA_METADATA_ID)];
  return raw === undefined ? createDefaultTokenRecord() : migrateToTokenRecord(raw);
}

export function getActiveDataFromItem(item: Item): CharacterData {
  return getActiveData(getTokenRecordFromItem(item));
}

/** Remove all of this extension's metadata from a token, plus its on-map attachments. */
export async function clearTokenData(itemId: string): Promise<void> {
  const keys = [
    TOKEN_RECORD_METADATA_ID,
    LEGACY_CHARACTER_DATA_METADATA_ID,
    HIDDEN_METADATA_ID,
  ].map(getPluginId);

  await OBR.scene.items.updateItems(await getItemById(itemId), (mutableItems) => {
    for (const item of mutableItems) {
      for (const key of keys) delete item.metadata[key];
    }
  });
  await OBR.scene.local.deleteItems(getAllAttachmentIds(itemId));
}

// ─── Hidden flag ──────────────────────────────────────────────────────────────

export function getHiddenFromItem(item: Item): boolean {
  return item.metadata[getPluginId(HIDDEN_METADATA_ID)] === true;
}

export async function writeHiddenToSelection(hidden: boolean): Promise<void> {
  await setMetadata(await getSingleSelectedItem(), HIDDEN_METADATA_ID, hidden);
}
