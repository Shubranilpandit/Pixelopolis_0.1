import React from 'react';
import { useGameStore } from '../store/gameStore';

export const InfoPanel: React.FC = () => {
  const mapDimensions = useGameStore((state) => state.mapDimensions);
  const hoveredTile = useGameStore((state) => state.hoveredTile);
  const selectedTile = useGameStore((state) => state.selectedTile);
  const camera = useGameStore((state) => state.camera);

  return (
    <aside
      style={{
        position: 'absolute',
        top: 76,
        left: 16,
        width: 220,
        padding: '12px 14px',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      className="pixel-panel"
      data-testid="info-panel"
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--accent-green)',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 8,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 4,
        }}
      >
        World Metrics
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Map Grid:</span>
          <span style={{ fontWeight: 600 }}>{mapDimensions.width} × {mapDimensions.height}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Tile Size:</span>
          <span>64 × 32 px (2:1)</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)' }}>Total Tiles:</span>
          <span style={{ fontWeight: 600 }}>{mapDimensions.totalTiles}</span>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Hover Tile:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: hoveredTile ? '#4ade80' : 'var(--text-muted)' }}>
              {hoveredTile ? `(${hoveredTile.gx}, ${hoveredTile.gy})` : '—'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: 'var(--text-muted)' }}>Selected:</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: selectedTile ? '#38bdf8' : 'var(--text-muted)' }}>
              {selectedTile ? `(${selectedTile.gx}, ${selectedTile.gy})` : '—'}
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>Zoom:</span>
            <span style={{ fontWeight: 600 }}>{(camera.zoom * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
