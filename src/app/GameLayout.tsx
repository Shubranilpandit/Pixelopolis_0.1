import React, { useEffect, useRef } from 'react';
import { launchGame, destroyGame } from '../game/engine/lifecycle';
import { eventBus } from '../game/events/GameEventBus';
import { useGameStore } from '../store/gameStore';
import { Header } from '../components/Header';
import { InfoPanel } from '../components/InfoPanel';
import { ControlsOverlay } from '../components/ControlsOverlay';

export const GameLayout: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const setEngineReady = useGameStore((state) => state.setEngineReady);
  const setActiveScene = useGameStore((state) => state.setActiveScene);
  const setMapDimensions = useGameStore((state) => state.setMapDimensions);
  const setHoveredTile = useGameStore((state) => state.setHoveredTile);
  const setSelectedTile = useGameStore((state) => state.setSelectedTile);
  const setGridVisible = useGameStore((state) => state.setGridVisible);
  const setCamera = useGameStore((state) => state.setCamera);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Phaser game instance
    const game = launchGame(containerRef.current);
    gameRef.current = game;

    // 2. Subscribe to decoupled event bus
    const unsubs = [
      eventBus.on('ENGINE_BOOTED', () => {
        setEngineReady(true);
      }),

      eventBus.on('SCENE_READY', (payload) => {
        setActiveScene(payload.sceneKey);
      }),

      eventBus.on('MAP_INITIALIZED', (payload) => {
        setMapDimensions({
          width: payload.mapWidth,
          height: payload.mapHeight,
          totalTiles: payload.totalTiles,
        });
      }),

      eventBus.on('TILE_HOVERED', (coord) => {
        setHoveredTile(coord);
      }),

      eventBus.on('TILE_SELECTED', (payload) => {
        setSelectedTile(payload);
      }),

      eventBus.on('GRID_OVERLAY_TOGGLED', ({ visible }) => {
        setGridVisible(visible);
      }),

      eventBus.on('CAMERA_CHANGED', (cam) => {
        setCamera(cam);
      }),
    ];

    // 3. Clean up when unmounting (destroys canvas and unsubscribes listeners)
    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
      if (gameRef.current) {
        destroyGame(gameRef.current);
        gameRef.current = null;
      }
      setEngineReady(false);
    };
  }, [setEngineReady, setActiveScene, setMapDimensions, setHoveredTile, setSelectedTile, setGridVisible, setCamera]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: '#141721',
      }}
    >
      {/* React UI Overlays */}
      <Header />
      <InfoPanel />
      <ControlsOverlay />

      {/* Phaser Canvas Container */}
      <div
        id="phaser-container"
        ref={containerRef}
        data-testid="phaser-container"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
};
