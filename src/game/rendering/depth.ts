/**
 * Layer depth constants to manage occlusion and z-indexing.
 */
export const RENDER_LAYERS = {
  TERRAIN_BASE: 0,
  TERRAIN_BORDER: 1000,
  GRID_LINES: 1500,
  SELECTION_OVERLAY: 2000,
  BUILDINGS: 3000,
  CURSOR_PREVIEW: 5000,
  DEBUG_OVERLAY: 9000,
} as const;

/**
 * Returns the final sprite depth based on tile coordinates and layer.
 */
export function getTileDepth(gx: number, gy: number, layer: number = RENDER_LAYERS.TERRAIN_BASE): number {
  return gx + gy + layer;
}
