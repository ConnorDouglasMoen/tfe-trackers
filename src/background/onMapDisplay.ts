import OBR, { Image, Item, Metadata, isImage } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import {
  TOKEN_RECORD_METADATA_ID,
  DisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  resolveDisplaySettings,
} from "../characterDataHelpers";
import { SCENE_DISPLAY_METADATA_ID } from "../useSceneDisplayStore";
import { getActiveDataFromItem, getTokenRecordFromItem } from "../itemMetadataHelpers";
import { getAllAttachmentIds } from "./onMapItemIds";
import { buildStrainItems, buildInjuryItems, buildConditionItems, buildNameBubble } from "./onMapHelpers";

let itemsLast: Image[] = [];
let sceneListenersSet = false;
let displaySettings: DisplaySettings = { ...DEFAULT_DISPLAY_SETTINGS };
let sceneDpi = 150;

// Serialized snapshot of the last-known display settings used to detect
// no-op scene metadata changes (other plugins writing unrelated metadata
// should not trigger a full TFE redraw).
let displaySettingsJson = JSON.stringify(DEFAULT_DISPLAY_SETTINGS);

// Debounce handle for item-change redraws. Rapid consecutive onChange events
// (e.g. dragging a token) collapse into a single redraw fired after the delay.
let itemChangeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const ITEM_CHANGE_DEBOUNCE_MS = 150;

// Fonts (e.g. Roboto) may not be loaded when OBR first fires onReadyChange,
// causing Unicode symbols to fall back to a system font and render incorrectly.
// A delayed second refresh (matching the owl-trackers reference approach)
// corrects any mis-rendered glyphs once fonts have had time to load.
let extraRefreshDone = false;
const EXTRA_REFRESH_DELAY = 1000;

/**
 * Incremented each time refreshAll starts. Checked after each await so that
 * a scene not-ready transition mid-refresh causes the stale run to abort
 * instead of adding items to a scene that just wiped local state.
 */
let refreshGeneration = 0;

function readDisplaySettings(meta: Metadata): DisplaySettings {
  const raw = meta[getPluginId(SCENE_DISPLAY_METADATA_ID)];
  if (raw !== null && typeof raw === "object") {
    return { ...DEFAULT_DISPLAY_SETTINGS, ...(raw as Partial<DisplaySettings>) };
  }
  return { ...DEFAULT_DISPLAY_SETTINGS };
}

/**
 * Returns true if `items` contains at least one TFE-relevant item: either a
 * CHARACTER/MOUNT image token with TFE metadata, or a TFE local attachment
 * (identified by the "-tfe-" substring in its ID). This guards the
 * items.onChange handler from triggering redraws when unrelated tokens
 * (plain images, drawings, rulers, etc.) are the only things that changed.
 */
function hasTfeRelevantItems(items: Item[]): boolean {
  return items.some(
    (item) =>
      item.id.includes("-tfe-") ||
      ((item.layer === "CHARACTER" || item.layer === "MOUNT") &&
        isImage(item) &&
        getPluginId(TOKEN_RECORD_METADATA_ID) in item.metadata),
  );
}

export function initOnMapDisplay() {
  // Wire up the ready-change listener first — before any awaits — so we never
  // miss a ready event due to async yielding. Everything else is triggered from
  // here rather than relying on a post-await isReady() check, which has a
  // window where the ready event fires between the call and the check.
  OBR.scene.onReadyChange(async (isReady) => {
    if (isReady) {
      // Read metadata fresh on each scene-ready so display settings are always
      // current (the previous getMetadata call happened before ready, potentially
      // returning empty/stale data).
      const meta = await OBR.scene.getMetadata();
      displaySettings = readDisplaySettings(meta);
      await refreshAll();
      startListeners();
      setTimeout(() => {
        if (!extraRefreshDone) void refreshAll();
        extraRefreshDone = true;
      }, EXTRA_REFRESH_DELAY);
    }
  });

  // Respond to scene-level display setting changes (GM Action panel updates).
  // Early-exit when TFE's own display settings haven't actually changed — this
  // prevents full redraws when other plugins write unrelated scene metadata.
  OBR.scene.onMetadataChange((meta) => {
    const next = readDisplaySettings(meta);
    const nextJson = JSON.stringify(next);
    if (nextJson === displaySettingsJson) return;
    displaySettings = next;
    displaySettingsJson = nextJson;
    void refreshAll();
  });

  // Also handle the case where the scene is already ready when the background
  // script loads (e.g. extension reload without page refresh).
  void (async () => {
    const isReady = await OBR.scene.isReady();
    if (isReady) {
      const meta = await OBR.scene.getMetadata();
      displaySettings = readDisplaySettings(meta);
      await refreshAll();
      startListeners();
      setTimeout(() => {
        if (!extraRefreshDone) void refreshAll();
        extraRefreshDone = true;
      }, EXTRA_REFRESH_DELAY);
    }
  })();
}

async function refreshAll() {
  // Claim this generation; any concurrent or prior refreshAll calls with a
  // lower generation will bail out after their next await, preventing a race
  // where deleteItems succeeds but batchAdd runs against a stale/gone scene.
  const generation = ++refreshGeneration;

  sceneDpi = await OBR.scene.grid.getDpi();
  if (generation !== refreshGeneration) return;

  const items: Image[] = await OBR.scene.items.getItems(
    (item) => (item.layer === "CHARACTER" || item.layer === "MOUNT") && isImage(item),
  );
  if (generation !== refreshGeneration) return;
  itemsLast = items;

  const addItems: Item[] = [];
  const deleteIds: string[] = [];
  for (const item of items) updateItem(item, addItems, deleteIds);

  if (deleteIds.length > 0) await OBR.scene.local.deleteItems(deleteIds);
  if (generation !== refreshGeneration) return;
  await batchAdd(addItems);
}

function startListeners() {
  if (sceneListenersSet) return;
  sceneListenersSet = true;

  const unsubItems = OBR.scene.items.onChange((allItems) => {
    // Skip entirely if no TFE-relevant items are in the changed set — this
    // avoids redraws when only unrelated scene items (props, drawings, etc.)
    // were modified.
    if (!hasTfeRelevantItems(allItems)) return;

    // Debounce: cancel any pending redraw and schedule a fresh one. This
    // collapses rapid successive fires (e.g. token drag) into a single redraw.
    if (itemChangeDebounceTimer !== null) clearTimeout(itemChangeDebounceTimer);
    itemChangeDebounceTimer = setTimeout(async () => {
      itemChangeDebounceTimer = null;

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
    }, ITEM_CHANGE_DEBOUNCE_MS);
  });

  OBR.scene.onReadyChange((isReady) => {
    if (!isReady) {
      // Scene went away — tear down item listener and allow re-init.
      unsubItems();
      sceneListenersSet = false;
    } else {
      // Scene became ready again (e.g. after a mid-load not-ready blip).
      // Re-run a full refresh and restart listeners so nothing is missed.
      void refreshAll();
      startListeners();
    }
  });
}

function updateItem(image: Image, addItems: Item[], deleteIds: string[]) {
  deleteIds.push(...getAllAttachmentIds(image.id));

  const raw = image.metadata[getPluginId(TOKEN_RECORD_METADATA_ID)];
  if (raw === undefined) return;

  const data = getActiveDataFromItem(image);

  // Resolve effective display settings: token overrides take precedence over scene defaults.
  const record = getTokenRecordFromItem(image);
  const effectiveSettings = resolveDisplaySettings(displaySettings, record.displayOverrides);
  const { showStrain, showConditions, injuryDisplay } = effectiveSettings;

  if (showStrain) {
    buildStrainItems(image, sceneDpi, data, effectiveSettings, addItems);
  }

  // Injury circles — skipped entirely when injuryDisplay is "none".
  if (injuryDisplay !== "none") {
    buildInjuryItems(
      image, sceneDpi, data, effectiveSettings,
      addItems,
    );
  }

  // Text bubbles — both complications and conditions are gated by showConditions.
  const hasUntreatedComplications = showConditions && [
    ...data.seriousInjuries,
    data.criticalInjury,
    data.lethalInjury,
  ].some((s) => !s.treated && s.complications.length > 0);

  const hasConditions = showConditions && data.conditions.length > 0;

  if (hasUntreatedComplications || hasConditions) {
    buildConditionItems(
      image, sceneDpi, data,
      effectiveSettings,
      addItems,
      showConditions,
    );
  }

  // Name bubble — gated by resolved showName setting.
  if (record.displayName !== "" && effectiveSettings.showName) {
    buildNameBubble(image, sceneDpi, record.displayName, effectiveSettings, addItems);
  }
}

/**
 * Returns items that are new or have changed position, scale, visibility, or
 * token metadata since the last snapshot. Uses a Map keyed by item ID so
 * order differences between itemsLast and the current list don't cause items
 * to be silently skipped (the previous index-walk algorithm could mis-skip
 * tokens when the array order shifted, leaving attachments deleted but never
 * rebuilt).
 */
function getChangedItems(current: Image[]): Image[] {
  const lastById = new Map<string, Image>(itemsLast.map((img) => [img.id, img]));
  const changed: Image[] = [];
  for (const cur of current) {
    const last = lastById.get(cur.id);
    if (
      last === undefined ||
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
