import React from 'react';
import { useGameStore } from '../store/gameStore';

export const Header: React.FC = () => {
  const isEngineReady = useGameStore((state) => state.isEngineReady);
  const activeScene = useGameStore((state) => state.activeScene);
  const isGridVisible = useGameStore((state) => state.isGridVisible);
  const toggleGrid = useGameStore((state) => state.toggleGrid);

  return (
    <header
      style={{
        position: 'absolute',
        top: 12,
        left: 16,
        right: 16,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 18px',
        zIndex: 50,
        pointerEvents: 'none',
      }}
      className="pixel-panel"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'auto' }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #4d8c3f 0%, #2e5425 100%)',
            border: '2px solid #5fa84e',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>🏙️</span>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 1.2,
                color: '#ffffff',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Pixelopolis
            </h1>
            <span className="pixel-badge">Phase 2 Interactive Grid</span>
          </div>
          <p
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              margin: '2px 0 0 0',
            }}
          >
            Browser-based Isometric City Simulation
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'auto' }}>
        {/* Grid Overlay Toggle Button (Task 2.5) */}
        <button
          onClick={toggleGrid}
          className="btn-pixel"
          data-testid="btn-toggle-grid"
          style={{
            borderColor: isGridVisible ? 'var(--accent-cyan)' : 'var(--border-color)',
            background: isGridVisible ? 'rgba(56, 189, 248, 0.2)' : 'rgba(35, 42, 60, 0.9)',
          }}
          title="Toggle Isometric Grid Overlay (or press G)"
        >
          <span>▦ Grid: {isGridVisible ? 'ON' : 'OFF'}</span>
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--text-muted)',
          }}
        >
          <div className="pulse-dot" style={{ backgroundColor: isEngineReady ? '#4ade80' : '#f59e0b' }} />
          <span>{isEngineReady ? `Scene: ${activeScene}` : 'Initializing Phaser...'}</span>
        </div>
      </div>
    </header>
  );
};
