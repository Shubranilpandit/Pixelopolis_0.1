import { test, expect } from '@playwright/test';

test.describe('Pixelopolis Phase 3 — Texture Upload & Canvas Independence', () => {
  test('independently registered textures retain original pixels without canvas corruption', async ({
    page,
  }) => {
    // 1. Launch application and wait for Phaser game to boot
    await page.goto('/');

    const phaserContainer = page.locator('#phaser-container');
    await expect(phaserContainer).toBeVisible();
    const canvas = phaserContainer.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Wait until window.__PIXELOPOLIS_GAME__ is defined and ready
    await page.waitForFunction(() => {
      const g = (window as unknown as { __PIXELOPOLIS_GAME__?: any }).__PIXELOPOLIS_GAME__;
      return g && g.textures && g.isBooted;
    });

    // 2. Perform sequential texture uploads and inspect canvas backing storage in real browser
    const result = await page.evaluate(() => {
      const game = (window as unknown as { __PIXELOPOLIS_GAME__: any }).__PIXELOPOLIS_GAME__;
      const textures = game.textures;

      const keyA = 'e2e_verify_texture_a';
      const keyB = 'e2e_verify_texture_b';

      // 1. Create and upload Texture A with pure RED pixels
      const texA = textures.createCanvas(keyA, 16, 16);
      if (!texA) throw new Error('Failed to create CanvasTexture A');

      const ctxA = texA.context || texA.canvas.getContext('2d');
      const imgDataA = ctxA.createImageData(16, 16);
      for (let i = 0; i < 16 * 16 * 4; i += 4) {
        imgDataA.data[i] = 255;     // R
        imgDataA.data[i + 1] = 0;   // G
        imgDataA.data[i + 2] = 0;   // B
        imgDataA.data[i + 3] = 255; // A
      }
      ctxA.putImageData(imgDataA, 0, 0);
      texA.refresh();
      texA.setFilter(1); // NEAREST

      // 2. Subsequent upload: Create and upload Texture B with pure BLUE pixels
      const texB = textures.createCanvas(keyB, 16, 16);
      if (!texB) throw new Error('Failed to create CanvasTexture B');

      const ctxB = texB.context || texB.canvas.getContext('2d');
      const imgDataB = ctxB.createImageData(16, 16);
      for (let i = 0; i < 16 * 16 * 4; i += 4) {
        imgDataB.data[i] = 0;       // R
        imgDataB.data[i + 1] = 0;   // G
        imgDataB.data[i + 2] = 255; // B
        imgDataB.data[i + 3] = 255; // A
      }
      ctxB.putImageData(imgDataB, 0, 0);
      texB.refresh();
      texB.setFilter(1); // NEAREST

      // 3. Read back actual pixels from Texture A and Texture B
      const readBackA = ctxA.getImageData(0, 0, 16, 16).data;
      const readBackB = ctxB.getImageData(0, 0, 16, 16).data;

      const areCanvasesDistinct = texA.canvas !== texB.canvas;

      // Clean up after test
      textures.remove(keyA);
      textures.remove(keyB);

      return {
        areCanvasesDistinct,
        texA_firstPixel: [readBackA[0], readBackA[1], readBackA[2], readBackA[3]],
        texB_firstPixel: [readBackB[0], readBackB[1], readBackB[2], readBackB[3]],
        textureAExistsAfterCleanup: textures.exists(keyA),
        textureBExistsAfterCleanup: textures.exists(keyB),
      };
    });

    // 3. Verify that Texture A and Texture B maintain independent canvas storage and colors
    expect(result.areCanvasesDistinct).toBe(true);

    // Texture A must remain 100% Red ([255, 0, 0, 255])
    expect(result.texA_firstPixel).toEqual([255, 0, 0, 255]);

    // Texture B must be 100% Blue ([0, 0, 255, 255])
    expect(result.texB_firstPixel).toEqual([0, 0, 255, 255]);

    // Textures must be removed cleanly
    expect(result.textureAExistsAfterCleanup).toBe(false);
    expect(result.textureBExistsAfterCleanup).toBe(false);
  });
});
