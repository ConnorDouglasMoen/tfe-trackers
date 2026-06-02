import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { HIDDEN_METADATA_ID } from "../characterDataHelpers";
import { clearTokenData } from "../itemMetadataHelpers";
import { initOnMapDisplay } from "./onMapDisplay";

/** localStorage key for pinned token IDs — must match useTrackedTokensStore. */
const STORAGE_KEY = getPluginId("trackedTokenIds");

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

  // All-users context menu: pin/unpin a token from the Action panel tracker
  // list. Each user's list is private — stored in player metadata, not scene
  // metadata — so GMs and players maintain independent lists.
  //
  // Players only see this entry on tokens they have UPDATE permission on
  // (i.e. tokens they own) and that are not hidden by the GM.
  // GMs see it on all CHARACTER/MOUNT tokens.
  OBR.contextMenu.create({
    id: getPluginId("pin-token"),
    icons: [
      {
        icon: menuIcon,
        label: "Pin to Action Panel",
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
          max: 1,
        },
      },
      {
        // GMs can pin any token regardless of hidden flag.
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
    onClick: (context) => {
      const itemId = context.items[0]?.id;
      if (itemId === undefined) return;

      // Read/write localStorage directly — synchronous, private per-browser,
      // persists across page refreshes.
      let current: string[] = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            current = parsed.filter((v): v is string => typeof v === "string");
          }
        }
      } catch { /* ignore */ }

      const next = current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId];

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
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

      // Clear all TFE metadata and on-map attachments from the token.
      await clearTokenData(itemId);

      // Also remove the token from this user's Action panel tracker list.
      // clearTokenData only wipes OBR metadata; localStorage must be updated
      // separately. The StorageEvent fired here will propagate to any open
      // Action panel iframe so it re-renders without the cleared token.
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter(
              (v): v is string => typeof v === "string" && v !== itemId,
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
          }
        }
      } catch { /* ignore storage errors */ }
    },
  });

  // Start the on-map display system.
  initOnMapDisplay();
});
