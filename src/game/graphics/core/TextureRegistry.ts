import type Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';

/**
 * Texture filter modes matching Phaser.Textures.FilterMode:
 * - LINEAR: 0
 * - NEAREST: 1
 */
export const TEXTURE_FILTER_MODE = {
  LINEAR: 0,
  NEAREST: 1,
} as const;

/**
 * Metadata recorded for every texture managed by the TextureRegistry.
 */
export interface TextureMetadata {
  key: string;
  width: number;
  height: number;
  createdAt: number;
  source: 'procedural' | 'static' | 'external';
  isRegistryOwned: boolean;
  filterMode: 'nearest' | 'linear';
}

/**
 * Options configuring texture registration and upload.
 */
export interface RegisterTextureOptions {
  /**
   * When true, throws an Error if the texture key is already registered.
   * When false (default), returns the existing texture as a cache hit without re-uploading.
   */
  failOnDuplicate?: boolean;

  /**
   * Filter mode applied to the registered texture.
   * Defaults to 'nearest' for crisp pixel art.
   */
  filterMode?: 'nearest' | 'linear';

  /**
   * Origin or category tag. Defaults to 'procedural'.
   */
  source?: 'procedural' | 'static' | 'external';
}

/**
 * Minimal structural interface for Phaser TextureManager compatibility,
 * enabling testing with lightweight mocks without full WebGL browser harnesses.
 */
export interface ITextureManager {
  exists(key: string): boolean;
  get(key: string): Phaser.Textures.Texture | any;
  createCanvas(key: string, width?: number, height?: number): Phaser.Textures.CanvasTexture | any;
  remove(key: string | Phaser.Textures.Texture | any): unknown;
  checkKey?(key: string): boolean;
  list?: Record<string, any>;
}

/**
 * Reserved internal Phaser texture keys that must not be used for user textures.
 */
const RESERVED_KEYS: ReadonlySet<string> = new Set([
  '__DEFAULT',
  '__MISSING',
  '__WHITE',
  '__RAINBOW',
]);

/**
 * Regular expression validating texture keys:
 * - Must be 1 to 128 characters.
 * - Allowed characters: alphanumeric, underscores, hyphens, colons, slashes, and dots.
 * - Must start and end with an alphanumeric character (or single alphanumeric).
 */
const VALID_KEY_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9_\-:/.]*[a-zA-Z0-9])?$/;

/**
 * Validates a texture key according to Pixelopolis naming conventions.
 * 
 * Rules:
 * - Must be a non-empty string between 1 and 128 characters.
 * - Alphanumeric, underscores, hyphens, colons, slashes, dots.
 * - Cannot start or end with punctuation or whitespace.
 * - Cannot contain consecutive delimiters ('//', '::', '..').
 * - Cannot match reserved Phaser keys ('__DEFAULT', '__MISSING', etc.).
 */
export function isValidTextureKey(key: unknown): boolean {
  if (typeof key !== 'string') return false;
  if (key.length === 0 || key.length > 128) return false;
  if (RESERVED_KEYS.has(key)) return false;
  if (key.includes('//') || key.includes('::') || key.includes('..')) return false;

  return VALID_KEY_REGEX.test(key);
}

/**
 * Asserts that a texture key is valid, throwing a descriptive Error if not.
 */
export function validateTextureKey(key: string): void {
  if (!isValidTextureKey(key)) {
    throw new Error(
      `Invalid texture key: "${key}". Keys must be 1-128 alphanumeric characters (with internal _, -, :, /, .) and not match reserved names.`
    );
  }
}

/**
 * Low-level bridge function that uploads a headless PixelCanvas into Phaser's TextureManager.
 * 
 * Critical Canvas Ownership Guarantee:
 * - Allocates an independent HTMLCanvasElement via `textureManager.createCanvas()`.
 * - Copies raw 32-bit pixel bytes directly into an ImageData buffer.
 * - Guarantees the source PixelCanvas retains independent memory and can be reused/cleared
 *   without corrupting the registered texture in either Canvas or WebGL renderers.
 * - Enforces nearest-neighbor filtering and rolls back on failure.
 */
export function uploadPixelCanvasToTexture(
  textureManager: Phaser.Textures.TextureManager | ITextureManager,
  key: string,
  pixelCanvas: PixelCanvas,
  options: RegisterTextureOptions = {}
): Phaser.Textures.CanvasTexture {
  validateTextureKey(key);

  const width = pixelCanvas.width;
  const height = pixelCanvas.height;

  if (width < 1 || height < 1) {
    throw new RangeError(
      `PixelCanvas dimensions must be positive integers >= 1. Received: ${width}x${height}`
    );
  }

  if (width > PixelCanvas.MAX_DIMENSION || height > PixelCanvas.MAX_DIMENSION) {
    throw new RangeError(
      `PixelCanvas dimensions exceed maximum limit of ${PixelCanvas.MAX_DIMENSION}px. Received: ${width}x${height}`
    );
  }

  const rawBuffer = pixelCanvas.getRawBuffer();
  if (rawBuffer.length !== width * height) {
    throw new RangeError(
      `PixelCanvas buffer length mismatch. Expected ${width * height} pixels, got ${rawBuffer.length}.`
    );
  }

  if (textureManager.exists(key)) {
    throw new Error(`Cannot upload texture: key "${key}" already exists in TextureManager.`);
  }

  // Allocate an independent CanvasTexture for this texture
  const canvasTexture = textureManager.createCanvas(key, width, height);
  if (!canvasTexture) {
    throw new Error(`Failed to create CanvasTexture for key "${key}".`);
  }

  try {
    const ctx =
      (canvasTexture as unknown as { context?: CanvasRenderingContext2D }).context ??
      (canvasTexture as unknown as { canvas?: HTMLCanvasElement }).canvas?.getContext('2d');

    if (!ctx) {
      throw new Error(`Failed to acquire 2D rendering context for CanvasTexture "${key}".`);
    }

    const imgData = ctx.createImageData(width, height);

    // Fast zero-copy byte view over the little-endian Uint32Array:
    // [R, G, B, A] in byte memory exactly aligns with ImageData.data layout.
    const byteView = new Uint8ClampedArray(
      rawBuffer.buffer,
      rawBuffer.byteOffset,
      rawBuffer.byteLength
    );
    imgData.data.set(byteView);
    ctx.putImageData(imgData, 0, 0);

    // Refresh GPU texture representation (WebGL)
    if (typeof canvasTexture.refresh === 'function') {
      canvasTexture.refresh();
    }

    // Set pixelated nearest-neighbor filter mode
    const filter =
      options.filterMode === 'linear'
        ? TEXTURE_FILTER_MODE.LINEAR
        : TEXTURE_FILTER_MODE.NEAREST;

    if (typeof canvasTexture.setFilter === 'function') {
      canvasTexture.setFilter(filter);
    }

    return canvasTexture as Phaser.Textures.CanvasTexture;
  } catch (error) {
    // Rollback: ensure no orphaned or partially registered texture remains in Phaser
    try {
      textureManager.remove(key);
    } catch {
      // Ignore rollback cleanup errors
    }
    throw error;
  }
}

/**
 * Pixelopolis — Centralized Texture Registry
 * 
 * Manages the lifecycle, ownership, lookup, and caching of procedurally generated textures:
 * - Single source of truth for generated texture keys.
 * - Cache-hit avoidance of redundant allocations and uploads.
 * - Strict ownership boundary (never mutates or removes textures owned by external code).
 * - Idempotent, leak-free disposal.
 */
export class TextureRegistry {
  private readonly textureManager: Phaser.Textures.TextureManager | ITextureManager;
  private readonly registeredTextures = new Map<string, TextureMetadata>();
  private isDestroyed = false;

  constructor(textureManager: Phaser.Textures.TextureManager | ITextureManager) {
    if (!textureManager) {
      throw new TypeError('TextureRegistry requires a valid Phaser TextureManager instance.');
    }
    this.textureManager = textureManager;
  }

  /**
   * Checks whether a texture key is registered and validly exists in Phaser's TextureManager.
   */
  public has(key: string): boolean {
    if (this.isDestroyed) return false;
    if (!this.registeredTextures.has(key)) return false;

    // Detect if texture was removed from Phaser externally
    if (!this.textureManager.exists(key)) {
      this.registeredTextures.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Safely retrieves a texture by key.
   * Returns null if not registered or if Phaser returns a fallback missing texture.
   */
  public get(key: string): Phaser.Textures.Texture | null {
    if (this.isDestroyed || !this.has(key)) return null;

    const tex = this.textureManager.get(key);
    if (!tex || tex.key === '__MISSING' || tex.key === '__DEFAULT') {
      return null;
    }
    return tex;
  }

  /**
   * Retrieves the metadata for a registered texture.
   */
  public getMetadata(key: string): TextureMetadata | null {
    if (this.isDestroyed || !this.has(key)) return null;
    return this.registeredTextures.get(key) ?? null;
  }

  /**
   * Tests whether a texture key is owned by this registry instance.
   */
  public isOwned(key: string): boolean {
    if (this.isDestroyed) return false;
    const meta = this.registeredTextures.get(key);
    return Boolean(meta?.isRegistryOwned && this.textureManager.exists(key));
  }

  /**
   * Registers a PixelCanvas into Phaser, returning the resulting Texture.
   * 
   * Cache behavior:
   * - If already registered and `failOnDuplicate` is false, returns existing texture immediately.
   * - If already registered and `failOnDuplicate` is true, throws Error.
   * - If key exists in Phaser but is not owned by this registry, throws Error.
   */
  public registerPixelCanvas(
    key: string,
    pixelCanvas: PixelCanvas,
    options: RegisterTextureOptions = {}
  ): Phaser.Textures.Texture {
    if (this.isDestroyed) {
      throw new Error(`Cannot register texture "${key}": TextureRegistry has been destroyed.`);
    }

    validateTextureKey(key);

    // 1. Cache hit check
    if (this.has(key)) {
      if (options.failOnDuplicate) {
        throw new Error(`Texture with key "${key}" is already registered.`);
      }
      return this.get(key)!;
    }

    // 2. Foreign texture collision check
    if (this.textureManager.exists(key)) {
      throw new Error(
        `Cannot register "${key}": key already exists in Phaser TextureManager and is not owned by this TextureRegistry.`
      );
    }

    // 3. Upload via independent canvas bridge
    const canvasTexture = uploadPixelCanvasToTexture(
      this.textureManager,
      key,
      pixelCanvas,
      options
    );

    // 4. Record metadata
    const meta: TextureMetadata = {
      key,
      width: pixelCanvas.width,
      height: pixelCanvas.height,
      createdAt: Date.now(),
      source: options.source ?? 'procedural',
      isRegistryOwned: true,
      filterMode: options.filterMode ?? 'nearest',
    };

    this.registeredTextures.set(key, meta);
    return canvasTexture;
  }

  /**
   * Unregisters and removes a registry-owned texture from both the registry and Phaser.
   * Refuses to remove foreign textures. Safe and idempotent.
   */
  public unregister(key: string): boolean {
    if (this.isDestroyed) return false;

    // Invariant: Never remove textures not owned by this registry
    if (!this.isOwned(key)) {
      return false;
    }

    try {
      this.textureManager.remove(key);
    } catch {
      // Safe removal error suppression
    }

    this.registeredTextures.delete(key);
    return true;
  }

  /**
   * Destroys this registry and optionally disposes all registered textures in Phaser.
   * Idempotent: safe to call multiple times.
   */
  public destroy(destroyPhaserTextures: boolean = true): void {
    if (this.isDestroyed) return;

    if (destroyPhaserTextures) {
      for (const [key, meta] of this.registeredTextures.entries()) {
        if (meta.isRegistryOwned) {
          try {
            if (this.textureManager.exists(key)) {
              this.textureManager.remove(key);
            }
          } catch {
            // Safe removal error suppression
          }
        }
      }
    }

    this.registeredTextures.clear();
    this.isDestroyed = true;
  }

  /**
   * Returns a list of all active texture keys owned by this registry.
   */
  public getAllOwnedKeys(): string[] {
    if (this.isDestroyed) return [];
    const keys: string[] = [];
    for (const key of this.registeredTextures.keys()) {
      if (this.has(key)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Returns the count of active textures owned by this registry.
   */
  public size(): number {
    return this.getAllOwnedKeys().length;
  }
}
