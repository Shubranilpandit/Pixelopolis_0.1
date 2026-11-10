import { PixelCanvas } from '../core/PixelCanvas';
import { PRNG } from '../prng/PRNG';
import { PALETTE_PACKED } from '../palette/palette';

/**
 * Canonical texture keys for procedural structures in Pixelopolis.
 */
export const STRUCTURE_TEXTURE_KEYS = {
  RESIDENTIAL_LVL1: 'structure_residential_lvl1',
} as const;

export type StructureTextureKey =
  (typeof STRUCTURE_TEXTURE_KEYS)[keyof typeof STRUCTURE_TEXTURE_KEYS];

/**
 * Structural dimensions and sprite origin metadata for 1x1 buildings.
 * 
 * Coordinate System and Anchor Convention:
 * - Total Canvas Dimensions: 64x64 pixels.
 * - Ground Reference Footprint: 64x32 isometric diamond situated on rows 32..63.
 * - Ground Center: (32, 48).
 * - Recommended Phaser Sprite Origin: (0.5, 0.75).
 *   When positioned at tile center (sx, sy) with setOrigin(0.5, 0.75),
 *   the building's base footprint aligns with the underlying terrain tile.
 * - Vertical Relief: The building rises 32 pixels upward into rows 0..31.
 */
export const STRUCTURE_DIMENSIONS = {
  WIDTH: 64,
  HEIGHT: 64,
  ORIGIN_X: 0.5,
  ORIGIN_Y: 0.75,
  GROUND_CENTER_X: 32,
  GROUND_CENTER_Y: 48,
  GROUND_FOOTPRINT_WIDTH: 64,
  GROUND_FOOTPRINT_HEIGHT: 32,
} as const;

/**
 * Default seed for deterministic building generation.
 */
export const DEFAULT_STRUCTURE_SEED = 1337;

/**
 * Configuration options for structure generation.
 */
export interface StructureGeneratorOptions {
  /**
   * Root numeric seed or PRNG instance.
   */
  seed?: number | PRNG;

  /**
   * Optional pre-allocated PixelCanvas (64x64).
   */
  target?: PixelCanvas;
}

/**
 * Resolves destination canvas, validating pre-allocated target or creating a new 64x64 canvas.
 */
function resolveCanvas(target?: PixelCanvas): PixelCanvas {
  if (target) {
    if (
      target.width !== STRUCTURE_DIMENSIONS.WIDTH ||
      target.height !== STRUCTURE_DIMENSIONS.HEIGHT
    ) {
      throw new RangeError(
        `Target PixelCanvas must have dimensions ${STRUCTURE_DIMENSIONS.WIDTH}x${STRUCTURE_DIMENSIONS.HEIGHT}. Received: ${target.width}x${target.height}`
      );
    }
    target.clear(0);
    return target;
  }
  return new PixelCanvas(STRUCTURE_DIMENSIONS.WIDTH, STRUCTURE_DIMENSIONS.HEIGHT);
}

/**
 * Generates the foundational 1x1 isometric residential cottage prototype (`structure_residential_lvl1`).
 * 
 * Features:
 * - 64x64 canvas with ground footprint at (32, 48) and origin (0.5, 0.75).
 * - South-West facing wall in direct Upper-Left illumination with wooden front door.
 * - South-East facing wall in Lower-Right shadow with framed glass window.
 * - Pitched gable roof with sunlit terracotta left pitch and shaded right pitch.
 * - Eaves overhang and structural masonry perimeter outlines.
 * - Fully transparent background outside the building geometry.
 */
export function generateStructurePrototype(
  options: StructureGeneratorOptions = {}
): PixelCanvas {
  const canvas = resolveCanvas(options.target);

  // 1. South-West Wall (Left Wall: facing North-West/South-West, in light)
  // X: 0..31, Y: 28 + (x/2) to 48 + (x/2)
  for (let x = 0; x <= 31; x++) {
    const topY = 28 + Math.floor(x * 0.5);
    const botY = 48 + Math.floor(x * 0.5);
    for (let y = topY; y <= botY; y++) {
      canvas.setPixel(x, y, PALETTE_PACKED.STONE.base);
    }
    // Upper wall highlight row
    canvas.setPixel(x, topY, PALETTE_PACKED.STONE.highlight);
    // Lower wall foundation outline row
    canvas.setPixel(x, botY, PALETTE_PACKED.STONE.outline);
  }

  // Left wall left vertical boundary
  for (let y = 28; y <= 48; y++) {
    canvas.setPixel(0, y, PALETTE_PACKED.STONE.outline);
  }

  // 2. South-East Wall (Right Wall: facing South-East, in shadow)
  // X: 32..63, Y: 44 - ((x-32)/2) to 63 - ((x-32)/2)
  for (let x = 32; x <= 63; x++) {
    const topY = 44 - Math.floor((x - 32) * 0.5);
    const botY = 63 - Math.floor((x - 32) * 0.5);
    for (let y = topY; y <= botY; y++) {
      canvas.setPixel(x, y, PALETTE_PACKED.STONE.shadow);
    }
    // Lower wall foundation outline row
    canvas.setPixel(x, botY, PALETTE_PACKED.STONE.outline);
  }

  // Right wall right vertical boundary
  for (let y = 28; y <= 48; y++) {
    canvas.setPixel(63, y, PALETTE_PACKED.STONE.outline);
  }

  // Center vertical structural corner (between left and right walls)
  for (let y = 44; y <= 63; y++) {
    canvas.setPixel(31, y, PALETTE_PACKED.STONE.outline);
  }

  // 3. Front Gable Triangle (between eaves and front ridge point at 32, 28)
  for (let x = 0; x <= 31; x++) {
    const eaveY = 28 + Math.floor(x * 0.5);
    const gableY = 12 + Math.floor(x * 0.5);
    for (let y = gableY; y < eaveY; y++) {
      canvas.setPixel(x, y, PALETTE_PACKED.STONE.base);
    }
  }
  for (let x = 32; x <= 63; x++) {
    const eaveY = 44 - Math.floor((x - 32) * 0.5);
    const gableY = 28 - Math.floor((x - 32) * 0.5);
    for (let y = gableY; y < eaveY; y++) {
      canvas.setPixel(x, y, PALETTE_PACKED.STONE.shadow);
    }
  }

  // 4. Pitched Gable Roof
  // Ridge line: x = 32, y from 8 to 26 (19 px)
  // Left Pitch (Facing North-West, Sunlit)
  // Right Pitch (Facing South-East, Shaded)
  for (let dy = 0; dy <= 18; dy++) {
    const yRidge = 8 + dy;

    // Left Pitch (Sunlit terracotta highlight)
    for (let x = 0; x <= 31; x++) {
      const y = yRidge + Math.floor((32 - x) * 0.5);
      canvas.setPixel(x, y, PALETTE_PACKED.ROOF.highlight);
    }

    // Right Pitch (Shaded terracotta shadow)
    for (let x = 33; x <= 63; x++) {
      const y = yRidge + Math.floor((x - 32) * 0.5);
      canvas.setPixel(x, y, PALETTE_PACKED.ROOF.shadow);
    }

    // Center ridge line
    canvas.setPixel(32, yRidge, PALETTE_PACKED.ROOF.base);
  }

  // Roof Outline / Eaves:
  // Left eaves line (slope +1/2 from (0, 24) to (32, 40))
  for (let x = 0; x <= 31; x++) {
    const y = 26 + Math.floor((32 - x) * 0.5);
    canvas.setPixel(x, y, PALETTE_PACKED.ROOF.outline);
  }
  // Right eaves line (slope -1/2 from (32, 44) to (63, 28))
  for (let x = 32; x <= 63; x++) {
    const y = 26 + Math.floor((x - 32) * 0.5);
    canvas.setPixel(x, y, PALETTE_PACKED.ROOF.outline);
  }
  // Back roof slope outlines
  for (let x = 0; x <= 31; x++) {
    const y = 8 + Math.floor((32 - x) * 0.5);
    canvas.setPixel(x, y, PALETTE_PACKED.ROOF.outline);
  }
  for (let x = 32; x <= 63; x++) {
    const y = 8 + Math.floor((x - 32) * 0.5);
    canvas.setPixel(x, y, PALETTE_PACKED.ROOF.outline);
  }

  // 5. Wooden Cottage Door on South-West Wall
  // X: 13..19, Y: 44..55
  for (let x = 13; x <= 19; x++) {
    const topDoorY = 44 + Math.floor((x - 13) * 0.5);
    const botDoorY = 54 + Math.floor((x - 13) * 0.5);
    for (let y = topDoorY; y <= botDoorY; y++) {
      canvas.setPixel(x, y, PALETTE_PACKED.WOOD.base);
    }
    // Door top frame
    canvas.setPixel(x, topDoorY, PALETTE_PACKED.WOOD.outline);
  }
  // Door side frames
  for (let y = 44; y <= 54; y++) {
    canvas.setPixel(13, y, PALETTE_PACKED.WOOD.outline);
    canvas.setPixel(19, y + 3, PALETTE_PACKED.WOOD.outline);
  }
  // Doorknob (brass highlight)
  canvas.setPixel(18, 51, PALETTE_PACKED.WOOD.highlight);

  // 6. Framed Glass Window on South-East Wall (in shadow)
  // X: 43..50, Y: 41..47
  for (let x = 43; x <= 50; x++) {
    for (let y = 41; y <= 47; y++) {
      if (x === 43 || x === 50 || y === 41 || y === 47 || x === 46 || y === 44) {
        // Window wooden frame & mullions
        canvas.setPixel(x, y, PALETTE_PACKED.WOOD.outline);
      } else {
        // Blue glass in shadow
        canvas.setPixel(x, y, PALETTE_PACKED.WATER.shadow);
      }
    }
  }

  // 7. Small Attic Window on Front Gable (Sunlit 2x2 pip)
  canvas.fillRect(31, 28, 2, 2, PALETTE_PACKED.WATER.highlight);
  canvas.fillRect(30, 27, 4, 1, PALETTE_PACKED.WOOD.outline);

  return canvas;
}

/**
 * Generates an individual structure tile by its canonical key.
 */
export function generateStructureTile(
  key: StructureTextureKey | string,
  options: StructureGeneratorOptions = {}
): PixelCanvas {
  switch (key) {
    case STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1:
    case 'structure_cottage_v0':
      return generateStructurePrototype(options);
    default:
      throw new Error(`Unsupported structure texture key: "${key}".`);
  }
}
