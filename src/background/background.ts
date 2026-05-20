import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { HIDDEN_METADATA_ID } from "../characterDataHelpers";

// The outline icon shown in the OBR context menu button.
// Replace this path once the logo SVG is added to /public.
const menuIcon = new URL(
  "../../public/tfe-trackers-logo-outline.svg",
  import.meta.url,
).toString();

const contextMenuLabel = "TFE Trackers";

// Height of the token menu embed in pixels.
// Adjust as the UI grows.
const TOKEN_MENU_HEIGHT = 420;

OBR.onReady(async () => {
  // Log extension version from manifest for debugging.
  fetch("/manifest.json")
    .then((r) => r.json())
    .then((json) =>
      console.log(`${json["name"] as string} - version: ${json["version"] as string}`),
    );

  // --- Player context menu ---
  // Visible to players on CHARACTER/MOUNT IMAGE tokens that are not hidden.
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
            // Hide menu button when trackers are hidden by GM
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

  // --- GM context menu ---
  // Visible to GMs on any CHARACTER/MOUNT IMAGE token; no hidden filter.
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
});
