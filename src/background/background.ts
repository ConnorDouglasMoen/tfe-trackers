import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { HIDDEN_METADATA_ID } from "../characterDataHelpers";
import { clearTokenData } from "../itemMetadataHelpers";
import { initOnMapDisplay } from "./onMapDisplay";

/** Scene metadata key for pinned token IDs — must match useTrackedTokensStore. */
const TRACKED_TOKENS_METADATA_ID = "trackedTokenIds";

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

  // GM-only context menu: pin/unpin a token from the Action panel tracker list.
  // The label and icon change depending on whether the token is already tracked.
  // Two separate registrations handle the two visual states; OBR picks the first
  // whose filter matches the current selection + metadata.
  OBR.contextMenu.create({
    id: getPluginId("pin-token"),
    icons: [
      {
        // Shown when the token is NOT yet in the tracked list → offer to pin.
        icon: menuIcon,
        label: "Pin to Action Panel",
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
    onClick: async (context) => {
      const itemId = context.items[0]?.id;
      if (itemId === undefined) return;

      const key = getPluginId(TRACKED_TOKENS_METADATA_ID);
      const metadata = await OBR.scene.getMetadata();
      const raw = metadata[key];
      const current: string[] = Array.isArray(raw)
        ? (raw as unknown[]).filter((v): v is string => typeof v === "string")
        : [];

      let next: string[];
      if (current.includes(itemId)) {
        // Already tracked → remove (unpin).
        next = current.filter((id) => id !== itemId);
      } else {
        // Not tracked → add (pin).
        next = [...current, itemId];
      }

      await OBR.scene.setMetadata({ [key]: next });
    },
  });

  // GM-only context menu: wipe all TFE Tracker data from a token and remove
  // its on-map attachments, resetting it to a clean slate.
  OBR.contextMenu.create({
    id: getPluginId("clear-token-data"),
    icons: [
      {
        icon: menuIcon,
        label: "Clear TFE Data",
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
    onClick: async (context) => {
      const itemId = context.items[0]?.id;
      if (itemId === undefined) return;
      await clearTokenData(itemId);
    },
  });

  // Start the on-map display system.
  initOnMapDisplay();
});
