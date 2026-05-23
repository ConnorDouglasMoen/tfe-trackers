import OBR, { Image, Item, isImage } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { TOKEN_RECORD_METADATA_ID } from "../characterDataHelpers";
import { getActiveDataFromItem } from "../itemMetadataHelpers";
import { getAllAttachmentIds } from "./onMapItemIds";
import { buildStrainItems, buildInjuryItems, buildConditionItems } from "./onMapHelpers";

// Row heights — must match constants in onMapHelpers.ts
const STRAIN_ROW_HEIGHT = 14;  // BOX_SIZE
const INJURY_ROW_HEIGHT = 18;  // CIRCLE_SIZE

let itemsLast: Image[] = [];
const addItemsArray: Item[] = [];
const deleteItemsArray: string[] = [];
let sceneListenersSet = false;

export async function initOnMapDisplay() {
  OBR.scene.onReadyChange(async (isReady) => {
    if (isReady) { await refreshAll(); startListeners(); }
  });
  const isReady = await OBR.scene.isReady();
  if (isReady) { await refreshAll(); startListeners(); }
}

async function refreshAll() {
  const items: Image[] = await OBR.scene.items.getItems(
    (item) => (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item),
  );
  itemsLast = items;
  for (const item of items) updateItem(item);
  await OBR.scene.local.deleteItems(deleteItemsArray);
  await batchAddToScene(addItemsArray);
  addItemsArray.length = 0;
  deleteItemsArray.length = 0;
}

function startListeners() {
  if (sceneListenersSet) return;
  sceneListenersSet = true;

  const unsubItems = OBR.scene.items.onChange(async (allItems) => {
    const images: Image[] = allItems.filter(
      (item): item is Image => (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item),
    );
    const changed = getChangedItems(images);
    itemsLast = images;
    for (const item of changed) updateItem(item);
    await OBR.scene.local.deleteItems(deleteItemsArray);
    await OBR.scene.local.addItems(addItemsArray);
    addItemsArray.length = 0;
    deleteItemsArray.length = 0;
  });

  OBR.scene.onReadyChange((isReady) => {
    if (!isReady) { unsubItems(); sceneListenersSet = false; }
  });
}

function updateItem(image: Image) {
  // If no TokenRecord stored yet, clear any stale attachments and bail.
  const raw = image.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)];
  if (raw === undefined) {
    deleteItemsArray.push(...getAllAttachmentIds(image.id));
    return;
  }

  // getActiveDataFromItem handles migration and returns the active CharacterData blob.
  const data = getActiveDataFromItem(image);
  const { showStrain, showConditions } = data.displaySettings;

  if (showStrain) {
    buildStrainItems(image, 150, data, addItemsArray, deleteItemsArray);
  } else {
    for (let i = 0; i < 9; i++) {
      deleteItemsArray.push(`${image.id}-tfe-strain-bg-${i}`, `${image.id}-tfe-strain-x-${i}`);
    }
  }

  buildInjuryItems(image, 150, data, showStrain ? STRAIN_ROW_HEIGHT : 0, addItemsArray, deleteItemsArray);

  if (showConditions && data.conditions.length > 0) {
    buildConditionItems(image, 150, data, showStrain ? STRAIN_ROW_HEIGHT : 0, INJURY_ROW_HEIGHT, addItemsArray, deleteItemsArray);
  } else {
    for (let i = 0; i < 20; i++) {
      deleteItemsArray.push(`${image.id}-tfe-cond-bg-${i}`, `${image.id}-tfe-cond-text-${i}`);
    }
  }
}

function getChangedItems(current: Image[]): Image[] {
  const changed: Image[] = [];
  let skip = 0;
  for (let i = 0; i < current.length; i++) {
    if (i > itemsLast.length - 1 - skip) { changed.push(current[i]); continue; }
    if (itemsLast[i + skip].id !== current[i].id) { skip++; i--; continue; }
    const last = itemsLast[i + skip];
    const cur = current[i];
    if (
      last.scale.x !== cur.scale.x ||
      last.scale.y !== cur.scale.y ||
      last.position.x !== cur.position.x ||
      last.position.y !== cur.position.y ||
      last.visible !== cur.visible ||
      JSON.stringify(last.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)]) !==
        JSON.stringify(cur.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)])
    ) {
      changed.push(cur);
    }
  }
  return changed;
}

const BATCH_SIZE = 100;
async function batchAddToScene(items: Item[]) {
  for (let i = 0; i < Math.ceil(items.length / BATCH_SIZE); i++) {
    await OBR.scene.local.addItems(items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE));
  }
}
