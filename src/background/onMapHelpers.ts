import {
  AttachmentBehavior,
  Image,
  Item,
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
const TEXT_VERTICAL_OFFSET = -1.2;

const BOX_SIZE = 14;
const BOX_GAP = 3;
const CIRCLE_SIZE = 18;
const CIRCLE_GAP = 3;
const ROW_GAP = 4;
const BUBBLE_HEIGHT = 14;
const BUBBLE_PADDING_X = 4;
const BUBBLE_FONT_SIZE = 9;
const ROW_OPACITY = 0.85;
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

  addItems.push(
    buildText()
      .position({ x: cx - size / 2, y: cy - size / 2 + TEXT_VERTICAL_OFFSET })
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
  const rowY = origin.y + ROW_GAP + BOX_SIZE / 2;

  for (let i = 0; i < data.strainMax; i++) {
    const cx = origin.x + i * (BOX_SIZE + BOX_GAP) + BOX_SIZE / 2;
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
  strainRowHeight: number,
  addItems: Item[],
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const rowY = origin.y + ROW_GAP + strainRowHeight + ROW_GAP + CIRCLE_SIZE / 2;

  const resolved = resolveInjuries(data);
  const showEmpty = displaySettings.injuryDisplay === "all";
  let colIndex = 0;

  for (const inj of resolved) {
    if (inj.isEmpty && !showEmpty) continue;

    const cx = origin.x + colIndex * (CIRCLE_SIZE + CIRCLE_GAP) + CIRCLE_SIZE / 2;
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

export function buildConditionItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  strainRowHeight: number,
  injuryRowHeight: number,
  addItems: Item[],
  showConditions: boolean,
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const tokenWidth = image.image.width * dpiScale * Math.abs(image.scale.x);

  const baseY = origin.y + ROW_GAP + strainRowHeight + ROW_GAP + injuryRowHeight + ROW_GAP;
  let currentX = origin.x;
  let currentY = baseY;

  const bubbles = collectBubbleStrings(data, showConditions);

  for (let i = 0; i < bubbles.length; i++) {
    const { text, color } = bubbles[i];
    const bubbleWidth = Math.min(text.length * 5.5 + BUBBLE_PADDING_X * 2, tokenWidth);

    if (i > 0 && currentX + bubbleWidth > origin.x + tokenWidth) {
      currentX = origin.x;
      currentY += BUBBLE_HEIGHT + 2;
    }

    addItems.push(
      buildShape()
        .width(bubbleWidth).height(BUBBLE_HEIGHT).shapeType("RECTANGLE")
        .fillColor("#1a1a2e").fillOpacity(0.8)
        .strokeColor(color).strokeOpacity(0.8).strokeWidth(1)
        .position({ x: currentX, y: currentY })
        .attachedTo(image.id).layer(ATTACHMENT_LAYER).locked(true)
        .id(getConditionBgId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    addItems.push(
      buildText()
        .position({ x: currentX + BUBBLE_PADDING_X, y: currentY + TEXT_VERTICAL_OFFSET })
        .plainText(text)
        .textAlign("LEFT").textAlignVertical("MIDDLE")
        .fontSize(BUBBLE_FONT_SIZE).fontFamily(FONT).textType("PLAIN")
        .height(BUBBLE_HEIGHT + 2).width(bubbleWidth - BUBBLE_PADDING_X)
        .fontWeight(400).fillColor(color).fillOpacity(0.9)
        .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
        .id(getConditionTextId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    currentX += bubbleWidth + 3;
  }
}
