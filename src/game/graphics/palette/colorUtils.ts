/**
 * Pixelopolis — Color Manipulation & Pixel Buffer Utilities
 * 
 * Provides pure mathematical operations for color conversion, shading, blending,
 * and high-performance 32-bit integer pixel buffer packing.
 * 
 * Memory & Architecture Standards:
 * - Little-Endian 32-Bit Packing: HTML5 ImageData and WebGL texture buffers store
 *   pixel bytes as [R, G, B, A]. On modern little-endian architectures (x86, ARM),
 *   a 32-bit integer view (Uint32Array) maps:
 *     - Bits 0..7:   Red   (Byte offset 0)
 *     - Bits 8..15:  Green (Byte offset 1)
 *     - Bits 16..23: Blue  (Byte offset 2)
 *     - Bits 24..31: Alpha (Byte offset 3)
 *   Packed formula: ((A << 24) | (B << 16) | (G << 8) | R) >>> 0
 */

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface RgbaColor extends RgbColor {
  a: number;
}

/**
 * Clamps a numeric channel to an integer between 0 and 255.
 */
export function clampByte(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Clamps a normalized alpha value [0, 1] to an integer byte [0, 255].
 */
export function normalizeAlphaByte(alpha: number): number {
  if (!Number.isFinite(alpha) || Number.isNaN(alpha)) return 255;
  // If provided as a fraction 0..1, scale to 0..255; if already 0..255, clamp
  if (alpha >= 0 && alpha <= 1) {
    return Math.round(alpha * 255);
  }
  return clampByte(alpha);
}

/**
 * Parses a hex string ('#RRGGBB', '#RGB', 'RRGGBB', 'RGB') or numeric literal (0xRRGGBB)
 * into an RgbColor object.
 * 
 * @throws TypeError for malformed hex strings or non-numeric types.
 */
export function hexToRgb(hex: string | number): RgbColor {
  if (typeof hex === 'number') {
    if (!Number.isFinite(hex) || hex < 0 || hex > 0xffffff) {
      throw new TypeError(`Invalid numeric hex color: ${hex}. Expected integer in [0, 0xFFFFFF].`);
    }
    const intVal = Math.floor(hex);
    return {
      r: (intVal >> 16) & 0xff,
      g: (intVal >> 8) & 0xff,
      b: intVal & 0xff,
    };
  }

  if (typeof hex !== 'string') {
    throw new TypeError(`Invalid hex color: expected string or number, received ${typeof hex}.`);
  }

  const clean = hex.trim().replace(/^#/, '');

  if (clean.length === 3) {
    if (!/^[0-9a-fA-F]{3}$/.test(clean)) {
      throw new TypeError(`Invalid 3-digit hex color format: "${hex}".`);
    }
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }

  if (clean.length === 6) {
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      throw new TypeError(`Invalid 6-digit hex color format: "${hex}".`);
    }
    const intVal = parseInt(clean, 16);
    return {
      r: (intVal >> 16) & 0xff,
      g: (intVal >> 8) & 0xff,
      b: intVal & 0xff,
    };
  }

  throw new TypeError(`Invalid hex color string length: "${hex}". Expected 3 or 6 hex digits.`);
}

/**
 * Converts an RGB triplet into a lowercase 6-digit hex string ('#rrggbb').
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const cr = clampByte(r).toString(16).padStart(2, '0');
  const cg = clampByte(g).toString(16).padStart(2, '0');
  const cb = clampByte(b).toString(16).padStart(2, '0');
  return `#${cr}${cg}${cb}`;
}

/**
 * Converts an RGB triplet into a 24-bit numeric hex integer (0xRRGGBB).
 */
export function rgbToHexNumber(r: number, g: number, b: number): number {
  return ((clampByte(r) << 16) | (clampByte(g) << 8) | clampByte(b)) >>> 0;
}

/**
 * Lightens an RGB color toward white by a factor in [0, 1].
 * Factor 0 = unchanged, factor 1 = pure white.
 */
export function lighten(color: RgbColor, factor: number): RgbColor {
  const f = Math.max(0, Math.min(1, Number.isFinite(factor) ? factor : 0));
  return {
    r: clampByte(color.r + (255 - color.r) * f),
    g: clampByte(color.g + (255 - color.g) * f),
    b: clampByte(color.b + (255 - color.b) * f),
  };
}

/**
 * Darkens an RGB color toward black by a factor in [0, 1].
 * Factor 0 = unchanged, factor 1 = pure black.
 */
export function darken(color: RgbColor, factor: number): RgbColor {
  const f = Math.max(0, Math.min(1, Number.isFinite(factor) ? factor : 0));
  const mult = 1 - f;
  return {
    r: clampByte(color.r * mult),
    g: clampByte(color.g * mult),
    b: clampByte(color.b * mult),
  };
}

/**
 * Performs Porter-Duff source-over alpha blending between a source color and destination color.
 * 
 * @param source Foregorund color (with alpha or explicit alpha parameter).
 * @param destination Background color.
 * @param overrideAlpha Optional explicit alpha [0, 1] or [0, 255].
 */
export function alphaBlend(
  source: RgbaColor | RgbColor,
  destination: RgbaColor | RgbColor,
  overrideAlpha?: number
): RgbaColor {
  const srcAlphaByte = overrideAlpha !== undefined
    ? normalizeAlphaByte(overrideAlpha)
    : ('a' in source ? clampByte(source.a) : 255);
  
  const dstAlphaByte = 'a' in destination ? clampByte(destination.a) : 255;

  const srcA = srcAlphaByte / 255;
  const dstA = dstAlphaByte / 255;

  const outA = srcA + dstA * (1 - srcA);

  if (outA <= 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const outR = Math.round((source.r * srcA + destination.r * dstA * (1 - srcA)) / outA);
  const outG = Math.round((source.g * srcA + destination.g * dstA * (1 - srcA)) / outA);
  const outB = Math.round((source.b * srcA + destination.b * dstA * (1 - srcA)) / outA);

  return {
    r: clampByte(outR),
    g: clampByte(outG),
    b: clampByte(outB),
    a: clampByte(Math.round(outA * 255)),
  };
}

/**
 * Packs RGB and Alpha channels into an unsigned 32-bit integer matching
 * little-endian Uint32Array memory representation:
 * 
 * Byte 0: Red
 * Byte 1: Green
 * Byte 2: Blue
 * Byte 3: Alpha
 * 
 * Output = ((A << 24) | (B << 16) | (G << 8) | R) >>> 0
 */
export function rgbaToUint32(r: number, g: number, b: number, a: number = 255): number {
  const cr = clampByte(r);
  const cg = clampByte(g);
  const cb = clampByte(b);
  const ca = normalizeAlphaByte(a);

  return ((ca << 24) | (cb << 16) | (cg << 8) | cr) >>> 0;
}

/**
 * Unpacks an unsigned 32-bit integer back into its component RGBA channels.
 */
export function uint32ToRgba(packed: number): RgbaColor {
  const u = packed >>> 0;
  return {
    r: u & 0xff,
    g: (u >>> 8) & 0xff,
    b: (u >>> 16) & 0xff,
    a: (u >>> 24) & 0xff,
  };
}

/**
 * Directly converts a hex color and optional alpha to a packed 32-bit unsigned integer.
 */
export function hexToUint32(hex: string | number, alpha: number = 255): number {
  const rgb = hexToRgb(hex);
  return rgbaToUint32(rgb.r, rgb.g, rgb.b, alpha);
}
