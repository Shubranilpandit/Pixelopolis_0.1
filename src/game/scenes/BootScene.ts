import Phaser from 'phaser';
import {
  ensureGrassTileTexture,
  ensureTileHoverTexture,
  ensureTileSelectedTexture,
} from '../graphics/grassTileGenerator';
import { ProceduralGraphicsEngine } from '../graphics/ProceduralGraphicsEngine';
import { eventBus } from '../events/GameEventBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // 1. Initialize the ProceduralGraphicsEngine and register foundational assets
    const graphicsEngine = new ProceduralGraphicsEngine(this.textures);
    graphicsEngine.initializeFoundationalSet();
    this.registry.set('graphicsEngine', graphicsEngine);

    // 2. Retain legacy generators for fallback compatibility
    ensureGrassTileTexture(this);
    ensureTileHoverTexture(this);
    ensureTileSelectedTexture(this);
  }

  public create(): void {
    eventBus.emit('ENGINE_BOOTED', { timestamp: Date.now() });

    // Transition immediately to the main city scene
    this.scene.start('CityScene');
  }
}
