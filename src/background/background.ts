import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { HIDDEN_METADATA_ID } from "../characterDataHelpers";
import { initOnMapDisplay } from "./onMapDisplay";

// Use the same icon as the Action button for visual consistency.
const menuIcon = new URL(
  "../../public/tfe-cowboy.svg",
  import.meta.url,
).toString();

const contextMenuLabel = "TFE Trackers";

/**
 * Embed heights (pixels).
 * Players see: type toggle, strain, injuries, conditions.
 * GMs see all of the above plus On-Map Display settings.
 * These values should be tuned once the UI is confirmed in OBR.
 */
const PLAYER_MENU_HEIGHT = 420;
const GM_MENU_HEIGHT = 560;

OBR.onReady(async () => {
  fetch("/manifest.json")
    .then((r) => r.json())
    .then((json) =>
      console.log(
        `${json["name"] as string} - version: ${json["version"] as string}`,
      ),
    );

  // Player context menu — hidden when trackers are marked hidden by GM.
  OBR.contextMenu.create({
    id: getPluginId("player-menu"),
    icons: [
      {
        icon: menuIcon,
        label: contextMenuLabel,
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
            {
              key: ["metadata", getPluginId(HIDDEN_METADATA_ID)],
              value: true,
              operator: "!=",
            },
          ],
          permissions: ["UPDATE"],
          roles: ["PLAYER"],
          max: 1,
        },
      },
    ],
    embed: {
      url: "/src/tokenMenu/tokenMenu.html",
      height: PLAYER_MENU_HEIGHT,
    },
  });

  // GM context menu — always visible; taller to accommodate display settings.
  OBR.contextMenu.create({
    id: getPluginId("gm-menu"),
    icons: [
      {
        icon: menuIcon,
        label: contextMenuLabel,
        filter: {
          every: [
            { key: "layer", value: "CHARACTER", coordinator: "||" },
            { key: "layer", value: "MOUNT" },
            { key: "type", value: "IMAGE" },
          ],
          roles: ["GM"],
          max: 1,
        },
      },
    ],
    embed: {
      url: "/src/tokenMenu/tokenMenu.html",
      height: GM_MENU_HEIGHT,
    },
  });

  // Start the on-map display system.
  initOnMapDisplay();
});
