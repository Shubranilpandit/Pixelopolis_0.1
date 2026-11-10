import { describe, it, expect } from 'vitest';
import { PixelCanvas } from '../../src/game/graphics/core/PixelCanvas';
import { rgbaToUint32, uint32ToRgba } from '../../src/game/graphics/palette/colorUtils';

describe('PixelCanvas', () => {
  describe('Initialization and Dimension Validation', () => {
    it('creates an empty canvas with specified dimensions and zeroed buffer', () => {
      const canvas = new PixelCanvas(64, 32);
      expect(canvas.width).toBe(64);
      expect(canvas.height).toBe(32);

      const raw = canvas.getRawBuffer();
      expect(raw.length).toBe(64 * 32);
      expect(raw.every((px) => px === 0)).toBe(true);
    });

    it('rejects non-finite dimensions with TypeError', () => {
      expect(() => new PixelCanvas(NaN, 32)).toThrow(TypeError);
      expect(() => new PixelCanvas(64, Infinity)).toThrow(TypeError);
    });

    it('rejects zero or negative dimensions with RangeError', () => {
      expect(() => new PixelCanvas(0, 32)).toThrow(RangeError);
      expect(() => new PixelCanvas(64, -5)).toThrow(RangeError);
      expect(() => new PixelCanvas(-10, -10)).toThrow(RangeError);
    });

    it('rejects dimensions exceeding MAX_DIMENSION (2048) with RangeError', () => {
      expect(() => new PixelCanvas(2049, 100)).toThrow(RangeError);
      expect(() => new PixelCanvas(100, 2049)).toThrow(RangeError);
    });

    it('accepts and copies a matching initialBuffer', () => {
      const buffer = new Uint32Array(4 * 4);
      buffer[0] = 0xff0000ff;
      buffer[15] = 0x00ff00ff;

      const canvas = new PixelCanvas(4, 4, buffer);
      expect(canvas.getPixel(0, 0)).toBe(0xff0000ff);
      expect(canvas.getPixel(3, 3)).toBe(0x00ff00ff);

      // Mutating source buffer should not mutate canvas (deep copy)
      buffer[0] = 0x12345678;
      expect(canvas.getPixel(0, 0)).toBe(0xff0000ff);
    });

    it('rejects initialBuffer with mismatched length', () => {
      const wrongSizeBuffer = new Uint32Array(10);
      expect(() => new PixelCanvas(4, 4, wrongSizeBuffer)).toThrow(RangeError);
    });
  });

  describe('setPixel and getPixel Operations', () => {
    it('writes and reads pixels accurately inside bounds', () => {
      const canvas = new PixelCanvas(10, 10);
      const testColor = rgbaToUint32(120, 200, 50, 255);

      canvas.setPixel(4, 7, testColor);
      expect(canvas.getPixel(4, 7)).toBe(testColor);
    });

    it('floors fractional coordinates', () => {
      const canvas = new PixelCanvas(10, 10);
      const testColor = 0xaabbccdd;

      canvas.setPixel(3.9, 5.2, testColor);
      expect(canvas.getPixel(3, 5)).toBe(testColor);
    });

    it('silently ignores out-of-bounds writes without throwing', () => {
      const canvas = new PixelCanvas(10, 10);

      expect(() => {
        canvas.setPixel(-1, 0, 0xffffffff);
        canvas.setPixel(0, -1, 0xffffffff);
        canvas.setPixel(10, 5, 0xffffffff);
        canvas.setPixel(5, 10, 0xffffffff);
        canvas.setPixel(999, 999, 0xffffffff);
      }).not.toThrow();

      // Buffer remains clean
      expect(canvas.getRawBuffer().every((px) => px === 0)).toBe(true);
    });

    it('returns 0 for out-of-bounds reads', () => {
      const canvas = new PixelCanvas(10, 10);
      expect(canvas.getPixel(-1, 0)).toBe(0);
      expect(canvas.getPixel(0, -1)).toBe(0);
      expect(canvas.getPixel(10, 5)).toBe(0);
      expect(canvas.getPixel(5, 10)).toBe(0);
    });
  });

  describe('fillRect', () => {
    it('fills an axis-aligned rectangle completely inside bounds', () => {
      const canvas = new PixelCanvas(8, 8);
      const color = rgbaToUint32(255, 0, 0, 255);

      canvas.fillRect(2, 2, 4, 3, color);

      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          if (x >= 2 && x < 6 && y >= 2 && y < 5) {
            expect(canvas.getPixel(x, y)).toBe(color);
          } else {
            expect(canvas.getPixel(x, y)).toBe(0);
          }
        }
      }
    });

    it('clips rectangles that partially overlap boundaries', () => {
      const canvas = new PixelCanvas(6, 6);
      const color = 0xffffffff;

      // Extends off the left and top
      canvas.fillRect(-2, -2, 4, 4, color);

      // Pixels (0,0), (0,1), (1,0), (1,1) should be colored
      expect(canvas.getPixel(0, 0)).toBe(color);
      expect(canvas.getPixel(1, 1)).toBe(color);
      expect(canvas.getPixel(2, 0)).toBe(0);
      expect(canvas.getPixel(0, 2)).toBe(0);
    });

    it('ignores rectangles that are completely outside canvas', () => {
      const canvas = new PixelCanvas(6, 6);
      canvas.fillRect(10, 10, 5, 5, 0xffffffff);
      canvas.fillRect(-10, -10, 5, 5, 0xffffffff);
      expect(canvas.getRawBuffer().every((px) => px === 0)).toBe(true);
    });

    it('ignores rectangles with non-positive dimensions', () => {
      const canvas = new PixelCanvas(6, 6);
      canvas.fillRect(0, 0, 0, 5, 0xffffffff);
      canvas.fillRect(0, 0, 5, 0, 0xffffffff);
      canvas.fillRect(0, 0, -2, -2, 0xffffffff);
      expect(canvas.getRawBuffer().every((px) => px === 0)).toBe(true);
    });
  });

  describe('drawLine', () => {
    it('draws a horizontal line', () => {
      const canvas = new PixelCanvas(10, 10);
      const color = 0xff112233;

      canvas.drawLine(1, 4, 6, 4, color);

      for (let x = 1; x <= 6; x++) {
        expect(canvas.getPixel(x, 4)).toBe(color);
      }
      expect(canvas.getPixel(0, 4)).toBe(0);
      expect(canvas.getPixel(7, 4)).toBe(0);
    });

    it('draws a vertical line', () => {
      const canvas = new PixelCanvas(10, 10);
      const color = 0xff445566;

      canvas.drawLine(3, 2, 3, 7, color);

      for (let y = 2; y <= 7; y++) {
        expect(canvas.getPixel(3, y)).toBe(color);
      }
      expect(canvas.getPixel(3, 1)).toBe(0);
      expect(canvas.getPixel(3, 8)).toBe(0);
    });

    it('draws a diagonal Bresenham line', () => {
      const canvas = new PixelCanvas(10, 10);
      const color = 0xffaabbcc;

      canvas.drawLine(1, 1, 4, 4, color);

      expect(canvas.getPixel(1, 1)).toBe(color);
      expect(canvas.getPixel(2, 2)).toBe(color);
      expect(canvas.getPixel(3, 3)).toBe(color);
      expect(canvas.getPixel(4, 4)).toBe(color);
    });
  });

  describe('fillPolygon', () => {
    it('safely handles empty or degenerate polygon inputs', () => {
      const canvas = new PixelCanvas(10, 10);
      expect(() => {
        canvas.fillPolygon([], 0xffffffff);
        canvas.fillPolygon([{ x: 1, y: 1 }], 0xffffffff);
        canvas.fillPolygon([{ x: 1, y: 1 }, { x: 2, y: 2 }], 0xffffffff);
      }).not.toThrow();

      expect(canvas.getRawBuffer().every((px) => px === 0)).toBe(true);
    });

    it('fills a triangular polygon', () => {
      const canvas = new PixelCanvas(10, 10);
      const color = 0xff00ff00;

      // Right-angle triangle from (1,1) to (6,1) to (1,6)
      canvas.fillPolygon(
        [
          { x: 1, y: 1 },
          { x: 6, y: 1 },
          { x: 1, y: 6 },
        ],
        color
      );

      // (1, 1) and (2, 2) should be inside
      expect(canvas.getPixel(1, 1)).toBe(color);
      expect(canvas.getPixel(2, 2)).toBe(color);
      // (8, 8) is definitely outside
      expect(canvas.getPixel(8, 8)).toBe(0);
    });
  });

  describe('blit', () => {
    it('copies raw pixels directly in copy mode', () => {
      const src = new PixelCanvas(3, 3);
      const testColor = 0x88112233; // Has semi-transparent alpha
      src.fillRect(0, 0, 3, 3, testColor);

      const dst = new PixelCanvas(6, 6);
      dst.blit(src, 1, 1, 'copy');

      expect(dst.getPixel(1, 1)).toBe(testColor);
      expect(dst.getPixel(3, 3)).toBe(testColor);
      expect(dst.getPixel(0, 0)).toBe(0);
      expect(dst.getPixel(4, 4)).toBe(0);
    });

    it('skips completely transparent pixels in blend mode', () => {
      const src = new PixelCanvas(2, 2);
      // Alpha is 0 (transparent)
      src.setPixel(0, 0, 0x00ffffff);

      const dst = new PixelCanvas(2, 2);
      const baseColor = rgbaToUint32(100, 100, 100, 255);
      dst.clear(baseColor);

      dst.blit(src, 0, 0, 'blend');
      expect(dst.getPixel(0, 0)).toBe(baseColor);
    });

    it('overwrites destination when source alpha is 255 in blend mode', () => {
      const src = new PixelCanvas(2, 2);
      const opaqueRed = rgbaToUint32(255, 0, 0, 255);
      src.clear(opaqueRed);

      const dst = new PixelCanvas(2, 2);
      const opaqueBlue = rgbaToUint32(0, 0, 255, 255);
      dst.clear(opaqueBlue);

      dst.blit(src, 0, 0, 'blend');
      expect(dst.getPixel(0, 0)).toBe(opaqueRed);
    });

    it('performs Porter-Duff alpha blending for semi-transparent source', () => {
      const src = new PixelCanvas(1, 1);
      // 50% white: rgba(255, 255, 255, 128)
      src.setPixel(0, 0, rgbaToUint32(255, 255, 255, 128));

      const dst = new PixelCanvas(1, 1);
      // Opaque black: rgba(0, 0, 0, 255)
      dst.setPixel(0, 0, rgbaToUint32(0, 0, 0, 255));

      dst.blit(src, 0, 0, 'blend');

      const blended = uint32ToRgba(dst.getPixel(0, 0));
      // 50% white over black = ~128
      expect(blended.r).toBeGreaterThan(120);
      expect(blended.r).toBeLessThan(135);
      expect(blended.a).toBe(255);
    });

    it('clips blits with negative destination coordinates or overflow', () => {
      const src = new PixelCanvas(4, 4);
      src.clear(0xffffffff);

      const dst = new PixelCanvas(4, 4);
      dst.blit(src, -2, -2, 'copy');

      expect(dst.getPixel(0, 0)).toBe(0xffffffff);
      expect(dst.getPixel(1, 1)).toBe(0xffffffff);
      expect(dst.getPixel(2, 2)).toBe(0);
    });
  });

  describe('clear', () => {
    it('clears all pixels to transparent 0 by default', () => {
      const canvas = new PixelCanvas(4, 4);
      canvas.setPixel(1, 1, 0xffffffff);
      canvas.clear();

      expect(canvas.getRawBuffer().every((px) => px === 0)).toBe(true);
    });

    it('clears all pixels to a specified fill color', () => {
      const canvas = new PixelCanvas(4, 4);
      const color = 0x12345678;
      canvas.clear(color);

      expect(canvas.getRawBuffer().every((px) => px === color)).toBe(true);
    });
  });

  describe('Buffer Access, Cloning, and Export', () => {
    it('provides zero-copy access via getRawBuffer', () => {
      const canvas = new PixelCanvas(4, 4);
      const raw = canvas.getRawBuffer();

      raw[0] = 0x44332211;
      expect(canvas.getPixel(0, 0)).toBe(0x44332211);
    });

    it('provides isolated deep copy via cloneBuffer', () => {
      const canvas = new PixelCanvas(4, 4);
      canvas.setPixel(0, 0, 0x11223344);

      const clonedBuf = canvas.cloneBuffer();
      expect(clonedBuf[0]).toBe(0x11223344);

      clonedBuf[0] = 0x99999999;
      expect(canvas.getPixel(0, 0)).toBe(0x11223344);
    });

    it('exports Uint8ClampedArray for ImageData compatibility', () => {
      const canvas = new PixelCanvas(2, 2);
      // Red = 255, Green = 128, Blue = 64, Alpha = 255
      const color = rgbaToUint32(255, 128, 64, 255);
      canvas.setPixel(0, 0, color);

      const clamped = canvas.toUint8ClampedArray();
      expect(clamped.byteLength).toBe(2 * 2 * 4);
      expect(clamped[0]).toBe(255); // R
      expect(clamped[1]).toBe(128); // G
      expect(clamped[2]).toBe(64);  // B
      expect(clamped[3]).toBe(255); // A
    });

    it('clones into an independent PixelCanvas instance', () => {
      const original = new PixelCanvas(4, 4);
      original.setPixel(2, 2, 0xff00ff00);

      const cloned = original.clone();
      expect(cloned.width).toBe(4);
      expect(cloned.height).toBe(4);
      expect(cloned.getPixel(2, 2)).toBe(0xff00ff00);

      cloned.setPixel(2, 2, 0x11111111);
      expect(original.getPixel(2, 2)).toBe(0xff00ff00);
    });
  });
});
