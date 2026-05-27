import {
  AttachmentBehavior,
  Image,
  Item,
  buildPath, Command,
  buildShape,
  buildText,
} from "@owlbear-rodeo/sdk";
import { CharacterData, DisplaySettings, InjurySlot } from "../characterDataHelpers";
import {
  getStrainBoxBgId,
  getStrainBoxXId,
  getInjuryCircleBgId,
  getInjuryCircleIconId,
  getConditionBgId,
  getConditionTextId,
  getNameBubbleBgId,
  getNameBubbleTextId,
} from "./onMapItemIds";
import { getImageCenter } from "./mathHelpers";

const DISABLE_BEHAVIORS: AttachmentBehavior[] = ["ROTATION", "VISIBLE", "COPY", "SCALE"];
const FONT = "Roboto, sans-serif";
const DISABLE_HIT = true;
const TEXT_VERTICAL_OFFSET = -1;

const BOX_SIZE = 14;
const BOX_GAP = 3;
const CIRCLE_SIZE = 16;
const CIRCLE_GAP = 2;
const ROW_GAP = 2;
const BUBBLE_HEIGHT = 12;
const BUBBLE_PADDING_X = 2;
const BUBBLE_FONT_SIZE = 9;
const ROW_OPACITY = 0.95;
const ATTACHMENT_LAYER = "ATTACHMENT" as const;
const TEXT_LAYER = "TEXT" as const;

const INJURY_COLORS = {
  serious:  { fill: "#d68e68", stroke: "#a44f27" },
  critical: { fill: "#db7777", stroke: "#94272c" },
  lethal:   { fill: "#7c4291", stroke: "#501e64" },
} as const;
type InjurySeverity = keyof typeof INJURY_COLORS;

function clampScale(scale: number): number {
  return Number.isFinite(scale) ? Math.min(Math.max(scale, 0.5), 2) : 1;
}

function getMarkerLayout(displaySettings: DisplaySettings) {
  const scale = clampScale(displaySettings.markerScale);
  return {
    boxSize: BOX_SIZE * scale,
    boxGap: BOX_GAP * scale,
    circleSize: CIRCLE_SIZE * scale,
    circleGap: CIRCLE_GAP * scale,
    rowGap: ROW_GAP * scale,
    strokeWidth: 1.5 * scale,
  };
}

function getBubbleLayout(displaySettings: DisplaySettings) {
  const scale = clampScale(displaySettings.textScale);
  return {
    height: BUBBLE_HEIGHT * scale,
    paddingX: BUBBLE_PADDING_X * scale,
    fontSize: BUBBLE_FONT_SIZE * scale,
    rowGap: ROW_GAP * scale,
    cornerRadius: 2 * scale,
    strokeWidth: 1 * scale,
  };
}

// Severity rank for dedup: higher = wins the color. Conditions have rank -1.
const SEVERITY_RANK: Record<InjurySeverity, number> = {
  serious: 0,
  critical: 1,
  lethal: 2,
};

function getTokenBottomLeft(image: Image, sceneDpi: number) {
  const center = getImageCenter(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const halfW = (image.image.width * dpiScale * Math.abs(image.scale.x)) / 2;
  const halfH = (image.image.height * dpiScale * Math.abs(image.scale.y)) / 2;
  return { x: center.x - halfW, y: center.y + halfH };
}

function getTokenTopLeft(image: Image, sceneDpi: number) {
  const center = getImageCenter(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const halfW = (image.image.width * dpiScale * Math.abs(image.scale.x)) / 2;
  const halfH = (image.image.height * dpiScale * Math.abs(image.scale.y)) / 2;
  return { x: center.x - halfW, y: center.y - halfH };
}

function buildCenteredShapeWithText(opts: {
  image: Image;
  shapeId: string;
  textId: string;
  cx: number;
  cy: number;
  size: number;
  shapeType: "RECTANGLE" | "CIRCLE";
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeOpacity: number;
  strokeWidth: number;
  text: string;
  fontSize: number;
  textColor: string;
  textOpacity: number;
  fontWeight: number;
  addItems: Item[];
}) {
  const {
    image, shapeId, textId, cx, cy, size, shapeType,
    fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth,
    text, fontSize, textColor, textOpacity, fontWeight, addItems,
  } = opts;

  addItems.push(
    buildShape()
      .width(size).height(size).shapeType(shapeType)
      .fillColor(fillColor).fillOpacity(fillOpacity)
      .strokeColor(strokeColor).strokeOpacity(strokeOpacity).strokeWidth(strokeWidth)
      .position({ x: cx, y: cy })
      .attachedTo(image.id).layer(ATTACHMENT_LAYER).locked(true)
      .id(shapeId).visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
      .build(),
  );

  let textCX = cx;
  let textCY = cy

  if (shapeType === "RECTANGLE") {
    textCX = cx + size / 2;
    textCY = cy + size / 2;
  }

  addItems.push(
    buildText()
      .position({ x: textCX - size / 2, y: textCY - size / 2 + TEXT_VERTICAL_OFFSET })
      .plainText(text)
      .textAlign("CENTER").textAlignVertical("MIDDLE")
      .fontSize(fontSize).fontFamily(FONT).textType("PLAIN")
      .height(size + 2).width(size)
      .fontWeight(fontWeight)
      .fillColor(textColor).fillOpacity(textOpacity)
      .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
      .id(textId).visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
      .build(),
  );
}

/////////////////////////////////////////////////////////////////////
// Strain boxes
/////////////////////////////////////////////////////////////////////

export function buildStrainItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  displaySettings: DisplaySettings,
  addItems: Item[],
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const layout = getMarkerLayout(displaySettings);
  const rowY = origin.y - (layout.boxSize + layout.rowGap);

  for (let i = 0; i < data.strainMax; i++) {
    const cx = origin.x + layout.rowGap + i * (layout.boxSize + layout.boxGap);
    const filled = i < data.strainCurrent;

    buildCenteredShapeWithText({
      image,
      shapeId: getStrainBoxBgId(image.id, i),
      textId: getStrainBoxXId(image.id, i),
      cx, cy: rowY,
      size: layout.boxSize,
      shapeType: "RECTANGLE",
      fillColor: filled ? "#b42828" : "#1a0000",
      fillOpacity: filled ? ROW_OPACITY : 0.4,
      strokeColor: filled ? "#b42828" : "#d25050",
      strokeOpacity: ROW_OPACITY,
      strokeWidth: layout.strokeWidth,
      text: filled ? "✕" : "",
      fontSize: layout.boxSize - 2,
      textColor: "#500a0a",
      textOpacity: filled ? 1 : 0,
      fontWeight: 700,
      addItems,
    });
  }
}

/////////////////////////////////////////////////////////////////////
// Injury circles
/////////////////////////////////////////////////////////////////////

interface ResolvedInjury {
  slot: string;
  severity: InjurySeverity;
  injurySlot: InjurySlot;
  isEmpty: boolean;
}

/** Returns active injury slots, correctly checking array complications. */
function resolveInjuries(data: CharacterData): ResolvedInjury[] {
  const resolved: ResolvedInjury[] = [];

  const isEmpty = (s: InjurySlot) =>
    s.description === "" && s.complications.length === 0 && !s.treated;

  if (data.hasSerious) {
    const count = data.characterType === "survivor" ? 2 : data.seriousCount;
    for (let i = 0; i < count; i++) {
      const s = data.seriousInjuries[i];
      resolved.push({ slot: `s${i}`, severity: "serious", injurySlot: s, isEmpty: isEmpty(s) });
    }
  }
  if (data.hasCritical) {
    const s = data.criticalInjury;
    resolved.push({ slot: "c", severity: "critical", injurySlot: s, isEmpty: isEmpty(s) });
  }
  if (data.hasLethal) {
    const s = data.lethalInjury;
    resolved.push({ slot: "l", severity: "lethal", injurySlot: s, isEmpty: isEmpty(s) });
  }

  return resolved;
}

export function buildInjuryItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  displaySettings: DisplaySettings,
  addItems: Item[],
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const layout = getMarkerLayout(displaySettings);
  const rowY = origin.y + layout.circleSize / 2;

  const resolved = resolveInjuries(data);
  const showEmpty = displaySettings.injuryDisplay === "all";
  let colIndex = 0;

  for (const inj of resolved) {
    if (inj.isEmpty && !showEmpty) continue;

    const cx = origin.x + layout.rowGap + colIndex * (layout.circleSize + layout.circleGap) + layout.circleSize / 2;
    const colors = INJURY_COLORS[inj.severity];
    const icon = inj.injurySlot.treated ? "✓" : inj.isEmpty ? "" : "!";

    buildCenteredShapeWithText({
      image,
      shapeId: getInjuryCircleBgId(image.id, inj.slot),
      textId: getInjuryCircleIconId(image.id, inj.slot),
      cx, cy: rowY,
      size: layout.circleSize,
      shapeType: "CIRCLE",
      fillColor: inj.isEmpty ? "#111111" : colors.fill,
      fillOpacity: inj.isEmpty ? 0.35 : ROW_OPACITY,
      strokeColor: colors.stroke,
      strokeOpacity: ROW_OPACITY,
      strokeWidth: layout.strokeWidth,
      text: icon,
      fontSize: layout.circleSize - 5,
      textColor: "#ffffff",
      textOpacity: ROW_OPACITY,
      fontWeight: 700,
      addItems,
    });

    colIndex++;
  }
}

/////////////////////////////////////////////////////////////////////
// Text bubbles (conditions + untreated complications, deduped)
/////////////////////////////////////////////////////////////////////

/**
 * Collect all text strings to display as bubbles, with their color.
 *
 * Rules:
 * - Conditions render in white (#ffffff).
 * - Untreated complications render in their injury severity color.
 * - If the same string appears in multiple sources, show it once using
 *   the color of the most severe source (lethal > critical > serious > condition).
 */
function collectBubbleStrings(
  data: CharacterData,
  showConditions: boolean,
): Array<{ text: string; color: string }> {
  // Map from normalised text → { color, rank }
  const seen = new Map<string, { color: string; rank: number }>();

  const consider = (text: string, color: string, rank: number) => {
    const key = text.trim().toLowerCase();
    if (key === "") return;
    const existing = seen.get(key);
    if (existing === undefined || rank > existing.rank) {
      seen.set(key, { color, rank });
    }
  };

  // Untreated complications from each active injury slot
  const injuries = resolveInjuries(data);
  for (const inj of injuries) {
    if (inj.injurySlot.treated) continue; // treated complications hidden
    const color = INJURY_COLORS[inj.severity].fill;
    const rank = SEVERITY_RANK[inj.severity];
    for (const comp of inj.injurySlot.complications) {
      consider(comp, color, rank);
    }
  }

  // Conditions (rank -1 — always loses to any injury color)
  if (showConditions) {
    for (const cond of data.conditions) {
      consider(cond, "#ffffff", -1);
    }
  }

  // Return in insertion order, preserving first-seen text casing
  return Array.from(seen.entries()).map(([key, { color }]) => ({
    // Use original casing from the first match by re-scanning
    text:
      [...inj_original_texts(data, showConditions)].find(
        (t) => t.trim().toLowerCase() === key,
      ) ?? key,
    color,
  }));
}

/** Helper: yields all raw text strings in severity order for casing lookup. */
function* inj_original_texts(
  data: CharacterData,
  showConditions: boolean,
): Generator<string> {
  const injuries = resolveInjuries(data);
  // Emit in severity order: lethal, critical, serious (so highest-rank wins casing)
  const ordered = [...injuries].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  for (const inj of ordered) {
    if (inj.injurySlot.treated) continue;
    for (const comp of inj.injurySlot.complications) yield comp;
  }
  if (showConditions) {
    for (const cond of data.conditions) yield cond;
  }
}

// Helper: returns text width for a string written in a specific size and font.
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

function getTextWidth(text: string, font: string) {
  if (!context) {
    throw new Error("Canvas 2D context is not supported.");
  }
  context.font = font; // e.g., "16px Roboto, sans-serif"
  return context.measureText(text).width;
}

export function buildConditionItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  displaySettings: DisplaySettings,
  addItems: Item[],
  showConditions: boolean,
): void {
  const origin = getTokenTopLeft(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const tokenWidth = image.image.width * dpiScale * Math.abs(image.scale.x);
  const layout = getBubbleLayout(displaySettings);

  const baseY = origin.y + layout.rowGap;
  const baseX = origin.x + layout.rowGap;
  let currentX = baseX;
  let currentY = baseY;
  const conicWeight = Math.sqrt(2) / 2;

  const bubbles = collectBubbleStrings(data, showConditions);

  for (let i = 0; i < bubbles.length; i++) {
    const { text, color } = bubbles[i];
    const textWidth = getTextWidth(text, `${layout.fontSize}px ${FONT}`);
    const bubbleWidth = Math.min(textWidth + layout.paddingX * 2, tokenWidth);

    if (i > 0 && currentX + bubbleWidth > baseX + tokenWidth) {
      currentX = baseX;
      currentY += layout.height + layout.rowGap;
    }

    addItems.push(
      buildPath()
        .commands([
          [Command.MOVE, currentX + layout.cornerRadius, currentY],
          [Command.LINE, currentX + bubbleWidth - layout.cornerRadius, currentY],
          [Command.CONIC, currentX + bubbleWidth - layout.cornerRadius, currentY + layout.cornerRadius, currentX + bubbleWidth, currentY + layout.cornerRadius, conicWeight],
          [Command.LINE, currentX + bubbleWidth, currentY + layout.height - layout.cornerRadius],
          [Command.CONIC, currentX + bubbleWidth - layout.cornerRadius, currentY + layout.height - layout.cornerRadius, currentX + bubbleWidth - layout.cornerRadius, currentY + layout.height, conicWeight],
          [Command.LINE, currentX + layout.cornerRadius, currentY + layout.height],
          [Command.CONIC, currentX + layout.cornerRadius, currentY + layout.height - layout.cornerRadius, currentX, currentY + layout.height - layout.cornerRadius, conicWeight],
          [Command.LINE, currentX, currentY + layout.cornerRadius],
          [Command.CONIC, currentX + layout.cornerRadius, currentY + layout.cornerRadius, currentX + layout.cornerRadius, currentY, conicWeight],
          [Command.CLOSE]
        ])
        .fillColor("#1a1a2e").fillOpacity(0.8)
        .strokeColor(color).strokeOpacity(0.8).strokeWidth(layout.strokeWidth)
        .attachedTo(image.id).layer(ATTACHMENT_LAYER).locked(true)
        .id(getConditionBgId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    )

    addItems.push(
      buildText()
        .position({ x: currentX, y: currentY - 1 })
        .plainText(text)
        .textAlign("CENTER").textAlignVertical("MIDDLE")
        .fontSize(layout.fontSize).fontFamily(FONT).textType("PLAIN")
        .height(layout.height).width(bubbleWidth)
        .fontWeight(400).fillColor(color).fillOpacity(0.9)
        .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
        .id(getConditionTextId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    currentX += bubbleWidth + layout.rowGap;
  }
}

/////////////////////////////////////////////////////////////////////
// Name bubble (bottom-right of token, level with injury circles)
/////////////////////////////////////////////////////////////////////

/**
 * Renders the token's custom displayName as a parchment-coloured pill bubble
 * anchored to the bottom-right corner of the token, at the same Y level as
 * the injury circles row. Does nothing when displayName is empty.
 */
export function buildNameBubble(
  image: Image,
  sceneDpi: number,
  displayName: string,
  displaySettings: DisplaySettings,
  addItems: Item[],
): void {
  const name = displayName.trim();
  if (name === "") return;

  const origin = getTokenBottomLeft(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const tokenWidth = image.image.width * dpiScale * Math.abs(image.scale.x);
  const layout = getBubbleLayout(displaySettings);

  // Keep the name bubble aligned with the marker row even when text size differs.
  const rowY = origin.y + getMarkerLayout(displaySettings).rowGap;

  const color = "#e8d8a0"; // warm parchment — visually distinct from condition/complication bubbles
  const textWidth = getTextWidth(name, `${layout.fontSize}px ${FONT}`);
  const bubbleWidth = Math.min(textWidth + layout.paddingX * 2 + 4 * clampScale(displaySettings.textScale), tokenWidth);

  // Pin right edge to token right edge.
  const bubbleX = origin.x + tokenWidth - bubbleWidth - layout.rowGap;
  const conicWeight = Math.sqrt(2) / 2;

  addItems.push(
    buildPath()
      .commands([
        [Command.MOVE, bubbleX + layout.cornerRadius, rowY],
        [Command.LINE, bubbleX + bubbleWidth - layout.cornerRadius, rowY],
        [Command.CONIC, bubbleX + bubbleWidth - layout.cornerRadius, rowY + layout.cornerRadius, bubbleX + bubbleWidth, rowY + layout.cornerRadius, conicWeight],
        [Command.LINE, bubbleX + bubbleWidth, rowY + layout.height - layout.cornerRadius],
        [Command.CONIC, bubbleX + bubbleWidth - layout.cornerRadius, rowY + layout.height - layout.cornerRadius, bubbleX + bubbleWidth - layout.cornerRadius, rowY + layout.height, conicWeight],
        [Command.LINE, bubbleX + layout.cornerRadius, rowY + layout.height],
        [Command.CONIC, bubbleX + layout.cornerRadius, rowY + layout.height - layout.cornerRadius, bubbleX, rowY + layout.height - layout.cornerRadius, conicWeight],
        [Command.LINE, bubbleX, rowY + layout.cornerRadius],
        [Command.CONIC, bubbleX + layout.cornerRadius, rowY + layout.cornerRadius, bubbleX + layout.cornerRadius, rowY, conicWeight],
        [Command.CLOSE],
      ])
      .fillColor("#1a1a2e").fillOpacity(0.85)
      .strokeColor(color).strokeOpacity(0.9).strokeWidth(layout.strokeWidth)
      .attachedTo(image.id).layer(ATTACHMENT_LAYER).locked(true)
      .id(getNameBubbleBgId(image.id))
      .visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
      .build(),
  );

  addItems.push(
    buildText()
      .position({ x: bubbleX, y: rowY - 1 })
      .plainText(name)
      .textAlign("CENTER").textAlignVertical("MIDDLE")
      .fontSize(layout.fontSize).fontFamily(FONT).textType("PLAIN")
      .height(layout.height).width(bubbleWidth)
      .fontWeight(500).fillColor(color).fillOpacity(0.95)
      .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
      .id(getNameBubbleTextId(image.id))
      .visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
      .build(),
  );
}
