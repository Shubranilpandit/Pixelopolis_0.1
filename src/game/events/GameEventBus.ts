import { GameEventKey, GameEventListener, GameEventMap } from '../../types/events';

/**
 * Lightweight, zero-dependency, strongly-typed event bus.
 * Bridges communication across React UI, Phaser Scenes, and Domain Logic.
 */
export class GameEventBus {
  private static instance: GameEventBus | null = null;
  private listeners: Map<GameEventKey, Set<GameEventListener<any>>> = new Map();

  /**
   * Returns the shared singleton instance of the event bus.
   */
  public static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  /**
   * Resets the singleton instance (primarily for isolated unit tests).
   */
  public static resetInstance(): void {
    if (GameEventBus.instance) {
      GameEventBus.instance.clear();
      GameEventBus.instance = null;
    }
  }

  /**
   * Subscribes a typed listener to an event.
   * Returns an unsubscribe function for convenient React effect cleanups.
   */
  public on<K extends GameEventKey>(event: K, listener: GameEventListener<K>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const eventListeners = this.listeners.get(event)!;
    eventListeners.add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Removes a specific listener from an event.
   */
  public off<K extends GameEventKey>(event: K, listener: GameEventListener<K>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emits a typed event to all registered listeners.
   */
  public emit<K extends GameEventKey>(
    event: K,
    ...args: GameEventMap[K] extends void ? [] : [GameEventMap[K]]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners && eventListeners.size > 0) {
      const payload = args[0] as GameEventMap[K];
      // Clone set to prevent issues if a listener unsubscribes during emit
      const snapshot = Array.from(eventListeners);
      for (const listener of snapshot) {
        try {
          listener(payload);
        } catch (error) {
          console.error(`[GameEventBus] Error in listener for event "${String(event)}":`, error);
        }
      }
    }
  }

  /**
   * Clears listeners for a given event, or all listeners if no event is specified.
   */
  public clear(event?: GameEventKey): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Returns the count of listeners registered for a given event.
   */
  public listenerCount(event: GameEventKey): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

export const eventBus = GameEventBus.getInstance();
