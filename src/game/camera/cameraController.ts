import Phaser from 'phaser';
import { WORLD_CONSTANTS } from '../world/constants';
import { eventBus } from '../events/GameEventBus';

const { CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM, CAMERA_DEFAULT_ZOOM, CAMERA_ZOOM_SPEED, MAX_CLICK_DRAG_DISTANCE } = WORLD_CONSTANTS;

/**
 * Manages isometric viewport navigation:
 * - Left-click drag to pan
 * - Wheel scroll to zoom anchored to cursor
 * - 'R' key or event to reset view
 * - Distinguishes clicks from camera drags
 */
export class CameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  private isDragging: boolean = false;
  private hasExceededDragThreshold: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;

  private defaultScrollX: number = 0;
  private defaultScrollY: number = 0;

  private resetKey?: Phaser.Input.Keyboard.Key;
  private escapeKey?: Phaser.Input.Keyboard.Key;
  private unsubscribeBus?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  /**
   * Initializes camera listeners and records default center point.
   */
  public initialize(defaultScrollX: number, defaultScrollY: number): void {
    this.defaultScrollX = defaultScrollX;
    this.defaultScrollY = defaultScrollY;

    this.resetCamera();
    this.setupPointerControls();
    this.setupKeyboardControls();

    // Listen for UI-triggered resets
    this.unsubscribeBus = eventBus.on('CAMERA_RESET_REQUESTED', () => {
      this.resetCamera();
    });

    this.emitCameraState();
  }

  /**
   * Returns whether the recent pointer down action exceeded the click threshold into a drag.
   */
  public wasDrag(): boolean {
    return this.hasExceededDragThreshold;
  }

  /**
   * Sets up drag-to-pan and mouse-wheel zoom handlers.
   */
  private setupPointerControls(): void {
    const input = this.scene.input;

    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.isDragging = true;
        this.hasExceededDragThreshold = false;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = this.camera.scrollX;
        this.cameraStartY = this.camera.scrollY;
      }
    });

    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const dist = Math.hypot(pointer.x - this.dragStartX, pointer.y - this.dragStartY);
        if (dist > MAX_CLICK_DRAG_DISTANCE) {
          this.hasExceededDragThreshold = true;
        }

        // Adjust drag sensitivity inversely by zoom level
        const dx = (pointer.x - this.dragStartX) / this.camera.zoom;
        const dy = (pointer.y - this.dragStartY) / this.camera.zoom;

        this.camera.scrollX = this.cameraStartX - dx;
        this.camera.scrollY = this.cameraStartY - dy;

        this.emitCameraState();
      }
    });

    const stopDragging = () => {
      this.isDragging = false;
    };

    input.on('pointerup', stopDragging);
    input.on('pointerupoutside', stopDragging);
    input.on('gameout', stopDragging);

    // Mouse wheel zoom anchored around pointer world coordinates
    input.on('wheel', (
      pointer: Phaser.Input.Pointer,
      _gameObjects: unknown[],
      _deltaX: number,
      deltaY: number
    ) => {
      const zoomFactor = 1 - deltaY * CAMERA_ZOOM_SPEED;
      const targetZoom = Phaser.Math.Clamp(
        this.camera.zoom * zoomFactor,
        CAMERA_MIN_ZOOM,
        CAMERA_MAX_ZOOM
      );

      if (targetZoom !== this.camera.zoom) {
        // Compute world position before zoom
        const worldXBefore = (pointer.x / this.camera.zoom) + this.camera.scrollX;
        const worldYBefore = (pointer.y / this.camera.zoom) + this.camera.scrollY;

        this.camera.setZoom(targetZoom);

        // Adjust scroll so the cursor stays fixed over the same world point
        const worldXAfter = (pointer.x / targetZoom) + this.camera.scrollX;
        const worldYAfter = (pointer.y / targetZoom) + this.camera.scrollY;

        this.camera.scrollX += (worldXBefore - worldXAfter);
        this.camera.scrollY += (worldYBefore - worldYAfter);

        this.emitCameraState();
      }
    });
  }

  /**
   * Sets up keyboard shortcuts (e.g., 'R' for reset, 'Escape' for deselect).
   */
  private setupKeyboardControls(): void {
    if (this.scene.input.keyboard) {
      this.resetKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.resetKey.on('down', () => {
        this.resetCamera();
      });

      this.escapeKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.escapeKey.on('down', () => {
        eventBus.emit('TILE_DESELECT_REQUESTED');
      });
    }
  }

  /**
   * Resets camera zoom and centers on the default origin.
   */
  public resetCamera(): void {
    this.camera.setZoom(CAMERA_DEFAULT_ZOOM);
    this.camera.centerOn(this.defaultScrollX, this.defaultScrollY);

    eventBus.emit('CAMERA_RESET_COMPLETED', {
      zoom: this.camera.zoom,
      scrollX: this.camera.scrollX,
      scrollY: this.camera.scrollY,
    });

    this.emitCameraState();
  }

  /**
   * Emits the current camera metrics over the event bus.
   */
  private emitCameraState(): void {
    eventBus.emit('CAMERA_CHANGED', {
      zoom: Number(this.camera.zoom.toFixed(2)),
      scrollX: Math.round(this.camera.scrollX),
      scrollY: Math.round(this.camera.scrollY),
    });
  }

  /**
   * Updates camera position during viewport resize.
   */
  public handleResize(newOriginX: number, newOriginY: number): void {
    this.defaultScrollX = newOriginX;
    this.defaultScrollY = newOriginY;
  }

  /**
   * Cleans up all listeners when scene is destroyed or unmounted.
   */
  public destroy(): void {
    if (this.resetKey) {
      this.resetKey.removeAllListeners();
    }
    if (this.escapeKey) {
      this.escapeKey.removeAllListeners();
    }
    if (this.unsubscribeBus) {
      this.unsubscribeBus();
      this.unsubscribeBus = undefined;
    }
    this.scene.input.removeAllListeners();
  }
}
