import { describe, it, expect } from 'vitest';
import { gridToScreen, screenToGrid, isWithinBounds, calculateIsometricDepth } from '../../src/game/world/isometric';
import { WORLD_CONSTANTS } from '../../src/game/world/constants';

describe('Isometric Math Utilities', () => {
  const originX = 500;
  const originY = 200;

  it('converts (0, 0) grid coordinate to screen origin', () => {
    const screen = gridToScreen(0, 0, originX, originY);
    expect(screen.sx).toBe(originX);
    expect(screen.sy).toBe(originY);
  });

  it('converts (1, 0) and (0, 1) symmetrically along 2:1 isometric axes', () => {
    const right = gridToScreen(1, 0, originX, originY);
    const left = gridToScreen(0, 1, originX, originY);

    expect(right.sx).toBe(originX + WORLD_CONSTANTS.HALF_TILE_WIDTH);
    expect(right.sy).toBe(originY + WORLD_CONSTANTS.HALF_TILE_HEIGHT);

    expect(left.sx).toBe(originX - WORLD_CONSTANTS.HALF_TILE_WIDTH);
    expect(left.sy).toBe(originY + WORLD_CONSTANTS.HALF_TILE_HEIGHT);
  });

  it('performs accurate round-trip conversion from grid -> screen -> grid', () => {
    const testCoords = [
      { gx: 0, gy: 0 },
      { gx: 5, gy: 5 },
      { gx: 10, gy: 3 },
      { gx: 19, gy: 19 },
    ];

    for (const coord of testCoords) {
      const screen = gridToScreen(coord.gx, coord.gy, originX, originY);
      // Center of tile picking offset
      const backToGrid = screenToGrid(screen.sx, screen.sy, originX, originY);
      expect(backToGrid.gx).toBe(coord.gx);
      expect(backToGrid.gy).toBe(coord.gy);
    }
  });

  it('validates 20x20 map boundaries correctly', () => {
    expect(isWithinBounds(0, 0)).toBe(true);
    expect(isWithinBounds(19, 19)).toBe(true);
    expect(isWithinBounds(10, 10)).toBe(true);

    expect(isWithinBounds(-1, 0)).toBe(false);
    expect(isWithinBounds(0, -1)).toBe(false);
    expect(isWithinBounds(20, 0)).toBe(false);
    expect(isWithinBounds(0, 20)).toBe(false);
    expect(isWithinBounds(25, 30)).toBe(false);
  });

  it('calculates depth sorting values correctly back-to-front', () => {
    const depthOrigin = calculateIsometricDepth(0, 0);
    const depthNear = calculateIsometricDepth(1, 1);
    const depthFar = calculateIsometricDepth(19, 19);

    expect(depthOrigin).toBe(0);
    expect(depthNear).toBe(2);
    expect(depthFar).toBe(38);
    expect(depthFar).toBeGreaterThan(depthNear);
    expect(depthNear).toBeGreaterThan(depthOrigin);
  });
});
