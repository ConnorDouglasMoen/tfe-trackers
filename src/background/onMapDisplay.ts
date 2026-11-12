import OBR, { Image, Item, Metadata, isImage } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import {
  TOKEN_RECORD_METADATA_ID,
  SCENE_DISPLAY_METADATA_ID,
  DisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  getActiveData,
  parseDisplaySettings,
  resolveDisplaySettings,
} from "../characterDataHelpers";
import { getTokenRecordFromItem } from "../itemMetadataHelpers";
import { getAllAttachmentIds } from "./onMapItemIds";
import {
  buildStrainItems,
  buildInjuryItems,
  buildConditionItems,
  buildNameBubble,
} from "./onMapHelpers";

const TOKEN_RECORD_KEY = getPluginId(TOKEN_RECORD_METADATA_ID);

/** Collapses bursts of item changes (e.g. dragging a token) into one redraw. */
const ITEM_CHANGE_DEBOUNCE_MS = 150;

/**
 * Glyphs drawn before Roboto finishes loading fall back to a system font, so
 * the first scene load gets one extra redraw after this delay.
 */
const FONT_REFRESH_DELAY_MS = 1000;

const BATCH_SIZE = 100;

let itemsLast: Image[] = [];
let displaySettings: DisplaySettings = { ...DEFAULT_DISPLAY_SETTINGS };
let displaySettingsJson = JSON.stringify(displaySettings);
let sceneDpi = 150;

let unsubscribeItems: (() => void) | null = null;
let itemChangeTimer: ReturnType<typeof setTimeout> | null = null;
let fontRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let fontRefreshDone = false;

/**
 * Bumped at the start of every full refresh. A refresh that sees a newer
 * generation after an await stops, so it can't draw into a scene that closed
 * or was redrawn in the meantime.
 */
let refreshGeneration = 0;

function isTokenImage(item: Item): item is Image {
  return (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item);
}

/** True if any item is a tracked token or one of our attachments. */
function hasRelevantItems(items: Item[]): boolean {
  return items.some(
    (item) =>
      item.id.includes("-tfe-") || (isTokenImage(item) && TOKEN_RECORD_KEY in item.metadata),
  );
}

/** Update the cached settings. Returns false if nothing changed. */
function applySceneMetadata(meta: Metadata): boolean {
  const next = parseDisplaySettings(meta[getPluginId(SCENE_DISPLAY_METADATA_ID)]);
  const nextJson = JSON.stringify(next);
  if (nextJson === displaySettingsJson) return false;
  displaySettings = next;
  displaySettingsJson = nextJson;
  return true;
}

export function initOnMapDisplay(): () => void {
  // Subscribe before the first await so a ready event can't slip past us.
  const unsubscribeReady = OBR.scene.onReadyChange((isReady) => {
    if (isReady) void handleSceneReady();
    else handleSceneClosed();
  });

  const unsubscribeMetadata = OBR.scene.onMetadataChange((meta) => {
    // Other extensions write scene metadata too; only redraw for our settings.
    if (applySceneMetadata(meta)) void refreshAll();
  });

  // The scene may already be open, e.g. when the extension is reloaded.
  void OBR.scene.isReady().then((isReady) => {
    if (isReady) void handleSceneReady();
  });

  return () => {
    unsubscribeReady();
    unsubscribeMetadata();
    unsubscribeItems?.();
    unsubscribeItems = null;
    clearTimer(itemChangeTimer);
    clearTimer(fontRefreshTimer);
    itemChangeTimer = null;
    fontRefreshTimer = null;
  };
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
  if (timer !== null) clearTimeout(timer);
}

async function handleSceneReady() {
  // Settings may have changed while no scene was open.
  applySceneMetadata(await OBR.scene.getMetadata());
  await refreshAll();
  subscribeToItems();

  if (!fontRefreshDone && fontRefreshTimer === null) {
    fontRefreshTimer = setTimeout(() => {
      fontRefreshTimer = null;
      fontRefreshDone = true;
      void refreshAll();
    }, FONT_REFRESH_DELAY_MS);
  }
}

function handleSceneClosed() {
  refreshGeneration++;
  unsubscribeItems?.();
  unsubscribeItems = null;
  clearTimer(itemChangeTimer);
  itemChangeTimer = null;
}

function subscribeToItems() {
  if (unsubscribeItems !== null) return;

  unsubscribeItems = OBR.scene.items.onChange((allItems) => {
    if (!hasRelevantItems(allItems)) return;

    clearTimer(itemChangeTimer);
    itemChangeTimer = setTimeout(() => {
      itemChangeTimer = null;
      const images = allItems.filter(isTokenImage);
      const changed = getChangedItems(images);
      itemsLast = images;
      if (changed.length > 0) void redraw(changed);
    }, ITEM_CHANGE_DEBOUNCE_MS);
  });
}

async function refreshAll() {
  const generation = ++refreshGeneration;

  sceneDpi = await OBR.scene.grid.getDpi();
  if (generation !== refreshGeneration) return;

  const items = await OBR.scene.items.getItems(isTokenImage);
  if (generation !== refreshGeneration) return;
  itemsLast = items;

  await redraw(items, () => generation === refreshGeneration);
}

/** Delete and rebuild the attachments for the given tokens. */
async function redraw(images: Image[], isCurrent: () => boolean = () => true) {
  const addItems: Item[] = [];
  const deleteIds: string[] = [];
  for (const image of images) {
    deleteIds.push(...getAllAttachmentIds(image.id));
    buildAttachments(image, addItems);
  }

  if (deleteIds.length > 0) await OBR.scene.local.deleteItems(deleteIds);
  if (!isCurrent()) return;
  for (let i = 0; i < addItems.length; i += BATCH_SIZE) {
    await OBR.scene.local.addItems(addItems.slice(i, i + BATCH_SIZE));
  }
}

function buildAttachments(image: Image, addItems: Item[]) {
  if (image.metadata[TOKEN_RECORD_KEY] === undefined) return;

  const record = getTokenRecordFromItem(image);
  const data = getActiveData(record);
  const settings = resolveDisplaySettings(displaySettings, record.displayOverrides);

  if (settings.showStrain) {
    buildStrainItems(image, sceneDpi, data, settings, addItems);
  }
  if (settings.injuryDisplay !== "none") {
    buildInjuryItems(image, sceneDpi, data, settings, addItems);
  }
  // showConditions hides complication bubbles as well as condition bubbles.
  if (settings.showConditions) {
    buildConditionItems(image, sceneDpi, data, settings, addItems, true);
  }
  if (settings.showName && record.displayName !== "") {
    buildNameBubble(image, sceneDpi, record.displayName, settings, addItems);
  }
}

/** Tokens that are new, or whose position, scale, visibility, or record changed. */
function getChangedItems(current: Image[]): Image[] {
  const lastById = new Map(itemsLast.map((img) => [img.id, img]));
  return current.filter((cur) => {
    const last = lastById.get(cur.id);
    return (
      last === undefined ||
      last.scale.x !== cur.scale.x ||
      last.scale.y !== cur.scale.y ||
      last.position.x !== cur.position.x ||
      last.position.y !== cur.position.y ||
      last.visible !== cur.visible ||
      JSON.stringify(last.metadata[TOKEN_RECORD_KEY]) !==
        JSON.stringify(cur.metadata[TOKEN_RECORD_KEY])
    );
  });
}
