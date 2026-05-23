// Copied from owl-trackers reference repo.
// Only getImageCenter is used by tfe-trackers' on-map display;
// the bar/arc helpers are retained in case they're needed later.

import { Vector2, Image, Math2 } from "@owlbear-rodeo/sdk";

/**
 * Calculate the fill portion of a bar tracker (0–1).
 * Optional segments parameter snaps fill to discrete steps.
 */
export function getFillPortion(value: number, maxValue: number, segments = 0) {
  if (value <= 0) return 0;
  if (value >= maxValue) return 1;
  if (segments === 0) return value / maxValue;
  return Math.ceil((value / maxValue) * segments) / segments;
}

/**
 * Generates a curve in the shape of a rounded rectangle for Owlbear Rodeo.
 * fill controls how much of the rectangle is drawn (0–1).
 */
export function createRoundedRectangle(
  maxLength: number,
  height: number,
  radius: number,
  fill = 1,
  pointsInCorner = 6,
): Vector2[] {
  if (radius * 2 > height) radius = height * 0.5;

  if (fill >= 1) {
    return [
      { x: radius, y: 0 },
      { x: maxLength - radius, y: 0 },
      ...drawArc({ x: maxLength - radius, y: radius }, radius, Math.PI * 0.5, -Math.PI * 0.5, pointsInCorner),
      ...drawArc({ x: maxLength - radius, y: height - radius }, radius, 0, -Math.PI * 0.5, pointsInCorner),
      { x: maxLength - radius, y: height },
      { x: radius, y: height },
      ...drawArc({ x: radius, y: height - radius }, radius, -Math.PI * 0.5, -Math.PI * 0.5, pointsInCorner),
      ...drawArc({ x: radius, y: radius }, radius, -Math.PI, -Math.PI * 0.5, pointsInCorner),
    ];
  }

  const barLength = fill * maxLength;
  if (barLength < radius) {
    const referenceAngle = Math.acos((radius - barLength) / radius);
    return [
      ...drawArc({ x: radius, y: height - radius }, radius, Math.PI + referenceAngle, -referenceAngle, pointsInCorner),
      ...drawArc({ x: radius, y: radius }, radius, Math.PI, -referenceAngle, pointsInCorner),
    ];
  }

  const remainingBarLength = maxLength - barLength;
  if (remainingBarLength < radius) {
    const referenceAngle = Math.acos((radius - remainingBarLength) / radius);
    return [
      { x: radius, y: 0 },
      { x: maxLength - radius, y: 0 },
      ...drawArc({ x: maxLength - radius, y: radius }, radius, Math.PI * 0.5, -Math.PI * 0.5 + referenceAngle, pointsInCorner),
      ...drawArc({ x: maxLength - radius, y: height - radius }, radius, -referenceAngle, -Math.PI * 0.5 + referenceAngle, pointsInCorner),
      { x: maxLength - radius, y: height },
      { x: radius, y: height },
      ...drawArc({ x: radius, y: height - radius }, radius, -Math.PI * 0.5, -Math.PI * 0.5, pointsInCorner),
      ...drawArc({ x: radius, y: radius }, radius, -Math.PI, -Math.PI * 0.5, pointsInCorner),
    ];
  }

  return [
    { x: radius, y: 0 },
    { x: barLength, y: 0 },
    { x: barLength, y: height },
    { x: radius, y: height },
    ...drawArc({ x: radius, y: height - radius }, radius, -Math.PI * 0.5, -Math.PI * 0.5, pointsInCorner),
    ...drawArc({ x: radius, y: radius }, radius, -Math.PI, -Math.PI * 0.5, pointsInCorner),
  ];
}

function drawArc(
  center: Vector2,
  radius: number,
  startAngle: number,
  arcAngle: number,
  arcPoints: number,
): Vector2[] {
  arcPoints--;
  const pointsArray: Vector2[] = [];
  const angleBetweenPoints = arcAngle / arcPoints;
  let angle = startAngle;
  for (let i = 0; i <= arcPoints; i++) {
    pointsArray.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y - radius * Math.sin(angle), // y-axis flipped for OBR coordinate system
    });
    angle += angleBetweenPoints;
  }
  return pointsArray;
}

/**
 * Returns the world-space center position of an image token,
 * accounting for scale, rotation, grid offset, and DPI scaling.
 */
export function getImageCenter(image: Image, sceneDpi: number) {
  let imageCenter = { x: 0, y: 0 };

  imageCenter = Math2.add(imageCenter, Math2.multiply({ x: image.image.width, y: image.image.height }, 0.5));
  imageCenter = Math2.subtract(imageCenter, image.grid.offset);
  imageCenter = Math2.multiply(imageCenter, sceneDpi / image.grid.dpi);
  imageCenter = Math2.multiply(imageCenter, image.scale);
  imageCenter = Math2.rotate(imageCenter, { x: 0, y: 0 }, image.rotation);
  imageCenter = Math2.add(imageCenter, image.position);

  return imageCenter;
}
