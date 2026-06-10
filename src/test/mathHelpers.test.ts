import { describe, it, expect } from "vitest";
import { Image } from "@owlbear-rodeo/sdk";
import { getImageCenter } from "../background/mathHelpers";

describe("mathHelpers", () => {

  // ─── getImageCenter ───────────────────────────────────────────────────────

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

      // Step-by-step using the mock Math2 from setup.ts:
      // 1. add({0,0}, multiply({100,100}, 0.5))   → add({0,0},{50,50})   = {50,50}
      // 2. subtract({50,50}, {10,10})              = {40,40}
      // 3. multiply({40,40}, 150/150)              = multiply({40,40},1) = {40,40}
      // 4. multiply({40,40}, {2,2})                = {80,80}
      // 5. rotate({80,80}, {0,0}, 90)
      //    rad=π/2, cos≈0, sin≈1
      //    dx=80, dy=80
      //    x = 0*80 - 1*80 + 0 = -80
      //    y = 1*80 + 0*80 + 0 =  80
      //    → {-80,80}
      // 6. add({-80,80}, {50,50})                  = {-30,130}
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

      // 1. {0,0} + {30,20}  = {30,20}
      // 2. {30,20} - {0,0}  = {30,20}
      // 3. {30,20} * 1      = {30,20}
      // 4. {30,20} * {1,1}  = {30,20}
      // 5. rotate({30,20},{0,0},0): cos=1,sin=0 → {30,20}
      // 6. {30,20} + {0,0}  = {30,20}
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

      // 1. {50,50}  2. {50,50}  3. *2 = {100,100}  4. *{1,1} = {100,100}
      // 5. rotate 0 → {100,100}  6. +{0,0} → {100,100}
      expect(getImageCenter(image, 300)).toEqual({ x: 100, y: 100 });
    });

    it("negative scale (flipped token) is handled via abs in callers, not getImageCenter", () => {
      // getImageCenter uses Math2.multiply which preserves the sign of scale.
      // The on-map helpers use Math.abs(image.scale.x) separately.
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

      // step 1: {30,30}  step 2: {30,30}  step 3: *1={30,30}
      // step 4: multiply({30,30},{-1,1}) = {-30,30}
      // step 5: rotate({-30,30},{0,0},0) = {-30,30}
      // step 6: +{0,0} = {-30,30}
      expect(getImageCenter(image, 150)).toEqual({ x: -30, y: 30 });
    });
  });
});
