import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEventBus } from '../../src/game/events/GameEventBus';

describe('GameEventBus', () => {
  let bus: GameEventBus;

  beforeEach(() => {
    GameEventBus.resetInstance();
    bus = GameEventBus.getInstance();
  });

  it('subscribes to and receives typed events', () => {
    const callback = vi.fn();
    bus.on('MAP_INITIALIZED', callback);

    bus.emit('MAP_INITIALIZED', {
      mapWidth: 20,
      mapHeight: 20,
      totalTiles: 400,
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({
      mapWidth: 20,
      mapHeight: 20,
      totalTiles: 400,
    });
  });

  it('unsubscribes using the returned cleanup function', () => {
    const callback = vi.fn();
    const unsubscribe = bus.on('TILE_CLICKED', callback);

    bus.emit('TILE_CLICKED', { gx: 5, gy: 7 });
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();

    bus.emit('TILE_CLICKED', { gx: 10, gy: 12 });
    expect(callback).toHaveBeenCalledTimes(1); // not called again
  });

  it('unsubscribes using off()', () => {
    const callback = vi.fn();
    bus.on('CAMERA_CHANGED', callback);

    bus.emit('CAMERA_CHANGED', { zoom: 1.5, scrollX: 100, scrollY: 200 });
    expect(callback).toHaveBeenCalledTimes(1);

    bus.off('CAMERA_CHANGED', callback);
    bus.emit('CAMERA_CHANGED', { zoom: 2.0, scrollX: 150, scrollY: 250 });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('handles multiple listeners independently', () => {
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    bus.on('ENGINE_BOOTED', listenerA);
    const unsubB = bus.on('ENGINE_BOOTED', listenerB);

    bus.emit('ENGINE_BOOTED', { timestamp: 12345 });
    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);

    unsubB();
    bus.emit('ENGINE_BOOTED', { timestamp: 67890 });
    expect(listenerA).toHaveBeenCalledTimes(2);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it('clears specific and all listeners cleanly', () => {
    bus.on('TILE_HOVERED', vi.fn());
    bus.on('ENGINE_BOOTED', vi.fn());

    expect(bus.listenerCount('TILE_HOVERED')).toBe(1);
    expect(bus.listenerCount('ENGINE_BOOTED')).toBe(1);

    bus.clear('TILE_HOVERED');
    expect(bus.listenerCount('TILE_HOVERED')).toBe(0);
    expect(bus.listenerCount('ENGINE_BOOTED')).toBe(1);

    bus.clear();
    expect(bus.listenerCount('ENGINE_BOOTED')).toBe(0);
  });

  it('isolates listener errors without breaking other listeners', () => {
    const throwingListener = vi.fn(() => {
      throw new Error('Listener error');
    });
    const normalListener = vi.fn();

    bus.on('TILE_CLICKED', throwingListener);
    bus.on('TILE_CLICKED', normalListener);

    expect(() => {
      bus.emit('TILE_CLICKED', { gx: 1, gy: 1 });
    }).not.toThrow();

    expect(normalListener).toHaveBeenCalledWith({ gx: 1, gy: 1 });
  });
});
