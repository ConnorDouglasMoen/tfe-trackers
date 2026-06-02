import { describe, it, expect } from "vitest";
import { Image } from "@owlbear-rodeo/sdk";
import {
  getFillPortion,
  createRoundedRectangle,
  getImageCenter,
} from "../background/mathHelpers";

describe("mathHelpers", () => {

  // ─── getFillPortion ───────────────────────────────────────────────────────

  describe("getFillPortion", () => {
    it("returns 0 for negative value", () => {
      expect(getFillPortion(-5, 10)).toBe(0);
    });

    it("returns 0 for zero value", () => {
      expect(getFillPortion(0, 10)).toBe(0);
    });

    it("returns 1 for value equal to max", () => {
      expect(getFillPortion(10, 10)).toBe(1);
    });

    it("returns 1 for value greater than max", () => {
      expect(getFillPortion(15, 10)).toBe(1);
    });

    it("returns exact ratio when segments=0 (default)", () => {
      expect(getFillPortion(3, 10)).toBe(0.3);
      expect(getFillPortion(7, 10)).toBe(0.7);
      expect(getFillPortion(1, 4)).toBe(0.25);
    });

    it("snaps up to the next segment boundary", () => {
      // 3/10 = 0.3. 0.3*5 = 1.5 → ceil = 2. 2/5 = 0.4
      expect(getFillPortion(3, 10, 5)).toBe(0.4);
    });

    it("snaps up when value falls inside first segment", () => {
      // 2.1/10 = 0.21. 0.21*4 = 0.84 → ceil = 1. 1/4 = 0.25
      expect(getFillPortion(2.1, 10, 4)).toBe(0.25);
    });

    it("returns 1 when value exactly fills the last segment", () => {
      // 10/10 = 1.0. Clamped before segment maths → 1
      expect(getFillPortion(10, 10, 5)).toBe(1);
    });

    it("snaps to 1/N for the first segment", () => {
      // 0.1/10 → 0.01 → *3 = 0.03 → ceil = 1 → 1/3
      expect(getFillPortion(0.1, 10, 3)).toBeCloseTo(1 / 3);
    });
  });

  // ─── createRoundedRectangle ───────────────────────────────────────────────

  describe("createRoundedRectangle", () => {

    // ── fill = 1 (full rectangle) ───────────────────────────────────────────

    it("full fill: first point starts at (radius, 0)", () => {
      const pts = createRoundedRectangle(100, 20, 5, 1.0, 3);
      expect(pts[0]).toEqual({ x: 5, y: 0 });
    });

    it("full fill: returns a non-empty coordinate array", () => {
      const pts = createRoundedRectangle(100, 20, 5, 1.0, 3);
      expect(pts.length).toBeGreaterThan(0);
    });

    it("full fill: clamps radius exceeding half-height to height*0.5", () => {
      // height=10, radius=6 → clamped to 5; first point at x=5
      const pts = createRoundedRectangle(100, 10, 6, 1.0, 3);
      expect(pts[0]).toEqual({ x: 5, y: 0 });
    });

    it("full fill: more arc points produce more coordinate points", () => {
      const few = createRoundedRectangle(100, 20, 5, 1.0, 3);
      const many = createRoundedRectangle(100, 20, 5, 1.0, 8);
      expect(many.length).toBeGreaterThan(few.length);
    });

    // ── barLength < radius (fill so small only the left cap is drawn) ───────

    it("tiny fill (barLength < radius): returns only arc points, no flat top", () => {
      // maxLength=100, radius=10, fill=0.05 → barLength=5 < radius=10
      // Takes the 'barLength < radius' branch; returns two arc arrays, no
      // straight top/bottom edges.
      const pts = createRoundedRectangle(100, 20, 10, 0.05, 3);
      expect(pts.length).toBeGreaterThan(0);
      // No point should have x > barLength + small epsilon (only the left cap)
      const barLength = 100 * 0.05; // 5
      for (const p of pts) {
        expect(p.x).toBeLessThanOrEqual(barLength + 10 + 1); // within cap radius
      }
    });

    // ── remainingBarLength < radius (fill so near-full only right cap clips) -

    it("near-full fill (remainingBarLength < radius): includes flat top edges", () => {
      // maxLength=100, radius=10, fill=0.95 → barLength=95, remaining=5 < radius=10
      // Takes the 'remainingBarLength < radius' branch; includes { x: radius, y: 0 }
      const pts = createRoundedRectangle(100, 20, 10, 0.95, 3);
      expect(pts[0]).toEqual({ x: 10, y: 0 }); // starts at radius
    });

    // ── straight middle section (fill in the middle range) ──────────────────

    it("mid fill: includes a straight vertical right edge at x=barLength", () => {
      // maxLength=100, radius=5, fill=0.5 → barLength=50
      // Both barLength(50) >= radius(5) and remainingBarLength(50) >= radius(5),
      // so the straight-middle branch runs. It emits { x: barLength, y: 0 }
      // and { x: barLength, y: height } as the right edge.
      const pts = createRoundedRectangle(100, 20, 5, 0.5, 3);
      expect(pts.some((p) => p.x === 50 && p.y === 0)).toBe(true);
      expect(pts.some((p) => p.x === 50 && p.y === 20)).toBe(true);
    });

    it("mid fill: starts at (radius, 0)", () => {
      const pts = createRoundedRectangle(100, 20, 5, 0.5, 3);
      expect(pts[0]).toEqual({ x: 5, y: 0 });
    });

    // ── edge cases ───────────────────────────────────────────────────────────

    it("fill=0 (barLength=0 < radius): returns arc points without crashing", () => {
      // barLength=0 < radius=5 → referenceAngle = acos(radius/radius) = acos(1) = 0
      // drawArc with arcAngle=0 still runs; no throw expected.
      expect(() => createRoundedRectangle(100, 20, 5, 0, 3)).not.toThrow();
    });

    it("zero radius produces rectangular corners", () => {
      // radius=0 → no arc math; clamping doesn't kick in
      const pts = createRoundedRectangle(100, 20, 0, 1.0, 3);
      expect(pts[0]).toEqual({ x: 0, y: 0 });
    });
  });

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
