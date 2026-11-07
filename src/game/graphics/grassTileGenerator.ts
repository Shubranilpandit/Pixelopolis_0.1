import Phaser from 'phaser';
import { WORLD_CONSTANTS } from '../world/constants';

const { TILE_WIDTH, TILE_HEIGHT, HALF_TILE_WIDTH, HALF_TILE_HEIGHT, PALETTE } = WORLD_CONSTANTS;

export const TEXTURE_KEYS = {
  GRASS_BASE: 'tile_grass_base',
  GRASS_ALT: 'tile_grass_alt',
  TILE_HOVER: 'tile_hover_outline',
  MAP_BORDER: 'map_border_line',
} as const;

/**
 * Ensures that the procedural grass tile texture exists in the Phaser TextureManager.
 * If already cached, returns the key immediately without regenerating.
 */
export function ensureGrassTileTexture(
  scene: Phaser.Scene,
  key: string = TEXTURE_KEYS.GRASS_BASE
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  // 1. Draw base isometric diamond
  // Top: (32, 0), Right: (64, 16), Bottom: (32, 32), Left: (0, 16)
  graphics.fillStyle(PALETTE.GRASS_BASE, 1);
  graphics.beginPath();
  graphics.moveTo(HALF_TILE_WIDTH, 0);
  graphics.lineTo(TILE_WIDTH, HALF_TILE_HEIGHT);
  graphics.lineTo(HALF_TILE_WIDTH, TILE_HEIGHT);
  graphics.lineTo(0, HALF_TILE_HEIGHT);
  graphics.closePath();
  graphics.fillPath();

  // 2. Upper-Left Lighting (Highlights along top-left facets)
  graphics.lineStyle(1, PALETTE.GRASS_LIGHT, 0.9);
  graphics.beginPath();
  graphics.moveTo(1, HALF_TILE_HEIGHT);
  graphics.lineTo(HALF_TILE_WIDTH, 1);
  graphics.strokePath();

  // Subtle inner highlight row
  graphics.lineStyle(1, PALETTE.GRASS_LIGHT, 0.5);
  graphics.beginPath();
  graphics.moveTo(3, HALF_TILE_HEIGHT);
  graphics.lineTo(HALF_TILE_WIDTH, 2);
  graphics.strokePath();

  // 3. Lower-Right Shadow (Darkened edges along bottom-right facets)
  graphics.lineStyle(1, PALETTE.GRASS_DARK, 0.85);
  graphics.beginPath();
  graphics.moveTo(HALF_TILE_WIDTH, TILE_HEIGHT - 1);
  graphics.lineTo(TILE_WIDTH - 1, HALF_TILE_HEIGHT);
  graphics.strokePath();

  // Bottom-left edge subtle shade
  graphics.lineStyle(1, PALETTE.GRASS_DARK, 0.6);
  graphics.beginPath();
  graphics.moveTo(0, HALF_TILE_HEIGHT);
  graphics.lineTo(HALF_TILE_WIDTH, TILE_HEIGHT);
  graphics.strokePath();

  // 4. Procedural Pixel-Art Grass Flecks (deterministic micro-details)
  graphics.fillStyle(PALETTE.GRASS_LIGHT, 0.8);
  // Cluster 1
  graphics.fillRect(28, 10, 2, 2);
  graphics.fillRect(34, 12, 2, 2);
  graphics.fillRect(22, 14, 2, 2);
  // Cluster 2
  graphics.fillRect(40, 16, 2, 2);
  graphics.fillRect(30, 20, 2, 2);

  graphics.fillStyle(PALETTE.GRASS_DARK, 0.7);
  graphics.fillRect(26, 12, 2, 2);
  graphics.fillRect(36, 14, 2, 2);
  graphics.fillRect(20, 18, 2, 2);
  graphics.fillRect(32, 22, 2, 2);

  // 5. Crisp Perimeter Border Stroke
  graphics.lineStyle(1, PALETTE.GRASS_BORDER, 0.4);
  graphics.strokePoints([
    { x: HALF_TILE_WIDTH, y: 0 },
    { x: TILE_WIDTH, y: HALF_TILE_HEIGHT },
    { x: HALF_TILE_WIDTH, y: TILE_HEIGHT },
    { x: 0, y: HALF_TILE_HEIGHT },
    { x: HALF_TILE_WIDTH, y: 0 }
  ]);

  // Generate and commit texture to cache
  graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
  graphics.destroy();

  return key;
}

/**
 * Ensures the tile selection/hover diamond outline texture exists in the TextureManager.
 */
export function ensureTileHoverTexture(
  scene: Phaser.Scene,
  key: string = TEXTURE_KEYS.TILE_HOVER
): string {
  if (scene.textures.exists(key)) {
    return key;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 }, false);

  // Semitransparent fill
  graphics.fillStyle(PALETTE.SELECTION_GREEN, 0.25);
  graphics.beginPath();
  graphics.moveTo(HALF_TILE_WIDTH, 0);
  graphics.lineTo(TILE_WIDTH, HALF_TILE_HEIGHT);
  graphics.lineTo(HALF_TILE_WIDTH, TILE_HEIGHT);
  graphics.lineTo(0, HALF_TILE_HEIGHT);
  graphics.closePath();
  graphics.fillPath();

  // Crisp diamond outline
  graphics.lineStyle(1, PALETTE.SELECTION_GREEN, 0.9);
  graphics.strokePoints([
    { x: HALF_TILE_WIDTH, y: 0 },
    { x: TILE_WIDTH, y: HALF_TILE_HEIGHT },
    { x: HALF_TILE_WIDTH, y: TILE_HEIGHT },
    { x: 0, y: HALF_TILE_HEIGHT },
    { x: HALF_TILE_WIDTH, y: 0 }
  ]);

  graphics.generateTexture(key, TILE_WIDTH, TILE_HEIGHT);
  graphics.destroy();

  return key;
}
