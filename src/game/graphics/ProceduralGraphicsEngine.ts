import type Phaser from 'phaser';
import { TextureRegistry, type ITextureManager, type TextureMetadata } from './core/TextureRegistry';
import {
  TERRAIN_TEXTURE_KEYS,
  DEFAULT_TERRAIN_SEED,
  generateFoundationalTerrainSet,
  type TerrainTextureKey,
} from './generators/terrainTextureGenerator';
import {
  OVERLAY_TEXTURE_KEYS,
  generateFoundationalOverlaySet,
  type OverlayTextureKey,
} from './generators/overlayTextureGenerator';
import {
  STRUCTURE_TEXTURE_KEYS,
  generateStructurePrototype,
  type StructureTextureKey,
} from './generators/structureTextureGenerator';

export type { TerrainTextureKey, OverlayTextureKey, StructureTextureKey };

/**
 * Complete list of all 11 foundational Phase 3 texture keys.
 */
export const FOUNDATIONAL_TEXTURE_KEYS = [
  // 7 Terrain Textures
  TERRAIN_TEXTURE_KEYS.GRASS_V0,
  TERRAIN_TEXTURE_KEYS.GRASS_V1,
  TERRAIN_TEXTURE_KEYS.GRASS_V2,
  TERRAIN_TEXTURE_KEYS.GRASS_V3,
  TERRAIN_TEXTURE_KEYS.DIRT_V0,
  TERRAIN_TEXTURE_KEYS.SAND_V0,
  TERRAIN_TEXTURE_KEYS.WATER_V0,
  // 3 Interaction Overlay Textures
  OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE,
  OVERLAY_TEXTURE_KEYS.SELECTED_RETICLE,
  OVERLAY_TEXTURE_KEYS.GRID_MARKER,
  // 1 Foundational Structure Prototype
  STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1,
] as const;

export type FoundationalTextureKey = (typeof FOUNDATIONAL_TEXTURE_KEYS)[number];

/**
 * Aggregated constant dictionary grouping all canonical texture keys by category.
 */
export const GRAPHICS_ENGINE_KEYS = {
  TERRAIN: TERRAIN_TEXTURE_KEYS,
  OVERLAYS: OVERLAY_TEXTURE_KEYS,
  STRUCTURES: STRUCTURE_TEXTURE_KEYS,
} as const;

/**
 * Configuration options for the ProceduralGraphicsEngine facade.
 */
export interface ProceduralGraphicsEngineOptions {
  /**
   * Root numeric seed used for deterministic terrain and structure generation.
   * Defaults to DEFAULT_TERRAIN_SEED (1337).
   */
  seed?: number;

  /**
   * Optional pre-existing TextureRegistry instance.
   * If omitted, the engine instantiates and manages its own TextureRegistry.
   */
  registry?: TextureRegistry;
}

/**
 * Pixelopolis — ProceduralGraphicsEngine Facade
 * 
 * High-level orchestration facade that unifies:
 * - Deterministic PRNG streams and the canonical 32-color palette.
 * - Headless PixelCanvas and IsometricDrawing rasterization algorithms.
 * - Pure procedural asset generators (Terrain, Overlays, Structures).
 * - Centralized TextureRegistry and the Phaser TextureManager upload bridge.
 * 
 * Provides an idempotent, transactional, and leak-free lifecycle:
 * - Single-step `initializeFoundationalSet()` with atomic rollback on failure.
 * - Cache-safe duplicate call protection.
 * - Strict ownership boundary (never destroys external textures).
 */
export class ProceduralGraphicsEngine {
  private readonly registry: TextureRegistry;
  private readonly ownsRegistry: boolean;
  private readonly seed: number;
  private readonly generatedKeys = new Set<string>();

  private initialized = false;
  private isDestroyed = false;

  constructor(
    textureManagerOrRegistry?: Phaser.Textures.TextureManager | ITextureManager | TextureRegistry,
    options: number | ProceduralGraphicsEngineOptions = {}
  ) {
    const normalizedOptions: ProceduralGraphicsEngineOptions =
      typeof options === 'number' ? { seed: options } : options;

    this.seed = normalizedOptions.seed ?? DEFAULT_TERRAIN_SEED;

    if (textureManagerOrRegistry instanceof TextureRegistry) {
      this.registry = textureManagerOrRegistry;
      this.ownsRegistry = false;
    } else if (normalizedOptions.registry instanceof TextureRegistry) {
      this.registry = normalizedOptions.registry;
      this.ownsRegistry = false;
    } else if (textureManagerOrRegistry) {
      this.registry = new TextureRegistry(textureManagerOrRegistry);
      this.ownsRegistry = true;
    } else {
      throw new TypeError(
        'ProceduralGraphicsEngine requires either a valid Phaser TextureManager or a pre-configured TextureRegistry.'
      );
    }
  }

  /**
   * Returns whether the engine has been successfully initialized and not destroyed.
   */
  public isReady(): boolean {
    return !this.isDestroyed && this.initialized;
  }

  /**
   * Returns the underlying root seed.
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Returns the underlying TextureRegistry instance.
   */
  public getRegistry(): TextureRegistry {
    return this.registry;
  }

  /**
   * Checks whether a texture exists in the registry and Phaser's TextureManager.
   */
  public has(key: string): boolean {
    if (this.isDestroyed) return false;
    return this.registry.has(key);
  }

  /**
   * Safely retrieves a registered texture by key.
   * Returns null if missing or destroyed.
   */
  public getTexture(key: string): Phaser.Textures.Texture | null {
    if (this.isDestroyed) return null;
    return this.registry.get(key);
  }

  /**
   * Retrieves the texture key if registered, or throws an Error if missing.
   * Useful for strict assertions when binding textures in scenes.
   */
  public getTextureKey(key: string): string {
    if (!this.has(key)) {
      throw new Error(
        `Texture with key "${key}" is not registered in ProceduralGraphicsEngine.`
      );
    }
    return key;
  }

  /**
   * Retrieves metadata for a registered texture.
   */
  public getMetadata(key: string): TextureMetadata | null {
    if (this.isDestroyed) return null;
    return this.registry.getMetadata(key);
  }

  /**
   * Returns an array of all texture keys generated and registered by this engine.
   */
  public getAllRegisteredKeys(): string[] {
    if (this.isDestroyed) return [];
    return Array.from(this.generatedKeys);
  }

  /**
   * Generates and registers the complete Phase 3 foundational texture set:
   * 1. 7 Terrain textures (4 grass variants, dirt, sand, water)
   * 2. 3 Interaction overlays (hover outline, selected reticle, grid marker)
   * 3. 1 Foundational structure prototype (residential lvl 1 cottage)
   * 
   * Idempotency & Rollback:
   * - If all 11 textures are already registered, returns immediately without re-generating.
   * - If an error occurs midway, rolls back all textures registered during this call.
   * - Prevents partial initialization leaks.
   */
  public initializeFoundationalSet(): string[] {
    if (this.isDestroyed) {
      throw new Error(
        'Cannot initialize ProceduralGraphicsEngine: instance has been destroyed.'
      );
    }

    // Idempotency check: if already initialized and all foundational keys exist, return cache hit
    if (this.initialized) {
      const allFoundationalExist = FOUNDATIONAL_TEXTURE_KEYS.every((k) =>
        this.registry.has(k)
      );
      if (allFoundationalExist) {
        return Array.from(this.generatedKeys);
      }
    }

    const newlyRegistered: string[] = [];

    try {
      // 1. Generate and register foundational terrain textures (7 tiles)
      const terrainSet = generateFoundationalTerrainSet(this.seed);
      for (const [key, canvas] of Object.entries(terrainSet)) {
        if (!this.registry.has(key)) {
          this.registry.registerPixelCanvas(key, canvas, {
            filterMode: 'nearest',
            source: 'procedural',
            failOnDuplicate: false,
          });
          newlyRegistered.push(key);
        }
        this.generatedKeys.add(key);
      }

      // 2. Generate and register foundational interaction overlays (3 tiles)
      const overlaySet = generateFoundationalOverlaySet();
      for (const [key, canvas] of Object.entries(overlaySet)) {
        if (!this.registry.has(key)) {
          this.registry.registerPixelCanvas(key, canvas, {
            filterMode: 'nearest',
            source: 'procedural',
            failOnDuplicate: false,
          });
          newlyRegistered.push(key);
        }
        this.generatedKeys.add(key);
      }

      // 3. Generate and register foundational structure prototype (1 cottage)
      const cottageKey = STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1;
      if (!this.registry.has(cottageKey)) {
        const cottageCanvas = generateStructurePrototype({ seed: this.seed });
        this.registry.registerPixelCanvas(cottageKey, cottageCanvas, {
          filterMode: 'nearest',
          source: 'procedural',
          failOnDuplicate: false,
        });
        newlyRegistered.push(cottageKey);
      }
      this.generatedKeys.add(cottageKey);

      this.initialized = true;
      return Array.from(this.generatedKeys);
    } catch (error) {
      // Transactional Rollback: unregister only the textures registered during this failed attempt
      for (const key of newlyRegistered) {
        try {
          this.registry.unregister(key);
        } catch {
          // Suppress secondary rollback cleanup errors
        }
        this.generatedKeys.delete(key);
      }
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Destroys this engine and cleanly unregisters/disposes its registered textures.
   * 
   * Ownership rules:
   * - If the engine created its own TextureRegistry, it destroys the registry and textures.
   * - If an external TextureRegistry was supplied, it unregisters ONLY its own generated keys.
   * - Safe and idempotent.
   */
  public destroy(destroyPhaserTextures: boolean = true): void {
    if (this.isDestroyed) return;

    if (this.ownsRegistry) {
      this.registry.destroy(destroyPhaserTextures);
    } else if (destroyPhaserTextures) {
      for (const key of this.generatedKeys) {
        try {
          this.registry.unregister(key);
        } catch {
          // Suppress unregister error
        }
      }
    }

    this.generatedKeys.clear();
    this.initialized = false;
    this.isDestroyed = true;
  }
}
