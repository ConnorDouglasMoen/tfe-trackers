# TFE Trackers

An [Owlbear Rodeo](https://www.owlbear.rodeo/) extension for tracking Strain, Injuries, and Conditions in the _Tales from Elsewhere_ RPG.

## Features

- **Token menu.** Right-click a Character or Mount token and choose _TFE Trackers_ to edit it: Survivor/Other type, strain, injuries (description, complications, treated), conditions, and a display name.
- **On-map markers.** Strain boxes and injury circles sit along the bottom of each tracked token. Untreated complications and conditions appear as bubbles across the top, and the display name appears at the bottom right.
- **Action panel.** Pin tokens to the Action panel to edit them without selecting them. GMs can pin or unpin everything at once and drag rows to reorder them.
- **Display settings.** The GM sets scene-wide visibility and marker/text size from the Action panel. Any token can override the visibility settings from its own menu.

### Character types

- **Survivor** (player characters): 3 strain by default, two Serious slots, one Critical, and one Lethal.
- **Other** (NPCs): 1 strain and one Serious slot by default. Use the +/− controls to add or remove slots.

Each token keeps separate Survivor and Other data, so switching between them doesn't lose anything.

## Development

Requires Node and pnpm 8.

```sh
pnpm install
pnpm dev:obr
```

`dev:obr` writes `public/manifest.dev.json` with absolute localhost URLs and starts Vite on port 5173. In Owlbear Rodeo, add the extension from `http://localhost:5173/manifest.dev.json`. For a different host or port, run `node scripts/write-dev-manifest.mjs --base-url <url>` first.

Other scripts:

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run the Vitest suite |
| `pnpm lint` | ESLint |
| `pnpm build` | Type-check and build to `dist/` |

### Manual test checklist

1. As GM, open a scene and check that the Action panel loads.
2. Edit a Survivor's strain, injuries, complications, treated state, and conditions from the token menu. Check the markers on the map.
3. Switch the token to Other and back. The Survivor data should still be there.
4. Change scene display settings and sizes, then override one of them on a single token.
5. Pin a token, edit it from the Action panel, then delete it from the scene. It should drop out of the pinned list.
6. Repeat as a player and confirm the GM-only controls are hidden.

## How it works

The extension has three pages, each a Vite entry point:

- `src/background/`: registers the context menus and draws the on-map markers as local items attached to each token.
- `src/tokenMenu/`: the per-token editor shown in the context menu (and in the larger "Open Editor" popover).
- `src/action/`: the Action panel.

### Stored data

All keys are prefixed with `com.tfe-trackers/`.

| Where | Key | Contents |
| --- | --- | --- |
| Token metadata | `tokenRecord` | Survivor and Other data, the active type, display overrides, and display name |
| Token metadata | `hidden` | When true, players don't get the token's menu entries |
| Scene metadata | `sceneDisplaySettings` | Scene-wide display settings, written by the GM |
| Browser localStorage | `trackedTokenIds` | Each user's pinned tokens. It's per-browser because player metadata doesn't survive a refresh |

Records saved by older versions, including the earlier `characterData` key, are migrated when read (see `migrateToTokenRecord` in `src/characterDataHelpers.ts`).
