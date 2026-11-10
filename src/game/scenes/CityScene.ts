import Phaser from 'phaser';
import { WORLD_CONSTANTS } from '../world/constants';
import { gridToScreen, screenToGrid, isWithinBounds, gridToIndex } from '../world/isometric';
import { RENDER_LAYERS, getTileDepth } from '../rendering/depth';
import { TEXTURE_KEYS } from '../graphics/grassTileGenerator';
import {
  TERRAIN_TEXTURE_KEYS,
  type TerrainTextureKey,
} from '../graphics/generators/terrainTextureGenerator';
import { OVERLAY_TEXTURE_KEYS } from '../graphics/generators/overlayTextureGenerator';
import {
  STRUCTURE_TEXTURE_KEYS,
  STRUCTURE_DIMENSIONS,
} from '../graphics/generators/structureTextureGenerator';
import { CameraController } from '../camera/cameraController';
import { eventBus } from '../events/GameEventBus';
import { GridCoord, TileData } from '../../types/world';

const { MAP_WIDTH, MAP_HEIGHT, TOTAL_TILES, HALF_TILE_WIDTH, HALF_TILE_HEIGHT } = WORLD_CONSTANTS;

export class CityScene extends Phaser.Scene {
  private cameraController!: CameraController;
  private originX: number = 0;
  private originY: number = 0;

  // Interaction visual sprites
  private hoverSprite!: Phaser.GameObjects.Sprite;
  private selectedSprite!: Phaser.GameObjects.Sprite;
  private borderGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private prototypeBuildingSprite: Phaser.GameObjects.Sprite | null = null;
  private readonly PROTOTYPE_BUILDING_COORD: GridCoord = { gx: 10, gy: 10 };

  // State
  private currentHoveredCoord: GridCoord | null = null;
  private currentSelectedCoord: GridCoord | null = null;
  private isGridVisible: boolean = false;

  private tileSprites: Phaser.GameObjects.Sprite[] = [];
  private unsubscribeBusListeners: Array<() => void> = [];

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

    // 4. Create toggleable isometric grid lines overlay
    this.createGridOverlay();

    // 5. Create tile hover indicator & persistent selection indicator
    this.createInteractionIndicators();

    // 5b. Create foundational structure prototype for visual verification
    this.createPrototypeBuilding();

    // 6. Initialize camera controller centered over the map
    this.cameraController = new CameraController(this);
    const mapCenterX = this.originX;
    const mapCenterY = this.originY + (MAP_WIDTH * HALF_TILE_HEIGHT);
    this.cameraController.initialize(mapCenterX, mapCenterY);

    // 7. Setup pointer interactions for hover and click-selection
    this.setupPointerInteractions();

    // 8. Setup keyboard shortcuts for grid toggle
    if (this.input.keyboard) {
      const gKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
      gKey.on('down', () => {
        this.setGridVisible(!this.isGridVisible);
      });
    }

    // 9. Setup EventBus listeners for UI-triggered actions
    this.setupEventBusListeners();

    // 9. Setup viewport resize handling and scene shutdown cleanup
    this.scale.on('resize', this.handleResize, this);
    this.events.on('shutdown', this.handleShutdown, this);
    this.events.on('destroy', this.handleShutdown, this);

    // 10. Notify listeners that the scene and map are initialized
    eventBus.emit('SCENE_READY', { sceneKey: 'CityScene' });
    eventBus.emit('MAP_INITIALIZED', {
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      totalTiles: TOTAL_TILES,
    });
  }

  private updateOrigin(): void {
    this.originX = this.scale.width / 2;
    this.originY = 120; // Margin from top HUD
  }

  /**
   * Generates 20x20 (400) isometric grass tiles rendered in back-to-front depth order.
   * Utilizes procedural grass variants (v0..v3) with fallback to legacy grass base.
   */
  private createIsometricMap(): void {
    this.tileSprites = [];

    const grassVariants: TerrainTextureKey[] = [
      TERRAIN_TEXTURE_KEYS.GRASS_V0,
      TERRAIN_TEXTURE_KEYS.GRASS_V1,
      TERRAIN_TEXTURE_KEYS.GRASS_V2,
      TERRAIN_TEXTURE_KEYS.GRASS_V3,
    ];

    for (let gy = 0; gy < MAP_HEIGHT; gy++) {
      for (let gx = 0; gx < MAP_WIDTH; gx++) {
        const { sx, sy } = gridToScreen(gx, gy, this.originX, this.originY);

        // Distribute procedural grass variants across the grid using a deterministic spatial hash
        const variantIndex = (gx * 3 + gy * 7) % grassVariants.length;
        const proceduralKey = grassVariants[variantIndex];
        const textureKey = this.textures.exists(proceduralKey)
          ? proceduralKey
          : TEXTURE_KEYS.GRASS_BASE;

        const tile = this.add.sprite(sx, sy, textureKey);
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
    const top = gridToScreen(0, 0, this.originX, this.originY);
    const right = gridToScreen(MAP_WIDTH - 1, 0, this.originX, this.originY);
    const bottom = gridToScreen(MAP_WIDTH - 1, MAP_HEIGHT - 1, this.originX, this.originY);
    const left = gridToScreen(0, MAP_HEIGHT - 1, this.originX, this.originY);

    this.borderGraphics.lineStyle(2, WORLD_CONSTANTS.PALETTE.GRASS_BORDER, 0.85);
    this.borderGraphics.strokePoints([
      { x: top.sx, y: top.sy - HALF_TILE_HEIGHT },
      { x: right.sx + HALF_TILE_WIDTH, y: right.sy },
      { x: bottom.sx, y: bottom.sy + HALF_TILE_HEIGHT },
      { x: left.sx - HALF_TILE_WIDTH, y: left.sy },
      { x: top.sx, y: top.sy - HALF_TILE_HEIGHT },
    ]);
  }

  /**
   * Renders the toggleable isometric grid overlay across all tile edges.
   */
  private createGridOverlay(): void {
    if (this.gridGraphics) {
      this.gridGraphics.destroy();
    }

    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(RENDER_LAYERS.GRID_LINES);
    this.gridGraphics.setVisible(this.isGridVisible);

    this.gridGraphics.lineStyle(1, WORLD_CONSTANTS.PALETTE.GRID_LINE, 0.35);

    // Draw lines along constant gx (running from top-left to bottom-right facets)
    for (let gx = 0; gx <= MAP_WIDTH; gx++) {
      const startX = this.originX + (gx - 0) * HALF_TILE_WIDTH;
      const startY = this.originY + (gx + 0) * HALF_TILE_HEIGHT - HALF_TILE_HEIGHT;
      const endX = this.originX + (gx - MAP_HEIGHT) * HALF_TILE_WIDTH;
      const endY = this.originY + (gx + MAP_HEIGHT) * HALF_TILE_HEIGHT - HALF_TILE_HEIGHT;
      this.gridGraphics.lineBetween(startX, startY, endX, endY);
    }

    // Draw lines along constant gy (running from top-right to bottom-left facets)
    for (let gy = 0; gy <= MAP_HEIGHT; gy++) {
      const startX = this.originX + (0 - gy) * HALF_TILE_WIDTH;
      const startY = this.originY + (0 + gy) * HALF_TILE_HEIGHT - HALF_TILE_HEIGHT;
      const endX = this.originX + (MAP_WIDTH - gy) * HALF_TILE_WIDTH;
      const endY = this.originY + (MAP_WIDTH + gy) * HALF_TILE_HEIGHT - HALF_TILE_HEIGHT;
      this.gridGraphics.lineBetween(startX, startY, endX, endY);
    }
  }

  /**
   * Creates the visual hover highlight indicator and persistent selection reticle.
   * Uses procedural overlay textures (HOVER_OUTLINE & SELECTED_RETICLE) with legacy fallback.
   */
  private createInteractionIndicators(): void {
    // Selection sprite (Cyan)
    const selKey = this.textures.exists(OVERLAY_TEXTURE_KEYS.SELECTED_RETICLE)
      ? OVERLAY_TEXTURE_KEYS.SELECTED_RETICLE
      : TEXTURE_KEYS.TILE_SELECTED;
    this.selectedSprite = this.add.sprite(0, 0, selKey);
    this.selectedSprite.setOrigin(0.5, 0.5);
    this.selectedSprite.setVisible(false);
    this.selectedSprite.setDepth(RENDER_LAYERS.SELECTION_OVERLAY);

    // Hover sprite (Green)
    const hoverKey = this.textures.exists(OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE)
      ? OVERLAY_TEXTURE_KEYS.HOVER_OUTLINE
      : TEXTURE_KEYS.TILE_HOVER;
    this.hoverSprite = this.add.sprite(0, 0, hoverKey);
    this.hoverSprite.setOrigin(0.5, 0.5);
    this.hoverSprite.setVisible(false);
    this.hoverSprite.setDepth(RENDER_LAYERS.HOVER_OVERLAY);
  }

  /**
   * Renders the Phase 3 foundational 1x1 residential cottage prototype.
   * Placed on test tile (10, 10) with exact (0.5, 0.75) anchor origin
   * and isometric depth sorting (RENDER_LAYERS.BUILDINGS).
   */
  private createPrototypeBuilding(): void {
    if (this.prototypeBuildingSprite) {
      this.prototypeBuildingSprite.destroy();
      this.prototypeBuildingSprite = null;
    }

    if (this.textures.exists(STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1)) {
      const { gx, gy } = this.PROTOTYPE_BUILDING_COORD;
      const { sx, sy } = gridToScreen(gx, gy, this.originX, this.originY);

      this.prototypeBuildingSprite = this.add.sprite(
        sx,
        sy,
        STRUCTURE_TEXTURE_KEYS.RESIDENTIAL_LVL1
      );
      this.prototypeBuildingSprite.setOrigin(
        STRUCTURE_DIMENSIONS.ORIGIN_X,
        STRUCTURE_DIMENSIONS.ORIGIN_Y
      );
      this.prototypeBuildingSprite.setDepth(
        getTileDepth(gx, gy, RENDER_LAYERS.BUILDINGS)
      );
    }
  }

  /**
   * Sets up pointer move (hover raycast) and pointer up (click selection).
   */
  private setupPointerInteractions(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const coord = screenToGrid(worldPoint.x, worldPoint.y, this.originX, this.originY);

      if (isWithinBounds(coord.gx, coord.gy)) {
        if (!this.currentHoveredCoord || 
            this.currentHoveredCoord.gx !== coord.gx || 
            this.currentHoveredCoord.gy !== coord.gy) {
          this.currentHoveredCoord = coord;

          const screenPos = gridToScreen(coord.gx, coord.gy, this.originX, this.originY);
          this.hoverSprite.setPosition(screenPos.sx, screenPos.sy);
          this.hoverSprite.setDepth(getTileDepth(coord.gx, coord.gy, RENDER_LAYERS.HOVER_OVERLAY));
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

    // Clear hover indicator if pointer leaves canvas
    this.input.on('gameout', () => {
      if (this.currentHoveredCoord !== null) {
        this.currentHoveredCoord = null;
        this.hoverSprite.setVisible(false);
        eventBus.emit('TILE_HOVERED', null);
      }
    });

    // Select tile on pointerup if it was a discrete click (not a camera drag)
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0 && !this.cameraController.wasDrag()) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const coord = screenToGrid(worldPoint.x, worldPoint.y, this.originX, this.originY);

        if (isWithinBounds(coord.gx, coord.gy)) {
          this.selectTile(coord);
          eventBus.emit('TILE_CLICKED', coord);
        } else {
          // Clicking outside map clears selection
          this.selectTile(null);
        }
      }
    });
  }

  /**
   * Selects or clears the active tile and emits the payload.
   */
  public selectTile(coord: GridCoord | null): void {
    if (coord && isWithinBounds(coord.gx, coord.gy)) {
      this.currentSelectedCoord = coord;
      const screenPos = gridToScreen(coord.gx, coord.gy, this.originX, this.originY);
      this.selectedSprite.setPosition(screenPos.sx, screenPos.sy);
      this.selectedSprite.setDepth(getTileDepth(coord.gx, coord.gy, RENDER_LAYERS.SELECTION_OVERLAY));
      this.selectedSprite.setVisible(true);

      const tileData: TileData = {
        id: `tile_${coord.gx}_${coord.gy}`,
        index: gridToIndex(coord.gx, coord.gy),
        gx: coord.gx,
        gy: coord.gy,
        terrain: 'grass',
        elevation: 0,
        isBuildable: true,
        status: 'Buildable • Virgin Soil',
      };

      eventBus.emit('TILE_SELECTED', {
        gx: coord.gx,
        gy: coord.gy,
        tileData,
      });
    } else {
      this.currentSelectedCoord = null;
      this.selectedSprite.setVisible(false);
      eventBus.emit('TILE_SELECTED', null);
    }
  }

  /**
   * Toggles the grid overlay visibility.
   */
  public setGridVisible(visible: boolean): void {
    this.isGridVisible = visible;
    if (this.gridGraphics) {
      this.gridGraphics.setVisible(visible);
    }
    eventBus.emit('GRID_OVERLAY_TOGGLED', { visible });
  }

  /**
   * Subscribes to GameEventBus requests from React UI.
   */
  private setupEventBusListeners(): void {
    const unsubDeselect = eventBus.on('TILE_DESELECT_REQUESTED', () => {
      this.selectTile(null);
    });

    const unsubHover = eventBus.on('TILE_HOVERED', (coord) => {
      if (coord === null && this.currentHoveredCoord !== null) {
        this.currentHoveredCoord = null;
        this.hoverSprite.setVisible(false);
      }
    });

    const unsubGrid = eventBus.on('SET_GRID_OVERLAY_REQUESTED', ({ visible }) => {
      this.setGridVisible(visible);
    });

    this.unsubscribeBusListeners.push(unsubDeselect, unsubHover, unsubGrid);
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

    // Redraw map border & grid overlay
    this.createMapBorder();
    this.createGridOverlay();

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

    // Reposition selected sprite if active
    if (this.currentSelectedCoord) {
      const screenPos = gridToScreen(
        this.currentSelectedCoord.gx,
        this.currentSelectedCoord.gy,
        this.originX,
        this.originY
      );
      this.selectedSprite.setPosition(screenPos.sx, screenPos.sy);
    }

    // Reposition prototype building sprite if active
    if (this.prototypeBuildingSprite) {
      const { gx, gy } = this.PROTOTYPE_BUILDING_COORD;
      const { sx, sy } = gridToScreen(gx, gy, this.originX, this.originY);
      this.prototypeBuildingSprite.setPosition(sx, sy);
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
    if (this.prototypeBuildingSprite) {
      this.prototypeBuildingSprite.destroy();
      this.prototypeBuildingSprite = null;
    }
    for (const unsub of this.unsubscribeBusListeners) {
      unsub();
    }
    this.unsubscribeBusListeners = [];
  }
}
