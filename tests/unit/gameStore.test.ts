import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../../src/store/gameStore';
import { eventBus } from '../../src/game/events/GameEventBus';
import { TileData } from '../../src/types/world';

describe('GameStore & UI State Transitions (Task 2.4 & 2.5)', () => {
  beforeEach(() => {
    // Reset store to initial defaults
    useGameStore.setState({
      isEngineReady: false,
      activeScene: 'None',
      hoveredTile: null,
      selectedTile: null,
      selectedTileData: null,
      isGridVisible: false,
      camera: { zoom: 1.0, scrollX: 0, scrollY: 0 },
    });
  });

  it('manages hovered tile state avoiding duplicate updates', () => {
    const store = useGameStore.getState();
    expect(store.hoveredTile).toBeNull();

    store.setHoveredTile({ gx: 5, gy: 7 });
    expect(useGameStore.getState().hoveredTile).toEqual({ gx: 5, gy: 7 });

    // Setting same coordinates does not trigger unnecessary mutation
    store.setHoveredTile({ gx: 5, gy: 7 });
    expect(useGameStore.getState().hoveredTile).toEqual({ gx: 5, gy: 7 });

    store.setHoveredTile(null);
    expect(useGameStore.getState().hoveredTile).toBeNull();
  });

  it('manages selected tile state and inspection payload', () => {
    const store = useGameStore.getState();
    expect(store.selectedTile).toBeNull();
    expect(store.selectedTileData).toBeNull();

    const sampleTile: TileData = {
      id: 'tile_10_12',
      index: 250,
      gx: 10,
      gy: 12,
      terrain: 'grass',
      elevation: 0,
      isBuildable: true,
      status: 'Buildable • Virgin Soil',
    };

    store.setSelectedTile({ gx: 10, gy: 12, tileData: sampleTile });

    expect(useGameStore.getState().selectedTile).toEqual({ gx: 10, gy: 12 });
    expect(useGameStore.getState().selectedTileData).toEqual(sampleTile);

    // Deselecting tile
    store.setSelectedTile(null);
    expect(useGameStore.getState().selectedTile).toBeNull();
    expect(useGameStore.getState().selectedTileData).toBeNull();
  });

  it('toggles grid overlay visibility and emits event', () => {
    const emitSpy = vi.spyOn(eventBus, 'emit');
    const store = useGameStore.getState();

    expect(store.isGridVisible).toBe(false);

    store.toggleGrid();
    expect(useGameStore.getState().isGridVisible).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith('SET_GRID_OVERLAY_REQUESTED', { visible: true });

    store.toggleGrid();
    expect(useGameStore.getState().isGridVisible).toBe(false);
    expect(emitSpy).toHaveBeenCalledWith('SET_GRID_OVERLAY_REQUESTED', { visible: false });

    emitSpy.mockRestore();
  });

  it('emits deselect and camera reset requests correctly', () => {
    const emitSpy = vi.spyOn(eventBus, 'emit');
    const store = useGameStore.getState();

    store.requestTileDeselect();
    expect(emitSpy).toHaveBeenCalledWith('TILE_DESELECT_REQUESTED');

    store.requestCameraReset();
    expect(emitSpy).toHaveBeenCalledWith('CAMERA_RESET_REQUESTED');

    emitSpy.mockRestore();
  });
});
