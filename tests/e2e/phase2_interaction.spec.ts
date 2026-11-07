import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Pixelopolis Phase 2 — Isometric Grid & World Interaction', () => {
  const screenshotsDir = path.resolve('test-results', 'screenshots_phase2');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('comprehensive grid, hover, selection, and overlay interaction', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Launch application
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // 2. Verify canvas mounted & single instance in DOM
    const phaserContainer = page.locator('#phaser-container');
    await expect(phaserContainer).toBeVisible();
    const canvas = phaserContainer.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    expect(await canvas.count()).toBe(1);

    // Wait for engine and CityScene to be fully booted and interactive
    await expect(page.locator('header')).toContainText('Scene: CityScene', { timeout: 10000 });
    await expect(page.locator('[data-testid="zoom-display"]')).toHaveText('100%');

    // Verify initial InfoPanel & Tile Inspector
    const infoPanel = page.locator('[data-testid="info-panel"]');
    await expect(infoPanel).toBeVisible();
    const noTileMsg = page.locator('[data-testid="no-tile-selected-msg"]');
    await expect(noTileMsg).toBeVisible();
    await expect(noTileMsg).toContainText('No tile selected');

    // Screenshot 1: Phase 2 Initial State
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '01_phase2_initial.png') });

    // 3. Hovering a tile updates coordinates
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    const centerX = canvasBox!.x + canvasBox!.width / 2;
    const centerY = canvasBox!.y + canvasBox!.height / 2;

    await page.mouse.move(0, 0);
    await page.waitForTimeout(100);
    await page.mouse.move(centerX, centerY, { steps: 5 });
    const hoverDisplay = page.locator('[data-testid="hover-tile-display"]');
    await expect(hoverDisplay).not.toHaveText('—');
    const hoveredText = await hoverDisplay.textContent();
    expect(hoveredText).toContain('(');

    // Screenshot 2: Hover Highlight
    await page.screenshot({ path: path.join(screenshotsDir, '02_tile_hover.png') });

    // 4. Moving outside the map clears hover
    await page.mouse.move(1050, 80); // Outside map in top-right empty canvas area
    await expect(hoverDisplay).toHaveText('—');

    // Also moving over UI overlays clears hover
    await page.mouse.move(centerX, centerY);
    await expect(hoverDisplay).not.toHaveText('—');
    await page.mouse.move(50, 50); // Move over Header UI
    await expect(hoverDisplay).toHaveText('—');

    // 5. Clicking a tile selects it
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(200);

    // Selected tile details appear in React panel
    const selectedCoords = page.locator('[data-testid="selected-coords"]');
    await expect(selectedCoords).toBeVisible();
    const initialSelectedCoordText = await selectedCoords.textContent();
    expect(initialSelectedCoordText).toContain('(');

    const selectedTerrain = page.locator('[data-testid="selected-terrain"]');
    await expect(selectedTerrain).toHaveText('Grassland');

    const selectedTileId = page.locator('[data-testid="selected-tile-id"]');
    await expect(selectedTileId).toContainText('tile_');

    // Screenshot 3: Tile Selected (Cyan Reticle + Inspector)
    await page.screenshot({ path: path.join(screenshotsDir, '03_tile_selected.png') });

    // 6. Selecting a second tile updates the details
    await page.mouse.click(centerX + 64, centerY + 32); // 1 tile east-south
    await page.waitForTimeout(200);

    const secondSelectedCoordText = await selectedCoords.textContent();
    expect(secondSelectedCoordText).not.toBe(initialSelectedCoordText);

    // Screenshot 4: Second Tile Selected
    await page.screenshot({ path: path.join(screenshotsDir, '04_second_tile_selected.png') });

    // 7. Grid Toggle shows and hides grid overlay
    const gridStatus = page.locator('[data-testid="grid-overlay-status"]');
    await expect(gridStatus).toHaveText('Hidden');

    const toggleGridBtn = page.locator('[data-testid="btn-toggle-grid"]');
    await toggleGridBtn.click();
    await page.waitForTimeout(200);
    await expect(gridStatus).toHaveText('Visible');

    // Screenshot 5: Grid Overlay ON
    await page.screenshot({ path: path.join(screenshotsDir, '05_grid_overlay_on.png') });

    // Toggle grid off via shortcut key 'g'
    await page.keyboard.press('g');
    await page.waitForTimeout(200);
    await expect(gridStatus).toHaveText('Hidden');

    // 8. Camera Dragging does NOT accidentally select another tile
    const currentSelectedBeforeDrag = await selectedCoords.textContent();
    // Start drag
    await page.mouse.move(centerX, centerY);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(centerX - 120, centerY - 80, { steps: 8 });
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(200);

    // Selection should remain unchanged
    const currentSelectedAfterDrag = await selectedCoords.textContent();
    expect(currentSelectedAfterDrag).toBe(currentSelectedBeforeDrag);

    // Screenshot 6: Camera Panned with Selection Preserved
    await page.screenshot({ path: path.join(screenshotsDir, '06_panned_with_selection.png') });

    // 9. Camera Zoom preserves selection
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(200);

    const currentSelectedAfterZoom = await selectedCoords.textContent();
    expect(currentSelectedAfterZoom).toBe(currentSelectedBeforeDrag);

    // Screenshot 7: Camera Zoomed with Selection Preserved
    await page.screenshot({ path: path.join(screenshotsDir, '07_zoomed_with_selection.png') });

    // Reset camera view
    await page.keyboard.press('r');
    await page.waitForTimeout(200);

    // 10. Deselect tile via UI button
    const deselectBtn = page.locator('[data-testid="btn-deselect-tile"]');
    await expect(deselectBtn).toBeVisible();
    await deselectBtn.click();
    await page.waitForTimeout(200);

    await expect(noTileMsg).toBeVisible();
    await expect(noTileMsg).toContainText('No tile selected');

    // Screenshot 8: Deselected State
    await page.screenshot({ path: path.join(screenshotsDir, '08_deselected_cleared.png') });

    // 11. Viewport Resizing preserves tile picking
    await page.setViewportSize({ width: 900, height: 600 });
    await page.waitForTimeout(300);

    const newCanvasBox = await canvas.boundingBox();
    const newCenterX = newCanvasBox!.x + newCanvasBox!.width / 2;
    const newCenterY = newCanvasBox!.y + newCanvasBox!.height / 2;

    await page.mouse.click(newCenterX, newCenterY);
    await page.waitForTimeout(200);
    await expect(selectedCoords).toBeVisible();

    // 12. Deselect via Escape keyboard key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(noTileMsg).toBeVisible();
    await expect(noTileMsg).toContainText('No tile selected');

    // 13. Verify Zero Critical Console Errors
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('Phaser') && !err.includes('WebGL')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
