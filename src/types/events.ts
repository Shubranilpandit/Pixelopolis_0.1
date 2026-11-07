import { GridCoord, TileData } from './world';

/**
 * Strongly-typed event map for the Pixelopolis GameEventBus.
 * Ensures compile-time safety across React, Phaser, and the Game Domain.
 */
export interface GameEventMap {
  // Engine Lifecycle Events
  'ENGINE_BOOTED': { timestamp: number };
  'SCENE_READY': { sceneKey: string };
  'ENGINE_DESTROYED': void;

  // World & Map Events
  'MAP_INITIALIZED': { mapWidth: number; mapHeight: number; totalTiles: number };
  'TILE_HOVERED': GridCoord | null;
  'TILE_CLICKED': GridCoord;
  'TILE_SELECTED': { gx: number; gy: number; tileData: TileData } | null;
  'TILE_DESELECT_REQUESTED': void;

  // Grid Overlay Events
  'GRID_OVERLAY_TOGGLED': { visible: boolean };
  'SET_GRID_OVERLAY_REQUESTED': { visible: boolean };

  // Camera Events
  'CAMERA_CHANGED': { zoom: number; scrollX: number; scrollY: number };
  'CAMERA_RESET_REQUESTED': void;
  'CAMERA_RESET_COMPLETED': { zoom: number; scrollX: number; scrollY: number };

  // Performance & Stats Events
  'FPS_UPDATED': { fps: number };
}

export type GameEventKey = keyof GameEventMap;
export type GameEventListener<K extends GameEventKey> = (payload: GameEventMap[K]) => void;
