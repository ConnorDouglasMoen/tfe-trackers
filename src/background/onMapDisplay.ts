import OBR, { Image, Item, isImage } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { CHARACTER_DATA_METADATA_ID } from "../characterDataHelpers";
import { getCharacterDataFromItem } from "../itemMetadataHelpers";
import { getAllAttachmentIds } from "./onMapItemIds";
import {
  buildStrainItems,
  buildInjuryItems,
  buildConditionItems,
} from "./onMapHelpers";

/////////////////////////////////////////////////////////////////////
// Layout row heights (must match constants in onMapHelpers.ts)
/////////////////////////////////////////////////////////////////////

const BOX_SIZE = 14;
const CIRCLE_SIZE = 18;
const BUBBLE_HEIGHT = 14;

// These heights are used to stack rows vertically.
const STRAIN_ROW_HEIGHT = BOX_SIZE;
const INJURY_ROW_HEIGHT = CIRCLE_SIZE;

/////////////////////////////////////////////////////////////////////
// Module-level state (mirrors owl-trackers pattern)
/////////////////////////////////////////////////////////////////////

let itemsLast: Image[] = [];
const addItemsArray: Item[] = [];
const deleteItemsArray: string[] = [];
let sceneListenersSet = false;

/////////////////////////////////////////////////////////////////////
// Public init — called from background.ts
/////////////////////////////////////////////////////////////////////

export async function initOnMapDisplay() {
  OBR.scene.onReadyChange(async (isReady) => {
    if (isReady) {
      await refreshAll();
      startListeners();
    }
  });

  const isReady = await OBR.scene.isReady();
  if (isReady) {
    await refreshAll();
    startListeners();
  }
}

/////////////////////////////////////////////////////////////////////
// Full refresh
/////////////////////////////////////////////////////////////////////

async function refreshAll() {
  const items: Image[] = await OBR.scene.items.getItems(
    (item) =>
      (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item),
  );
  itemsLast = items;

  for (const item of items) {
    updateItem(item);
  }

  await OBR.scene.local.deleteItems(deleteItemsArray);
  await batchAddToScene(addItemsArray);
  addItemsArray.length = 0;
  deleteItemsArray.length = 0;
}

/////////////////////////////////////////////////////////////////////
// Incremental update — only changed items
/////////////////////////////////////////////////////////////////////

function startListeners() {
  if (sceneListenersSet) return;
  sceneListenersSet = true;

  // Item changes (position, metadata, visibility, scale)
  const unsubItems = OBR.scene.items.onChange(async (allItems) => {
    const images: Image[] = allItems.filter(
      (item): item is Image =>
        (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item),
    );

    const changed = getChangedItems(images);
    itemsLast = images;

    for (const item of changed) updateItem(item);

    await OBR.scene.local.deleteItems(deleteItemsArray);
    await OBR.scene.local.addItems(addItemsArray);
    addItemsArray.length = 0;
    deleteItemsArray.length = 0;
  });

  // Unsubscribe when scene stops being ready
  OBR.scene.onReadyChange((isReady) => {
    if (!isReady) {
      unsubItems();
      sceneListenersSet = false;
    }
  });
}

/////////////////////////////////////////////////////////////////////
// Per-item update
/////////////////////////////////////////////////////////////////////

function updateItem(image: Image) {
  const data = getCharacterDataFromItem(image);

  // If no data is stored yet, clear any stale attachments and bail.
  const raw = image.metadata[getPluginId(CHARACTER_DATA_METADATA_ID)];
  if (raw === undefined) {
    deleteItemsArray.push(...getAllAttachmentIds(image.id));
    return;
  }

  const { showStrain, showConditions } = data.displaySettings;

  // Strain row
  if (showStrain) {
    buildStrainItems(image, 150, data, addItemsArray, deleteItemsArray);
  } else {
    // Delete all strain boxes
    for (let i = 0; i < 9; i++) {
      deleteItemsArray.push(
        `${image.id}-tfe-strain-bg-${i}`,
        `${image.id}-tfe-strain-x-${i}`,
      );
    }
  }

  // Injury row — always rendered (injuryDisplay controls empty-slot visibility)
  buildInjuryItems(
    image,
    150,
    data,
    showStrain ? STRAIN_ROW_HEIGHT : 0,
    addItemsArray,
    deleteItemsArray,
  );

  // Conditions row
  if (showConditions && data.conditions.length > 0) {
    buildConditionItems(
      image,
      150,
      data,
      showStrain ? STRAIN_ROW_HEIGHT : 0,
      INJURY_ROW_HEIGHT,
      addItemsArray,
      deleteItemsArray,
    );
  } else {
    // Delete all condition bubbles
    for (let i = 0; i < 20; i++) {
      deleteItemsArray.push(
        `${image.id}-tfe-cond-bg-${i}`,
        `${image.id}-tfe-cond-text-${i}`,
      );
    }
  }
}

/////////////////////////////////////////////////////////////////////
// Change detection (mirrors owl-trackers pattern)
/////////////////////////////////////////////////////////////////////

function getChangedItems(current: Image[]): Image[] {
  const changed: Image[] = [];
  let skip = 0;

  for (let i = 0; i < current.length; i++) {
    if (i > itemsLast.length - 1 - skip) {
      changed.push(current[i]);
      continue;
    }
    if (itemsLast[i + skip].id !== current[i].id) {
      skip++;
      i--;
      continue;
    }
    const last = itemsLast[i + skip];
    const cur = current[i];
    if (
      last.scale.x !== cur.scale.x ||
      last.scale.y !== cur.scale.y ||
      last.position.x !== cur.position.x ||
      last.position.y !== cur.position.y ||
      last.visible !== cur.visible ||
      JSON.stringify(last.metadata[getPluginId(CHARACTER_DATA_METADATA_ID)]) !==
        JSON.stringify(cur.metadata[getPluginId(CHARACTER_DATA_METADATA_ID)])
    ) {
      changed.push(cur);
    }
  }

  return changed;
}

/////////////////////////////////////////////////////////////////////
// Batch add (avoids OBR rate limits on large scenes)
/////////////////////////////////////////////////////////////////////

const BATCH_SIZE = 100;
async function batchAddToScene(items: Item[]) {
  for (let i = 0; i < Math.ceil(items.length / BATCH_SIZE); i++) {
    await OBR.scene.local.addItems(
      items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
    );
  }
}
