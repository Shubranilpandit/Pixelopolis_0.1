/**
 * Pixelopolis — Core Graphics Engine Type Definitions
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BlendMode = 'copy' | 'blend';

export type DitherPattern =
  | 'checkerboard_2x2'
  | 'sparse_4x4'
  | 'horizontal_stripes'
  | 'bayer_2x2'
  | 'bayer_4x4';

export interface SteppedShadingOptions {
  offsetX?: number;
  offsetY?: number;
  highlightThreshold?: number; // 0..1, default 0.33
  shadowThreshold?: number;    // 0..1, default 0.67
  maskToDiamond?: boolean;     // default true
}

export interface DitherOptions {
  pattern?: DitherPattern;
  threshold?: number;          // For Bayer patterns: 0..3 or 0..15
  bounds?: PixelRect;
  maskToDiamond?: boolean;     // default true
  offsetX?: number;
  offsetY?: number;
}
