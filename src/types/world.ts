/**
 * World coordinate, dimensions, and tile data types for Pixelopolis.
 */

export interface GridCoord {
  gx: number;
  gy: number;
}

export interface ScreenCoord {
  sx: number;
  sy: number;
}

export type TerrainType = 'grass' | 'dirt' | 'water';

export interface TileData {
  id: string;
  index: number;
  gx: number;
  gy: number;
  terrain: TerrainType;
  elevation: number;
  isBuildable: boolean;
  status: string;
}

export interface MapDimensions {
  tileWidth: number;
  tileHeight: number;
  mapWidth: number;
  mapHeight: number;
  totalTiles: number;
}
