import { describe, it, expect } from 'vitest';
import { PixelCanvas } from '../../src/game/graphics/core/PixelCanvas';
import {
  IsometricDrawing,
  fillIsometricDiamond,
  strokeIsometricDiamond,
  drawUpperLeftHighlight,
  drawLowerRightShadow,
  applySteppedShading,
  applyDither,
  getIsometricDiamondRowBounds,
  isInsideIsometricDiamond,
  getIsometricDiamondPoints,
} from '../../src/game/graphics/core/IsometricDrawing';
import { PALETTE_PACKED } from '../../src/game/graphics/palette/palette';

describe('IsometricDrawing', () => {
  describe('Geometry and Bounds Calculation', () => {
    it('exposes canonical isometric tile dimensions', () => {
      expect(IsometricDrawing.TILE_WIDTH).toBe(64);
      expect(IsometricDrawing.TILE_HEIGHT).toBe(32);
      expect(IsometricDrawing.HALF_WIDTH).toBe(32);
      expect(IsometricDrawing.HALF_HEIGHT).toBe(16);
    });

    it('returns exact 2:1 slope spans for all 32 tile rows', () => {
      // Row 0 apex
      expect(getIsometricDiamondRowBounds(0)).toEqual({ minX: 30, maxX: 33 });
      // Row 15 equator top
      expect(getIsometricDiamondRowBounds(15)).toEqual({ minX: 0, maxX: 63 });
      // Row 16 equator bottom
      expect(getIsometricDiamondRowBounds(16)).toEqual({ minX: 0, maxX: 63 });
      // Row 31 apex
      expect(getIsometricDiamondRowBounds(31)).toEqual({ minX: 30, maxX: 33 });

      // Out of bounds rows
      expect(getIsometricDiamondRowBounds(-1)).toBeNull();
      expect(getIsometricDiamondRowBounds(32)).toBeNull();
    });

    it('verifies strict 2:1 slope along top and bottom halves', () => {
      for (let y = 0; y < 15; y++) {
        const cur = getIsometricDiamondRowBounds(y)!;
        const next = getIsometricDiamondRowBounds(y + 1)!;
        expect(cur.minX - next.minX).toBe(2);
        expect(next.maxX - cur.maxX).toBe(2);
      }

      for (let y = 16; y < 31; y++) {
        const cur = getIsometricDiamondRowBounds(y)!;
        const next = getIsometricDiamondRowBounds(y + 1)!;
        expect(next.minX - cur.minX).toBe(2);
        expect(cur.maxX - next.maxX).toBe(2);
      }
    });

    it('verifies exact horizontal and vertical symmetry', () => {
      for (let y = 0; y < 32; y++) {
        const bounds = getIsometricDiamondRowBounds(y)!;
        // Horizontal symmetry around center 31.5
        expect(bounds.minX + bounds.maxX).toBe(63);

        // Vertical symmetry around center 15.5
        const mirrored = getIsometricDiamondRowBounds(31 - y)!;
        expect(bounds.minX).toBe(mirrored.minX);
        expect(bounds.maxX).toBe(mirrored.maxX);
      }
    });

    it('accurately classifies points as inside or outside the diamond', () => {
      // Key vertices
      expect(isInsideIsometricDiamond(31, 0)).toBe(true);
      expect(isInsideIsometricDiamond(32, 0)).toBe(true);
      expect(isInsideIsometricDiamond(0, 15)).toBe(true);
      expect(isInsideIsometricDiamond(63, 15)).toBe(true);
      expect(isInsideIsometricDiamond(0, 16)).toBe(true);
      expect(isInsideIsometricDiamond(63, 16)).toBe(true);
      expect(isInsideIsometricDiamond(31, 31)).toBe(true);
      expect(isInsideIsometricDiamond(32, 31)).toBe(true);
      expect(isInsideIsometricDiamond(32, 16)).toBe(true); // Center

      // Four outside canvas corners
      expect(isInsideIsometricDiamond(0, 0)).toBe(false);
      expect(isInsideIsometricDiamond(63, 0)).toBe(false);
      expect(isInsideIsometricDiamond(0, 31)).toBe(false);
      expect(isInsideIsometricDiamond(63, 31)).toBe(false);

      // Outside bounds
      expect(isInsideIsometricDiamond(32, -1)).toBe(false);
      expect(isInsideIsometricDiamond(32, 32)).toBe(false);
      expect(isInsideIsometricDiamond(29, 0)).toBe(false);
      expect(isInsideIsometricDiamond(34, 0)).toBe(false);
    });

    it('returns the four canonical polygon vertices', () => {
      const pts = getIsometricDiamondPoints(10, 5);
      expect(pts).toEqual([
        { x: 42, y: 5 },
        { x: 74, y: 21 },
        { x: 42, y: 37 },
        { x: 10, y: 21 },
      ]);
    });
  });

  describe('fillIsometricDiamond', () => {
    it('fills all 1088 diamond pixels while leaving background transparent', () => {
      const canvas = new PixelCanvas(64, 32);
      const color = PALETTE_PACKED.GRASS.base;

      fillIsometricDiamond(canvas, color);

      let diamondPixelCount = 0;
      let outsidePixelCount = 0;

      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
          const px = canvas.getPixel(x, y);
          if (isInsideIsometricDiamond(x, y)) {
            expect(px).toBe(color);
            diamondPixelCount++;
          } else {
            expect(px).toBe(0);
            outsidePixelCount++;
          }
        }
      }

      expect(diamondPixelCount).toBe(1088);
      expect(outsidePixelCount).toBe(2048 - 1088); // 960
    });

    it('respects coordinate offsets', () => {
      const canvas = new PixelCanvas(100, 50);
      const color = PALETTE_PACKED.STONE.base;

      fillIsometricDiamond(canvas, color, 10, 10);

      expect(canvas.getPixel(10 + 31, 10 + 0)).toBe(color);
      expect(canvas.getPixel(10 + 0, 10 + 15)).toBe(color);
      expect(canvas.getPixel(0, 0)).toBe(0);
    });
  });

  describe('strokeIsometricDiamond', () => {
    it('strokes the 1px perimeter outline without leaking outside or overwriting center', () => {
      const canvas = new PixelCanvas(64, 32);
      const outlineColor = PALETTE_PACKED.GRASS.outline;

      strokeIsometricDiamond(canvas, outlineColor);

      // Total perimeter outline pixels: 4 (top) + 4 (bottom) + 30 * 4 = 128
      let strokePixelCount = 0;
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
          if (canvas.getPixel(x, y) === outlineColor) {
            strokePixelCount++;
            // Must be inside diamond
            expect(isInsideIsometricDiamond(x, y)).toBe(true);
          }
        }
      }

      expect(strokePixelCount).toBe(128);

      // Center (32, 16) must NOT be outline
      expect(canvas.getPixel(32, 16)).toBe(0);
      // Apices must be outlined
      expect(canvas.getPixel(30, 0)).toBe(outlineColor);
      expect(canvas.getPixel(33, 0)).toBe(outlineColor);
      expect(canvas.getPixel(0, 15)).toBe(outlineColor);
      expect(canvas.getPixel(63, 15)).toBe(outlineColor);
    });
  });

  describe('Lighting and Shadow Facets', () => {
    it('draws upper-left highlight exclusively on rows 0..15', () => {
      const canvas = new PixelCanvas(64, 32);
      const hlColor = PALETTE_PACKED.GRASS.highlight;

      drawUpperLeftHighlight(canvas, hlColor, 1);

      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
          if (canvas.getPixel(x, y) === hlColor) {
            // Must only be on the upper half
            expect(y).toBeLessThan(16);
            // Must be inside diamond
            expect(isInsideIsometricDiamond(x, y)).toBe(true);
          }
        }
      }
    });

    it('draws lower-right shadow exclusively on rows 16..31', () => {
      const canvas = new PixelCanvas(64, 32);
      const shadowColor = PALETTE_PACKED.GRASS.shadow;

      drawLowerRightShadow(canvas, shadowColor, 1);

      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
          if (canvas.getPixel(x, y) === shadowColor) {
            // Must only be on the lower half
            expect(y).toBeGreaterThanOrEqual(16);
            // Must be inside diamond
            expect(isInsideIsometricDiamond(x, y)).toBe(true);
          }
        }
      }
    });
  });

  describe('applySteppedShading', () => {
    it('shades top-left with highlight and bottom-right with shadow', () => {
      const canvas = new PixelCanvas(64, 32);
      const hlColor = PALETTE_PACKED.DIRT.highlight;
      const shColor = PALETTE_PACKED.DIRT.shadow;

      applySteppedShading(canvas, hlColor, shColor, {
        highlightThreshold: 0.3,
        shadowThreshold: 0.7,
        maskToDiamond: true,
      });

      // Top-left pixel should receive highlight
      expect(canvas.getPixel(31, 1)).toBe(hlColor);
      // Bottom-right pixel should receive shadow
      expect(canvas.getPixel(32, 30)).toBe(shColor);
      // Center (32, 16) is in the midtone zone, remains 0
      expect(canvas.getPixel(32, 16)).toBe(0);
      // Outside diamond remains 0
      expect(canvas.getPixel(0, 0)).toBe(0);
    });
  });

  describe('applyDither', () => {
    it('produces deterministic checkerboard dithering', () => {
      const canvas1 = new PixelCanvas(64, 32);
      const canvas2 = new PixelCanvas(64, 32);
      const color = PALETTE_PACKED.OVERLAY.PURE_WHITE;

      applyDither(canvas1, color, 'checkerboard_2x2');
      applyDither(canvas2, color, 'checkerboard_2x2');

      const buf1 = canvas1.getRawBuffer();
      const buf2 = canvas2.getRawBuffer();

      expect(buf1).toEqual(buf2);

      // Verify checkerboard math inside diamond
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
          if (isInsideIsometricDiamond(x, y)) {
            if ((x + y) % 2 === 0) {
              expect(canvas1.getPixel(x, y)).toBe(color);
            } else {
              expect(canvas1.getPixel(x, y)).toBe(0);
            }
          } else {
            expect(canvas1.getPixel(x, y)).toBe(0);
          }
        }
      }
    });

    it('supports sparse_4x4 and horizontal_stripes patterns', () => {
      const canvas = new PixelCanvas(64, 32);
      const color = 0xffffffff;

      applyDither(canvas, color, 'horizontal_stripes');

      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 64; x++) {
          if (isInsideIsometricDiamond(x, y)) {
            if (y % 2 === 0) {
              expect(canvas.getPixel(x, y)).toBe(color);
            } else {
              expect(canvas.getPixel(x, y)).toBe(0);
            }
          }
        }
      }
    });

    it('supports bayer_2x2 and bayer_4x4 threshold dithering', () => {
      const canvas = new PixelCanvas(64, 32);
      const color = 0xffaabbcc;

      // Bayer 2x2 with threshold 1
      applyDither(canvas, color, 'bayer_2x2', { threshold: 1 });

      const raw = canvas.getRawBuffer();
      // Must not be completely empty or completely filled
      const filledCount = raw.filter((px) => px === color).length;
      expect(filledCount).toBeGreaterThan(100);
      expect(filledCount).toBeLessThan(1088);
    });
  });
});
