import React from 'react';
import { useGameStore } from '../store/gameStore';

export const ControlsOverlay: React.FC = () => {
  const requestCameraReset = useGameStore((state) => state.requestCameraReset);
  const toggleGrid = useGameStore((state) => state.toggleGrid);
  const isGridVisible = useGameStore((state) => state.isGridVisible);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '8px 16px',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      className="pixel-panel"
      data-testid="controls-overlay"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>🖱️</span>
          <span><strong>Click:</strong> Select Tile</span>
        </div>

        <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>🖐️</span>
          <span><strong>Drag:</strong> Pan</span>
        </div>

        <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>🔄</span>
          <span><strong>Wheel:</strong> Zoom</span>
        </div>

        <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13 }}>⌨️</span>
          <span><strong>R:</strong> Reset</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleGrid}
          className="btn-pixel"
          title="Toggle grid lines (G)"
          style={{
            borderColor: isGridVisible ? 'var(--accent-cyan)' : 'var(--border-color)',
            background: isGridVisible ? 'rgba(56, 189, 248, 0.2)' : 'rgba(35, 42, 60, 0.9)',
          }}
        >
          <span>▦ Grid</span>
        </button>

        <button
          onClick={requestCameraReset}
          className="btn-pixel"
          title="Reset camera zoom and center on map (R)"
        >
          <span>Reset View</span>
        </button>
      </div>
    </div>
  );
};
