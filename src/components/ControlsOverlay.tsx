import React from 'react';
import { useGameStore } from '../store/gameStore';

export const ControlsOverlay: React.FC = () => {
  const requestCameraReset = useGameStore((state) => state.requestCameraReset);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '8px 16px',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      className="pixel-panel"
      data-testid="controls-overlay"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🖱️</span>
          <span><strong>Left Drag:</strong> Pan</span>
        </div>

        <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🔄</span>
          <span><strong>Wheel:</strong> Zoom</span>
        </div>

        <div style={{ width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>⌨️</span>
          <span><strong>R:</strong> Reset View</span>
        </div>
      </div>

      <button
        onClick={requestCameraReset}
        className="btn-pixel"
        title="Reset camera zoom and center on map (or press R)"
      >
        <span>Reset View</span>
      </button>
    </div>
  );
};
