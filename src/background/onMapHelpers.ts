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

function getTokenBottomLeft(image: Image, sceneDpi: number) {
  const center = getImageCenter(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const halfW = (image.image.width * dpiScale * Math.abs(image.scale.x)) / 2;
  const halfH = (image.image.height * dpiScale * Math.abs(image.scale.y)) / 2;
  return { x: center.x - halfW, y: center.y + halfH };
}

/////////////////////////////////////////////////////////////////////
// Strain boxes
/////////////////////////////////////////////////////////////////////

export function buildStrainItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  addItems: Item[],
  deleteIds: string[],
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const rowY = origin.y + ROW_GAP;

  for (let i = 0; i < data.strainMax; i++) {
    const x = origin.x + i * (BOX_SIZE + BOX_GAP);
    const filled = i < data.strainCurrent;

    addItems.push(
      buildShape()
        .width(BOX_SIZE).height(BOX_SIZE).shapeType("RECTANGLE")
        .fillColor(filled ? "#b42828" : "#1a0000")
        .fillOpacity(filled ? ROW_OPACITY : 0.4)
        .strokeColor(filled ? "#b42828" : "#d25050")
        .strokeOpacity(ROW_OPACITY).strokeWidth(1.5)
        .position({ x, y: rowY })
        .attachedTo(image.id).layer(ATTACHMENT_LAYER).locked(true)
        .id(getStrainBoxBgId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    addItems.push(
      buildText()
        .position({ x, y: rowY - 1 })
        .plainText(filled ? "✕" : "")
        .textAlign("CENTER").textAlignVertical("MIDDLE")
        .fontSize(BOX_SIZE - 2).fontFamily(FONT).textType("PLAIN")
        .height(BOX_SIZE + 2).width(BOX_SIZE).fontWeight(700)
        .fillColor("#500a0a").fillOpacity(filled ? 1 : 0)
        .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
        .id(getStrainBoxXId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );
  }

  for (let i = data.strainMax; i < 9; i++) {
    deleteIds.push(getStrainBoxBgId(image.id, i), getStrainBoxXId(image.id, i));
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

/**
 * displaySettings is passed explicitly — it now lives in scene metadata,
 * not on the token, so it cannot be read from `data`.
 */
export function buildInjuryItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  displaySettings: DisplaySettings,
  strainRowHeight: number,
  addItems: Item[],
  deleteIds: string[],
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const rowY = origin.y + ROW_GAP + strainRowHeight + ROW_GAP;

  const resolved: ResolvedInjury[] = [];

  if (data.hasSerious) {
    const count = data.characterType === "survivor" ? 2 : data.seriousCount;
    for (let i = 0; i < count; i++) {
      const s = data.seriousInjuries[i];
      resolved.push({ slot: `s${i}`, severity: "serious", injurySlot: s, isEmpty: s.location === "" && s.complications === "" && !s.treated });
    }
  }
  if (data.hasCritical) {
    const s = data.criticalInjury;
    resolved.push({ slot: "c", severity: "critical", injurySlot: s, isEmpty: s.location === "" && s.complications === "" && !s.treated });
  }
  if (data.hasLethal) {
    const s = data.lethalInjury;
    resolved.push({ slot: "l", severity: "lethal", injurySlot: s, isEmpty: s.location === "" && s.complications === "" && !s.treated });
  }

  let colIndex = 0;
  for (const inj of resolved) {
    const showEmpty = displaySettings.injuryDisplay === "all";

    if (inj.isEmpty && !showEmpty) {
      deleteIds.push(getInjuryCircleBgId(image.id, inj.slot), getInjuryCircleIconId(image.id, inj.slot));
      continue;
    }

    const x = origin.x + colIndex * (CIRCLE_SIZE + CIRCLE_GAP) + CIRCLE_SIZE / 2;
    const colors = INJURY_COLORS[inj.severity];
    const icon = inj.isEmpty ? "○" : inj.injurySlot.treated ? "✓" : "!";

    addItems.push(
      buildShape()
        .width(CIRCLE_SIZE).height(CIRCLE_SIZE).shapeType("CIRCLE")
        .fillColor(inj.isEmpty ? "#111111" : colors.fill)
        .fillOpacity(inj.isEmpty ? 0.35 : ROW_OPACITY)
        .strokeColor(colors.stroke).strokeOpacity(ROW_OPACITY).strokeWidth(1.5)
        .position({ x: x - CIRCLE_SIZE / 2, y: rowY })
        .attachedTo(image.id).layer(ATTACHMENT_LAYER).locked(true)
        .id(getInjuryCircleBgId(image.id, inj.slot))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    addItems.push(
      buildText()
        .position({ x: x - CIRCLE_SIZE / 2, y: rowY - 1 })
        .plainText(icon)
        .textAlign("CENTER").textAlignVertical("MIDDLE")
        .fontSize(CIRCLE_SIZE - 4).fontFamily(FONT).textType("PLAIN")
        .height(CIRCLE_SIZE + 2).width(CIRCLE_SIZE).fontWeight(700)
        .fillColor(inj.isEmpty ? colors.stroke : "#ffffff")
        .fillOpacity(ROW_OPACITY)
        .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
        .id(getInjuryCircleIconId(image.id, inj.slot))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    colIndex++;
  }

  const activeSlots = new Set(resolved.map((r) => r.slot));
  for (const slot of ["s0", "s1", "c", "l"]) {
    if (!activeSlots.has(slot)) {
      deleteIds.push(getInjuryCircleBgId(image.id, slot), getInjuryCircleIconId(image.id, slot));
    }
  }
}

/////////////////////////////////////////////////////////////////////
// Condition bubbles
/////////////////////////////////////////////////////////////////////

export function buildConditionItems(
  image: Image,
  sceneDpi: number,
  data: CharacterData,
  strainRowHeight: number,
  injuryRowHeight: number,
  addItems: Item[],
  deleteIds: string[],
): void {
  const origin = getTokenBottomLeft(image, sceneDpi);
  const dpiScale = sceneDpi / image.grid.dpi;
  const tokenWidth = image.image.width * dpiScale * Math.abs(image.scale.x);

  const baseY = origin.y + ROW_GAP + strainRowHeight + ROW_GAP + injuryRowHeight + ROW_GAP;
  let currentX = origin.x;
  let currentY = baseY;

  for (let i = 0; i < data.conditions.length; i++) {
    const text = data.conditions[i];
    const bubbleWidth = Math.min(text.length * 5.5 + BUBBLE_PADDING_X * 2, tokenWidth);

    if (i > 0 && currentX + bubbleWidth > origin.x + tokenWidth) {
      currentX = origin.x;
      currentY += BUBBLE_HEIGHT + 2;
    }

    addItems.push(
      buildShape()
        .width(bubbleWidth).height(BUBBLE_HEIGHT).shapeType("RECTANGLE")
        .fillColor("#1a1a2e").fillOpacity(0.8)
        .strokeColor("#888888").strokeOpacity(0.6).strokeWidth(1)
        .position({ x: currentX, y: currentY })
        .attachedTo(image.id).layer(ATTACHMENT_LAYER).locked(true)
        .id(getConditionBgId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    addItems.push(
      buildText()
        .position({ x: currentX + BUBBLE_PADDING_X, y: currentY })
        .plainText(text)
        .textAlign("LEFT").textAlignVertical("MIDDLE")
        .fontSize(BUBBLE_FONT_SIZE).fontFamily(FONT).textType("PLAIN")
        .height(BUBBLE_HEIGHT + 2).width(bubbleWidth - BUBBLE_PADDING_X)
        .fontWeight(400).fillColor("#ffffff").fillOpacity(0.9)
        .attachedTo(image.id).layer(TEXT_LAYER).locked(true)
        .id(getConditionTextId(image.id, i))
        .visible(image.visible)
        .disableAttachmentBehavior(DISABLE_BEHAVIORS).disableHit(DISABLE_HIT)
        .build(),
    );

    currentX += bubbleWidth + 3;
  }

  for (let i = data.conditions.length; i < 20; i++) {
    deleteIds.push(getConditionBgId(image.id, i), getConditionTextId(image.id, i));
  }
}
