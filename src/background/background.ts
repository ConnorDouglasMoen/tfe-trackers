import OBR, { KeyFilter } from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { HIDDEN_METADATA_ID } from "../characterDataHelpers";
import { clearTokenData } from "../itemMetadataHelpers";
import { removeTrackedTokenId, toggleTrackedTokenId } from "../trackedTokenStorage";
import { initOnMapDisplay } from "./onMapDisplay";

const menuIcon = new URL("../../public/tfe-cowboy.svg", import.meta.url).toString();
const MENU_LABEL = "TFE Trackers";
const TOKEN_MENU_URL = "/src/tokenMenu/tokenMenu.html";
const TOKEN_MENU_HEIGHT = 600;
const PIN_LABEL = "Pin/Unpin to Action Panel";

/** Image tokens on the Character or Mount layer. */
const TOKEN_FILTER: KeyFilter[] = [
  { key: "layer", value: "CHARACTER", coordinator: "||" },
  { key: "layer", value: "MOUNT" },
  { key: "type", value: "IMAGE" },
];

/** Tokens the GM hasn't hidden from players. */
const NOT_HIDDEN_FILTER: KeyFilter[] = [
  ...TOKEN_FILTER,
  { key: ["metadata", getPluginId(HIDDEN_METADATA_ID)], value: true, operator: "!=" },
];

OBR.onReady(() => {
  void logVersion();

  // Players can open the editor on tokens they control that aren't hidden.
  OBR.contextMenu.create({
    id: getPluginId("player-menu"),
    icons: [
      {
        icon: menuIcon,
        label: MENU_LABEL,
        filter: { every: NOT_HIDDEN_FILTER, permissions: ["UPDATE"], roles: ["PLAYER"], max: 1 },
      },
    ],
    embed: { url: TOKEN_MENU_URL, height: TOKEN_MENU_HEIGHT },
  });

  OBR.contextMenu.create({
    id: getPluginId("gm-menu"),
    icons: [
      {
        icon: menuIcon,
        label: MENU_LABEL,
        filter: { every: TOKEN_FILTER, roles: ["GM"], max: 1 },
      },
    ],
    embed: { url: TOKEN_MENU_URL, height: TOKEN_MENU_HEIGHT },
  });

  // Each user's pinned list lives in their own browser storage. The Action
  // panel picks up the change through a `storage` event.
  OBR.contextMenu.create({
    id: getPluginId("pin-token"),
    icons: [
      {
        icon: menuIcon,
        label: PIN_LABEL,
        filter: { every: NOT_HIDDEN_FILTER, permissions: ["UPDATE"], max: 1 },
      },
      {
        // GMs can pin any token, hidden or not.
        icon: menuIcon,
        label: PIN_LABEL,
        filter: { every: TOKEN_FILTER, roles: ["GM"], max: 1 },
      },
    ],
    onClick: (context) => {
      const itemId = context.items[0]?.id;
      if (itemId !== undefined) toggleTrackedTokenId(itemId);
    },
  });

  OBR.contextMenu.create({
    id: getPluginId("clear-token-data"),
    icons: [
      {
        icon: menuIcon,
        label: "Clear TFE Data",
        filter: { every: TOKEN_FILTER, roles: ["GM"], max: 1 },
      },
    ],
    onClick: async (context) => {
      const itemId = context.items[0]?.id;
      if (itemId === undefined) return;
      await clearTokenData(itemId);
      removeTrackedTokenId(itemId);
    },
  });

  // The background page lives for the whole session, so the cleanup fn isn't needed.
  initOnMapDisplay();
});

async function logVersion() {
  try {
    const response = await fetch(new URL("/manifest.json", window.location.origin));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { name, version } = (await response.json()) as { name: string; version: string };
    console.log(`${name} - version: ${version}`);
  } catch (err) {
    console.warn("Could not load manifest.json:", err);
  }
}
