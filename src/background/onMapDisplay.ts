import OBR, { Image, Item, Metadata, isImage } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import {
  TOKEN_RECORD_METADATA_ID,
  DisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
} from "../characterDataHelpers";
import { SCENE_DISPLAY_METADATA_ID } from "../useSceneDisplayStore";
import { getActiveDataFromItem } from "../itemMetadataHelpers";
import { getAllAttachmentIds } from "./onMapItemIds";
import { buildStrainItems, buildInjuryItems, buildConditionItems } from "./onMapHelpers";

const STRAIN_ROW_HEIGHT = 13;
const INJURY_ROW_HEIGHT = 14;

let itemsLast: Image[] = [];
let sceneListenersSet = false;
let displaySettings: DisplaySettings = { ...DEFAULT_DISPLAY_SETTINGS };
let sceneDpi = 150;

function readDisplaySettings(meta: Metadata): DisplaySettings {
  const raw = meta[getPluginId(SCENE_DISPLAY_METADATA_ID)];
  if (raw !== null && typeof raw === "object") {
    return { ...DEFAULT_DISPLAY_SETTINGS, ...(raw as Partial<DisplaySettings>) };
  }
  return { ...DEFAULT_DISPLAY_SETTINGS };
}

export async function initOnMapDisplay() {
  const meta = await OBR.scene.getMetadata();
  displaySettings = readDisplaySettings(meta);

  OBR.scene.onMetadataChange((meta) => {
    displaySettings = readDisplaySettings(meta);
    void refreshAll();
  });

  OBR.scene.onReadyChange(async (isReady) => {
    if (isReady) { await refreshAll(); startListeners(); }
  });

  const isReady = await OBR.scene.isReady();
  if (isReady) { await refreshAll(); startListeners(); }
}

async function refreshAll() {
  sceneDpi = await OBR.scene.grid.getDpi();

  const items: Image[] = await OBR.scene.items.getItems(
    (item) => (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item),
  );
  itemsLast = items;

  const addItems: Item[] = [];
  const deleteIds: string[] = [];
  for (const item of items) updateItem(item, addItems, deleteIds);

  if (deleteIds.length > 0) await OBR.scene.local.deleteItems(deleteIds);
  await batchAdd(addItems);
}

function startListeners() {
  if (sceneListenersSet) return;
  sceneListenersSet = true;

  const unsubItems = OBR.scene.items.onChange(async (allItems) => {
    const images: Image[] = allItems.filter(
      (item): item is Image =>
        (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item),
    );
    const changed = getChangedItems(images);
    itemsLast = images;
    if (changed.length === 0) return;

    const addItems: Item[] = [];
    const deleteIds: string[] = [];
    for (const item of changed) updateItem(item, addItems, deleteIds);

    if (deleteIds.length > 0) await OBR.scene.local.deleteItems(deleteIds);
    await batchAdd(addItems);
  });

  OBR.scene.onReadyChange((isReady) => {
    if (!isReady) { unsubItems(); sceneListenersSet = false; }
  });
}

function updateItem(image: Image, addItems: Item[], deleteIds: string[]) {
  deleteIds.push(...getAllAttachmentIds(image.id));

  const raw = image.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)];
  if (raw === undefined) return;

  const data = getActiveDataFromItem(image);
  const { showStrain, showConditions } = displaySettings;

  if (showStrain) {
    buildStrainItems(image, sceneDpi, data, addItems);
  }

  buildInjuryItems(
    image, sceneDpi, data, displaySettings,
    showStrain ? STRAIN_ROW_HEIGHT : 0,
    addItems,
  );

  // Build the text bubble row when there is anything to show:
  // untreated complications always appear; conditions appear when showConditions is on.
  const hasUntreatedComplications = [
    ...data.seriousInjuries,
    data.criticalInjury,
    data.lethalInjury,
  ].some((s) => !s.treated && s.complications.length > 0);

  const hasConditions = showConditions && data.conditions.length > 0;

  if (hasUntreatedComplications || hasConditions) {
    buildConditionItems(
      image, sceneDpi, data,
      showStrain ? STRAIN_ROW_HEIGHT : 0,
      INJURY_ROW_HEIGHT,
      addItems,
      showConditions,
    );
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
async function batchAdd(items: Item[]) {
  if (items.length === 0) return;
  for (let i = 0; i < Math.ceil(items.length / BATCH_SIZE); i++) {
    await OBR.scene.local.addItems(
      items.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
    );
  }
}
