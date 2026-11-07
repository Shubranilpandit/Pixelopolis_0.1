import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Pixelopolis Phase 1 Final Verification', () => {
  const screenshotsDir = path.resolve('test-results', 'screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('comprehensive visual, interaction, and lifecycle verification', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    // 1. Load application
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Verify Title & Header
    await expect(page).toHaveTitle(/Pixelopolis/);
    const headerTitle = page.locator('header h1');
    await expect(headerTitle).toHaveText(/pixelopolis/i);

    // 2. Lifecycle: Verify exactly ONE canvas exists in #phaser-container
    const phaserContainer = page.locator('#phaser-container');
    await expect(phaserContainer).toBeVisible();
    const canvas = phaserContainer.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    const canvasCount = await canvas.count();
    expect(canvasCount).toBe(1);

    // Wait for BootScene to transition to CityScene
    const infoPanel = page.locator('[data-testid="info-panel"]');
    await expect(infoPanel).toBeVisible();
    await expect(infoPanel).toContainText('20 × 20');
    await expect(infoPanel).toContainText('400');
    await expect(infoPanel).toContainText('100%');

    // Wait a brief moment for initial rendering to settle
    await page.waitForTimeout(500);

    // Screenshot 1: Initial Centered Isometric Map
    const initialScreenshotPath = path.join(screenshotsDir, '01_initial_isometric_map.png');
    await page.screenshot({ path: initialScreenshotPath });

    // 3. Interaction: Hover over tiles and verify InfoPanel updates
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    const centerX = canvasBox!.x + canvasBox!.width / 2;
    const centerY = canvasBox!.y + canvasBox!.height / 2;

    await page.mouse.move(centerX, centerY);
    await page.waitForTimeout(200);

    // Verify hover coord is recognized
    const hoverCoordText = await infoPanel.locator('span:has-text("Hover Tile:") + span').textContent();
    expect(hoverCoordText).not.toBe('—');

    // Screenshot 2: Tile Hover Highlight
    const hoverScreenshotPath = path.join(screenshotsDir, '02_tile_hover.png');
    await page.screenshot({ path: hoverScreenshotPath });

    // 4. Interaction: Left Mouse Drag (Camera Pan)
    await page.mouse.move(centerX, centerY);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(centerX - 150, centerY - 100, { steps: 10 });
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(200);

    // Screenshot 3: After Camera Pan
    const panScreenshotPath = path.join(screenshotsDir, '03_after_camera_pan.png');
    await page.screenshot({ path: panScreenshotPath });

    // 5. Interaction: Mouse Wheel Zoom In
    await page.mouse.move(centerX, centerY);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);

    // Zoom should now be > 100%
    const zoomTextAfterZoomIn = await infoPanel.locator('span:has-text("Zoom:") + span').textContent();
    const zoomValIn = parseInt(zoomTextAfterZoomIn?.replace('%', '') || '100', 10);
    expect(zoomValIn).toBeGreaterThan(100);

    // Screenshot 4: After Zoom In
    const zoomInScreenshotPath = path.join(screenshotsDir, '04_after_zoom_in.png');
    await page.screenshot({ path: zoomInScreenshotPath });

    // 6. Interaction: Mouse Wheel Zoom Out
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(300);

    const zoomTextAfterZoomOut = await infoPanel.locator('span:has-text("Zoom:") + span').textContent();
    const zoomValOut = parseInt(zoomTextAfterZoomOut?.replace('%', '') || '100', 10);
    expect(zoomValOut).toBeLessThan(100);

    // Screenshot 5: After Zoom Out
    const zoomOutScreenshotPath = path.join(screenshotsDir, '05_after_zoom_out.png');
    await page.screenshot({ path: zoomOutScreenshotPath });

    // 7. Interaction: Keyboard 'R' Reset
    await page.keyboard.press('r');
    await page.waitForTimeout(300);

    const zoomAfterR = await infoPanel.locator('span:has-text("Zoom:") + span').textContent();
    expect(zoomAfterR?.trim()).toBe('100%');

    // 8. Interaction: HUD "Reset View" Button
    // Drag camera away
    await page.mouse.move(centerX, centerY);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(centerX + 200, centerY + 150, { steps: 5 });
    await page.mouse.up({ button: 'left' });
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(200);

    // Click HUD Reset button
    const resetButton = page.locator('button:has-text("Reset View")');
    await expect(resetButton).toBeVisible();
    await resetButton.click();
    await page.waitForTimeout(300);

    const zoomAfterHudReset = await infoPanel.locator('span:has-text("Zoom:") + span').textContent();
    expect(zoomAfterHudReset?.trim()).toBe('100%');

    // 9. Interaction: Viewport Resizing
    await page.setViewportSize({ width: 900, height: 600 });
    await page.waitForTimeout(300);

    const resizeScreenshotPath = path.join(screenshotsDir, '06_after_resize_900x600.png');
    await page.screenshot({ path: resizeScreenshotPath });

    // Restore viewport size
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(300);

    // 10. Console Error Inspection
    // Filter out expected Phaser debug banners or innocuous webgl notes if any
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('Phaser') && !err.includes('WebGL')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
