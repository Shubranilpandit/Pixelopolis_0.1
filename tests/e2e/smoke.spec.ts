import { test, expect } from '@playwright/test';

test.describe('Pixelopolis Application Smoke Test', () => {
  test('launches application, renders branding, HUD, and mounts Phaser canvas', async ({ page }) => {
    // Navigate to local dev server
    await page.goto('/');

    // 1. Verify document title
    await expect(page).toHaveTitle(/Pixelopolis/);

    // 2. Verify header branding
    const headerTitle = page.locator('header h1');
    await expect(headerTitle).toHaveText(/pixelopolis/i);

    // 3. Verify InfoPanel is present with world dimensions
    const infoPanel = page.locator('[data-testid="info-panel"]');
    await expect(infoPanel).toBeVisible();
    await expect(infoPanel).toContainText('20 × 20');
    await expect(infoPanel).toContainText('400');

    // 4. Verify ControlsOverlay is rendered
    const controlsOverlay = page.locator('[data-testid="controls-overlay"]');
    await expect(controlsOverlay).toBeVisible();
    await expect(controlsOverlay).toContainText('Reset View');

    // 5. Verify Phaser canvas container exists and contains a canvas element
    const phaserContainer = page.locator('#phaser-container');
    await expect(phaserContainer).toBeVisible();

    const canvas = phaserContainer.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // Verify canvas dimensions are positive
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);
  });
});
