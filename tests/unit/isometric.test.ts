import { describe, it, expect } from 'vitest';
import {
  gridToScreen,
  screenToGrid,
  pointerToGrid,
  isWithinBounds,
  gridToIndex,
  indexToGrid,
  getTileVertices,
  calculateIsometricDepth,
} from '../../src/game/world/isometric';
import { WORLD_CONSTANTS } from '../../src/game/world/constants';

describe('Isometric Coordinate Foundation (Task 2.1)', () => {
  const originX = 600;
  const originY = 150;
  const { MAP_WIDTH, MAP_HEIGHT, TOTAL_TILES, HALF_TILE_WIDTH, HALF_TILE_HEIGHT } = WORLD_CONSTANTS;

  it('converts (0, 0) origin grid coordinate to screen origin', () => {
    const screen = gridToScreen(0, 0, originX, originY);
    expect(screen.sx).toBe(originX);
    expect(screen.sy).toBe(originY);

    const backToGrid = screenToGrid(screen.sx, screen.sy, originX, originY);
    expect(backToGrid.gx).toBe(0);
    expect(backToGrid.gy).toBe(0);
  });

  it('correctly maps the 4 extreme corners of the 20x20 world', () => {
    const corners = [
      { name: 'Top Corner (0, 0)', gx: 0, gy: 0 },
      { name: 'Right Corner (19, 0)', gx: 19, gy: 0 },
      { name: 'Bottom Corner (19, 19)', gx: 19, gy: 19 },
      { name: 'Left Corner (0, 19)', gx: 0, gy: 19 },
    ];

    for (const corner of corners) {
      const screen = gridToScreen(corner.gx, corner.gy, originX, originY);
      const retrieved = screenToGrid(screen.sx, screen.sy, originX, originY);
      expect(retrieved.gx, `Checking gx for ${corner.name}`).toBe(corner.gx);
      expect(retrieved.gy, `Checking gy for ${corner.name}`).toBe(corner.gy);
      expect(isWithinBounds(retrieved.gx, retrieved.gy)).toBe(true);
    }
  });

  it('correctly maps the center tiles of the 20x20 world', () => {
    const centers = [
      { gx: 9, gy: 9 },
      { gx: 10, gy: 9 },
      { gx: 9, gy: 10 },
      { gx: 10, gy: 10 },
    ];

    for (const center of centers) {
      const screen = gridToScreen(center.gx, center.gy, originX, originY);
      const retrieved = screenToGrid(screen.sx, screen.sy, originX, originY);
      expect(retrieved.gx).toBe(center.gx);
      expect(retrieved.gy).toBe(center.gy);
    }
  });

  it('performs 100% accurate round-trip conversion for every single tile in the 20x20 map', () => {
    for (let gy = 0; gy < MAP_HEIGHT; gy++) {
      for (let gx = 0; gx < MAP_WIDTH; gx++) {
        const screen = gridToScreen(gx, gy, originX, originY);
        const back = screenToGrid(screen.sx, screen.sy, originX, originY);
        expect(back.gx).toBe(gx);
        expect(back.gy).toBe(gy);
      }
    }
  });

  it('accurately resolves pointer picking with camera scroll and zoom (pointerToGrid)', () => {
    const targetTile = { gx: 12, gy: 8 };
    const screenCenter = gridToScreen(targetTile.gx, targetTile.gy, originX, originY);

    // Scenario A: Standard 1.0x zoom, zero scroll
    const pickA = pointerToGrid(screenCenter.sx, screenCenter.sy, 0, 0, 1.0, originX, originY);
    expect(pickA.gx).toBe(targetTile.gx);
    expect(pickA.gy).toBe(targetTile.gy);

    // Scenario B: Zoomed in 1.5x with scroll offset
    const scrollX = 200;
    const scrollY = 100;
    const zoom = 1.5;
    // Pointer coordinate in viewport: (worldPos - scroll) * zoom
    const pointerX = (screenCenter.sx - scrollX) * zoom;
    const pointerY = (screenCenter.sy - scrollY) * zoom;

    const pickB = pointerToGrid(pointerX, pointerY, scrollX, scrollY, zoom, originX, originY);
    expect(pickB.gx).toBe(targetTile.gx);
    expect(pickB.gy).toBe(targetTile.gy);
  });

  it('accurately converts linear tile indices bidirectionally', () => {
    expect(TOTAL_TILES).toBe(400);

    for (let index = 0; index < TOTAL_TILES; index++) {
      const coord = indexToGrid(index, MAP_WIDTH);
      const computedIndex = gridToIndex(coord.gx, coord.gy, MAP_WIDTH);
      expect(computedIndex).toBe(index);
      expect(coord.gx).toBeGreaterThanOrEqual(0);
      expect(coord.gx).toBeLessThan(MAP_WIDTH);
      expect(coord.gy).toBeGreaterThanOrEqual(0);
      expect(coord.gy).toBeLessThan(MAP_HEIGHT);
    }
  });

  it('validates 20x20 map boundaries and rejects invalid/out-of-bounds coords', () => {
    // Valid boundaries
    expect(isWithinBounds(0, 0)).toBe(true);
    expect(isWithinBounds(19, 19)).toBe(true);
    expect(isWithinBounds(19, 0)).toBe(true);
    expect(isWithinBounds(0, 19)).toBe(true);

    // Negative / Out of bounds
    expect(isWithinBounds(-1, 0)).toBe(false);
    expect(isWithinBounds(0, -1)).toBe(false);
    expect(isWithinBounds(-1, -1)).toBe(false);
    expect(isWithinBounds(20, 0)).toBe(false);
    expect(isWithinBounds(0, 20)).toBe(false);
    expect(isWithinBounds(20, 20)).toBe(false);
    expect(isWithinBounds(100, 200)).toBe(false);
  });

  it('computes diamond tile vertices correctly', () => {
    const gx = 5;
    const gy = 5;
    const center = gridToScreen(gx, gy, originX, originY);
    const vertices = getTileVertices(gx, gy, originX, originY);

    expect(vertices.top).toEqual({ sx: center.sx, sy: center.sy - HALF_TILE_HEIGHT });
    expect(vertices.right).toEqual({ sx: center.sx + HALF_TILE_WIDTH, sy: center.sy });
    expect(vertices.bottom).toEqual({ sx: center.sx, sy: center.sy + HALF_TILE_HEIGHT });
    expect(vertices.left).toEqual({ sx: center.sx - HALF_TILE_WIDTH, sy: center.sy });
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

  describe('Tile Boundary Precision & Edge-Handling Convention (Task A)', () => {
    it('reliably resolves tile interior points across various quadrants without bias', () => {
      const tile = { gx: 10, gy: 10 };
      const topScreen = gridToScreen(tile.gx, tile.gy, originX, originY);
      // Under Math.floor inversion, tile (gx, gy) diamond extends from sy to sy + 32, centered at (sx, sy + 16)
      const centerScreenX = topScreen.sx;
      const centerScreenY = topScreen.sy + HALF_TILE_HEIGHT;

      // Representative interior offsets around the diamond center
      const interiorOffsets = [
        { dx: 0, dy: 0 },    // exact tile interior center
        { dx: 10, dy: 3 },   // interior right-bottom
        { dx: -10, dy: 3 },  // interior left-bottom
        { dx: 10, dy: -3 },  // interior right-top
        { dx: -10, dy: -3 }, // interior left-top
        { dx: 0, dy: 6 },    // interior bottom
        { dx: 0, dy: -6 },   // interior top
        { dx: 15, dy: 0 },   // interior right
        { dx: -15, dy: 0 },  // interior left
      ];

      for (const offset of interiorOffsets) {
        const picked = screenToGrid(centerScreenX + offset.dx, centerScreenY + offset.dy, originX, originY);
        expect(picked.gx).toBe(tile.gx);
        expect(picked.gy).toBe(tile.gy);
      }
    });

    it('exhibits deterministic, gapless partitioning along shared tile boundaries with no flickering', () => {
      const tileA = { gx: 10, gy: 10 };
      const topA = gridToScreen(tileA.gx, tileA.gy, originX, originY);

      // Shared edge between (10, 10) and (11, 10):
      // Runs from Right vertex (sx + 32, sy + 16) to Bottom vertex (sx, sy + 32)
      const edgePoints = [
        { t: 0.1 }, // near right vertex
        { t: 0.5 }, // midpoint of shared edge
        { t: 0.9 }, // near bottom vertex
      ];

      for (const { t } of edgePoints) {
        const edgeX = topA.sx + 32 * (1 - t);
        const edgeY = topA.sy + 16 + 16 * t;

        // 1. Inward offset (-0.05px in X) belongs to tile A (10, 10)
        const insideA = screenToGrid(edgeX - 0.05, edgeY, originX, originY);
        expect(insideA).toEqual({ gx: 10, gy: 10 });

        // 2. Outward offset (+0.05px in X) belongs to neighbor tile B (11, 10)
        const insideB = screenToGrid(edgeX + 0.05, edgeY, originX, originY);
        expect(insideB).toEqual({ gx: 11, gy: 10 });

        // 3. Exactly on the boundary edge: deterministic convention [k, k+1)
        // Repeated evaluations must be 100% identical (strictly 0 flicker)
        const exactBoundary = screenToGrid(edgeX, edgeY, originX, originY);
        expect(exactBoundary).toEqual({ gx: 11, gy: 10 });
        for (let i = 0; i < 50; i++) {
          const repeat = screenToGrid(edgeX, edgeY, originX, originY);
          expect(repeat).toEqual(exactBoundary);
        }
      }
    });

    it('never returns NaN or non-integer coordinates for valid screen numbers', () => {
      const testCoordinates = [
        { sx: 0, sy: 0 },
        { sx: -1000.45, sy: 2000.75 },
        { sx: 1280, sy: 720 },
        { sx: 600.333, sy: 150.666 },
      ];

      for (const pt of testCoordinates) {
        const coord = screenToGrid(pt.sx, pt.sy, originX, originY);
        expect(Number.isInteger(coord.gx)).toBe(true);
        expect(Number.isInteger(coord.gy)).toBe(true);
        expect(Number.isNaN(coord.gx)).toBe(false);
        expect(Number.isNaN(coord.gy)).toBe(false);
      }
    });
  });

  describe('Click vs. Drag Distance Threshold Logic (Task B)', () => {
    const threshold = WORLD_CONSTANTS.MAX_CLICK_DRAG_DISTANCE; // 6px

    it('accurately distinguishes discrete clicks from drag movements', () => {
      expect(threshold).toBe(6);

      // Clicks: distance <= 6px
      const clickDistances = [
        Math.hypot(0, 0),    // 0px (perfect click in place)
        Math.hypot(2, 2),    // ~2.83px (subtle finger jitter)
        Math.hypot(4, 3),    // 5px
        Math.hypot(0, 5.99), // 5.99px (under threshold)
      ];

      for (const dist of clickDistances) {
        const isDrag = dist > threshold;
        expect(isDrag).toBe(false);
      }

      // Drags: distance > 6px
      const dragDistances = [
        Math.hypot(6.01, 0), // 6.01px
        Math.hypot(5, 5),    // ~7.07px
        Math.hypot(50, 30),  // 58.3px (deliberate camera pan)
      ];

      for (const dist of dragDistances) {
        const isDrag = dist > threshold;
        expect(isDrag).toBe(true);
      }
    });
  });
});
