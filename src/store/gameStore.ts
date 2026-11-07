import { create } from 'zustand';
import { GridCoord, TileData } from '../types/world';
import { eventBus } from '../game/events/GameEventBus';

export interface GameUIState {
  isEngineReady: boolean;
  activeScene: string;
  mapDimensions: {
    width: number;
    height: number;
    totalTiles: number;
  };
  hoveredTile: GridCoord | null;
  selectedTile: GridCoord | null;
  selectedTileData: TileData | null;
  isGridVisible: boolean;
  camera: {
    zoom: number;
    scrollX: number;
    scrollY: number;
  };

  // Actions
  setEngineReady: (ready: boolean) => void;
  setActiveScene: (scene: string) => void;
  setMapDimensions: (dims: { width: number; height: number; totalTiles: number }) => void;
  setHoveredTile: (coord: GridCoord | null) => void;
  setSelectedTile: (selection: { gx: number; gy: number; tileData: TileData } | null) => void;
  setGridVisible: (visible: boolean) => void;
  toggleGrid: () => void;
  setCamera: (camera: { zoom: number; scrollX: number; scrollY: number }) => void;
  requestCameraReset: () => void;
  requestTileDeselect: () => void;
}

export const useGameStore = create<GameUIState>((set, get) => ({
  isEngineReady: false,
  activeScene: 'None',
  mapDimensions: {
    width: 20,
    height: 20,
    totalTiles: 400,
  },
  hoveredTile: null,
  selectedTile: null,
  selectedTileData: null,
  isGridVisible: false,
  camera: {
    zoom: 1.0,
    scrollX: 0,
    scrollY: 0,
  },

  setEngineReady: (ready) => set({ isEngineReady: ready }),
  setActiveScene: (scene) => set({ activeScene: scene }),
  setMapDimensions: (dims) => set({ mapDimensions: dims }),
  setHoveredTile: (coord) => {
    const current = get().hoveredTile;
    if (current?.gx !== coord?.gx || current?.gy !== coord?.gy) {
      set({ hoveredTile: coord });
    }
  },
  setSelectedTile: (selection) => {
    if (selection) {
      set({
        selectedTile: { gx: selection.gx, gy: selection.gy },
        selectedTileData: selection.tileData,
      });
    } else {
      set({
        selectedTile: null,
        selectedTileData: null,
      });
    }
  },
  setGridVisible: (visible) => set({ isGridVisible: visible }),
  toggleGrid: () => {
    const next = !get().isGridVisible;
    set({ isGridVisible: next });
    eventBus.emit('SET_GRID_OVERLAY_REQUESTED', { visible: next });
  },
  setCamera: (camera) => set({ camera }),
  requestCameraReset: () => {
    eventBus.emit('CAMERA_RESET_REQUESTED');
  },
  requestTileDeselect: () => {
    eventBus.emit('TILE_DESELECT_REQUESTED');
  },
}));
