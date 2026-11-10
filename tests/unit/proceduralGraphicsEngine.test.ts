import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ProceduralGraphicsEngine,
  FOUNDATIONAL_TEXTURE_KEYS,
  GRAPHICS_ENGINE_KEYS,
} from '../../src/game/graphics/ProceduralGraphicsEngine';
import {
  TextureRegistry,
  type ITextureManager,
} from '../../src/game/graphics/core/TextureRegistry';
import { TERRAIN_TEXTURE_KEYS } from '../../src/game/graphics/generators/terrainTextureGenerator';
import { OVERLAY_TEXTURE_KEYS } from '../../src/game/graphics/generators/overlayTextureGenerator';
import { STRUCTURE_TEXTURE_KEYS } from '../../src/game/graphics/generators/structureTextureGenerator';

/**
 * Creates a mock Phaser TextureManager for headless engine testing.
 */
function createMockTextureManager(): ITextureManager & {
  list: Record<string, any>;
  createdTextures: Record<string, any>;
} {
  const store: Record<string, any> = {};

  const mock: ITextureManager & {
    list: Record<string, any>;
    createdTextures: Record<string, any>;
  } = {
    list: store,
    createdTextures: store,

    exists: vi.fn((key: string) => Boolean(store[key])),

    get: vi.fn((key: string) => {
      return store[key] ?? { key: '__MISSING' };
    }),

    createCanvas: vi.fn((key: string, width: number = 64, height: number = 32) => {
      if (store[key]) {
        return null;
      }

      const simulatedImageData = {
        data: new Uint8ClampedArray(width * height * 4),
        width,
        height,
      };

      const mockContext = {
        createImageData: vi.fn((w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        })),
        putImageData: vi.fn((imgData: any) => {
          simulatedImageData.data.set(imgData.data);
        }),
      };

      const mockCanvas = {
        width,
        height,
        getContext: vi.fn(() => mockContext),
      };

      const mockTexture = {
        key,
        width,
        height,
        canvas: mockCanvas,
        context: mockContext,
        lastImageData: simulatedImageData,
        filterMode: 1,
        refresh: vi.fn(),
        setFilter: vi.fn((mode: number) => {
          mockTexture.filterMode = mode;
        }),
        destroy: vi.fn(() => {
          delete store[key];
        }),
      };

      store[key] = mockTexture;
      return mockTexture;
    }),

    remove: vi.fn((key: string) => {
      delete store[key];
      return true;
    }),
  };

  return mock;
}

describe('ProceduralGraphicsEngine Facade', () => {
  let mockManager: ReturnType<typeof createMockTextureManager>;

  beforeEach(() => {
    mockManager = createMockTextureManager();
  });

  describe('Configuration & Initialization Lifecycle', () => {
    it('throws a TypeError if instantiated with null/undefined texture manager and no registry', () => {
      expect(() => new ProceduralGraphicsEngine(undefined as any)).toThrow(TypeError);
    });

    it('initializes with default seed (1337) and owns its internal TextureRegistry', () => {
      expect(GRAPHICS_ENGINE_KEYS.TERRAIN).toBeDefined();
      expect(GRAPHICS_ENGINE_KEYS.OVERLAYS).toBeDefined();
      expect(GRAPHICS_ENGINE_KEYS.STRUCTURES).toBeDefined();

      const engine = new ProceduralGraphicsEngine(mockManager);
      expect(engine.getSeed()).toBe(1337);
      expect(engine.getRegistry()).toBeInstanceOf(TextureRegistry);
      expect(engine.isReady()).toBe(false);
    });

    it('supports custom seed numeric argument or options object', () => {
      const engine1 = new ProceduralGraphicsEngine(mockManager, 42);
      expect(engine1.getSeed()).toBe(42);

      const engine2 = new ProceduralGraphicsEngine(mockManager, { seed: 999 });
      expect(engine2.getSeed()).toBe(999);
    });

    it('supports sharing an external TextureRegistry without taking exclusive ownership', () => {
      const externalRegistry = new TextureRegistry(mockManager);
      const engine = new ProceduralGraphicsEngine(undefined, { registry: externalRegistry });
      expect(engine.getRegistry()).toBe(externalRegistry);
    });

    it('generates and registers all 11 foundational textures on initializeFoundationalSet()', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      const registeredKeys = engine.initializeFoundationalSet();

      expect(engine.isReady()).toBe(true);
      expect(registeredKeys).toHaveLength(11);
      expect(registeredKeys.sort()).toEqual([...FOUNDATIONAL_TEXTURE_KEYS].sort());

      // 7 terrain textures
      expect(engine.has(TERRAIN_TEXTURE_KEYS.GRASS_V0)).toBe(true);
      expect(engine.has(TERRAIN_TEXTURE_KEYS.GRASS_V1)).toBe(true);
      expect(engine.has(TERRAIN_TEXTURE_KEYS.GRASS_V2)).toBe(true);
      expect(engine.has(TERRAIN_TEXTURE_KEYS.GRASS_V3)).toBe(true);
      expect(engine.has(TERRAIN_TEXTURE_KEYS.DIRT_V0)).toBe(true);
      expect(engine.has(TERRAIN_TEXTURE_KEYS.SAND_V0)).toBe(true);
      expect(engine.has(TERRAIN_TEXTURE_KEYS.WATER_V0)).toBe(true);

      // 3 interaction overlays
      expect(engine.has(OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE)).toBe(true);
      expect(engine.has(OVERLAY_TEXTURE_KEYS.SELECTED_RETICLE)).toBe(true);
      expect(engine.has(OVERLAY_TEXTURE_KEYS.GRID_MARKER)).toBe(true);

      // 1 structure prototype
      expect(engine.has(STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1)).toBe(true);
    });

    it('is idempotent: calling initializeFoundationalSet() repeatedly does not re-register or throw', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      const firstKeys = engine.initializeFoundationalSet();
      expect(firstKeys).toHaveLength(11);

      const createCanvasCallsBefore = (mockManager.createCanvas as any).mock.calls.length;

      // Second invocation
      const secondKeys = engine.initializeFoundationalSet();
      expect(secondKeys).toEqual(firstKeys);

      // Must not have called createCanvas again
      const createCanvasCallsAfter = (mockManager.createCanvas as any).mock.calls.length;
      expect(createCanvasCallsAfter).toBe(createCanvasCallsBefore);
    });

    it('correctly sets nearest-neighbor filter mode and procedural metadata', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      engine.initializeFoundationalSet();

      const grassMeta = engine.getMetadata(TERRAIN_TEXTURE_KEYS.GRASS_V0);
      expect(grassMeta).not.toBeNull();
      expect(grassMeta?.filterMode).toBe('nearest');
      expect(grassMeta?.source).toBe('procedural');
      expect(grassMeta?.width).toBe(64);
      expect(grassMeta?.height).toBe(32);

      const cottageMeta = engine.getMetadata(STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1);
      expect(cottageMeta).not.toBeNull();
      expect(cottageMeta?.width).toBe(64);
      expect(cottageMeta?.height).toBe(64);
    });
  });

  describe('Query and Access Methods', () => {
    it('returns valid textures via getTexture() and keys via getTextureKey()', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      engine.initializeFoundationalSet();

      const tex = engine.getTexture(OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE);
      expect(tex).not.toBeNull();
      expect(tex?.key).toBe(OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE);

      expect(engine.getTextureKey(OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE)).toBe(
        OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE
      );
    });

    it('handles missing textures gracefully', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      engine.initializeFoundationalSet();

      expect(engine.has('non_existent_key')).toBe(false);
      expect(engine.getTexture('non_existent_key')).toBeNull();
      expect(engine.getMetadata('non_existent_key')).toBeNull();

      expect(() => engine.getTextureKey('non_existent_key')).toThrow(
        /is not registered in ProceduralGraphicsEngine/
      );
    });

    it('returns all registered keys via getAllRegisteredKeys()', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      expect(engine.getAllRegisteredKeys()).toEqual([]);

      engine.initializeFoundationalSet();
      expect(engine.getAllRegisteredKeys().sort()).toEqual([...FOUNDATIONAL_TEXTURE_KEYS].sort());
    });
  });

  describe('Determinism', () => {
    it('produces identical texture byte sequences for engines with identical seeds', () => {
      const managerA = createMockTextureManager();
      const managerB = createMockTextureManager();

      const engineA = new ProceduralGraphicsEngine(managerA, 1337);
      const engineB = new ProceduralGraphicsEngine(managerB, 1337);

      engineA.initializeFoundationalSet();
      engineB.initializeFoundationalSet();

      for (const key of FOUNDATIONAL_TEXTURE_KEYS) {
        const dataA = managerA.createdTextures[key].lastImageData.data;
        const dataB = managerB.createdTextures[key].lastImageData.data;
        expect(dataA).toEqual(dataB);
      }
    });

    it('produces distinct grass variations across different variants within the same engine', () => {
      const engine = new ProceduralGraphicsEngine(mockManager, 1337);
      engine.initializeFoundationalSet();

      const dataV0 = mockManager.createdTextures[TERRAIN_TEXTURE_KEYS.GRASS_V0].lastImageData.data;
      const dataV1 = mockManager.createdTextures[TERRAIN_TEXTURE_KEYS.GRASS_V1].lastImageData.data;
      const dataV2 = mockManager.createdTextures[TERRAIN_TEXTURE_KEYS.GRASS_V2].lastImageData.data;

      // Variants must not be completely identical
      expect(dataV0).not.toEqual(dataV1);
      expect(dataV0).not.toEqual(dataV2);
      expect(dataV1).not.toEqual(dataV2);
    });
  });

  describe('Partial Initialization Failure & Transactional Rollback', () => {
    it('rolls back registered textures when an error is thrown midway through initialization', () => {
      let callCount = 0;
      const originalCreateCanvas = mockManager.createCanvas;

      mockManager.createCanvas = vi.fn((key: string, w: number, h: number) => {
        callCount++;
        // Fail on the 5th texture registration
        if (callCount === 5) {
          throw new Error('Simulated CanvasTexture allocation failure');
        }
        return originalCreateCanvas(key, w, h);
      });

      const engine = new ProceduralGraphicsEngine(mockManager);

      expect(() => engine.initializeFoundationalSet()).toThrow(
        'Simulated CanvasTexture allocation failure'
      );

      // Verify that engine is not marked as ready
      expect(engine.isReady()).toBe(false);

      // Verify that all 4 textures registered prior to the failure were rolled back (unregistered)
      expect(mockManager.remove).toHaveBeenCalled();
      for (const key of FOUNDATIONAL_TEXTURE_KEYS) {
        expect(engine.has(key)).toBe(false);
      }
      expect(engine.getAllRegisteredKeys()).toHaveLength(0);
    });
  });

  describe('Destruction & Texture Ownership', () => {
    it('disposes all registry-owned textures when destroyed', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      engine.initializeFoundationalSet();

      expect(engine.isReady()).toBe(true);
      engine.destroy(true);

      expect(engine.isReady()).toBe(false);
      expect(engine.has(TERRAIN_TEXTURE_KEYS.GRASS_V0)).toBe(false);
      expect(engine.getAllRegisteredKeys()).toHaveLength(0);

      // Calling methods after destroy
      expect(() => engine.initializeFoundationalSet()).toThrow(/has been destroyed/);
      expect(engine.getTexture(TERRAIN_TEXTURE_KEYS.GRASS_V0)).toBeNull();
      expect(engine.getMetadata(TERRAIN_TEXTURE_KEYS.GRASS_V0)).toBeNull();
    });

    it('only unregisters its own textures when sharing an external registry', () => {
      const externalRegistry = new TextureRegistry(mockManager);

      // Simulate an external texture in the registry
      const externalMockTex = mockManager.createCanvas('external_foreign_tex', 16, 16);
      expect(externalMockTex).not.toBeNull();

      const engine = new ProceduralGraphicsEngine(undefined, { registry: externalRegistry });
      engine.initializeFoundationalSet();

      expect(engine.has(TERRAIN_TEXTURE_KEYS.GRASS_V0)).toBe(true);

      // Destroy engine with destroyPhaserTextures = true
      engine.destroy(true);

      // Engine's textures are removed
      expect(engine.has(TERRAIN_TEXTURE_KEYS.GRASS_V0)).toBe(false);

      // External texture in textureManager was not removed by engine destruction
      expect(mockManager.exists('external_foreign_tex')).toBe(true);
    });

    it('calling destroy() multiple times is safe and idempotent', () => {
      const engine = new ProceduralGraphicsEngine(mockManager);
      engine.initializeFoundationalSet();

      expect(() => {
        engine.destroy();
        engine.destroy();
        engine.destroy();
      }).not.toThrow();
    });
  });
});
