// Math helpers for tfe-trackers' on-map display.
// Adapted from owl-trackers reference repo.

import { Image, Math2 } from "@owlbear-rodeo/sdk";

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
