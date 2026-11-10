import { describe, it, expect } from 'vitest';
import {
  generateStructurePrototype,
  generateStructureTile,
  STRUCTURE_TEXTURE_KEYS,
  STRUCTURE_DIMENSIONS,
} from '../../src/game/graphics/generators/structureTextureGenerator';
import { PixelCanvas } from '../../src/game/graphics/core/PixelCanvas';
import { PALETTE_PACKED } from '../../src/game/graphics/palette/palette';

describe('Structure Texture Generator', () => {
  describe('Dimensions and Alignment Metadata', () => {
    it('produces a 64x64 PixelCanvas instance with vertical building height', () => {
      const structure = generateStructurePrototype();

      expect(structure).toBeInstanceOf(PixelCanvas);
      expect(structure.width).toBe(64);
      expect(structure.height).toBe(64);
    });

    it('exposes standard dimensions and sprite anchor convention metadata', () => {
      expect(STRUCTURE_DIMENSIONS.WIDTH).toBe(64);
      expect(STRUCTURE_DIMENSIONS.HEIGHT).toBe(64);
      expect(STRUCTURE_DIMENSIONS.ORIGIN_X).toBe(0.5);
      expect(STRUCTURE_DIMENSIONS.ORIGIN_Y).toBe(0.75);
      expect(STRUCTURE_DIMENSIONS.GROUND_CENTER_X).toBe(32);
      expect(STRUCTURE_DIMENSIONS.GROUND_CENTER_Y).toBe(48);
      expect(STRUCTURE_DIMENSIONS.GROUND_FOOTPRINT_WIDTH).toBe(64);
      expect(STRUCTURE_DIMENSIONS.GROUND_FOOTPRINT_HEIGHT).toBe(32);
    });

    it('aligns ground base footprint corners with 1x1 tile reference', () => {
      const structure = generateStructurePrototype();

      // Left ground apex at (0, 48)
      expect(structure.getPixel(0, 48)).not.toBe(0);

      // Right ground apex at (63, 48)
      expect(structure.getPixel(63, 48)).not.toBe(0);

      // Front-bottom apex at (31, 63)
      expect(structure.getPixel(31, 63)).not.toBe(0);
    });
  });

  describe('Vertical Height and Transparent Silhouette', () => {
    it('rises vertically above ground with non-zero pixels spanning ~56 rows', () => {
      const structure = generateStructurePrototype();
      let minY = 64;
      let maxY = -1;

      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          if (structure.getPixel(x, y) !== 0) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // Roof ridge starts near y = 8
      expect(minY).toBeLessThanOrEqual(8);
      // Foundation extends to y = 63
      expect(maxY).toBe(63);

      // Total vertical span is >= 50 pixels
      expect(maxY - minY + 1).toBeGreaterThanOrEqual(50);
    });

    it('preserves transparent background outside the visible building silhouette', () => {
      const structure = generateStructurePrototype();

      // Top corners outside roof
      expect(structure.getPixel(0, 0)).toBe(0);
      expect(structure.getPixel(63, 0)).toBe(0);

      // Sky above roof peak (row 0 to 7 at x = 32)
      expect(structure.getPixel(32, 0)).toBe(0);
      expect(structure.getPixel(32, 7)).toBe(0);

      // Bottom-left and bottom-right corners outside foundation
      expect(structure.getPixel(0, 63)).toBe(0);
      expect(structure.getPixel(63, 63)).toBe(0);
    });
  });

  describe('Lighting, Shading, and Distinct Material Surfaces', () => {
    it('distinguishes sunlit left roof pitch from shaded right roof pitch', () => {
      const structure = generateStructurePrototype();

      // Left roof pitch sample (e.g. at (20, 20))
      const leftPitch = structure.getPixel(20, 20);
      expect(leftPitch).toBe(PALETTE_PACKED.ROOF.highlight);

      // Right roof pitch sample (e.g. at (44, 20))
      const rightPitch = structure.getPixel(44, 20);
      expect(rightPitch).toBe(PALETTE_PACKED.ROOF.shadow);

      // Must be distinct colors
      expect(leftPitch).not.toBe(rightPitch);
    });

    it('distinguishes sunlit South-West wall from shaded South-East wall', () => {
      const structure = generateStructurePrototype();

      // South-West wall sample (e.g. at (8, 40))
      const leftWall = structure.getPixel(8, 40);
      expect(leftWall).toBe(PALETTE_PACKED.STONE.base);

      // South-East wall sample (e.g. at (56, 40))
      const rightWall = structure.getPixel(56, 40);
      expect(rightWall).toBe(PALETTE_PACKED.STONE.shadow);

      // Must be distinct colors
      expect(leftWall).not.toBe(rightWall);
    });

    it('includes architectural accents: front door and framed window', () => {
      const structure = generateStructurePrototype();

      // Door panel at (15, 50)
      const doorPixel = structure.getPixel(15, 50);
      expect(doorPixel).toBe(PALETTE_PACKED.WOOD.base);

      // Window glass at (45, 43)
      const windowGlass = structure.getPixel(45, 43);
      expect(windowGlass).toBe(PALETTE_PACKED.WATER.shadow);
    });
  });

  describe('Determinism, Target Reuse, and Key Dispatch', () => {
    it('is strictly deterministic across multiple invocations', () => {
      const b1 = generateStructurePrototype();
      const b2 = generateStructurePrototype();
      expect(b1.getRawBuffer()).toEqual(b2.getRawBuffer());
    });

    it('reuses a pre-allocated target canvas safely', () => {
      const target = new PixelCanvas(64, 64);
      target.setPixel(0, 0, 0xffffffff);

      const result = generateStructurePrototype({ target });
      expect(result).toBe(target);
      expect(result.getPixel(0, 0)).toBe(0);
    });

    it('rejects target canvases with invalid dimensions', () => {
      const wrongSize = new PixelCanvas(64, 32);
      expect(() => generateStructurePrototype({ target: wrongSize })).toThrow(RangeError);
    });

    it('dispatches correctly via generateStructureTile(key)', () => {
      const s1 = generateStructureTile(STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1);
      const s2 = generateStructureTile('structure_cottage_v0');

      expect(s1.getRawBuffer()).toEqual(generateStructurePrototype().getRawBuffer());
      expect(s2.getRawBuffer()).toEqual(generateStructurePrototype().getRawBuffer());
    });

    it('throws when requesting an unsupported structure key', () => {
      expect(() => generateStructureTile('unknown_building_key')).toThrow(
        /Unsupported structure texture key/
      );
    });
  });
});
