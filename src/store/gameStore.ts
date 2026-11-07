import { create } from 'zustand';
import { GridCoord } from '../types/world';
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
  setSelectedTile: (coord: GridCoord | null) => void;
  setCamera: (camera: { zoom: number; scrollX: number; scrollY: number }) => void;
  requestCameraReset: () => void;
}

export const useGameStore = create<GameUIState>((set) => ({
  isEngineReady: false,
  activeScene: 'None',
  mapDimensions: {
    width: 20,
    height: 20,
    totalTiles: 400,
  },
  hoveredTile: null,
  selectedTile: null,
  camera: {
    zoom: 1.0,
    scrollX: 0,
    scrollY: 0,
  },

  setEngineReady: (ready) => set({ isEngineReady: ready }),
  setActiveScene: (scene) => set({ activeScene: scene }),
  setMapDimensions: (dims) => set({ mapDimensions: dims }),
  setHoveredTile: (coord) => set({ hoveredTile: coord }),
  setSelectedTile: (coord) => set({ selectedTile: coord }),
  setCamera: (camera) => set({ camera }),
  requestCameraReset: () => {
    eventBus.emit('CAMERA_RESET_REQUESTED');
  },
}));
