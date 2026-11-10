import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  rgbToHexNumber,
  lighten,
  darken,
  alphaBlend,
  rgbaToUint32,
  uint32ToRgba,
  hexToUint32,
  clampByte,
  normalizeAlphaByte,
} from '../../src/game/graphics/palette/colorUtils';
import { PALETTE_HEX, PALETTE_NUMERIC, PALETTE_PACKED } from '../../src/game/graphics/palette/palette';

describe('Color Utilities & Palette (Task 3.1)', () => {
  describe('Hex to RGB Parsing', () => {
    it('parses standard 6-digit hex strings with and without hash', () => {
      expect(hexToRgb('#4d8c3f')).toEqual({ r: 0x4d, g: 0x8c, b: 0x3f });
      expect(hexToRgb('4d8c3f')).toEqual({ r: 0x4d, g: 0x8c, b: 0x3f });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('parses 3-digit shorthand hex strings', () => {
      expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('0f0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00f')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc });
    });

    it('parses 24-bit numeric hex numbers', () => {
      expect(hexToRgb(0x4d8c3f)).toEqual({ r: 0x4d, g: 0x8c, b: 0x3f });
      expect(hexToRgb(0x000000)).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb(0xffffff)).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('throws TypeError on invalid hex strings or out-of-range numbers', () => {
      expect(() => hexToRgb('#xyz')).toThrow(TypeError);
      expect(() => hexToRgb('#12345')).toThrow(TypeError);
      expect(() => hexToRgb('#1234567')).toThrow(TypeError);
      expect(() => hexToRgb(-1)).toThrow(TypeError);
      expect(() => hexToRgb(0x1000000)).toThrow(TypeError);
      // @ts-expect-error testing invalid type
      expect(() => hexToRgb(null)).toThrow(TypeError);
    });
  });

  describe('RGB to Hex Conversion', () => {
    it('converts RGB channels to 6-digit hex string', () => {
      expect(rgbToHex(77, 140, 63)).toBe('#4d8c3f');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
    });

    it('converts RGB channels to 24-bit hex number', () => {
      expect(rgbToHexNumber(77, 140, 63)).toBe(0x4d8c3f);
      expect(rgbToHexNumber(0, 0, 0)).toBe(0x000000);
      expect(rgbToHexNumber(255, 255, 255)).toBe(0xffffff);
    });

    it('clamps out-of-range channels automatically in rgbToHex', () => {
      expect(rgbToHex(-50, 300, 128)).toBe('#00ff80');
      expect(clampByte(-10)).toBe(0);
      expect(clampByte(300)).toBe(255);
      expect(clampByte(127.4)).toBe(127);
      expect(clampByte(NaN)).toBe(0);

      expect(normalizeAlphaByte(0.5)).toBe(128);
      expect(normalizeAlphaByte(1)).toBe(255);
      expect(normalizeAlphaByte(0)).toBe(0);
      expect(normalizeAlphaByte(200)).toBe(200);
      expect(normalizeAlphaByte(NaN)).toBe(255);
    });
  });

  describe('Lighten and Darken Shading Operations', () => {
    const baseGreen = { r: 100, g: 150, b: 80 };

    it('lightens colors toward white proportionally', () => {
      const lighter = lighten(baseGreen, 0.2); // 20% toward 255
      expect(lighter.r).toBeGreaterThan(baseGreen.r);
      expect(lighter.g).toBeGreaterThan(baseGreen.g);
      expect(lighter.b).toBeGreaterThan(baseGreen.b);

      // Factor 1 produces pure white
      expect(lighten(baseGreen, 1.0)).toEqual({ r: 255, g: 255, b: 255 });
      // Factor 0 leaves unchanged
      expect(lighten(baseGreen, 0.0)).toEqual(baseGreen);
    });

    it('darkens colors toward black proportionally', () => {
      const darker = darken(baseGreen, 0.2); // 20% toward 0
      expect(darker.r).toBeLessThan(baseGreen.r);
      expect(darker.g).toBeLessThan(baseGreen.g);
      expect(darker.b).toBeLessThan(baseGreen.b);

      // Factor 1 produces pure black
      expect(darken(baseGreen, 1.0)).toEqual({ r: 0, g: 0, b: 0 });
      // Factor 0 leaves unchanged
      expect(darken(baseGreen, 0.0)).toEqual(baseGreen);
    });
  });

  describe('Alpha Blending', () => {
    it('blends opaque source over destination accurately', () => {
      const red = { r: 255, g: 0, b: 0, a: 255 };
      const blue = { r: 0, g: 0, b: 255, a: 255 };

      // Opaque source completely covers destination
      const result = alphaBlend(red, blue);
      expect(result).toEqual({ r: 255, g: 0, b: 0, a: 255 });
    });

    it('blends 50% semi-transparent red over blue', () => {
      const red = { r: 255, g: 0, b: 0 };
      const blue = { r: 0, g: 0, b: 255 };

      const blended = alphaBlend(red, blue, 0.5);
      // Red: 255 * 0.5 = 127.5 -> 128
      // Blue: 255 * (1 - 0.5) = 127.5 -> 128
      expect(blended.r).toBeCloseTo(128, -1);
      expect(blended.b).toBeCloseTo(128, -1);
      expect(blended.g).toBe(0);
      expect(blended.a).toBe(255);
    });
  });

  describe('Pixel Buffer 32-Bit Integer Representation', () => {
    it('packs RGBA into little-endian Uint32 integer', () => {
      // Little-endian: ((A << 24) | (B << 16) | (G << 8) | R) >>> 0
      const packed = rgbaToUint32(0x12, 0x34, 0x56, 0x78);
      // Expected: 0x78563412
      expect(packed).toBe(0x78563412 >>> 0);
    });

    it('unpacks 32-bit integer back to original RGBA channels without loss', () => {
      const original = { r: 77, g: 140, b: 63, a: 220 };
      const packed = rgbaToUint32(original.r, original.g, original.b, original.a);
      const unpacked = uint32ToRgba(packed);

      expect(unpacked).toEqual(original);
    });

    it('converts hex string directly to packed 32-bit uint32', () => {
      const packed = hexToUint32('#4d8c3f', 255);
      const unpacked = uint32ToRgba(packed);

      expect(unpacked).toEqual({ r: 0x4d, g: 0x8c, b: 0x3f, a: 255 });
    });
  });

  describe('Canonical Palette Structure', () => {
    it('provides all 7 core biome/structure color ramps with highlight, base, shadow, and outline', () => {
      const ramps = ['GRASS', 'DIRT', 'STONE', 'WATER', 'WOOD', 'SAND', 'ROOF'] as const;

      for (const key of ramps) {
        const ramp = PALETTE_HEX[key];
        expect(ramp.highlight).toMatch(/^#[0-9a-f]{6}$/i);
        expect(ramp.base).toMatch(/^#[0-9a-f]{6}$/i);
        expect(ramp.shadow).toMatch(/^#[0-9a-f]{6}$/i);
        expect(ramp.outline).toMatch(/^#[0-9a-f]{6}$/i);

        // Numeric ramp matching
        expect(PALETTE_NUMERIC[key].base).toBe(rgbToHexNumber(...Object.values(hexToRgb(ramp.base)) as [number, number, number]));

        // Packed ramp matching
        expect(PALETTE_PACKED[key].base).toBe(hexToUint32(ramp.base));
      }
    });

    it('provides interaction overlay tokens', () => {
      expect(PALETTE_HEX.OVERLAY.HOVER_GREEN).toBe('#55ff55');
      expect(PALETTE_HEX.OVERLAY.SELECT_CYAN).toBe('#00f0ff');
      expect(PALETTE_HEX.OVERLAY.GRID_LINE).toBe('#38bdf8');
    });
  });
});
