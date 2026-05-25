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
  addItems: Item[],
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const rowY = origin.y - (BOX_SIZE + ROW_GAP);

  for (let i = 0; i < data.strainMax; i++) {
    const cx = origin.x + ROW_GAP + i * (BOX_SIZE + BOX_GAP);
    const filled = i < data.strainCurrent;

    buildCenteredShapeWithText({
      image,
      shapeId: getStrainBoxBgId(image.id, i),
      textId: getStrainBoxXId(image.id, i),
      cx, cy: rowY,
      size: BOX_SIZE,
      shapeType: "RECTANGLE",
      fillColor: filled ? "#b42828" : "#1a0000",
      fillOpacity: filled ? ROW_OPACITY : 0.4,
      strokeColor: filled ? "#b42828" : "#d25050",
      strokeOpacity: ROW_OPACITY,
      strokeWidth: 1.5,
      text: filled ? "✕" : "",
      fontSize: BOX_SIZE - 2,
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
    s.location === "" && s.complications.length === 0 && !s.treated;

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
  const rowY = origin.y + CIRCLE_SIZE / 2;

  const resolved = resolveInjuries(data);
  const showEmpty = displaySettings.injuryDisplay === "all";
  let colIndex = 0;

  for (const inj of resolved) {
    if (inj.isEmpty && !showEmpty) continue;

    const cx = origin.x + ROW_GAP + colIndex * (CIRCLE_SIZE + CIRCLE_GAP) + CIRCLE_SIZE / 2;
    const colors = INJURY_COLORS[inj.severity];
    const icon = inj.injurySlot.treated ? "✓" : inj.isEmpty ? "" : "!";

    buildCenteredShapeWithText({
      image,
      shapeId: getInjuryCircleBgId(image.id, inj.slot),
      textId: getInjuryCircleIconId(image.id, inj.slot),
      cx, cy: rowY,
      size: CIRCLE_SIZE,
      shapeType: "CIRCLE",
      fillColor: inj.isEmpty ? "#111111" : colors.fill,
      fillOpacity: inj.isEmpty ? 0.35 : ROW_OPACITY,
      strokeColor: colors.stroke,
      strokeOpacity: ROW_OPACITY,
      strokeWidth: 1.5,
      text: icon,
      fontSize: CIRCLE_SIZE - 5,
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
  addItems: Item[],
  showConditions: boolean,
): void {
  const origin = getTokenTopLeft(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const tokenWidth = image.image.width * dpiScale * Math.abs(image.scale.x);

  const baseY = origin.y + ROW_GAP;
  const baseX = origin.x + ROW_GAP;
  let currentX = baseX;
  let currentY = baseY;
  const conicWeight = Math.sqrt(2) / 2;

  const bubbles = collectBubbleStrings(data, showConditions);

  for (let i = 0; i < bubbles.length; i++) {
    const { text, color } = bubbles[i];
    const textWidth = getTextWidth(text, `${BUBBLE_FONT_SIZE} ${FONT}`);
    const bubbleWidth = Math.min(textWidth + BUBBLE_PADDING_X, tokenWidth);

    if (i > 0 && currentX + bubbleWidth > baseX + tokenWidth) {
      currentX = baseX;
      currentY += BUBBLE_HEIGHT + 2;
    }

    addItems.push(
      buildPath()
        .commands([
          [Command.MOVE, currentX + 2, currentY],
          [Command.LINE, currentX + bubbleWidth - 2, currentY],
          [Command.CONIC, currentX + bubbleWidth - 2, currentY + 2, currentX + bubbleWidth, currentY + 2, conicWeight],
          [Command.LINE, currentX + bubbleWidth, currentY + BUBBLE_HEIGHT - 2],
          [Command.CONIC, currentX + bubbleWidth - 2, currentY + BUBBLE_HEIGHT - 2, currentX + bubbleWidth - 2, currentY + BUBBLE_HEIGHT, conicWeight],
          [Command.LINE, currentX + 2, currentY + BUBBLE_HEIGHT],
          [Command.CONIC, currentX + 2, currentY + BUBBLE_HEIGHT - 2, currentX, currentY + BUBBLE_HEIGHT - 2, conicWeight],
          [Command.LINE, currentX, currentY + 2],
          [Command.CONIC, currentX + 2, currentY + 2, currentX + 2, currentY, conicWeight],
          [Command.CLOSE]
        ])
        .fillColor("#1a1a2e").fillOpacity(0.8)
        .strokeColor(color).strokeOpacity(0.8).strokeWidth(1)
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
        .fontSize(BUBBLE_FONT_SIZE).fontFamily(FONT).textType("PLAIN")
        .height(BUBBLE_HEIGHT).width(bubbleWidth)
        .fontWeight(400).fillColor(color).fillOpacity(0.9)
        .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
        .id(getConditionTextId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    currentX += bubbleWidth + 2;
  }
}
