import { Point2D, BlendMode } from './types';
import { uint32ToRgba, alphaBlend, rgbaToUint32 } from '../palette/colorUtils';

/**
 * Pixelopolis — Headless High-Performance Pixel Canvas
 * 
 * A pure TypeScript, zero-dependency, integer-coordinate 2D raster buffer
 * backed by a contiguous 32-bit typed array (`Uint32Array`).
 * 
 * Representation & Channel Conventions:
 * - Little-Endian 32-bit RGBA integer packing:
 *   - Byte 0 (Bits 0..7):   Red
 *   - Byte 1 (Bits 8..15):  Green
 *   - Byte 2 (Bits 16..23): Blue
 *   - Byte 3 (Bits 24..31): Alpha
 *   - Packed formula: ((A << 24) | (B << 16) | (G << 8) | R) >>> 0
 * - Completely headless: Can run inside Node.js, Vitest, Web Workers, or browsers.
 * - Strict clipping: Out-of-bounds writes are no-ops; out-of-bounds reads return 0 (transparent black).
 */
export class PixelCanvas {
  public readonly width: number;
  public readonly height: number;
  private readonly buffer: Uint32Array;

  /**
   * Maximum allowed dimension for safety against runaway allocations.
   */
  public static readonly MAX_DIMENSION: number = 2048;

  constructor(width: number, height: number, initialBuffer?: Uint32Array) {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new TypeError(`Canvas dimensions must be finite numbers. Received: ${width}x${height}`);
    }

    const w = Math.floor(width);
    const h = Math.floor(height);

    if (w < 1 || h < 1) {
      throw new RangeError(`Canvas dimensions must be positive integers >= 1. Received: ${w}x${h}`);
    }

    if (w > PixelCanvas.MAX_DIMENSION || h > PixelCanvas.MAX_DIMENSION) {
      throw new RangeError(
        `Canvas dimensions exceed maximum limit of ${PixelCanvas.MAX_DIMENSION}px. Received: ${w}x${h}`
      );
    }

    this.width = w;
    this.height = h;

    const totalPixels = w * h;

    if (initialBuffer) {
      if (initialBuffer.length !== totalPixels) {
        throw new RangeError(
          `Initial buffer size mismatch. Expected ${totalPixels} elements, got ${initialBuffer.length}.`
        );
      }
      this.buffer = new Uint32Array(initialBuffer);
    } else {
      this.buffer = new Uint32Array(totalPixels);
    }
  }

  /**
   * Sets a single pixel color at (x, y) with boundary clipping.
   * Out-of-bounds coordinates are safely ignored.
   */
  public setPixel(x: number, y: number, color: number): void {
    const ix = Math.floor(x);
    const iy = Math.floor(y);

    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return;
    }

    this.buffer[iy * this.width + ix] = color >>> 0;
  }

  /**
   * Reads a single pixel color at (x, y).
   * Returns 0 (fully transparent black) if (x, y) is out of bounds.
   */
  public getPixel(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);

    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return 0;
    }

    return this.buffer[iy * this.width + ix] >>> 0;
  }

  /**
   * Fills an axis-aligned rectangle with the specified color, with strict boundary clipping.
   */
  public fillRect(x: number, y: number, w: number, h: number, color: number): void {
    if (w <= 0 || h <= 0) return;

    const startX = Math.max(0, Math.floor(x));
    const endX = Math.min(this.width, Math.floor(x + w));
    const startY = Math.max(0, Math.floor(y));
    const endY = Math.min(this.height, Math.floor(y + h));

    if (startX >= endX || startY >= endY) return;

    const packedColor = color >>> 0;

    for (let py = startY; py < endY; py++) {
      const rowOffset = py * this.width;
      this.buffer.fill(packedColor, rowOffset + startX, rowOffset + endX);
    }
  }

  /**
   * Draws a 1px solid line between (x0, y0) and (x1, y1) using Bresenham's algorithm.
   */
  public drawLine(x0: number, y0: number, x1: number, y1: number, color: number): void {
    let ix0 = Math.floor(x0);
    let iy0 = Math.floor(y0);
    const ix1 = Math.floor(x1);
    const iy1 = Math.floor(y1);

    const dx = Math.abs(ix1 - ix0);
    const dy = Math.abs(iy1 - iy0);
    const sx = ix0 < ix1 ? 1 : -1;
    const sy = iy0 < iy1 ? 1 : -1;
    let err = dx - dy;

    const packed = color >>> 0;

    while (true) {
      this.setPixel(ix0, iy0, packed);
      if (ix0 === ix1 && iy0 === iy1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        ix0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        iy0 += sy;
      }
    }
  }

  /**
   * Fills an arbitrary 2D polygon using standard scanline conversion.
   * Adheres to standard half-open top/left edge inclusion rules.
   */
  public fillPolygon(points: readonly Point2D[], color: number): void {
    if (!points || points.length < 3) return;

    // 1. Calculate polygon vertical bounds
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const scanStart = Math.max(0, Math.floor(minY));
    const scanEnd = Math.min(this.height - 1, Math.floor(maxY));

    if (scanStart > scanEnd) return;

    const packedColor = color >>> 0;
    const n = points.length;
    const intersections: number[] = [];

    // 2. Scanline rasterization
    for (let py = scanStart; py <= scanEnd; py++) {
      const scanY = py + 0.5; // evaluate at pixel centers
      intersections.length = 0;

      for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];

        if ((p1.y <= scanY && p2.y > scanY) || (p2.y <= scanY && p1.y > scanY)) {
          const dy = p2.y - p1.y;
          if (dy !== 0) {
            const x = p1.x + ((scanY - p1.y) * (p2.x - p1.x)) / dy;
            intersections.push(x);
          }
        }
      }

      if (intersections.length >= 2) {
        intersections.sort((a, b) => a - b);

        for (let j = 0; j < intersections.length - 1; j += 2) {
          const xStart = Math.max(0, Math.round(intersections[j]));
          const xEnd = Math.min(this.width - 1, Math.round(intersections[j + 1]) - 1);

          if (xStart <= xEnd) {
            const rowOffset = py * this.width;
            this.buffer.fill(packedColor, rowOffset + xStart, rowOffset + xEnd + 1);
          }
        }
      }
    }
  }

  /**
   * Blits a rectangular region from a source PixelCanvas onto this canvas.
   * 
   * @param source Source pixel buffer
   * @param destX Target X offset on this canvas
   * @param destY Target Y offset on this canvas
   * @param blendMode 'copy' for raw overwriting; 'blend' for alpha-blending
   */
  public blit(
    source: PixelCanvas,
    destX: number,
    destY: number,
    blendMode: BlendMode = 'blend'
  ): void {
    const srcW = source.width;
    const srcH = source.height;

    const dx = Math.floor(destX);
    const dy = Math.floor(destY);

    // Overlapping bounding box calculation
    const startX = Math.max(0, -dx);
    const endX = Math.min(srcW, this.width - dx);
    const startY = Math.max(0, -dy);
    const endY = Math.min(srcH, this.height - dy);

    if (startX >= endX || startY >= endY) return;

    const srcBuf = source.getRawBuffer();

    for (let sy = startY; sy < endY; sy++) {
      const targetY = dy + sy;
      const targetRowOffset = targetY * this.width;
      const srcRowOffset = sy * srcW;

      for (let sx = startX; sx < endX; sx++) {
        const srcPixel = srcBuf[srcRowOffset + sx] >>> 0;
        const targetIndex = targetRowOffset + (dx + sx);

        if (blendMode === 'copy') {
          this.buffer[targetIndex] = srcPixel;
        } else {
          // Alpha blending mode
          const srcAlpha = (srcPixel >>> 24) & 0xff;

          if (srcAlpha === 0) {
            // Source is completely transparent: skip
            continue;
          } else if (srcAlpha === 255) {
            // Source is completely opaque: overwrite
            this.buffer[targetIndex] = srcPixel;
          } else {
            // Semi-transparent: Porter-Duff blend
            const dstPixel = this.buffer[targetIndex] >>> 0;
            const srcRgba = uint32ToRgba(srcPixel);
            const dstRgba = uint32ToRgba(dstPixel);
            const blended = alphaBlend(srcRgba, dstRgba);
            this.buffer[targetIndex] = rgbaToUint32(blended.r, blended.g, blended.b, blended.a);
          }
        }
      }
    }
  }

  /**
   * Clears the entire buffer to a solid color.
   * Defaults to 0 (fully transparent black).
   */
  public clear(color: number = 0): void {
    this.buffer.fill(color >>> 0);
  }

  /**
   * Returns a direct zero-copy reference to the internal Uint32Array.
   * Useful for high-performance direct reads or uploading into WebGL buffers.
   */
  public getRawBuffer(): Uint32Array {
    return this.buffer;
  }

  /**
   * Returns a deep copy of the pixel buffer.
   */
  public cloneBuffer(): Uint32Array {
    return new Uint32Array(this.buffer);
  }

  /**
   * Exports the buffer as a Uint8ClampedArray suitable for HTML5 ImageData.
   */
  public toUint8ClampedArray(): Uint8ClampedArray {
    return new Uint8ClampedArray(this.buffer.buffer.slice(0));
  }

  /**
   * Clones this PixelCanvas into an independent instance with copied pixel data.
   */
  public clone(): PixelCanvas {
    return new PixelCanvas(this.width, this.height, this.buffer);
  }
}
