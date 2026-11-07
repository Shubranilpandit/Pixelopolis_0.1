import Phaser from 'phaser';
import {
  ensureGrassTileTexture,
  ensureTileHoverTexture,
  ensureTileSelectedTexture,
} from '../graphics/grassTileGenerator';
import { eventBus } from '../events/GameEventBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    // Generate and cache procedural textures once
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
