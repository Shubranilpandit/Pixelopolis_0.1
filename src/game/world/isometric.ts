import { GridCoord, ScreenCoord } from '../../types/world';
import { WORLD_CONSTANTS } from './constants';

const { HALF_TILE_WIDTH, HALF_TILE_HEIGHT, MAP_WIDTH, MAP_HEIGHT } = WORLD_CONSTANTS;

/**
 * Converts integer grid coordinates (gx, gy) to isometric screen coordinates (sx, sy).
 * Represents the geometric center of the diamond tile footprint.
 * 
 * Formula:
 *   sx = originX + (gx - gy) * HALF_TILE_WIDTH
 *   sy = originY + (gx + gy) * HALF_TILE_HEIGHT
 */
export function gridToScreen(
  gx: number,
  gy: number,
  originX: number = 0,
  originY: number = 0
): ScreenCoord {
  return {
    sx: originX + (gx - gy) * HALF_TILE_WIDTH,
    sy: originY + (gx + gy) * HALF_TILE_HEIGHT,
  };
}

/**
 * Converts screen/world coordinates (sx, sy) to integer grid coordinates (gx, gy).
 * Inverts the 2:1 isometric projection matrix.
 * 
 * Formula:
 *   dx = sx - originX
 *   dy = sy - originY
 *   gx = floor((dx / HALF_TILE_WIDTH + dy / HALF_TILE_HEIGHT) / 2)
 *   gy = floor((dy / HALF_TILE_HEIGHT - dx / HALF_TILE_WIDTH) / 2)
 */
export function screenToGrid(
  sx: number,
  sy: number,
  originX: number = 0,
  originY: number = 0
): GridCoord {
  const dx = sx - originX;
  const dy = sy - originY;

  const gx = Math.floor((dx / HALF_TILE_WIDTH + dy / HALF_TILE_HEIGHT) / 2);
  const gy = Math.floor((dy / HALF_TILE_HEIGHT - dx / HALF_TILE_WIDTH) / 2);

  return { gx, gy };
}

/**
 * Converts pointer screen coordinates taking camera scroll and zoom into account,
 * then maps to integer grid coordinates. Pure mathematical implementation.
 */
export function pointerToGrid(
  pointerX: number,
  pointerY: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
  originX: number = 0,
  originY: number = 0
): GridCoord {
  const worldX = (pointerX / zoom) + scrollX;
  const worldY = (pointerY / zoom) + scrollY;
  return screenToGrid(worldX, worldY, originX, originY);
}

/**
 * Checks whether a grid coordinate is within the playable map boundaries.
 */
export function isWithinBounds(
  gx: number,
  gy: number,
  mapWidth: number = MAP_WIDTH,
  mapHeight: number = MAP_HEIGHT
): boolean {
  return gx >= 0 && gx < mapWidth && gy >= 0 && gy < mapHeight;
}

/**
 * Calculates a unique, 0-based linear index for a tile coordinate.
 * Maps (gx, gy) -> [0, totalTiles - 1].
 */
export function gridToIndex(
  gx: number,
  gy: number,
  mapWidth: number = MAP_WIDTH
): number {
  return gy * mapWidth + gx;
}

/**
 * Reverses a 0-based linear index back to integer (gx, gy) grid coordinates.
 */
export function indexToGrid(
  index: number,
  mapWidth: number = MAP_WIDTH
): GridCoord {
  return {
    gx: index % mapWidth,
    gy: Math.floor(index / mapWidth),
  };
}

/**
 * Returns the four diamond vertices (Top, Right, Bottom, Left) of a tile in screen space.
 */
export function getTileVertices(
  gx: number,
  gy: number,
  originX: number = 0,
  originY: number = 0
): { top: ScreenCoord; right: ScreenCoord; bottom: ScreenCoord; left: ScreenCoord } {
  const center = gridToScreen(gx, gy, originX, originY);
  return {
    top: { sx: center.sx, sy: center.sy - HALF_TILE_HEIGHT },
    right: { sx: center.sx + HALF_TILE_WIDTH, sy: center.sy },
    bottom: { sx: center.sx, sy: center.sy + HALF_TILE_HEIGHT },
    left: { sx: center.sx - HALF_TILE_WIDTH, sy: center.sy },
  };
}

/**
 * Calculates the depth (z-index) for depth sorting in isometric projection.
 * Back-to-front rendering order is guaranteed by summing the bottom-most grid coordinates.
 */
export function calculateIsometricDepth(
  gx: number,
  gy: number,
  footprintX: number = 1,
  footprintY: number = 1,
  layerOffset: number = 0
): number {
  return (gx + footprintX - 1) + (gy + footprintY - 1) + layerOffset;
}
