import { describe, it, expect } from 'vitest';
import { PRNG } from '../../src/game/graphics/prng/PRNG';

describe('PRNG (Task 3.1) — Deterministic Mulberry32 Generator', () => {
  it('produces identical floating-point sequences when initialized with the same seed', () => {
    const seed = 123456789;
    const prng1 = new PRNG(seed);
    const prng2 = new PRNG(seed);

    const seq1 = Array.from({ length: 50 }, () => prng1.next());
    const seq2 = Array.from({ length: 50 }, () => prng2.next());

    expect(seq1).toEqual(seq2);
    // Values must be strictly in [0, 1)
    for (const val of seq1) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces different sequences for distinct seeds', () => {
    const prngA = new PRNG(100);
    const prngB = new PRNG(200);

    const seqA = Array.from({ length: 10 }, () => prngA.next());
    const seqB = Array.from({ length: 10 }, () => prngB.next());

    expect(seqA).not.toEqual(seqB);
  });

  it('handles negative, zero, and large seeds deterministically via 32-bit normalization', () => {
    // Zero seed
    const prngZero1 = new PRNG(0);
    const prngZero2 = new PRNG(0);
    expect(prngZero1.next()).toBe(prngZero2.next());

    // Negative seed (-42 normalizes to (-42 >>> 0) = 4294967254)
    const prngNeg1 = new PRNG(-42);
    const prngNeg2 = new PRNG(PRNG.normalizeSeed(-42));
    expect(prngNeg1.rootSeed).toBe(4294967254);
    expect(prngNeg1.next()).toBe(prngNeg2.next());

    // Large floating-point seed
    const prngLarge = new PRNG(9876543210.999);
    expect(Number.isInteger(prngLarge.rootSeed)).toBe(true);
    expect(prngLarge.rootSeed).toBeGreaterThanOrEqual(0);
  });

  it('handles non-finite and NaN inputs gracefully by defaulting to 0', () => {
    const prngNaN = new PRNG(NaN);
    const prngInf = new PRNG(Infinity);
    const prngNegInf = new PRNG(-Infinity);

    expect(prngNaN.rootSeed).toBe(0);
    expect(prngInf.rootSeed).toBe(0);
    expect(prngNegInf.rootSeed).toBe(0);
  });

  it('generates bounded integers in [min, max] inclusive', () => {
    const prng = new PRNG(42);
    const min = 5;
    const max = 12;

    const results = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const val = prng.nextInt(min, max);
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
      results.add(val);
    }

    // Over 200 iterations with range 5..12, all 8 integers should be sampled
    expect(results.size).toBe(8);
  });

  it('handles inverted and equal integer bounds correctly', () => {
    const prng = new PRNG(999);

    // Inverted bounds (min > max): automatically swapped
    const valSwapped = prng.nextInt(20, 10);
    expect(valSwapped).toBeGreaterThanOrEqual(10);
    expect(valSwapped).toBeLessThanOrEqual(20);

    // Equal bounds (min === max)
    expect(prng.nextInt(7, 7)).toBe(7);
  });

  it('picks elements uniformly from non-empty arrays using nextChoice', () => {
    const prng = new PRNG(777);
    const items = ['apple', 'banana', 'cherry', 'date'];

    const chosen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const item = prng.nextChoice(items);
      expect(items).toContain(item);
      chosen.add(item);
    }
    expect(chosen.size).toBe(4);
  });

  it('throws RangeError when nextChoice is called on empty or non-array values', () => {
    const prng = new PRNG(1);
    expect(() => prng.nextChoice([])).toThrow(RangeError);
    // @ts-expect-error testing invalid argument runtime guard
    expect(() => prng.nextChoice(null)).toThrow(RangeError);
  });

  it('evaluates boolean probability accurately', () => {
    const prng = new PRNG(55);
    // Edge cases
    expect(prng.nextBoolean(0)).toBe(false);
    expect(prng.nextBoolean(-1)).toBe(false);
    expect(prng.nextBoolean(1)).toBe(true);
    expect(prng.nextBoolean(2)).toBe(true);
  });

  it('guarantees named stream determinism and independence from parent PRNG state consumption', () => {
    const masterSeed = 404040;
    const masterPRNG1 = new PRNG(masterSeed);
    const masterPRNG2 = new PRNG(masterSeed);

    // Scenario 1: Fork stream "terrain_grass_v0" immediately
    const stream1 = masterPRNG1.fork('terrain_grass_v0');

    // Scenario 2: Consume 500 values on masterPRNG2, fork another stream, THEN fork "terrain_grass_v0"
    for (let i = 0; i < 500; i++) {
      masterPRNG2.next();
    }
    masterPRNG2.fork('unrelated_stream').next();
    const stream2 = masterPRNG2.fork('terrain_grass_v0');

    // Streams derived with the same key from the same root seed MUST be 100% identical
    const seq1 = Array.from({ length: 30 }, () => stream1.next());
    const seq2 = Array.from({ length: 30 }, () => stream2.next());

    expect(seq1).toEqual(seq2);
  });

  it('handles empty and special string keys in fork deterministically', () => {
    const master = new PRNG(123);
    const emptyStream1 = master.fork('');
    const emptyStream2 = master.fork('');
    expect(emptyStream1.next()).toBe(emptyStream2.next());
  });

  it('resets to root seed cleanly via reset()', () => {
    const prng = new PRNG(314159);
    const firstVal = prng.next();
    prng.next();
    prng.next();

    prng.reset();
    expect(prng.next()).toBe(firstVal);
  });
});
