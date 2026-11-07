import Phaser from 'phaser';
import { WORLD_CONSTANTS } from '../world/constants';
import { gridToScreen, screenToGrid, isWithinBounds } from '../world/isometric';
import { RENDER_LAYERS, getTileDepth } from '../rendering/depth';
import { TEXTURE_KEYS } from '../graphics/grassTileGenerator';
import { CameraController } from '../camera/cameraController';
import { eventBus } from '../events/GameEventBus';
import { GridCoord } from '../../types/world';

const { MAP_WIDTH, MAP_HEIGHT, TOTAL_TILES, HALF_TILE_WIDTH, HALF_TILE_HEIGHT } = WORLD_CONSTANTS;

export class CityScene extends Phaser.Scene {
  private cameraController!: CameraController;
  private originX: number = 0;
  private originY: number = 0;

  private hoverSprite!: Phaser.GameObjects.Sprite;
  private currentHoveredCoord: GridCoord | null = null;
  private borderGraphics!: Phaser.GameObjects.Graphics;

  private tileSprites: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: 'CityScene' });
  }

  public create(): void {
    // 1. Calculate map center based on initial canvas dimensions
    this.updateOrigin();

    // 2. Build the 20x20 isometric grass tilemap
    this.createIsometricMap();

    // 3. Draw subtle border around buildable 20x20 perimeter
    this.createMapBorder();

    // 4. Create tile hover indicator
    this.createHoverIndicator();

    // 5. Initialize camera controller centered over the map
    this.cameraController = new CameraController(this);
    const mapCenterX = this.originX;
    const mapCenterY = this.originY + (MAP_WIDTH * HALF_TILE_HEIGHT);
    this.cameraController.initialize(mapCenterX, mapCenterY);

    // 6. Setup pointer interactions for tile picking
    this.setupPointerInteractions();

    // 7. Setup viewport resize handling and scene shutdown cleanup
    this.scale.on('resize', this.handleResize, this);
    this.events.on('shutdown', this.handleShutdown, this);
    this.events.on('destroy', this.handleShutdown, this);

    // 8. Notify listeners that the scene and map are initialized
    eventBus.emit('SCENE_READY', { sceneKey: 'CityScene' });
    eventBus.emit('MAP_INITIALIZED', {
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      totalTiles: TOTAL_TILES,
    });
  }

  private updateOrigin(): void {
    // Center the top vertex of the diamond horizontally in the viewport
    this.originX = this.scale.width / 2;
    this.originY = 120; // Margin from top HUD
  }

  /**
   * Generates 20x20 (400) isometric grass tiles rendered in back-to-front depth order.
   */
  private createIsometricMap(): void {
    this.tileSprites = [];

    for (let gy = 0; gy < MAP_HEIGHT; gy++) {
      for (let gx = 0; gx < MAP_WIDTH; gx++) {
        const { sx, sy } = gridToScreen(gx, gy, this.originX, this.originY);

        const tile = this.add.sprite(sx, sy, TEXTURE_KEYS.GRASS_BASE);
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(getTileDepth(gx, gy, RENDER_LAYERS.TERRAIN_BASE));

        this.tileSprites.push(tile);
      }
    }
  }

  /**
   * Renders a crisp boundary line around the 20x20 playable island.
   */
  private createMapBorder(): void {
    if (this.borderGraphics) {
      this.borderGraphics.destroy();
    }

    this.borderGraphics = this.add.graphics();
    this.borderGraphics.setDepth(RENDER_LAYERS.TERRAIN_BORDER);

    // Four diamond boundary corners:
    // Top: (0, 0)
    const top = gridToScreen(0, 0, this.originX, this.originY);
    // Right: (MAP_WIDTH - 1, 0)
    const right = gridToScreen(MAP_WIDTH - 1, 0, this.originX, this.originY);
    // Bottom: (MAP_WIDTH - 1, MAP_HEIGHT - 1)
    const bottom = gridToScreen(MAP_WIDTH - 1, MAP_HEIGHT - 1, this.originX, this.originY);
    // Left: (0, MAP_HEIGHT - 1)
    const left = gridToScreen(0, MAP_HEIGHT - 1, this.originX, this.originY);

    this.borderGraphics.lineStyle(2, WORLD_CONSTANTS.PALETTE.GRASS_BORDER, 0.8);
    this.borderGraphics.strokePoints([
      { x: top.sx, y: top.sy - HALF_TILE_HEIGHT },
      { x: right.sx + HALF_TILE_WIDTH, y: right.sy },
      { x: bottom.sx, y: bottom.sy + HALF_TILE_HEIGHT },
      { x: left.sx - HALF_TILE_WIDTH, y: left.sy },
      { x: top.sx, y: top.sy - HALF_TILE_HEIGHT },
    ]);
  }

  /**
   * Creates the visual hover highlight indicator.
   */
  private createHoverIndicator(): void {
    this.hoverSprite = this.add.sprite(0, 0, TEXTURE_KEYS.TILE_HOVER);
    this.hoverSprite.setOrigin(0.5, 0.5);
    this.hoverSprite.setVisible(false);
    this.hoverSprite.setDepth(RENDER_LAYERS.SELECTION_OVERLAY);
  }

  /**
   * Sets up pointer move/click raycasting into isometric grid coordinates.
   */
  private setupPointerInteractions(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Raycast pointer coordinates into camera world space
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const coord = screenToGrid(worldPoint.x, worldPoint.y, this.originX, this.originY);

      if (isWithinBounds(coord.gx, coord.gy)) {
        if (!this.currentHoveredCoord || 
            this.currentHoveredCoord.gx !== coord.gx || 
            this.currentHoveredCoord.gy !== coord.gy) {
          this.currentHoveredCoord = coord;

          const screenPos = gridToScreen(coord.gx, coord.gy, this.originX, this.originY);
          this.hoverSprite.setPosition(screenPos.sx, screenPos.sy);
          this.hoverSprite.setDepth(getTileDepth(coord.gx, coord.gy, RENDER_LAYERS.SELECTION_OVERLAY));
          this.hoverSprite.setVisible(true);

          eventBus.emit('TILE_HOVERED', coord);
        }
      } else {
        if (this.currentHoveredCoord !== null) {
          this.currentHoveredCoord = null;
          this.hoverSprite.setVisible(false);
          eventBus.emit('TILE_HOVERED', null);
        }
      }
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && this.currentHoveredCoord) {
        eventBus.emit('TILE_CLICKED', this.currentHoveredCoord);
      }
    });
  }

  /**
   * Responds to browser viewport resize events.
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.originX = gameSize.width / 2;
    this.originY = 120;

    // Shift all tile sprites to new origin
    let index = 0;
    for (let gy = 0; gy < MAP_HEIGHT; gy++) {
      for (let gx = 0; gx < MAP_WIDTH; gx++) {
        const tile = this.tileSprites[index++];
        if (tile) {
          const { sx, sy } = gridToScreen(gx, gy, this.originX, this.originY);
          tile.setPosition(sx, sy);
        }
      }
    }

    // Redraw map border
    this.createMapBorder();

    // Reposition hover sprite if active
    if (this.currentHoveredCoord) {
      const screenPos = gridToScreen(
        this.currentHoveredCoord.gx,
        this.currentHoveredCoord.gy,
        this.originX,
        this.originY
      );
      this.hoverSprite.setPosition(screenPos.sx, screenPos.sy);
    }

    // Update camera center reference
    const mapCenterX = this.originX;
    const mapCenterY = this.originY + (MAP_WIDTH * HALF_TILE_HEIGHT);
    this.cameraController.handleResize(mapCenterX, mapCenterY);
  }

  /**
   * Scene cleanup when shutdown or destroyed.
   */
  private handleShutdown(): void {
    this.scale.off('resize', this.handleResize, this);
    if (this.cameraController) {
      this.cameraController.destroy();
    }
  }
}
