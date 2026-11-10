import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Pixelopolis Phase 3 — Visual Verification & Facade Integration', () => {
  const screenshotsDir = path.resolve('test-results', 'screenshots_phase3');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('captures and verifies procedural terrain, overlays, and structure prototype', async ({
    page,
  }) => {
    // 1. Set standard desktop viewport and navigate to application
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // 2. Wait for Phaser canvas to mount and BootScene -> CityScene transition
    const phaserContainer = page.locator('#phaser-container');
    await expect(phaserContainer).toBeVisible();
    const canvas = phaserContainer.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });

    const infoPanel = page.locator('[data-testid="info-panel"]');
    await expect(infoPanel).toBeVisible();
    await expect(infoPanel).toContainText('20 × 20');
    await expect(infoPanel).toContainText('400');

    // Wait for rendering to stabilize
    await page.waitForTimeout(500);

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    const centerX = canvasBox!.x + canvasBox!.width / 2;
    const centerY = canvasBox!.y + canvasBox!.height / 2;

    // Screenshot 1: Complete Tiled Grass Terrain with Structure Prototype
    const terrainScreenshotPath = path.join(screenshotsDir, '01_procedural_terrain_map.png');
    await page.screenshot({ path: terrainScreenshotPath });

    // 3. Hover over tile (10, 8) to display hover overlay
    // Coordinate (centerX + 64, centerY - 10) hovers near tile (10, 8)
    await page.mouse.move(centerX + 64, centerY - 10);
    await page.waitForTimeout(200);

    const hoverLocator = page.locator('[data-testid="hover-tile-display"]');
    await expect(hoverLocator).not.toHaveText('-');

    // Screenshot 2: Hover Overlay
    const hoverScreenshotPath = path.join(screenshotsDir, '02_hover_overlay.png');
    await page.screenshot({ path: hoverScreenshotPath });

    // 4. Click tile (10, 8) to activate persistent selection reticle
    await page.mouse.click(centerX + 64, centerY - 10);
    await page.waitForTimeout(200);

    const selectedCoords = page.locator('[data-testid="selected-coords"]');
    await expect(selectedCoords).toBeVisible();
    const coordText = await selectedCoords.textContent();
    expect(coordText).toContain('(');

    // Screenshot 3: Selected Reticle Overlay
    const selectedScreenshotPath = path.join(screenshotsDir, '03_selected_overlay.png');
    await page.screenshot({ path: selectedScreenshotPath });

    // 5. Toggle Grid Overlay via HUD button
    const toggleGridBtn = page.locator('[data-testid="btn-toggle-grid"]');
    await toggleGridBtn.click();
    await page.waitForTimeout(200);

    // Screenshot 4: Grid Overlay
    const gridScreenshotPath = path.join(screenshotsDir, '04_grid_overlay.png');
    await page.screenshot({ path: gridScreenshotPath });

    // Turn grid off again
    await toggleGridBtn.click();
    await page.waitForTimeout(100);

    // 6. Click directly on tile (10, 10) at (centerX, centerY) where the cottage prototype is placed
    // Camera starts centered directly over map center (gx: 10, gy: 10)
    const cottageScreenX = centerX;
    const cottageScreenY = centerY;

    await page.mouse.click(cottageScreenX, cottageScreenY);
    await page.waitForTimeout(200);

    const cottageSelectedCoord = await selectedCoords.textContent();
    expect(cottageSelectedCoord).toContain('(10, 10)');

    // Screenshot 6: Structure with Selected Reticle Underneath (1.0x zoom)
    const structureSelectedPath = path.join(screenshotsDir, '06_structure_selected.png');
    await page.screenshot({ path: structureSelectedPath });

    // 7. Center on and Zoom in to inspect Cottage Prototype at (10, 10) close-up
    await page.mouse.move(cottageScreenX, cottageScreenY);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(300);

    // Screenshot 5: Close-Up Structure Prototype
    const structureScreenshotPath = path.join(screenshotsDir, '05_structure_prototype_close_up.png');
    await page.screenshot({ path: structureScreenshotPath });

    // Ensure all 6 screenshot files were created and have non-zero size
    for (const file of [
      terrainScreenshotPath,
      hoverScreenshotPath,
      selectedScreenshotPath,
      gridScreenshotPath,
      structureScreenshotPath,
      structureSelectedPath,
    ]) {
      expect(fs.existsSync(file)).toBe(true);
      const stat = fs.statSync(file);
      expect(stat.size).toBeGreaterThan(10000);
    }
  });
});
