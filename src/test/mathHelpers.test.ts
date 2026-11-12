import { describe, it, expect } from "vitest";
import { Image } from "@owlbear-rodeo/sdk";
import { getImageCenter } from "../background/mathHelpers";

describe("mathHelpers", () => {

  describe("getImageCenter", () => {
    it("correctly computes world-space center accounting for scale, rotation, offset, and DPI", () => {
      const image = {
        id: "tok",
        type: "IMAGE",
        visible: true,
        scale: { x: 2, y: 2 },
        position: { x: 50, y: 50 },
        rotation: 90,
        image: { width: 100, height: 100 },
        grid: { dpi: 150, offset: { x: 10, y: 10 } },
      } as Image;

      // Half size (50,50) minus offset (10,10), scaled ×2 = (80,80),
      // rotated 90° = (-80,80), plus position (50,50) = (-30,130).
      expect(getImageCenter(image, 150)).toEqual({ x: -30, y: 130 });
    });

    it("identity case: scale=1, rotation=0, offset=(0,0), same DPI", () => {
      const image = {
        id: "tok2",
        type: "IMAGE",
        visible: true,
        scale: { x: 1, y: 1 },
        position: { x: 0, y: 0 },
        rotation: 0,
        image: { width: 60, height: 40 },
        grid: { dpi: 150, offset: { x: 0, y: 0 } },
      } as Image;

      expect(getImageCenter(image, 150)).toEqual({ x: 30, y: 20 });
    });

    it("DPI scaling: sceneDpi different from grid.dpi scales the center", () => {
      const image = {
        id: "tok3",
        type: "IMAGE",
        visible: true,
        scale: { x: 1, y: 1 },
        position: { x: 0, y: 0 },
        rotation: 0,
        image: { width: 100, height: 100 },
        grid: { dpi: 150, offset: { x: 0, y: 0 } },
      } as Image;

      expect(getImageCenter(image, 300)).toEqual({ x: 100, y: 100 });
    });

    it("negative scale (flipped token) is handled via abs in callers, not getImageCenter", () => {
      // The sign of scale is kept here; the on-map helpers take Math.abs themselves.
      const image = {
        id: "tok4",
        type: "IMAGE",
        visible: true,
        scale: { x: -1, y: 1 },
        position: { x: 0, y: 0 },
        rotation: 0,
        image: { width: 60, height: 60 },
        grid: { dpi: 150, offset: { x: 0, y: 0 } },
      } as Image;

      expect(getImageCenter(image, 150)).toEqual({ x: -30, y: 30 });
    });
  });
});
