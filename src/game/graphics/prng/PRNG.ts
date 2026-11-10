/**
 * Pixelopolis — Deterministic Pseudo-Random Number Generator (PRNG)
 * 
 * Implements a 32-bit Mulberry32 algorithm providing fast, high-quality,
 * and deterministic pseudo-random sequences for procedural asset generation.
 * 
 * Key Architecture:
 * - Immutable root seed: The initial seed is never modified.
 * - Independent stream isolation: Calling `fork(streamKey)` creates an independent
 *   PRNG stream derived strictly from the immutable root seed and stream identifier.
 * - Consumption independence: Consuming numbers from one stream has zero impact on
 *   other streams derived from the same root seed.
 * - Zero external dependencies.
 * 
 * Note: Not cryptographically secure. Designed specifically for deterministic graphics
 * and game simulation generation.
 */
export class PRNG {
  /**
   * The immutable root seed used to construct this generator.
   */
  public readonly rootSeed: number;

  /**
   * Mutable 32-bit unsigned state variable.
   */
  private state: number;

  /**
   * Constructs a new deterministic PRNG.
   * 
   * Seed Normalization:
   * - Finite numbers are floored and mapped to unsigned 32-bit integers via `>>> 0`.
   * - Negative numbers map cleanly via 2's complement unsigned casting (e.g. -1 -> 4294967295).
   * - Non-finite values (NaN, Infinity, -Infinity) default deterministically to 0.
   */
  constructor(seed: number = 0) {
    this.rootSeed = PRNG.normalizeSeed(seed);
    this.state = this.rootSeed;
  }

  /**
   * Normalizes any numeric input into an unsigned 32-bit integer [0, 4294967295].
   */
  public static normalizeSeed(seed: number): number {
    if (!Number.isFinite(seed) || Number.isNaN(seed)) {
      return 0;
    }
    return Math.floor(seed) >>> 0;
  }

  /**
   * Generates a pseudo-random floating-point number in the half-open interval [0, 1).
   * Range: 0 (inclusive) to 1 (exclusive).
   */
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a pseudo-random integer in the closed interval [min, max].
   * Both min and max are inclusive.
   * 
   * Invariants:
   * - If min > max, they are automatically swapped.
   * - Non-integer inputs are floored to integers.
   * - If min === max, returns min without consuming random numbers unnecessarily.
   */
  public nextInt(min: number, max: number): number {
    let iMin = Math.floor(Number.isFinite(min) ? min : 0);
    let iMax = Math.floor(Number.isFinite(max) ? max : 0);

    if (iMin > iMax) {
      const temp = iMin;
      iMin = iMax;
      iMax = temp;
    }

    if (iMin === iMax) {
      return iMin;
    }

    const range = iMax - iMin + 1;
    return iMin + Math.floor(this.next() * range);
  }

  /**
   * Selects a random element from a non-empty array.
   * 
   * @throws RangeError if array is empty or invalid.
   */
  public nextChoice<T>(items: readonly T[]): T {
    if (!Array.isArray(items) || items.length === 0) {
      throw new RangeError('PRNG.nextChoice requires a non-empty array.');
    }
    const index = this.nextInt(0, items.length - 1);
    return items[index];
  }

  /**
   * Returns a boolean with a configurable true probability [0, 1].
   * Defaults to 0.5 (fair 50/50 coin flip).
   */
  public nextBoolean(chance: number = 0.5): boolean {
    const clampedChance = Math.max(0, Math.min(1, Number.isFinite(chance) ? chance : 0.5));
    return this.next() < clampedChance;
  }

  /**
   * Forks an independent deterministic sub-stream identified by a string key.
   * 
   * Crucial Determinism Guarantee:
   * - The child PRNG seed is derived strictly from `this.rootSeed` and `streamKey`.
   * - It is completely independent of the mutable `this.state`.
   * - Calling `fork("streamA")` will ALWAYS yield the exact same sequence regardless
   *   of how many times `next()` has been called on the parent generator or other streams.
   */
  public fork(streamKey: string): PRNG {
    const key = typeof streamKey === 'string' ? streamKey : String(streamKey ?? '');
    
    // Murmur-inspired 32-bit mixing of rootSeed + streamKey string
    let h = (this.rootSeed ^ 0x811c9dc5) >>> 0;
    for (let i = 0; i < key.length; i++) {
      h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
      h = (h ^ (h >>> 16)) >>> 0;
    }
    
    // Avalanching bit-mixer
    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    h = (h ^ (h >>> 16)) >>> 0;

    return new PRNG(h);
  }

  /**
   * Resets the generator state back to the original root seed.
   */
  public reset(): void {
    this.state = this.rootSeed;
  }

  /**
   * Returns the current internal 32-bit state for serialization.
   */
  public getState(): number {
    return this.state;
  }

  /**
   * Restores an internal state previously obtained from `getState()`.
   */
  public setState(state: number): void {
    this.state = PRNG.normalizeSeed(state);
  }
}
