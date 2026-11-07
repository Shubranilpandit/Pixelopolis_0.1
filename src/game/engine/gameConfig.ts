import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { CityScene } from '../scenes/CityScene';

/**
 * Creates the production-grade Phaser 3 Game Configuration for Pixelopolis.
 * Enforces crisp pixel-art rendering, strict resize modes, and decoupled lifecycle.
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: '100%',
    height: '100%',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    backgroundColor: '#141721',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, CityScene],
    fps: {
      target: 60,
      min: 30,
      smoothStep: true,
    },
    audio: {
      noAudio: true, // Audio system enabled in Phase 11
    },
  };
}
