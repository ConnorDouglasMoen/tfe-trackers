import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { HIDDEN_METADATA_ID } from "../characterDataHelpers";
import { initOnMapDisplay } from "./onMapDisplay";

const menuIcon = new URL(
  "../../public/tfe-trackers-logo-outline.svg",
  import.meta.url,
).toString();

const contextMenuLabel = "TFE Trackers";

// Fixed embed height. OBR.contextMenu has no setEmbedHeight method —
// height is set only at registration time.
const TOKEN_MENU_HEIGHT = 420;

OBR.onReady(async () => {
  fetch("/manifest.json")
    .then((r) => r.json())
    .then((json) =>
      console.log(`${json["name"] as string} - version: ${json["version"] as string}`),
    );

  // Player context menu — hidden when trackers are marked hidden by GM
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
      height: TOKEN_MENU_HEIGHT,
    },
  });

  // GM context menu — always visible regardless of hidden flag
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
      height: TOKEN_MENU_HEIGHT,
    },
  });

  // Start the on-map display system
  initOnMapDisplay();
});
