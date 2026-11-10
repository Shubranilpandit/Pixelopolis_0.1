import { describe, it, expect } from 'vitest';
import {
  generateHoverOverlay,
  generateSelectedOverlay,
  generateGridMarkerOverlay,
  generateOverlayTile,
  generateFoundationalOverlaySet,
  OVERLAY_TEXTURE_KEYS,
} from '../../src/game/graphics/generators/overlayTextureGenerator';
import { PixelCanvas } from '../../src/game/graphics/core/PixelCanvas';
import { isInsideIsometricDiamond } from '../../src/game/graphics/core/IsometricDrawing';

describe('Overlay Texture Generator', () => {
  describe('Dimensions and Alignment', () => {
    it('produces 64x32 PixelCanvas instances for all overlay textures', () => {
      const set = generateFoundationalOverlaySet();
      const keys = Object.values(OVERLAY_TEXTURE_KEYS);

      expect(Object.keys(set)).toEqual(keys);

      for (const key of keys) {
        const canvas = set[key];
        expect(canvas).toBeInstanceOf(PixelCanvas);
        expect(canvas.width).toBe(64);
        expect(canvas.height).toBe(32);
      }
    });

    it('ensures all pixels outside the 64x32 isometric diamond are 100% transparent (0)', () => {
      const set = generateFoundationalOverlaySet();

      for (const [key, canvas] of Object.entries(set)) {
        for (let y = 0; y < 32; y++) {
          for (let x = 0; x < 64; x++) {
            if (!isInsideIsometricDiamond(x, y)) {
              const pixel = canvas.getPixel(x, y);
              expect(
                pixel,
                `Pixel at (${x}, ${y}) in ${key} should be transparent 0 but was 0x${pixel.toString(16)}`
              ).toBe(0);
            }
          }
        }
      }
    });
  });

  describe('Hover Overlay Visual Properties', () => {
    it('generates translucent green fill and crisp green border within the diamond', () => {
      const hover = generateHoverOverlay();

      // Check center pixel (32, 16): must be green fill
      const centerPixel = hover.getPixel(32, 16);
      expect(centerPixel).not.toBe(0);

      // Extract Green and Alpha channels
      const g = (centerPixel >>> 8) & 0xff;
      const a = (centerPixel >>> 24) & 0xff;
      expect(g).toBe(255);
      expect(a).toBe(56); // ~22% alpha

      // Check apex border pixel (30, 0): must be higher alpha neon green
      const borderPixel = hover.getPixel(30, 0);
      const borderA = (borderPixel >>> 24) & 0xff;
      expect(borderA).toBe(217); // ~85% alpha
    });
  });

  describe('Selected Reticle Visual Properties', () => {
    it('generates cyan fill, double border, and central white reticle pip', () => {
      const selected = generateSelectedOverlay();

      // Check center targeting pip: 2x2 white square at (31, 15) to (32, 16)
      for (let y = 15; y <= 16; y++) {
        for (let x = 31; x <= 32; x++) {
          const pip = selected.getPixel(x, y);
          const r = pip & 0xff;
          const g = (pip >>> 8) & 0xff;
          const b = (pip >>> 16) & 0xff;
          const a = (pip >>> 24) & 0xff;

          // Pure white with high alpha
          expect(r).toBe(255);
          expect(g).toBe(255);
          expect(b).toBe(255);
          expect(a).toBe(230);
        }
      }

      // Check interior cyan fill (e.g. at (32, 10))
      const interior = selected.getPixel(32, 10);
      const bInterior = (interior >>> 16) & 0xff;
      expect(bInterior).toBe(255); // Cyan blue channel
    });

    it('ensures hover and selection overlays are visually and numerically distinct', () => {
      const hover = generateHoverOverlay();
      const selected = generateSelectedOverlay();

      expect(hover.getRawBuffer()).not.toEqual(selected.getRawBuffer());
    });
  });

  describe('Grid Marker Overlay Visual Properties', () => {
    it('generates a 1px outline with completely transparent interior', () => {
      const grid = generateGridMarkerOverlay();

      // Center (32, 16) must be transparent (not filled)
      expect(grid.getPixel(32, 16)).toBe(0);
      // Apex border (30, 0) must have grid color
      expect(grid.getPixel(30, 0)).not.toBe(0);

      // Verify only outline pixels are colored (128 total)
      let nonZeroCount = 0;
      for (const px of grid.getRawBuffer()) {
        if (px !== 0) nonZeroCount++;
      }
      expect(nonZeroCount).toBe(128);
    });
  });

  describe('Determinism, Target Reuse, and Key Dispatch', () => {
    it('is strictly deterministic across multiple invocations', () => {
      const h1 = generateHoverOverlay();
      const h2 = generateHoverOverlay();
      expect(h1.getRawBuffer()).toEqual(h2.getRawBuffer());

      const s1 = generateSelectedOverlay();
      const s2 = generateSelectedOverlay();
      expect(s1.getRawBuffer()).toEqual(s2.getRawBuffer());

      const g1 = generateGridMarkerOverlay();
      const g2 = generateGridMarkerOverlay();
      expect(g1.getRawBuffer()).toEqual(g2.getRawBuffer());
    });

    it('reuses a pre-allocated target canvas safely', () => {
      const target = new PixelCanvas(64, 32);
      target.setPixel(0, 0, 0xffffffff);

      const result = generateHoverOverlay({ target });
      expect(result).toBe(target);
      expect(result.getPixel(0, 0)).toBe(0);
    });

    it('rejects target canvases with invalid dimensions', () => {
      const wrongSize = new PixelCanvas(64, 64);
      expect(() => generateHoverOverlay({ target: wrongSize })).toThrow(RangeError);
    });

    it('dispatches correctly via generateOverlayTile(key)', () => {
      const hover = generateOverlayTile(OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE);
      expect(hover.getRawBuffer()).toEqual(generateHoverOverlay().getRawBuffer());

      const sel = generateOverlayTile(OVERLAY_TEXTURE_KEYS.SELECTED_RETICLE);
      expect(sel.getRawBuffer()).toEqual(generateSelectedOverlay().getRawBuffer());

      const grid = generateOverlayTile(OVERLAY_TEXTURE_KEYS.GRID_MARKER);
      expect(grid.getRawBuffer()).toEqual(generateGridMarkerOverlay().getRawBuffer());
    });

    it('throws when requesting an unsupported overlay key', () => {
      expect(() => generateOverlayTile('invalid_overlay_key')).toThrow(
        /Unsupported overlay texture key/
      );
    });
  });
});
