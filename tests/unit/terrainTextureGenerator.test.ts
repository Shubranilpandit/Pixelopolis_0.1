import { describe, it, expect } from 'vitest';
import {
  generateGrassTile,
  generateDirtTile,
  generateSandTile,
  generateWaterTile,
  generateTerrainTile,
  generateFoundationalTerrainSet,
  TERRAIN_TEXTURE_KEYS,
  DEFAULT_TERRAIN_SEED,
} from '../../src/game/graphics/generators/terrainTextureGenerator';
import { PixelCanvas } from '../../src/game/graphics/core/PixelCanvas';
import { isInsideIsometricDiamond } from '../../src/game/graphics/core/IsometricDrawing';
import { PALETTE_PACKED } from '../../src/game/graphics/palette/palette';
import { PRNG } from '../../src/game/graphics/prng/PRNG';

describe('Terrain Texture Generator', () => {
  describe('Output Dimensions and Footprint Containment', () => {
    it('produces valid 64x32 PixelCanvas instances for all foundational terrain types', () => {
      const set = generateFoundationalTerrainSet();

      const expectedKeys = Object.values(TERRAIN_TEXTURE_KEYS);
      expect(Object.keys(set)).toEqual(expectedKeys);

      for (const key of expectedKeys) {
        const canvas = set[key];
        expect(canvas).toBeInstanceOf(PixelCanvas);
        expect(canvas.width).toBe(64);
        expect(canvas.height).toBe(32);
      }
    });

    it('ensures all pixels outside the 64x32 isometric diamond footprint remain 100% transparent (0)', () => {
      const set = generateFoundationalTerrainSet();

      for (const [key, canvas] of Object.entries(set)) {
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 64; x++) {
            const pixel = canvas.getPixel(x, y);
            const inside = isInsideIsometricDiamond(x, y);

            if (!inside) {
              expect(
                pixel,
                `Pixel at (${x}, ${y}) in ${key} should be transparent 0 but was 0x${pixel.toString(16)}`
              ).toBe(0);
            } else {
              // Inside diamond, pixels must be non-zero (filled with opaque material colors)
              expect(
                pixel,
                `Pixel at (${x}, ${y}) in ${key} inside diamond should be non-zero`
              ).not.toBe(0);
            }
          }
        }
      }
    });
  });

  describe('Determinism and Stream Isolation', () => {
    it('generates byte-for-byte identical pixel buffers when given the same numeric seed', () => {
      const canvasA = generateGrassTile({ seed: 42, variant: 0 });
      const canvasB = generateGrassTile({ seed: 42, variant: 0 });

      expect(canvasA.getRawBuffer()).toEqual(canvasB.getRawBuffer());
    });

    it('generates different pixel buffers when given different seeds', () => {
      const canvasA = generateGrassTile({ seed: 101, variant: 0 });
      const canvasB = generateGrassTile({ seed: 202, variant: 0 });

      expect(canvasA.getRawBuffer()).not.toEqual(canvasB.getRawBuffer());
    });

    it('guarantees named stream isolation: order of generation does not alter outputs', () => {
      const root1 = new PRNG(8888);
      const root2 = new PRNG(8888);

      // Order 1: Grass v0 first, then Water
      const grass1 = generateGrassTile({ seed: root1, variant: 0 });
      const water1 = generateWaterTile({ seed: root1 });

      // Order 2: Water first, then Grass v0
      const water2 = generateWaterTile({ seed: root2 });
      const grass2 = generateGrassTile({ seed: root2, variant: 0 });

      expect(grass1.getRawBuffer()).toEqual(grass2.getRawBuffer());
      expect(water1.getRawBuffer()).toEqual(water2.getRawBuffer());
    });

    it('produces identical results whether passing number or PRNG instance', () => {
      const canvasFromNumber = generateDirtTile({ seed: DEFAULT_TERRAIN_SEED });
      const canvasFromPRNG = generateDirtTile({ seed: new PRNG(DEFAULT_TERRAIN_SEED) });

      expect(canvasFromNumber.getRawBuffer()).toEqual(canvasFromPRNG.getRawBuffer());
    });
  });

  describe('Grass Variant Differentiation', () => {
    it('generates four visually distinguishable grass variants that are mutually non-identical', () => {
      const v0 = generateGrassTile({ variant: 0 });
      const v1 = generateGrassTile({ variant: 1 });
      const v2 = generateGrassTile({ variant: 2 });
      const v3 = generateGrassTile({ variant: 3 });

      const buf0 = v0.getRawBuffer();
      const buf1 = v1.getRawBuffer();
      const buf2 = v2.getRawBuffer();
      const buf3 = v3.getRawBuffer();

      // All variants must differ from each other
      expect(buf0).not.toEqual(buf1);
      expect(buf0).not.toEqual(buf2);
      expect(buf0).not.toEqual(buf3);
      expect(buf1).not.toEqual(buf2);
      expect(buf1).not.toEqual(buf3);
      expect(buf2).not.toEqual(buf3);
    });

    it('restricts grass pixel colors strictly to the canonical GRASS palette ramp', () => {
      const allowedColors = new Set([
        0, // Transparent background
        PALETTE_PACKED.GRASS.highlight,
        PALETTE_PACKED.GRASS.base,
        PALETTE_PACKED.GRASS.shadow,
        PALETTE_PACKED.GRASS.outline,
      ]);

      for (let variant = 0; variant < 4; variant++) {
        const canvas = generateGrassTile({ variant: variant as 0 | 1 | 2 | 3 });
        for (const px of canvas.getRawBuffer()) {
          expect(allowedColors.has(px)).toBe(true);
        }
      }
    });
  });

  describe('Material Palette Compliance', () => {
    it('restricts dirt pixels strictly to the DIRT palette ramp', () => {
      const allowedColors = new Set([
        0,
        PALETTE_PACKED.DIRT.highlight,
        PALETTE_PACKED.DIRT.base,
        PALETTE_PACKED.DIRT.shadow,
        PALETTE_PACKED.DIRT.outline,
      ]);

      const canvas = generateDirtTile();
      for (const px of canvas.getRawBuffer()) {
        expect(allowedColors.has(px)).toBe(true);
      }
    });

    it('restricts sand pixels strictly to the SAND palette ramp', () => {
      const allowedColors = new Set([
        0,
        PALETTE_PACKED.SAND.highlight,
        PALETTE_PACKED.SAND.base,
        PALETTE_PACKED.SAND.shadow,
        PALETTE_PACKED.SAND.outline,
      ]);

      const canvas = generateSandTile();
      for (const px of canvas.getRawBuffer()) {
        expect(allowedColors.has(px)).toBe(true);
      }
    });

    it('restricts water pixels strictly to the WATER palette ramp and contains ripple details', () => {
      const allowedColors = new Set([
        0,
        PALETTE_PACKED.WATER.highlight,
        PALETTE_PACKED.WATER.base,
        PALETTE_PACKED.WATER.shadow,
        PALETTE_PACKED.WATER.outline,
      ]);

      const canvas = generateWaterTile();
      const raw = canvas.getRawBuffer();

      for (const px of raw) {
        expect(allowedColors.has(px)).toBe(true);
      }

      // Verify water contains highlight crests (ripples)
      const highlightCount = raw.filter((px) => px === PALETTE_PACKED.WATER.highlight).length;
      expect(highlightCount).toBeGreaterThan(30);
    });
  });

  describe('Target Buffer Reuse and Dispatch API', () => {
    it('reuses a pre-allocated target canvas without allocating a new buffer', () => {
      const target = new PixelCanvas(64, 32);
      target.setPixel(0, 0, 0xffffffff);

      const result = generateGrassTile({ target, variant: 0 });
      expect(result).toBe(target);
      // Verify initial dirty pixel was cleared
      expect(result.getPixel(0, 0)).toBe(0);
    });

    it('rejects target canvases with invalid dimensions', () => {
      const wrongSize = new PixelCanvas(32, 16);
      expect(() => generateGrassTile({ target: wrongSize })).toThrow(RangeError);
    });

    it('dispatches generation correctly via generateTerrainTile(key)', () => {
      const grassV2 = generateTerrainTile(TERRAIN_TEXTURE_KEYS.GRASS_V2);
      const directGrassV2 = generateGrassTile({ variant: 2 });
      expect(grassV2.getRawBuffer()).toEqual(directGrassV2.getRawBuffer());

      const dirt = generateTerrainTile(TERRAIN_TEXTURE_KEYS.DIRT_V0);
      const directDirt = generateDirtTile();
      expect(dirt.getRawBuffer()).toEqual(directDirt.getRawBuffer());

      const sand = generateTerrainTile(TERRAIN_TEXTURE_KEYS.SAND_V0);
      const directSand = generateSandTile();
      expect(sand.getRawBuffer()).toEqual(directSand.getRawBuffer());

      const water = generateTerrainTile(TERRAIN_TEXTURE_KEYS.WATER_V0);
      const directWater = generateWaterTile();
      expect(water.getRawBuffer()).toEqual(directWater.getRawBuffer());
    });

    it('throws when requesting an unsupported terrain key in generateTerrainTile', () => {
      expect(() => generateTerrainTile('unknown_terrain_key')).toThrow(
        /Unsupported terrain texture key/
      );
    });
  });
});
