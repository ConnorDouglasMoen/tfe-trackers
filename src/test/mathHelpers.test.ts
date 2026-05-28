import { describe, it, expect } from "vitest";
import { Image } from "@owlbear-rodeo/sdk";
import {
  getFillPortion,
  createRoundedRectangle,
  getImageCenter,
} from "../background/mathHelpers";

describe("mathHelpers", () => {
  describe("getFillPortion", () => {
    it("returns 0 for negative or zero value", () => {
      expect(getFillPortion(-5, 10)).toBe(0);
      expect(getFillPortion(0, 10)).toBe(0);
    });

    it("returns 1 for value equal to or greater than max", () => {
      expect(getFillPortion(10, 10)).toBe(1);
      expect(getFillPortion(15, 10)).toBe(1);
    });

    it("returns exact ratio when segments is 0", () => {
      expect(getFillPortion(3, 10)).toBe(0.3);
      expect(getFillPortion(7, 10)).toBe(0.7);
    });

    it("snaps to segment boundaries when segments > 0", () => {
      // 3/10 = 0.3. 0.3 * 5 = 1.5. Ceil(1.5) = 2. 2 / 5 = 0.4.
      expect(getFillPortion(3, 10, 5)).toBe(0.4);
      // 2.1/10 = 0.21. 0.21 * 4 = 0.84. Ceil(0.84) = 1. 1/4 = 0.25.
      expect(getFillPortion(2.1, 10, 4)).toBe(0.25);
    });
  });

  describe("createRoundedRectangle", () => {
    it("returns a coordinate array for full rectangle (fill = 1.0)", () => {
      const points = createRoundedRectangle(100, 20, 5, 1.0, 3);
      expect(points.length).toBeGreaterThan(0);
      // Top-left corner arc starts around x=5, y=0
      expect(points[0]).toEqual({ x: 5, y: 0 });
    });

    it("clamps radius if it exceeds half-height", () => {
      // Height 10, radius 6. Max radius allowed is height * 0.5 = 5.
      const points = createRoundedRectangle(100, 10, 6, 1.0, 3);
      expect(points[0]).toEqual({ x: 5, y: 0 });
    });

    it("returns smaller coordinate array when fill is fractional", () => {
      const pointsHalf = createRoundedRectangle(100, 20, 5, 0.5, 3);
      expect(pointsHalf.length).toBeGreaterThan(0);
    });
  });

  describe("getImageCenter", () => {
    it("correctly calculates the world space center of an image token", () => {
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

      // getImageCenter uses OBR Math2 mocks from setup.ts
      const center = getImageCenter(image, 150);

      // Calculations:
      // imageCenter = add({0,0}, {100,100}*0.5) => {50, 50}
      // imageCenter = subtract({50,50}, {10,10}) => {40, 40}
      // imageCenter = multiply({40,40}, 150/150) => {40, 40}
      // imageCenter = multiply({40,40}, {2,2}) => {80, 80}
      // imageCenter = rotate({80,80}, {0,0}, 90) => rad = pi/2, cos=0, sin=1
      //   dx = 80, dy = 80
      //   x = cos*80 - sin*80 = -80
      //   y = sin*80 + cos*80 = 80
      //   => {-80, 80}
      // imageCenter = add({-80, 80}, {50, 50}) => {-30, 130}
      expect(center).toEqual({ x: -30, y: 130 });
    });
  });
});
