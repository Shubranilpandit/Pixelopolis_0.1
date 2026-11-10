import { hexToRgb, hexToUint32, rgbToHexNumber } from './colorUtils';

/**
 * A cohesive 4-step color ramp supporting the upper-left lighting / lower-right shadow model:
 * - highlight: Sunlit upper-left facet
 * - base: Dominant top/surface color
 * - shadow: Shaded lower-right facet
 * - outline: Dark 1px structural perimeter contour
 */
export interface ColorRamp {
  highlight: string;
  base: string;
  shadow: string;
  outline: string;
}

export interface NumericColorRamp {
  highlight: number;
  base: number;
  shadow: number;
  outline: number;
}

export interface PackedColorRamp {
  highlight: number; // 32-bit Uint32 packed (little-endian RGBA)
  base: number;
  shadow: number;
  outline: number;
}

function makeNumericRamp(ramp: ColorRamp): NumericColorRamp {
  return {
    highlight: rgbToHexNumber(...Object.values(hexToRgb(ramp.highlight)) as [number, number, number]),
    base: rgbToHexNumber(...Object.values(hexToRgb(ramp.base)) as [number, number, number]),
    shadow: rgbToHexNumber(...Object.values(hexToRgb(ramp.shadow)) as [number, number, number]),
    outline: rgbToHexNumber(...Object.values(hexToRgb(ramp.outline)) as [number, number, number]),
  };
}

function makePackedRamp(ramp: ColorRamp): PackedColorRamp {
  return {
    highlight: hexToUint32(ramp.highlight),
    base: hexToUint32(ramp.base),
    shadow: hexToUint32(ramp.shadow),
    outline: hexToUint32(ramp.outline),
  };
}

/**
 * Canonical 32-Color Palette for Pixelopolis.
 * Curated for crisp, high-contrast isometric pixel-art rendering with
 * Upper-Left lighting and Lower-Right shadowing.
 */
export const PALETTE_HEX = {
  // 1. Meadow & Foliage Ramp
  GRASS: {
    highlight: '#6ec459', // Sunlit top-left facet
    base: '#4d8c3f',      // Standard meadow ground
    shadow: '#3d7031',    // Shaded bottom-right facet
    outline: '#23421c',   // Perimeter edge line
  },

  // 2. Fertile Soil & Earth Ramp
  DIRT: {
    highlight: '#b08f65', // Dry surface dirt
    base: '#8c6f4b',      // Moist agricultural loam
    shadow: '#664e31',    // Under-layer shadow
    outline: '#402f1a',   // Deep trench outline
  },

  // 3. Bedrock & Concrete Ramp
  STONE: {
    highlight: '#a4b3c6', // Clean concrete / masonry highlight
    base: '#7b8b9f',      // Primary paving / foundation tone
    shadow: '#566579',    // Cast building shadow
    outline: '#333e4d',   // Structural boundary outline
  },

  // 4. River & Oceanic Water Ramp
  WATER: {
    highlight: '#63b3ed', // Sun glare / shallow shoreline
    base: '#3182ce',      // Clean lake/river body
    shadow: '#2b6cb0',    // Deep ocean channel
    outline: '#1a365d',   // Deepest marine contour
  },

  // 5. Timber & Woodwork Ramp
  WOOD: {
    highlight: '#c99763', // Polished timber highlight
    base: '#9e6f3b',      // Framing beam / cottage plank
    shadow: '#734d24',    // Eaves shadow
    outline: '#4a2e11',   // Carpenter joinery outline
  },

  // 6. Coastal Beach & Sand Ramp
  SAND: {
    highlight: '#edd998', // Sun-bleached dune crest
    base: '#dbc172',      // Warm coastal sand
    shadow: '#b09748',    // Wet tide line
    outline: '#786427',   // Sand bar contour
  },

  // 7. Terracotta & Brick Roof Ramp
  ROOF: {
    highlight: '#e06b53', // Sun-facing terracotta pitch
    base: '#b84732',      // Traditional residential tile
    shadow: '#852d1c',    // Gable shadow
    outline: '#52160a',   // Ridge cap outline
  },

  // 8. Interaction & HUD Accent Tokens
  OVERLAY: {
    HOVER_GREEN: '#55ff55',
    HOVER_GREEN_OUTLINE: '#4ade80',
    SELECT_CYAN: '#00f0ff',
    SELECT_CYAN_BORDER: '#0284c7',
    GRID_LINE: '#38bdf8',
    PURE_WHITE: '#ffffff',
    DEEP_CHARCOAL: '#141721',
  },
} as const;

/**
 * Numeric 24-bit hex constants (0xRRGGBB) for direct consumption by Phaser Graphics.
 */
export const PALETTE_NUMERIC = {
  GRASS: makeNumericRamp(PALETTE_HEX.GRASS),
  DIRT: makeNumericRamp(PALETTE_HEX.DIRT),
  STONE: makeNumericRamp(PALETTE_HEX.STONE),
  WATER: makeNumericRamp(PALETTE_HEX.WATER),
  WOOD: makeNumericRamp(PALETTE_HEX.WOOD),
  SAND: makeNumericRamp(PALETTE_HEX.SAND),
  ROOF: makeNumericRamp(PALETTE_HEX.ROOF),
  OVERLAY: {
    HOVER_GREEN: 0x55ff55,
    HOVER_GREEN_OUTLINE: 0x4ade80,
    SELECT_CYAN: 0x00f0ff,
    SELECT_CYAN_BORDER: 0x0284c7,
    GRID_LINE: 0x38bdf8,
    PURE_WHITE: 0xffffff,
    DEEP_CHARCOAL: 0x141721,
  },
} as const;

/**
 * Packed 32-bit unsigned integer constants (little-endian RGBA) for
 * high-performance direct buffer writes into Uint32Array PixelCanvas buffers.
 */
export const PALETTE_PACKED = {
  GRASS: makePackedRamp(PALETTE_HEX.GRASS),
  DIRT: makePackedRamp(PALETTE_HEX.DIRT),
  STONE: makePackedRamp(PALETTE_HEX.STONE),
  WATER: makePackedRamp(PALETTE_HEX.WATER),
  WOOD: makePackedRamp(PALETTE_HEX.WOOD),
  SAND: makePackedRamp(PALETTE_HEX.SAND),
  ROOF: makePackedRamp(PALETTE_HEX.ROOF),
  OVERLAY: {
    HOVER_GREEN: hexToUint32(PALETTE_HEX.OVERLAY.HOVER_GREEN),
    HOVER_GREEN_OUTLINE: hexToUint32(PALETTE_HEX.OVERLAY.HOVER_GREEN_OUTLINE),
    SELECT_CYAN: hexToUint32(PALETTE_HEX.OVERLAY.SELECT_CYAN),
    SELECT_CYAN_BORDER: hexToUint32(PALETTE_HEX.OVERLAY.SELECT_CYAN_BORDER),
    GRID_LINE: hexToUint32(PALETTE_HEX.OVERLAY.GRID_LINE),
    PURE_WHITE: hexToUint32(PALETTE_HEX.OVERLAY.PURE_WHITE),
    DEEP_CHARCOAL: hexToUint32(PALETTE_HEX.OVERLAY.DEEP_CHARCOAL),
  },
} as const;
