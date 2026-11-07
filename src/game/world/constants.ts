/**
 * Global world and tile configuration constants for Pixelopolis.
 */
export const WORLD_CONSTANTS = {
  // Tile geometry (standard 2:1 isometric projection)
  TILE_WIDTH: 64,
  TILE_HEIGHT: 32,
  HALF_TILE_WIDTH: 32,
  HALF_TILE_HEIGHT: 16,
  ISOMETRIC_RATIO: 2,

  // Map dimensions
  MAP_WIDTH: 20,
  MAP_HEIGHT: 20,
  TOTAL_TILES: 400,

  // Camera settings
  CAMERA_MIN_ZOOM: 0.55,
  CAMERA_MAX_ZOOM: 2.0,
  CAMERA_DEFAULT_ZOOM: 1.0,
  CAMERA_ZOOM_SPEED: 0.0015,
  CAMERA_PAN_SMOOTHNESS: 0.1,

  // Color Palette Tokens (Hex integer & CSS string for procedural generator)
  PALETTE: {
    GRASS_BASE: 0x4d8c3f,
    GRASS_LIGHT: 0x5fa84e,
    GRASS_DARK: 0x3d7031,
    GRASS_BORDER: 0x2e5425,
    GRID_HIGHLIGHT: 0xffffff,
    SELECTION_GREEN: 0x55ff55,
  }
} as const;
