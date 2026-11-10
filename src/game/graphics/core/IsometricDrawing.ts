import { PixelCanvas } from './PixelCanvas';
import { Point2D, DitherPattern, SteppedShadingOptions, DitherOptions } from './types';

/**
 * Bayer 2x2 Normalized Matrix (indices 0..3)
 */
const BAYER_2X2: readonly (readonly number[])[] = [
  [0, 2],
  [3, 1],
];

/**
 * Bayer 4x4 Normalized Matrix (indices 0..15)
 */
const BAYER_4X4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Pixelopolis — Headless Isometric Drawing Primitives
 * 
 * Provides integer-precision 2:1 isometric raster operations for 64x32 tiles:
 * - Tile diamond filling and perimeter outlining
 * - Upper-Left facet lighting and Lower-Right facet shadowing
 * - Multi-band stepped shading transitions
 * - Deterministic Bayer & pattern dithering
 * 
 * All drawing routines are pure TypeScript, zero-dependency, and strictly deterministic.
 */
export class IsometricDrawing {
  public static readonly TILE_WIDTH = 64;
  public static readonly TILE_HEIGHT = 32;
  public static readonly HALF_WIDTH = 32;
  public static readonly HALF_HEIGHT = 16;

  /**
   * Returns the horizontal min and max pixel span for a given row `y` (0..31)
   * within a canonical 64x32 2:1 isometric diamond.
   * 
   * Returns null if `y` is outside [0, 31].
   */
  public static getIsometricDiamondRowBounds(y: number): { minX: number; maxX: number } | null {
    const iy = Math.floor(y);
    if (iy < 0 || iy >= IsometricDrawing.TILE_HEIGHT) {
      return null;
    }

    if (iy < IsometricDrawing.HALF_HEIGHT) {
      // Upper half: y in 0..15
      // y=0:  minX=30, maxX=33 (span=4)
      // y=15: minX=0,  maxX=63 (span=64)
      const minX = 30 - 2 * iy;
      const maxX = 33 + 2 * iy;
      return { minX, maxX };
    } else {
      // Lower half: y in 16..31
      // y=16: minX=0,  maxX=63 (span=64)
      // y=31: minX=30, maxX=33 (span=4)
      const k = iy - IsometricDrawing.HALF_HEIGHT;
      const minX = 2 * k;
      const maxX = 63 - 2 * k;
      return { minX, maxX };
    }
  }

  /**
   * Tests whether an integer coordinate (x, y) is inside the canonical 64x32 diamond.
   */
  public static isInsideIsometricDiamond(
    x: number,
    y: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): boolean {
    const ly = Math.floor(y - offsetY);
    const lx = Math.floor(x - offsetX);

    const bounds = IsometricDrawing.getIsometricDiamondRowBounds(ly);
    if (!bounds) return false;

    return lx >= bounds.minX && lx <= bounds.maxX;
  }

  /**
   * Returns the 4 canonical polygon vertices defining the 64x32 isometric diamond:
   * Top (32, 0), Right (64, 16), Bottom (32, 32), Left (0, 16).
   */
  public static getIsometricDiamondPoints(
    offsetX: number = 0,
    offsetY: number = 0
  ): readonly Point2D[] {
    return [
      { x: IsometricDrawing.HALF_WIDTH + offsetX, y: 0 + offsetY },
      { x: IsometricDrawing.TILE_WIDTH + offsetX, y: IsometricDrawing.HALF_HEIGHT + offsetY },
      { x: IsometricDrawing.HALF_WIDTH + offsetX, y: IsometricDrawing.TILE_HEIGHT + offsetY },
      { x: 0 + offsetX, y: IsometricDrawing.HALF_HEIGHT + offsetY },
    ];
  }

  /**
   * Fills a standard 64x32 2:1 isometric diamond on the target canvas.
   */
  public static fillIsometricDiamond(
    canvas: PixelCanvas,
    color: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    const ox = Math.floor(offsetX);
    const oy = Math.floor(offsetY);

    for (let y = 0; y < IsometricDrawing.TILE_HEIGHT; y++) {
      const bounds = IsometricDrawing.getIsometricDiamondRowBounds(y);
      if (!bounds) continue;

      const spanWidth = bounds.maxX - bounds.minX + 1;
      canvas.fillRect(bounds.minX + ox, y + oy, spanWidth, 1, color);
    }
  }

  /**
   * Strokes a crisp 1px perimeter outline of the 64x32 diamond with 2:1 slope continuity.
   */
  public static strokeIsometricDiamond(
    canvas: PixelCanvas,
    color: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    const ox = Math.floor(offsetX);
    const oy = Math.floor(offsetY);

    for (let y = 0; y < IsometricDrawing.TILE_HEIGHT; y++) {
      const bounds = IsometricDrawing.getIsometricDiamondRowBounds(y);
      if (!bounds) continue;

      const targetY = y + oy;

      if (y === 0 || y === IsometricDrawing.TILE_HEIGHT - 1) {
        // Cap apex rows (4 horizontal pixels: [30..33])
        const spanWidth = bounds.maxX - bounds.minX + 1;
        canvas.fillRect(bounds.minX + ox, targetY, spanWidth, 1, color);
      } else {
        // 2-pixel step along left perimeter edge
        canvas.fillRect(bounds.minX + ox, targetY, 2, 1, color);
        // 2-pixel step along right perimeter edge
        canvas.fillRect(bounds.maxX - 1 + ox, targetY, 2, 1, color);
      }
    }
  }

  /**
   * Draws directional lighting along the Upper-Left (North-West) facet.
   * 
   * @param inset 0 for perimeter edge, >=1 for inner highlight rows
   */
  public static drawUpperLeftHighlight(
    canvas: PixelCanvas,
    color: number,
    inset: number = 0,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    const ox = Math.floor(offsetX);
    const oy = Math.floor(offsetY);
    const insetValue = Math.max(0, Math.floor(inset));

    // Facet runs along the top-left boundary (rows 0..15)
    for (let y = 0; y < IsometricDrawing.HALF_HEIGHT; y++) {
      const bounds = IsometricDrawing.getIsometricDiamondRowBounds(y);
      if (!bounds) continue;

      const x0 = bounds.minX + 2 * insetValue;
      const x1 = x0 + 1;

      if (x0 <= bounds.maxX) {
        const startX = x0 + ox;
        const targetY = y + oy;
        const width = Math.min(x1, bounds.maxX) - x0 + 1;
        canvas.fillRect(startX, targetY, width, 1, color);
      }
    }
  }

  /**
   * Draws directional shadow along the Lower-Right (South-East) facet.
   * 
   * @param inset 0 for perimeter edge, >=1 for inner shadow rows
   */
  public static drawLowerRightShadow(
    canvas: PixelCanvas,
    color: number,
    inset: number = 0,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    const ox = Math.floor(offsetX);
    const oy = Math.floor(offsetY);
    const insetValue = Math.max(0, Math.floor(inset));

    // Facet runs along the bottom-right boundary (rows 16..31)
    for (let y = IsometricDrawing.HALF_HEIGHT; y < IsometricDrawing.TILE_HEIGHT; y++) {
      const bounds = IsometricDrawing.getIsometricDiamondRowBounds(y);
      if (!bounds) continue;

      const x1 = bounds.maxX - 2 * insetValue;
      const x0 = x1 - 1;

      if (x1 >= bounds.minX) {
        const startX = Math.max(x0, bounds.minX) + ox;
        const targetY = y + oy;
        const width = x1 - Math.max(x0, bounds.minX) + 1;
        canvas.fillRect(startX, targetY, width, 1, color);
      }
    }
  }

  /**
   * Applies multi-band stepped shading perpendicular to the Upper-Left illumination vector.
   * 
   * In 2:1 isometric projection, light travelling along the screen direction (+X, +Y)
   * generates iso-luminance lines along `s = x + 2y`.
   */
  public static applySteppedShading(
    canvas: PixelCanvas,
    highlightColor: number,
    shadowColor: number,
    options: SteppedShadingOptions = {}
  ): void {
    const {
      offsetX = 0,
      offsetY = 0,
      highlightThreshold = 0.33,
      shadowThreshold = 0.67,
      maskToDiamond = true,
    } = options;

    const ox = Math.floor(offsetX);
    const oy = Math.floor(offsetY);

    for (let y = 0; y < IsometricDrawing.TILE_HEIGHT; y++) {
      const bounds = IsometricDrawing.getIsometricDiamondRowBounds(y);
      if (!bounds && maskToDiamond) continue;

      const startX = maskToDiamond && bounds ? bounds.minX : 0;
      const endX = maskToDiamond && bounds ? bounds.maxX : IsometricDrawing.TILE_WIDTH - 1;

      for (let x = startX; x <= endX; x++) {
        // Gradient distance projection: ranges roughly 30..94 across 64x32 diamond
        const s = x + 2 * y;
        const t = (s - 30) / 64;

        if (t < highlightThreshold) {
          canvas.setPixel(x + ox, y + oy, highlightColor);
        } else if (t > shadowThreshold) {
          canvas.setPixel(x + ox, y + oy, shadowColor);
        }
      }
    }
  }

  /**
   * Applies deterministic pixel dithering across the canvas or within diamond boundaries.
   */
  public static applyDither(
    canvas: PixelCanvas,
    color: number,
    pattern: DitherPattern = 'checkerboard_2x2',
    options: DitherOptions = {}
  ): void {
    const {
      threshold,
      bounds,
      maskToDiamond = true,
      offsetX = 0,
      offsetY = 0,
    } = options;

    const ox = Math.floor(offsetX);
    const oy = Math.floor(offsetY);

    const startY = bounds ? Math.max(0, Math.floor(bounds.y)) : 0;
    const endY = bounds
      ? Math.min(IsometricDrawing.TILE_HEIGHT - 1, Math.floor(bounds.y + bounds.height - 1))
      : IsometricDrawing.TILE_HEIGHT - 1;

    for (let y = startY; y <= endY; y++) {
      const diamondBounds = IsometricDrawing.getIsometricDiamondRowBounds(y);
      if (maskToDiamond && !diamondBounds) continue;

      let startX = 0;
      let endX = IsometricDrawing.TILE_WIDTH - 1;

      if (bounds) {
        startX = Math.max(startX, Math.floor(bounds.x));
        endX = Math.min(endX, Math.floor(bounds.x + bounds.width - 1));
      }

      if (maskToDiamond && diamondBounds) {
        startX = Math.max(startX, diamondBounds.minX);
        endX = Math.min(endX, diamondBounds.maxX);
      }

      if (startX > endX) continue;

      for (let x = startX; x <= endX; x++) {
        let isDitherPixel = false;

        switch (pattern) {
          case 'checkerboard_2x2':
            isDitherPixel = (x + y) % 2 === 0;
            break;

          case 'sparse_4x4':
            isDitherPixel =
              (x % 4 === 0 && y % 4 === 0) || ((x + 2) % 4 === 0 && (y + 2) % 4 === 0);
            break;

          case 'horizontal_stripes':
            isDitherPixel = y % 2 === 0;
            break;

          case 'bayer_2x2': {
            const thresh = threshold !== undefined ? threshold : 1; // default to ~50%
            isDitherPixel = BAYER_2X2[y % 2][x % 2] < thresh;
            break;
          }

          case 'bayer_4x4': {
            const thresh = threshold !== undefined ? threshold : 8; // default to ~50%
            isDitherPixel = BAYER_4X4[y % 4][x % 4] < thresh;
            break;
          }
        }

        if (isDitherPixel) {
          canvas.setPixel(x + ox, y + oy, color);
        }
      }
    }
  }
}

// Standalone function exports for ergonomics
export const fillIsometricDiamond = IsometricDrawing.fillIsometricDiamond;
export const strokeIsometricDiamond = IsometricDrawing.strokeIsometricDiamond;
export const drawUpperLeftHighlight = IsometricDrawing.drawUpperLeftHighlight;
export const drawLowerRightShadow = IsometricDrawing.drawLowerRightShadow;
export const applySteppedShading = IsometricDrawing.applySteppedShading;
export const applyDither = IsometricDrawing.applyDither;
export const getIsometricDiamondRowBounds = IsometricDrawing.getIsometricDiamondRowBounds;
export const isInsideIsometricDiamond = IsometricDrawing.isInsideIsometricDiamond;
export const getIsometricDiamondPoints = IsometricDrawing.getIsometricDiamondPoints;
