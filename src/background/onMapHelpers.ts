import {
  AttachmentBehavior,
  Command,
  Image,
  Item,
  PathCommand,
  buildPath,
  buildShape,
  buildText,
} from "@owlbear-rodeo/sdk";
import { CharacterData, DisplaySettings, InjurySlot } from "../characterDataHelpers";
import {
  MAX_CONDITIONS,
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
const TEXT_VERTICAL_OFFSET = -1;

const BOX_SIZE = 14;
const BOX_GAP = 3;
const CIRCLE_SIZE = 16;
const CIRCLE_GAP = 2;
const ROW_GAP = 2;
const BUBBLE_HEIGHT = 12;
const BUBBLE_PADDING_X = 2;
const BUBBLE_FONT_SIZE = 9;
const BUBBLE_FILL = "#1a1a2e";
const ROW_OPACITY = 0.95;
const NAME_COLOR = "#e8d8a0";
const CONDITION_COLOR = "#ffffff";

const INJURY_COLORS = {
  serious: { fill: "#d68e68", stroke: "#a44f27" },
  critical: { fill: "#db7777", stroke: "#94272c" },
  lethal: { fill: "#7c4291", stroke: "#501e64" },
} as const;
type InjurySeverity = keyof typeof INJURY_COLORS;

/** When the same text appears more than once, the highest rank picks its color. */
const SEVERITY_RANK: Record<InjurySeverity, number> = { serious: 0, critical: 1, lethal: 2 };
const CONDITION_RANK = -1;

// ─── Layout ───────────────────────────────────────────────────────────────────

/** Guard against malformed scene metadata producing huge or invisible markers. */
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
    scale,
    height: BUBBLE_HEIGHT * scale,
    paddingX: BUBBLE_PADDING_X * scale,
    fontSize: BUBBLE_FONT_SIZE * scale,
    rowGap: ROW_GAP * scale,
    cornerRadius: 2 * scale,
    strokeWidth: 1 * scale,
  };
}

/** The token's on-screen bounding box, ignoring rotation. */
function getTokenBounds(image: Image, sceneDpi: number) {
  const center = getImageCenter(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const width = image.image.width * dpiScale * Math.abs(image.scale.x);
  const height = image.image.height * dpiScale * Math.abs(image.scale.y);
  return {
    left: center.x - width / 2,
    top: center.y - height / 2,
    bottom: center.y + height / 2,
    width,
  };
}

// ─── Shared builders ──────────────────────────────────────────────────────────

let measureContext: CanvasRenderingContext2D | null = null;

function getTextWidth(text: string, fontSize: number): number {
  measureContext ??= document.createElement("canvas").getContext("2d");
  if (measureContext === null) throw new Error("Canvas 2D context is not supported.");
  measureContext.font = `${fontSize}px ${FONT}`;
  return measureContext.measureText(text).width;
}

function roundedRectCommands(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): PathCommand[] {
  const w = Math.SQRT1_2; // conic weight for a quarter circle
  const right = x + width;
  const bottom = y + height;
  return [
    [Command.MOVE, x + radius, y],
    [Command.LINE, right - radius, y],
    [Command.CONIC, right - radius, y + radius, right, y + radius, w],
    [Command.LINE, right, bottom - radius],
    [Command.CONIC, right - radius, bottom - radius, right - radius, bottom, w],
    [Command.LINE, x + radius, bottom],
    [Command.CONIC, x + radius, bottom - radius, x, bottom - radius, w],
    [Command.LINE, x, y + radius],
    [Command.CONIC, x + radius, y + radius, x + radius, y, w],
    [Command.CLOSE],
  ];
}

/**
 * A square or circle with a centered glyph. Rectangles are positioned by their
 * top-left corner and circles by their center, matching OBR's shape origins.
 */
function buildShapeWithText(opts: {
  image: Image;
  shapeId: string;
  textId: string;
  x: number;
  y: number;
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
  addItems: Item[];
}) {
  const { image, x, y, size, addItems } = opts;

  addItems.push(
    buildShape()
      .width(size).height(size).shapeType(opts.shapeType)
      .fillColor(opts.fillColor).fillOpacity(opts.fillOpacity)
      .strokeColor(opts.strokeColor).strokeOpacity(opts.strokeOpacity).strokeWidth(opts.strokeWidth)
      .position({ x, y })
      .attachedTo(image.id).layer("ATTACHMENT").locked(true)
      .id(opts.shapeId).visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(true)
      .build(),
  );

  const textLeft = opts.shapeType === "CIRCLE" ? x - size / 2 : x;
  const textTop = opts.shapeType === "CIRCLE" ? y - size / 2 : y;
  addItems.push(
    buildText()
      .position({ x: textLeft, y: textTop + TEXT_VERTICAL_OFFSET })
      .plainText(opts.text)
      .textAlign("CENTER").textAlignVertical("MIDDLE")
      .fontSize(opts.fontSize).fontFamily(FONT).textType("PLAIN")
      .height(size + 2).width(size)
      .fontWeight(700)
      .fillColor(opts.textColor).fillOpacity(opts.textOpacity)
      .attachedTo(image.id).layer("TEXT").locked(true)
      .id(opts.textId).visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(true)
      .build(),
  );
}

/** A rounded label: path background plus text. */
function buildBubble(opts: {
  image: Image;
  bgId: string;
  textId: string;
  x: number;
  y: number;
  width: number;
  text: string;
  color: string;
  bgOpacity: number;
  strokeOpacity: number;
  textOpacity: number;
  fontWeight: number;
  layout: ReturnType<typeof getBubbleLayout>;
  addItems: Item[];
}) {
  const { image, x, y, width, layout, addItems } = opts;

  addItems.push(
    buildPath()
      .commands(roundedRectCommands(x, y, width, layout.height, layout.cornerRadius))
      .fillColor(BUBBLE_FILL).fillOpacity(opts.bgOpacity)
      .strokeColor(opts.color).strokeOpacity(opts.strokeOpacity).strokeWidth(layout.strokeWidth)
      .attachedTo(image.id).layer("ATTACHMENT").locked(true)
      .id(opts.bgId).visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(true)
      .build(),
  );

  addItems.push(
    buildText()
      .position({ x, y: y - 1 })
      .plainText(opts.text)
      .textAlign("CENTER").textAlignVertical("MIDDLE")
      .fontSize(layout.fontSize).fontFamily(FONT).textType("PLAIN")
      .height(layout.height).width(width)
      .fontWeight(opts.fontWeight).fillColor(opts.color).fillOpacity(opts.textOpacity)
      .attachedTo(image.id).layer("TEXT").locked(true)
      .id(opts.textId).visible(image.visible)
      .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(true)
      .build(),
  );
}

// ─── Strain boxes (row just above the token's bottom edge) ────────────────────

export function buildStrainItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  displaySettings: DisplaySettings,
  addItems: Item[],
): void {
  const bounds = getTokenBounds(image, sceneDpi);
  const layout = getMarkerLayout(displaySettings);
  const y = bounds.bottom - (layout.boxSize + layout.rowGap);

  for (let i = 0; i < data.strainMax; i++) {
    const filled = i < data.strainCurrent;
    buildShapeWithText({
      image,
      shapeId: getStrainBoxBgId(image.id, i),
      textId: getStrainBoxXId(image.id, i),
      x: bounds.left + layout.rowGap + i * (layout.boxSize + layout.boxGap),
      y,
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
      addItems,
    });
  }
}

// ─── Injury circles (row straddling the token's bottom edge) ──────────────────

interface ResolvedInjury {
  slot: string;
  severity: InjurySeverity;
  injurySlot: InjurySlot;
  isEmpty: boolean;
}

/** The injury slots this character currently has, in display order. */
function resolveInjuries(data: CharacterData): ResolvedInjury[] {
  const resolved: ResolvedInjury[] = [];
  const add = (slot: string, severity: InjurySeverity, injurySlot: InjurySlot) => {
    const isEmpty =
      injurySlot.description === "" &&
      injurySlot.complications.length === 0 &&
      !injurySlot.treated;
    resolved.push({ slot, severity, injurySlot, isEmpty });
  };

  if (data.hasSerious) {
    const count = data.characterType === "survivor" ? 2 : data.seriousCount;
    for (let i = 0; i < count; i++) add(`s${i}`, "serious", data.seriousInjuries[i]);
  }
  if (data.hasCritical) add("c", "critical", data.criticalInjury);
  if (data.hasLethal) add("l", "lethal", data.lethalInjury);
  return resolved;
}

export function buildInjuryItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  displaySettings: DisplaySettings,
  addItems: Item[],
): void {
  const bounds = getTokenBounds(image, sceneDpi);
  const layout = getMarkerLayout(displaySettings);
  const showEmpty = displaySettings.injuryDisplay === "all";
  const visible = resolveInjuries(data).filter((inj) => showEmpty || !inj.isEmpty);

  visible.forEach((inj, column) => {
    const colors = INJURY_COLORS[inj.severity];
    buildShapeWithText({
      image,
      shapeId: getInjuryCircleBgId(image.id, inj.slot),
      textId: getInjuryCircleIconId(image.id, inj.slot),
      x:
        bounds.left +
        layout.rowGap +
        column * (layout.circleSize + layout.circleGap) +
        layout.circleSize / 2,
      y: bounds.bottom + layout.circleSize / 2,
      size: layout.circleSize,
      shapeType: "CIRCLE",
      fillColor: inj.isEmpty ? "#111111" : colors.fill,
      fillOpacity: inj.isEmpty ? 0.35 : ROW_OPACITY,
      strokeColor: colors.stroke,
      strokeOpacity: ROW_OPACITY,
      strokeWidth: layout.strokeWidth,
      text: inj.injurySlot.treated ? "✓" : inj.isEmpty ? "" : "!",
      fontSize: layout.circleSize - 5,
      textColor: "#ffffff",
      textOpacity: ROW_OPACITY,
      addItems,
    });
  });
}

// ─── Condition and complication bubbles (top of the token) ────────────────────

/**
 * Bubble texts and colors. Untreated complications use their injury's color and
 * conditions are white. Text that appears more than once (case-insensitive) is
 * shown once, using the color and spelling of its most severe source.
 */
function collectBubbleStrings(
  data: CharacterData,
  showConditions: boolean,
): Array<{ text: string; color: string }> {
  const byKey = new Map<string, { text: string; color: string; rank: number }>();

  const consider = (text: string, color: string, rank: number) => {
    const key = text.trim().toLowerCase();
    if (key === "") return;
    const existing = byKey.get(key);
    if (existing === undefined || rank > existing.rank) {
      byKey.set(key, { text, color, rank });
    }
  };

  for (const inj of resolveInjuries(data)) {
    if (inj.injurySlot.treated) continue;
    for (const complication of inj.injurySlot.complications) {
      consider(complication, INJURY_COLORS[inj.severity].fill, SEVERITY_RANK[inj.severity]);
    }
  }
  if (showConditions) {
    for (const condition of data.conditions) consider(condition, CONDITION_COLOR, CONDITION_RANK);
  }

  return Array.from(byKey.values(), ({ text, color }) => ({ text, color }));
}

/** Bubbles flow left to right across the top of the token, wrapping at its width. */
export function buildConditionItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  displaySettings: DisplaySettings,
  addItems: Item[],
  showConditions: boolean,
): void {
  const bounds = getTokenBounds(image, sceneDpi);
  const layout = getBubbleLayout(displaySettings);
  const startX = bounds.left + layout.rowGap;
  let x = startX;
  let y = bounds.top + layout.rowGap;

  const bubbles = collectBubbleStrings(data, showConditions).slice(0, MAX_CONDITIONS);
  bubbles.forEach(({ text, color }, i) => {
    const width = Math.min(
      getTextWidth(text, layout.fontSize) + layout.paddingX * 2,
      bounds.width,
    );
    if (i > 0 && x + width > startX + bounds.width) {
      x = startX;
      y += layout.height + layout.rowGap;
    }

    buildBubble({
      image,
      bgId: getConditionBgId(image.id, i),
      textId: getConditionTextId(image.id, i),
      x,
      y,
      width,
      text,
      color,
      bgOpacity: 0.8,
      strokeOpacity: 0.8,
      textOpacity: 0.9,
      fontWeight: 400,
      layout,
      addItems,
    });

    x += width + layout.rowGap;
  });
}

// ─── Name bubble (bottom-right of the token, level with the injury row) ───────

export function buildNameBubble(
  image: Image,
  sceneDpi: number,
  displayName: string,
  displaySettings: DisplaySettings,
  addItems: Item[],
): void {
  const name = displayName.trim();
  if (name === "") return;

  const bounds = getTokenBounds(image, sceneDpi);
  const layout = getBubbleLayout(displaySettings);
  const width = Math.min(
    getTextWidth(name, layout.fontSize) + layout.paddingX * 2 + 4 * layout.scale,
    bounds.width,
  );

  buildBubble({
    image,
    bgId: getNameBubbleBgId(image.id),
    textId: getNameBubbleTextId(image.id),
    x: bounds.left + bounds.width - width - layout.rowGap,
    // Follow the marker scale so the bubble stays level with the injury circles.
    y: bounds.bottom + getMarkerLayout(displaySettings).rowGap,
    width,
    text: name,
    color: NAME_COLOR,
    bgOpacity: 0.85,
    strokeOpacity: 0.9,
    textOpacity: 0.95,
    fontWeight: 500,
    layout,
    addItems,
  });
}
