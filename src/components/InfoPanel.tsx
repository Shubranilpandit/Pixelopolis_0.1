import React from 'react';
import { useGameStore } from '../store/gameStore';

export const InfoPanel: React.FC = () => {
  const mapDimensions = useGameStore((state) => state.mapDimensions);
  const hoveredTile = useGameStore((state) => state.hoveredTile);
  const selectedTileData = useGameStore((state) => state.selectedTileData);
  const isGridVisible = useGameStore((state) => state.isGridVisible);
  const camera = useGameStore((state) => state.camera);
  const requestTileDeselect = useGameStore((state) => state.requestTileDeselect);

  return (
    <aside
      style={{
        position: 'absolute',
        top: 76,
        left: 16,
        width: 250,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      data-testid="info-panel"
    >
      {/* 1. World Metrics Card */}
      <div className="pixel-panel" style={{ padding: '12px 14px' }}>
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
              <span
                data-testid="hover-tile-display"
                style={{ fontFamily: 'var(--font-mono)', color: hoveredTile ? '#4ade80' : 'var(--text-muted)' }}
              >
                {hoveredTile ? `(${hoveredTile.gx}, ${hoveredTile.gy})` : '—'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Grid Overlay:</span>
              <span
                data-testid="grid-overlay-status"
                style={{ fontWeight: 600, color: isGridVisible ? '#38bdf8' : 'var(--text-muted)' }}
              >
                {isGridVisible ? 'Visible' : 'Hidden'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Zoom:</span>
              <span data-testid="zoom-display" style={{ fontWeight: 600 }}>{(camera.zoom * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tile Inspection Panel (Task 2.4) */}
      <div className="pixel-panel" style={{ padding: '12px 14px' }} data-testid="tile-inspection-panel">
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent-cyan)',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            paddingBottom: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Tile Inspector</span>
          {selectedTileData && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              #{selectedTileData.index}
            </span>
          )}
        </div>

        {selectedTileData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Coordinates:</span>
              <span data-testid="selected-coords" style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 600 }}>
                ({selectedTileData.gx}, {selectedTileData.gy})
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tile ID:</span>
              <span data-testid="selected-tile-id" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {selectedTileData.id}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Terrain:</span>
              <span data-testid="selected-terrain" style={{ color: '#4ade80', fontWeight: 600 }}>
                Grassland
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Elevation:</span>
              <span>Level {selectedTileData.elevation}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span data-testid="selected-status" style={{ fontSize: 11, color: '#f0f4f8' }}>
                {selectedTileData.status}
              </span>
            </div>

            <button
              onClick={requestTileDeselect}
              className="btn-pixel"
              style={{
                marginTop: 8,
                width: '100%',
                justifyContent: 'center',
                padding: '5px 10px',
                fontSize: 11,
              }}
              data-testid="btn-deselect-tile"
              title="Deselect active tile (or press Escape)"
            >
              <span>Deselect Tile (Esc)</span>
            </button>
          </div>
        ) : (
          <div
            data-testid="no-tile-selected-msg"
            style={{
              padding: '12px 8px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>No tile selected</p>
            <p style={{ margin: '4px 0 0 0' }}>Click any tile on the map to inspect terrain details.</p>
          </div>
        )}
      </div>
    </aside>
  );
};
