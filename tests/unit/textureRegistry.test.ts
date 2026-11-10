import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TextureRegistry,
  uploadPixelCanvasToTexture,
  isValidTextureKey,
  validateTextureKey,
  ITextureManager,
} from '../../src/game/graphics/core/TextureRegistry';
import { PixelCanvas } from '../../src/game/graphics/core/PixelCanvas';
import { rgbaToUint32 } from '../../src/game/graphics/palette/colorUtils';

/**
 * Creates a lightweight, high-fidelity mock of Phaser's TextureManager and CanvasTexture
 * to verify upload and registry operations without a full WebGL browser engine.
 */
function createMockTextureManager() {
  const textureStore: Record<string, any> = {};

  const mockManager: ITextureManager & {
    list: Record<string, any>;
    canvasInstances: Record<string, any>;
  } = {
    list: textureStore,
    canvasInstances: {},

    exists: vi.fn((key: string) => Boolean(textureStore[key])),

    get: vi.fn((key: string) => {
      return textureStore[key] ?? { key: '__MISSING' };
    }),

    createCanvas: vi.fn((key: string, width: number = 256, height: number = 256) => {
      if (textureStore[key]) {
        return null;
      }

      // Simulated HTMLCanvasElement and 2D context
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
        filterMode: 1, // Default NEAREST
        refresh: vi.fn(),
        setFilter: vi.fn((mode: number) => {
          mockTexture.filterMode = mode;
        }),
        destroy: vi.fn(() => {
          delete textureStore[key];
        }),
      };

      textureStore[key] = mockTexture;
      mockManager.canvasInstances[key] = mockCanvas;
      return mockTexture;
    }),

    remove: vi.fn((keyOrTexture: any) => {
      const key = typeof keyOrTexture === 'string' ? keyOrTexture : keyOrTexture?.key;
      if (key && textureStore[key]) {
        textureStore[key].destroy();
        delete textureStore[key];
      }
      return mockManager;
    }),
  };

  return mockManager;
}

describe('TextureRegistry and Upload Bridge', () => {
  let mockTM: ReturnType<typeof createMockTextureManager>;
  let registry: TextureRegistry;

  beforeEach(() => {
    mockTM = createMockTextureManager();
    registry = new TextureRegistry(mockTM);
  });

  describe('Key Validation', () => {
    it('accepts valid texture keys adhering to Pixelopolis conventions', () => {
      const validKeys = [
        'terrain_grass_base',
        'terrain/grass/base',
        'structure/residential_lvl1',
        'overlay:hover',
        'tile-01',
        'ground.dirt',
        'a',
        'abc',
        'MAP_BORDER_1',
      ];

      for (const key of validKeys) {
        expect(isValidTextureKey(key)).toBe(true);
        expect(() => validateTextureKey(key)).not.toThrow();
      }
    });

    it('rejects invalid texture keys with descriptive errors', () => {
      const invalidKeys = [
        '', // Empty
        '   ', // Whitespace
        '/leading_slash',
        'trailing_slash/',
        ':leading_colon',
        'trailing_colon:',
        '-leading_hyphen',
        'trailing_hyphen-',
        'double//slash',
        'double::colon',
        'has space',
        'invalid$character',
        'invalid#hash',
        '__DEFAULT', // Reserved
        '__MISSING', // Reserved
        '__WHITE', // Reserved
        'a'.repeat(129), // Exceeds 128 chars
      ];

      for (const key of invalidKeys) {
        expect(isValidTextureKey(key)).toBe(false);
        expect(() => validateTextureKey(key)).toThrow(Error);
      }
    });
  });

  describe('uploadPixelCanvasToTexture Bridge', () => {
    it('uploads a PixelCanvas to an independent CanvasTexture with nearest-neighbor filtering', () => {
      const canvas = new PixelCanvas(64, 32);
      const testColor = rgbaToUint32(255, 128, 64, 255);
      canvas.setPixel(0, 0, testColor);

      const texture = uploadPixelCanvasToTexture(mockTM, 'tile_test', canvas);

      expect(mockTM.createCanvas).toHaveBeenCalledWith('tile_test', 64, 32);
      expect(texture.refresh).toHaveBeenCalled();
      expect(texture.setFilter).toHaveBeenCalledWith(1); // Phaser.Textures.FilterMode.NEAREST

      // Verify exact pixel and alpha byte conversion into ImageData
      const ctx = (texture as any).context;
      expect(ctx.putImageData).toHaveBeenCalled();
      const rawData = (texture as any).lastImageData.data;
      expect(rawData[0]).toBe(255); // R
      expect(rawData[1]).toBe(128); // G
      expect(rawData[2]).toBe(64);  // B
      expect(rawData[3]).toBe(255); // A
    });

    it('supports linear filtering when explicitly requested', () => {
      const canvas = new PixelCanvas(16, 16);
      const texture = uploadPixelCanvasToTexture(mockTM, 'tile_smooth', canvas, {
        filterMode: 'linear',
      });

      expect(texture.setFilter).toHaveBeenCalledWith(0); // Phaser.Textures.FilterMode.LINEAR
    });

    it('rejects invalid dimensions and buffer mismatches', () => {
      const invalidCanvas = Object.create(PixelCanvas.prototype);
      Object.assign(invalidCanvas, {
        width: 0,
        height: 10,
        getRawBuffer: () => new Uint32Array(0),
      });

      expect(() => uploadPixelCanvasToTexture(mockTM, 'bad_dims', invalidCanvas)).toThrow(
        RangeError
      );
    });

    it('rejects upload when key already exists in TextureManager', () => {
      const canvas = new PixelCanvas(16, 16);
      uploadPixelCanvasToTexture(mockTM, 'tile_exist', canvas);

      expect(() => uploadPixelCanvasToTexture(mockTM, 'tile_exist', canvas)).toThrow(Error);
    });

    it('cleans up and removes texture if context acquisition or upload throws', () => {
      const canvas = new PixelCanvas(16, 16);

      // Force context creation failure
      vi.spyOn(mockTM, 'createCanvas').mockImplementationOnce(() => {
        const tex = {
          key: 'fail_key',
          canvas: { getContext: () => null },
          destroy: vi.fn(),
        } as any;
        mockTM.list['fail_key'] = tex;
        return tex;
      });

      expect(() => uploadPixelCanvasToTexture(mockTM, 'fail_key', canvas)).toThrow(
        /Failed to acquire 2D rendering context/
      );

      // Should have triggered rollback remove
      expect(mockTM.remove).toHaveBeenCalledWith('fail_key');
    });
  });

  describe('Canvas Ownership Independence', () => {
    it('guarantees each registered texture receives an independent canvas instance', () => {
      const canvas1 = new PixelCanvas(32, 32);
      const canvas2 = new PixelCanvas(32, 32);

      const color1 = rgbaToUint32(255, 0, 0, 255); // Red
      const color2 = rgbaToUint32(0, 0, 255, 255); // Blue
      canvas1.clear(color1);
      canvas2.clear(color2);

      const tex1 = registry.registerPixelCanvas('texture_red', canvas1);
      const tex2 = registry.registerPixelCanvas('texture_blue', canvas2);

      // Distinct canvas instances
      expect((tex1 as any).canvas).not.toBe((tex2 as any).canvas);

      // Distinct pixel data
      expect((tex1 as any).lastImageData.data[0]).toBe(255); // Red
      expect((tex1 as any).lastImageData.data[2]).toBe(0);

      expect((tex2 as any).lastImageData.data[0]).toBe(0);
      expect((tex2 as any).lastImageData.data[2]).toBe(255); // Blue
    });

    it('guarantees that mutating or clearing the source PixelCanvas does NOT mutate the registered texture', () => {
      const canvas = new PixelCanvas(16, 16);
      const originalColor = rgbaToUint32(100, 150, 200, 255);
      canvas.clear(originalColor);

      const tex = registry.registerPixelCanvas('tile_scratch', canvas);

      // Mutate the original CPU canvas
      canvas.clear(rgbaToUint32(0, 0, 0, 0));

      // Registered texture must retain original uploaded pixels
      const texData = (tex as any).lastImageData.data;
      expect(texData[0]).toBe(100);
      expect(texData[1]).toBe(150);
      expect(texData[2]).toBe(200);
      expect(texData[3]).toBe(255);
    });
  });

  describe('TextureRegistry Lifecycle and Caching', () => {
    it('initializes with a valid TextureManager and rejects null/undefined', () => {
      expect(() => new TextureRegistry(null as any)).toThrow(TypeError);
      expect(() => new TextureRegistry(undefined as any)).toThrow(TypeError);
    });

    it('returns existing texture on duplicate registration without re-uploading (cache hit)', () => {
      const canvas = new PixelCanvas(32, 32);
      const tex1 = registry.registerPixelCanvas('cached_tile', canvas);

      // Spy on createCanvas
      const createSpy = vi.spyOn(mockTM, 'createCanvas');

      // Second registration should be a cache hit
      const tex2 = registry.registerPixelCanvas('cached_tile', canvas);

      expect(tex2).toBe(tex1);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('throws on duplicate registration when failOnDuplicate is true', () => {
      const canvas = new PixelCanvas(16, 16);
      registry.registerPixelCanvas('dup_key', canvas);

      expect(() =>
        registry.registerPixelCanvas('dup_key', canvas, { failOnDuplicate: true })
      ).toThrow(/already registered/);
    });

    it('refuses to register or overwrite textures owned by external systems', () => {
      // Simulate an external texture (e.g. static UI asset loaded by Phaser loader)
      mockTM.list['external_texture'] = { key: 'external_texture' } as any;

      const canvas = new PixelCanvas(16, 16);
      expect(() => registry.registerPixelCanvas('external_texture', canvas)).toThrow(
        /already exists in Phaser TextureManager and is not owned by this TextureRegistry/
      );
    });

    it('safely handles missing textures by returning null instead of Phaser __MISSING fallback', () => {
      expect(registry.has('nonexistent_key')).toBe(false);
      expect(registry.get('nonexistent_key')).toBeNull();
      expect(registry.getMetadata('nonexistent_key')).toBeNull();
    });

    it('detects external texture removal and invalidates stale registry metadata', () => {
      const canvas = new PixelCanvas(16, 16);
      registry.registerPixelCanvas('vanish_tile', canvas);

      expect(registry.has('vanish_tile')).toBe(true);

      // Simulate external removal in Phaser
      delete mockTM.list['vanish_tile'];

      expect(registry.has('vanish_tile')).toBe(false);
      expect(registry.get('vanish_tile')).toBeNull();
    });

    it('distinguishes registry-owned textures from unowned textures', () => {
      const canvas = new PixelCanvas(16, 16);
      registry.registerPixelCanvas('owned_tile', canvas);

      mockTM.list['foreign_tile'] = { key: 'foreign_tile' } as any;

      expect(registry.isOwned('owned_tile')).toBe(true);
      expect(registry.isOwned('foreign_tile')).toBe(false);
      expect(registry.isOwned('unknown_tile')).toBe(false);
    });

    it('records rich metadata upon registration', () => {
      const canvas = new PixelCanvas(64, 32);
      registry.registerPixelCanvas('meta_tile', canvas, { source: 'procedural' });

      const meta = registry.getMetadata('meta_tile');
      expect(meta).not.toBeNull();
      expect(meta!.key).toBe('meta_tile');
      expect(meta!.width).toBe(64);
      expect(meta!.height).toBe(32);
      expect(meta!.source).toBe('procedural');
      expect(meta!.isRegistryOwned).toBe(true);
      expect(meta!.filterMode).toBe('nearest');
      expect(typeof meta!.createdAt).toBe('number');
    });

    it('unregisters owned textures cleanly while protecting foreign textures', () => {
      const canvas = new PixelCanvas(16, 16);
      registry.registerPixelCanvas('remove_me', canvas);

      // Foreign texture
      mockTM.list['foreign_tile'] = { key: 'foreign_tile' } as any;

      // Attempting to unregister foreign texture must return false and NOT remove from Phaser
      expect(registry.unregister('foreign_tile')).toBe(false);
      expect(mockTM.list['foreign_tile']).toBeDefined();

      // Unregistering owned texture must remove from Phaser and registry
      expect(registry.unregister('remove_me')).toBe(true);
      expect(registry.has('remove_me')).toBe(false);
      expect(mockTM.list['remove_me']).toBeUndefined();

      // Idempotent: second unregister returns false safely
      expect(registry.unregister('remove_me')).toBe(false);
    });

    it('destroys all owned textures on destroy(true) and is completely idempotent', () => {
      const canvas = new PixelCanvas(16, 16);
      registry.registerPixelCanvas('tile_1', canvas);
      registry.registerPixelCanvas('tile_2', canvas);

      // Foreign texture
      mockTM.list['foreign_tile'] = { key: 'foreign_tile' } as any;

      expect(registry.size()).toBe(2);

      // Destroy registry with texture cleanup
      registry.destroy(true);

      expect(registry.size()).toBe(0);
      expect(mockTM.list['tile_1']).toBeUndefined();
      expect(mockTM.list['tile_2']).toBeUndefined();
      // Foreign texture preserved
      expect(mockTM.list['foreign_tile']).toBeDefined();

      // Idempotent: subsequent destroy() does not throw
      expect(() => registry.destroy(true)).not.toThrow();

      // Post-destruction actions throw or return empty
      expect(() => registry.registerPixelCanvas('new_tile', canvas)).toThrow(
        /has been destroyed/
      );
      expect(registry.has('tile_1')).toBe(false);
      expect(registry.get('tile_1')).toBeNull();
      expect(registry.getAllOwnedKeys()).toEqual([]);
    });

    it('preserves textures in Phaser when destroy(false) is called', () => {
      const canvas = new PixelCanvas(16, 16);
      registry.registerPixelCanvas('preserve_tile', canvas);

      registry.destroy(false);

      // Texture remains in Phaser
      expect(mockTM.list['preserve_tile']).toBeDefined();
      // But registry tracking is cleared
      expect(registry.size()).toBe(0);
    });
  });
});
