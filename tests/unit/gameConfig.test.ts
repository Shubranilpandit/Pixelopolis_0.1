import { describe, it, expect, vi } from 'vitest';

// Mock Phaser runtime so gameConfig can be tested headlessly without WebGL/Canvas device checks
vi.mock('phaser', () => {
  class MockScene {
    sys = {};
  }
  return {
    default: {
      AUTO: 0,
      Scale: {
        RESIZE: 3,
        CENTER_BOTH: 1,
      },
      Scene: MockScene,
    },
  };
});

import { createGameConfig } from '../../src/game/engine/gameConfig';
import { BootScene } from '../../src/game/scenes/BootScene';
import { CityScene } from '../../src/game/scenes/CityScene';

describe('Phaser Game Configuration', () => {
  it('creates configuration enforcing strict pixel-art and scaling rules', () => {
    const mockContainer = {} as HTMLElement;
    const config = createGameConfig(mockContainer);

    expect(config.parent).toBe(mockContainer);
    expect(config.pixelArt).toBe(true);
    expect(config.roundPixels).toBe(true);
    expect(config.antialias).toBe(false);

    expect(config.scale?.mode).toBe(3); // Phaser.Scale.RESIZE
    expect(config.scale?.autoCenter).toBe(1); // Phaser.Scale.CENTER_BOTH

    expect(config.fps?.target).toBe(60);

    // Verify registered scenes
    expect(config.scene).toEqual([BootScene, CityScene]);
  });
});
