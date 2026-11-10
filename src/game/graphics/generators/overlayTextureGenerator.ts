import { PixelCanvas } from '../core/PixelCanvas';
import {
  IsometricDrawing,
  fillIsometricDiamond,
  strokeIsometricDiamond,
  getIsometricDiamondRowBounds,
} from '../core/IsometricDrawing';
import { rgbaToUint32 } from '../palette/colorUtils';

/**
 * Canonical texture keys for procedural interaction overlays in Pixelopolis.
 */
export const OVERLAY_TEXTURE_KEYS = {
  HOVER_OUTLINE: 'overlay_hover_outline',
  SELECTED_RETICLE: 'overlay_selected_reticle',
  GRID_MARKER: 'overlay_grid_marker',
} as const;

export type OverlayTextureKey =
  (typeof OVERLAY_TEXTURE_KEYS)[keyof typeof OVERLAY_TEXTURE_KEYS];

/**
 * Options configuring overlay texture generation.
 */
export interface OverlayGeneratorOptions {
  /**
   * Optional pre-allocated PixelCanvas (64x32).
   * If provided, it will be cleared and reused to avoid allocation.
   */
  target?: PixelCanvas;
}

/**
 * Resolves destination canvas, clearing any pre-allocated target or creating a new 64x32 canvas.
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
 * Generates the hover outline indicator overlay (`overlay_hover_outline`).
 * 
 * Visual Specification:
 * - Exact 64x32 2:1 isometric diamond footprint.
 * - Translucent green interior fill (~22% alpha) providing subtle contrast over grass.
 * - Crisp 1px neon green perimeter outline (~85% alpha) for sharp tile bounds.
 * - Completely transparent background outside the diamond.
 */
export function generateHoverOverlay(options: OverlayGeneratorOptions = {}): PixelCanvas {
  const canvas = resolveCanvas(options.target);

  // 1. Semitransparent green interior fill (#55ff55 @ alpha ~0.22 / 56)
  const fillGreen = rgbaToUint32(0x55, 0xff, 0x55, 56);
  fillIsometricDiamond(canvas, fillGreen);

  // 2. Crisp 1px neon green perimeter border (#55ff55 @ alpha ~0.85 / 217)
  const borderGreen = rgbaToUint32(0x55, 0xff, 0x55, 217);
  strokeIsometricDiamond(canvas, borderGreen);

  return canvas;
}

/**
 * Generates the persistent tile selection reticle overlay (`overlay_selected_reticle`).
 * 
 * Visual Specification:
 * - Exact 64x32 2:1 isometric diamond footprint.
 * - Vibrant cyan translucent interior fill (~35% alpha).
 * - High-contrast double-stroke cyan border:
 *   - Outer 1px perimeter stroke (#0284c7 @ alpha ~0.95 / 242)
 *   - Inner 1px inset stroke (#00f0ff @ alpha ~0.95 / 242)
 * - Central 2x2 white targeting pip (#ffffff @ alpha ~0.90 / 230).
 * - Distinct from hover overlay in color, border weight, and target reticle.
 */
export function generateSelectedOverlay(options: OverlayGeneratorOptions = {}): PixelCanvas {
  const canvas = resolveCanvas(options.target);

  // 1. Translucent cyan fill (#00f0ff @ alpha ~0.35 / 89)
  const fillCyan = rgbaToUint32(0x00, 0xf0, 0xff, 89);
  fillIsometricDiamond(canvas, fillCyan);

  // 2. Outer high-contrast cyan perimeter border (#0284c7 @ alpha ~0.95 / 242)
  const outerBorder = rgbaToUint32(0x02, 0x84, 0xc7, 242);
  strokeIsometricDiamond(canvas, outerBorder);

  // 3. Inner neon cyan border stroke (#00f0ff @ alpha ~0.95 / 242)
  const innerBorder = rgbaToUint32(0x00, 0xf0, 0xff, 242);
  for (let y = 1; y < IsometricDrawing.TILE_HEIGHT - 1; y++) {
    const bounds = getIsometricDiamondRowBounds(y);
    if (!bounds) continue;

    // Inset 1: 2-pixel step along left inner facet
    canvas.fillRect(bounds.minX + 2, y, 2, 1, innerBorder);
    // Inset 1: 2-pixel step along right inner facet
    canvas.fillRect(bounds.maxX - 3, y, 2, 1, innerBorder);
  }

  // 4. Center target reticle pip: 2x2 white square at (31, 15) to (32, 16)
  const whitePip = rgbaToUint32(255, 255, 255, 230);
  canvas.fillRect(
    IsometricDrawing.HALF_WIDTH - 1,
    IsometricDrawing.HALF_HEIGHT - 1,
    2,
    2,
    whitePip
  );

  return canvas;
}

/**
 * Generates the subtle grid marker cell overlay (`overlay_grid_marker`).
 * 
 * Visual Specification:
 * - Exact 64x32 2:1 isometric diamond footprint.
 * - Completely transparent inside and outside the diamond.
 * - 1px perimeter outline using subtle cyan/green grid tone (#38bdf8 @ alpha ~0.35 / 90).
 * - Serves as a modular, tileable grid cell marker for isometric grid visualization.
 */
export function generateGridMarkerOverlay(options: OverlayGeneratorOptions = {}): PixelCanvas {
  const canvas = resolveCanvas(options.target);

  // 1px subtle perimeter outline only (#38bdf8 @ alpha ~0.35 / 90)
  const gridLineColor = rgbaToUint32(0x38, 0xbd, 0xf8, 90);
  strokeIsometricDiamond(canvas, gridLineColor);

  return canvas;
}

/**
 * Generates an individual interaction overlay tile by its canonical key.
 */
export function generateOverlayTile(
  key: OverlayTextureKey | string,
  options: OverlayGeneratorOptions = {}
): PixelCanvas {
  switch (key) {
    case OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE:
      return generateHoverOverlay(options);
    case OVERLAY_TEXTURE_KEYS.SELECTED_RETICLE:
      return generateSelectedOverlay(options);
    case OVERLAY_TEXTURE_KEYS.GRID_MARKER:
      return generateGridMarkerOverlay(options);
    default:
      throw new Error(`Unsupported overlay texture key: "${key}".`);
  }
}

/**
 * Generates the complete set of foundational interaction overlay textures:
 * - Hover diamond outline (green)
 * - Persistent selected reticle (cyan with double border & target pip)
 * - Subtle grid marker (1px cell contour)
 */
export function generateFoundationalOverlaySet(): Record<OverlayTextureKey, PixelCanvas> {
  return {
    [OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE]: generateHoverOverlay(),
    [OVERLAY_TEXTURE_KEYS.SELECTED_RETICLE]: generateSelectedOverlay(),
    [OVERLAY_TEXTURE_KEYS.GRID_MARKER]: generateGridMarkerOverlay(),
  };
}
