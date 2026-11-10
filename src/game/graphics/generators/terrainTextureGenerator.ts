import { PixelCanvas } from '../core/PixelCanvas';
import {
  IsometricDrawing,
  fillIsometricDiamond,
  strokeIsometricDiamond,
  drawUpperLeftHighlight,
  drawLowerRightShadow,
  applySteppedShading,
  getIsometricDiamondRowBounds,
} from '../core/IsometricDrawing';
import { PRNG } from '../prng/PRNG';
import { PALETTE_PACKED } from '../palette/palette';

/**
 * Canonical texture keys for all procedural terrain textures in Pixelopolis.
 */
export const TERRAIN_TEXTURE_KEYS = {
  GRASS_V0: 'terrain_grass_v0',
  GRASS_V1: 'terrain_grass_v1',
  GRASS_V2: 'terrain_grass_v2',
  GRASS_V3: 'terrain_grass_v3',
  DIRT_V0: 'terrain_dirt_v0',
  SAND_V0: 'terrain_sand_v0',
  WATER_V0: 'terrain_water_v0',
} as const;

export type TerrainTextureKey =
  (typeof TERRAIN_TEXTURE_KEYS)[keyof typeof TERRAIN_TEXTURE_KEYS];

/**
 * Standard default root seed for reproducible world asset generation.
 */
export const DEFAULT_TERRAIN_SEED = 1337;

/**
 * Configuration options for terrain texture generation.
 */
export interface TerrainGeneratorOptions {
  /**
   * Root numeric seed or parent PRNG instance.
   * Defaults to DEFAULT_TERRAIN_SEED (1337).
   */
  seed?: number | PRNG;

  /**
   * Optional pre-allocated PixelCanvas (64x32).
   * If provided, it will be cleared and reused to avoid allocation.
   */
  target?: PixelCanvas;
}

/**
 * Options specifically for generating grass variants.
 */
export interface GrassVariantOptions extends TerrainGeneratorOptions {
  /**
   * Grass variant index (0, 1, 2, or 3). Defaults to 0.
   */
  variant?: 0 | 1 | 2 | 3;
}

/**
 * Resolves a root PRNG instance from optional numeric seed or existing PRNG.
 */
function resolvePRNG(seed?: number | PRNG): PRNG {
  if (seed instanceof PRNG) {
    return seed;
  }
  return new PRNG(seed !== undefined ? seed : DEFAULT_TERRAIN_SEED);
}

/**
 * Resolves the destination PixelCanvas, clearing any pre-allocated target or creating a new 64x32 canvas.
 */
function resolveCanvas(target?: PixelCanvas): PixelCanvas {
  if (target) {
    if (
      target.width !== IsometricDrawing.TILE_WIDTH ||
      target.height !== IsometricDrawing.TILE_HEIGHT
    ) {
      throw new RangeError(
        `Target PixelCanvas must have dimensions ${IsometricDrawing.TILE_WIDTH}x${IsometricDrawing.TILE_HEIGHT}. Received: ${target.width}x${target.height}`
      );
    }
    target.clear(0);
    return target;
  }
  return new PixelCanvas(IsometricDrawing.TILE_WIDTH, IsometricDrawing.TILE_HEIGHT);
}

/**
 * Tests whether a coordinate (x, y) is safely inside the interior of the 64x32 diamond,
 * respecting a safety margin from the perimeter outline and facet highlights.
 */
function isSafeInterior(x: number, y: number, margin: number = 3): boolean {
  if (y < margin || y >= IsometricDrawing.TILE_HEIGHT - margin) {
    return false;
  }
  const bounds = getIsometricDiamondRowBounds(y);
  if (!bounds) return false;

  return x >= bounds.minX + margin && x <= bounds.maxX - margin;
}

/**
 * Safely plots a cluster of pixels if and only if all pixels in the cluster fall
 * strictly inside the diamond interior.
 */
function safePlotCluster(
  canvas: PixelCanvas,
  startX: number,
  startY: number,
  width: number,
  height: number,
  color: number,
  margin: number = 3
): boolean {
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (!isSafeInterior(startX + dx, startY + dy, margin)) {
        return false;
      }
    }
  }

  canvas.fillRect(startX, startY, width, height, color);
  return true;
}

/**
 * Generates one of four deterministic grass variants:
 * - variant 0: Balanced meadow with standard micro-flecks.
 * - variant 1: Lush sprouting meadow with denser sunlit blade clusters.
 * - variant 2: Wild tufted meadow with paired shadow accents beneath grass tufts.
 * - variant 3: Mellow manicured lawn with calm, minimal tonal stepping.
 */
export function generateGrassTile(options: GrassVariantOptions = {}): PixelCanvas {
  const canvas = resolveCanvas(options.target);
  const rootPrng = resolvePRNG(options.seed);
  const variant = (options.variant ?? 0) as 0 | 1 | 2 | 3;

  // Stream isolation: fork a named sub-stream for this exact variant
  const stream = rootPrng.fork(`terrain_grass_v${variant}`);

  // 1. Base isometric diamond
  fillIsometricDiamond(canvas, PALETTE_PACKED.GRASS.base);

  // 2. Upper-Left facet lighting (outer facet + inner sunlit row)
  drawUpperLeftHighlight(canvas, PALETTE_PACKED.GRASS.highlight, 0);
  drawUpperLeftHighlight(canvas, PALETTE_PACKED.GRASS.highlight, 1);

  // 3. Lower-Right facet shadow (outer facet + inner shade row)
  drawLowerRightShadow(canvas, PALETTE_PACKED.GRASS.shadow, 0);
  drawLowerRightShadow(canvas, PALETTE_PACKED.GRASS.shadow, 1);

  // 4. Perimeter outline
  strokeIsometricDiamond(canvas, PALETTE_PACKED.GRASS.outline);

  // 5. Restrained, deterministic pixel-art micro-details based on variant
  switch (variant) {
    case 0: {
      // Balanced meadow: 8 scattered fleck clusters (5 highlight, 3 shadow)
      const fleckCount = 8;
      for (let i = 0; i < fleckCount; i++) {
        const y = stream.nextInt(5, 26);
        const bounds = getIsometricDiamondRowBounds(y)!;
        const x = stream.nextInt(bounds.minX + 5, bounds.maxX - 6);
        const isHighlight = i % 3 !== 0;
        const color = isHighlight ? PALETTE_PACKED.GRASS.highlight : PALETTE_PACKED.GRASS.shadow;
        const w = stream.nextInt(1, 2);
        const h = stream.nextInt(1, 2);
        safePlotCluster(canvas, x, y, w, h, color, 3);
      }
      break;
    }

    case 1: {
      // Lush sprouting meadow: 10 clusters biased toward sunlit sprouting blades
      const fleckCount = 10;
      for (let i = 0; i < fleckCount; i++) {
        const y = stream.nextInt(5, 26);
        const bounds = getIsometricDiamondRowBounds(y)!;
        const x = stream.nextInt(bounds.minX + 5, bounds.maxX - 6);
        const isHighlight = i % 4 !== 0; // 75% highlight
        const color = isHighlight ? PALETTE_PACKED.GRASS.highlight : PALETTE_PACKED.GRASS.shadow;
        // Sprouting blade: vertical 1x2 or small 2x1 pip
        const w = isHighlight ? 1 : 2;
        const h = isHighlight ? 2 : 1;
        safePlotCluster(canvas, x, y, w, h, color, 3);
      }
      break;
    }

    case 2: {
      // Wild tufted meadow: 6 prominent grass tufts with small micro-shadow pairs
      const tuftCount = 6;
      for (let i = 0; i < tuftCount; i++) {
        const y = stream.nextInt(6, 24);
        const bounds = getIsometricDiamondRowBounds(y)!;
        const x = stream.nextInt(bounds.minX + 6, bounds.maxX - 7);

        // Sunlit tuft blade
        safePlotCluster(canvas, x, y, 2, 2, PALETTE_PACKED.GRASS.highlight, 3);
        // Cast shadow immediately under / to the right of tuft
        safePlotCluster(canvas, x + 1, y + 2, 2, 1, PALETTE_PACKED.GRASS.shadow, 3);
      }
      break;
    }

    case 3: {
      // Mellow lawn: minimal, calm texture with 4 subtle 1x2 blade accents
      const fleckCount = 4;
      for (let i = 0; i < fleckCount; i++) {
        const y = stream.nextInt(6, 25);
        const bounds = getIsometricDiamondRowBounds(y)!;
        const x = stream.nextInt(bounds.minX + 6, bounds.maxX - 7);
        const color = i % 2 === 0 ? PALETTE_PACKED.GRASS.highlight : PALETTE_PACKED.GRASS.shadow;
        safePlotCluster(canvas, x, y, 2, 1, color, 4);
      }
      break;
    }
  }

  return canvas;
}

/**
 * Generates foundational fertile dirt / soil texture (`terrain_dirt_v0`).
 * Features natural soil tones, subtle stepped depth, and fine soil crumb clusters.
 */
export function generateDirtTile(options: TerrainGeneratorOptions = {}): PixelCanvas {
  const canvas = resolveCanvas(options.target);
  const rootPrng = resolvePRNG(options.seed);
  const stream = rootPrng.fork('terrain_dirt_v0');

  // 1. Base loam diamond
  fillIsometricDiamond(canvas, PALETTE_PACKED.DIRT.base);

  // 2. Stepped depth shading along lighting projection
  applySteppedShading(canvas, PALETTE_PACKED.DIRT.highlight, PALETTE_PACKED.DIRT.shadow, {
    highlightThreshold: 0.22,
    shadowThreshold: 0.78,
    maskToDiamond: true,
  });

  // 3. Facet lighting and shadowing
  drawUpperLeftHighlight(canvas, PALETTE_PACKED.DIRT.highlight, 0);
  drawLowerRightShadow(canvas, PALETTE_PACKED.DIRT.shadow, 0);

  // 4. Perimeter outline
  strokeIsometricDiamond(canvas, PALETTE_PACKED.DIRT.outline);

  // 5. Restrained soil crumb / pebble clusters
  const crumbCount = 7;
  for (let i = 0; i < crumbCount; i++) {
    const y = stream.nextInt(6, 25);
    const bounds = getIsometricDiamondRowBounds(y)!;
    const x = stream.nextInt(bounds.minX + 5, bounds.maxX - 6);
    const isHighlight = i % 2 === 0;
    const color = isHighlight ? PALETTE_PACKED.DIRT.highlight : PALETTE_PACKED.DIRT.shadow;
    const w = stream.nextInt(1, 2);
    const h = stream.nextInt(1, 2);
    safePlotCluster(canvas, x, y, w, h, color, 3);
  }

  return canvas;
}

/**
 * Generates foundational coastal sand / dune texture (`terrain_sand_v0`).
 * Features warm sand tones, fine grain stippling, and gentle dune crest accents.
 */
export function generateSandTile(options: TerrainGeneratorOptions = {}): PixelCanvas {
  const canvas = resolveCanvas(options.target);
  const rootPrng = resolvePRNG(options.seed);
  const stream = rootPrng.fork('terrain_sand_v0');

  // 1. Base warm sand diamond
  fillIsometricDiamond(canvas, PALETTE_PACKED.SAND.base);

  // 2. Facet lighting and shadowing
  drawUpperLeftHighlight(canvas, PALETTE_PACKED.SAND.highlight, 0);
  drawLowerRightShadow(canvas, PALETTE_PACKED.SAND.shadow, 0);

  // 3. Perimeter outline
  strokeIsometricDiamond(canvas, PALETTE_PACKED.SAND.outline);

  // 4. Fine grain dots (1x1 micro-grains)
  const grainCount = 12;
  for (let i = 0; i < grainCount; i++) {
    const y = stream.nextInt(5, 26);
    const bounds = getIsometricDiamondRowBounds(y)!;
    const x = stream.nextInt(bounds.minX + 4, bounds.maxX - 5);
    const color = i % 2 === 0 ? PALETTE_PACKED.SAND.highlight : PALETTE_PACKED.SAND.shadow;
    safePlotCluster(canvas, x, y, 1, 1, color, 3);
  }

  // 5. Subtle horizontal dune ripple lines (3-4px width)
  const rippleCount = 3;
  for (let i = 0; i < rippleCount; i++) {
    const y = stream.nextInt(8 + i * 5, 12 + i * 5);
    const bounds = getIsometricDiamondRowBounds(y)!;
    const width = stream.nextInt(3, 5);
    const x = stream.nextInt(bounds.minX + 6, bounds.maxX - width - 6);
    safePlotCluster(canvas, x, y, width, 1, PALETTE_PACKED.SAND.highlight, 3);
    safePlotCluster(canvas, x, y + 1, width - 1, 1, PALETTE_PACKED.SAND.shadow, 3);
  }

  return canvas;
}

/**
 * Generates foundational river / lake water texture (`terrain_water_v0`).
 * Features crisp blue shading ramp and deterministic horizontal ripple crests.
 */
export function generateWaterTile(options: TerrainGeneratorOptions = {}): PixelCanvas {
  const canvas = resolveCanvas(options.target);
  const rootPrng = resolvePRNG(options.seed);
  const stream = rootPrng.fork('terrain_water_v0');

  // 1. Base clean water diamond
  fillIsometricDiamond(canvas, PALETTE_PACKED.WATER.base);

  // 2. Stepped depth shading
  applySteppedShading(canvas, PALETTE_PACKED.WATER.highlight, PALETTE_PACKED.WATER.shadow, {
    highlightThreshold: 0.18,
    shadowThreshold: 0.76,
    maskToDiamond: true,
  });

  // 3. Facet lighting and shadowing
  drawUpperLeftHighlight(canvas, PALETTE_PACKED.WATER.highlight, 0);
  drawLowerRightShadow(canvas, PALETTE_PACKED.WATER.shadow, 0);

  // 4. Perimeter outline
  strokeIsometricDiamond(canvas, PALETTE_PACKED.WATER.outline);

  // 5. Crisp pixel-art ripple lines
  // Horizontal wave crest with shadowed trough beneath
  const rippleCount = 5;
  for (let i = 0; i < rippleCount; i++) {
    const y = stream.nextInt(7 + i * 3, 10 + i * 3);
    const bounds = getIsometricDiamondRowBounds(y)!;
    const rippleWidth = stream.nextInt(4, 6);
    const x = stream.nextInt(bounds.minX + 6, bounds.maxX - rippleWidth - 6);

    // Ripple crest (sunlit foam/reflection)
    safePlotCluster(canvas, x, y, rippleWidth, 1, PALETTE_PACKED.WATER.highlight, 3);
    // Ripple trough (shadow underneath)
    safePlotCluster(canvas, x + 1, y + 1, rippleWidth - 1, 1, PALETTE_PACKED.WATER.shadow, 3);
  }

  return canvas;
}

/**
 * Generates an individual terrain tile by its canonical key.
 */
export function generateTerrainTile(
  key: TerrainTextureKey | string,
  options: TerrainGeneratorOptions = {}
): PixelCanvas {
  switch (key) {
    case TERRAIN_TEXTURE_KEYS.GRASS_V0:
      return generateGrassTile({ ...options, variant: 0 });
    case TERRAIN_TEXTURE_KEYS.GRASS_V1:
      return generateGrassTile({ ...options, variant: 1 });
    case TERRAIN_TEXTURE_KEYS.GRASS_V2:
      return generateGrassTile({ ...options, variant: 2 });
    case TERRAIN_TEXTURE_KEYS.GRASS_V3:
      return generateGrassTile({ ...options, variant: 3 });
    case TERRAIN_TEXTURE_KEYS.DIRT_V0:
      return generateDirtTile(options);
    case TERRAIN_TEXTURE_KEYS.SAND_V0:
      return generateSandTile(options);
    case TERRAIN_TEXTURE_KEYS.WATER_V0:
      return generateWaterTile(options);
    default:
      throw new Error(`Unsupported terrain texture key: "${key}".`);
  }
}

/**
 * Generates the complete foundational set of 7 terrain textures:
 * - 4 distinct grass variants (v0, v1, v2, v3)
 * - 1 fertile dirt tile (v0)
 * - 1 coastal sand tile (v0)
 * - 1 river water tile (v0)
 * 
 * Each texture is generated through an independent named PRNG sub-stream,
 * guaranteeing stream isolation and total reproducibility.
 */
export function generateFoundationalTerrainSet(
  seed: number | PRNG = DEFAULT_TERRAIN_SEED
): Record<TerrainTextureKey, PixelCanvas> {
  const rootPrng = resolvePRNG(seed);

  return {
    [TERRAIN_TEXTURE_KEYS.GRASS_V0]: generateGrassTile({ seed: rootPrng, variant: 0 }),
    [TERRAIN_TEXTURE_KEYS.GRASS_V1]: generateGrassTile({ seed: rootPrng, variant: 1 }),
    [TERRAIN_TEXTURE_KEYS.GRASS_V2]: generateGrassTile({ seed: rootPrng, variant: 2 }),
    [TERRAIN_TEXTURE_KEYS.GRASS_V3]: generateGrassTile({ seed: rootPrng, variant: 3 }),
    [TERRAIN_TEXTURE_KEYS.DIRT_V0]: generateDirtTile({ seed: rootPrng }),
    [TERRAIN_TEXTURE_KEYS.SAND_V0]: generateSandTile({ seed: rootPrng }),
    [TERRAIN_TEXTURE_KEYS.WATER_V0]: generateWaterTile({ seed: rootPrng }),
  };
}
