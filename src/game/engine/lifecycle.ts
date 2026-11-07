import Phaser from 'phaser';
import { createGameConfig } from './gameConfig';
import { eventBus } from '../events/GameEventBus';

let activeGameInstance: Phaser.Game | null = null;

/**
 * Initializes and mounts a single, controlled Phaser.Game instance.
 * Destroys any lingering instances to prevent memory leaks or duplicate canvases in React StrictMode.
 */
export function launchGame(container: HTMLElement): Phaser.Game {
  if (activeGameInstance) {
    destroyGame(activeGameInstance);
    activeGameInstance = null;
  }

  const config = createGameConfig(container);
  const game = new Phaser.Game(config);
  activeGameInstance = game;

  return game;
}

/**
 * Safely stops and destroys a running Phaser.Game instance.
 */
export function destroyGame(game: Phaser.Game | null): void {
  if (game) {
    try {
      eventBus.emit('ENGINE_DESTROYED');
      game.destroy(true, false);
    } catch (error) {
      console.warn('[Pixelopolis Lifecycle] Error during game destruction:', error);
    }
  }
  if (activeGameInstance === game) {
    activeGameInstance = null;
  }
}

/**
 * Returns the currently active Phaser.Game instance (if any).
 */
export function getActiveGame(): Phaser.Game | null {
  return activeGameInstance;
}
