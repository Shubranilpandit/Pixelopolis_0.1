# Pixelopolis — Technical Architecture & Technology Decisions

> **Document Status:** Authoritative Record (Phase 0)  
> **Author:** Game Development Technical Lead & Software Architect  
> **Last Updated:** 2026-11-06

---

## Document Purpose

This document records all architectural, infrastructural, and technological decisions made for Pixelopolis. It serves as the definitive reference for technical choices, design trade-offs, and boundary definitions.

Decisions are formally categorized into:
- **[CONFIRMED]** — Non-negotiable architectural mandates approved for implementation.
- **[RECOMMENDATION]** — Architecturally sound recommendations adopted for subsequent phases.
- **[DEFERRED]** — Future possibilities and extensions postponed until core prerequisites are satisfied.

---

## 1. Confirmed Technology Decisions

### ADR-001: Game Engine — Phaser 3
- **Classification:** **[CONFIRMED]**
- **Decision:** Use Phaser 3 as the sole 2D game rendering engine.
- **Scope of Responsibility:**
  - Game world rendering onto HTML5 Canvas / WebGL context.
  - Scene lifecycle management (`BootScene`, `CityScene`).
  - Viewport camera management (pan, zoom, reset, bounds).
  - Canvas pointer input capture and screen-to-world coordinate translation.
  - Sprite rendering, procedural animations, and isometric depth sorting.
- **Boundary Restriction:** Phaser scenes must **not** host business simulation logic, tax formulas, or direct DOM components.

### ADR-002: UI Framework — React 18+
- **Classification:** **[CONFIRMED]**
- **Decision:** Use React for all user interface layers surrounding the game canvas.
- **Scope of Responsibility:**
  - Top HUD (treasury coins, population, city level, storage gauges).
  - Construction catalogs and categorized building drawers.
  - Contextual building inspector modals (demolish, upgrade, service indicators).
  - Modal dialogs: Settings, sound options, save/load slot management, missions, achievements.
- **Boundary Restriction:** React components must **never** directly access, mutate, or instantiate Phaser game objects, scenes, or cameras.

### ADR-003: Programming Language — TypeScript (Strict Mode)
- **Classification:** **[CONFIRMED]**
- **Decision:** 100% TypeScript throughout all client and simulation code with `strict: true`.
- **Mandates:**
  - Zero tolerance for implicit or explicit `any` types.
  - Extensive use of typed interfaces, discriminated unions, and type guards.
  - Shared domain type definitions maintained in `src/types/`.

### ADR-004: Build & Dev Tooling — Vite
- **Classification:** **[CONFIRMED]**
- **Decision:** Standardize on Vite as the frontend build tool and local development server.
- **Rationale:** Sub-second Hot Module Replacement (HMR), optimized Rollup-based production bundling, zero-config TypeScript handling, and rapid developer iteration speed.

### ADR-005: State Management & Bridge — Zustand
- **Classification:** **[CONFIRMED]**
- **Decision:** Use Zustand for shared UI state and cross-boundary state bridging.
- **Scope of Responsibility:**
  - Reactive store for active tools (e.g., active building placement selection).
  - Mirroring read-only snapshots of simulation stats (coins, population, happiness, inventory) for React rendering.
- **Boundary Restriction:** Do **not** run the simulation game tick inside Zustand stores. Zustand is a consumption and state synchronization bridge, not an execution engine.

### ADR-006: Local Persistence — IndexedDB
- **Classification:** **[CONFIRMED]**
- **Decision:** Use browser IndexedDB as the primary persistence engine for game saves.
- **Rationale:** High storage quotas (hundreds of megabytes vs. 5MB in `localStorage`), asynchronous non-blocking I/O, multi-slot save records, and clean migration support.
- **Scope:**
  - Dedicated database `PixelopolisDB`.
  - Object stores for `saves` (Slot 1, Slot 2, Slot 3, AutoSave) and `settings`.
  - Schema versioning with migration scripts.

### ADR-007: Automated Testing Strategy — Vitest & Playwright
- **Classification:** **[CONFIRMED]**
- **Decision:** Employ a dual-tier testing methodology:
  - **Vitest:** Headless unit and integration testing of pure TypeScript simulation modules, isometric math, economy ticks, and road graph algorithms (fast execution, zero canvas mocking needed).
  - **Playwright:** End-to-end browser automation validating critical player journeys (canvas mounting, UI clicks, building placement, save/reload).

### ADR-008: Visual Direction — Procedural Programmatic Pixel Art
- **Classification:** **[CONFIRMED]**
- **Decision:** Generate all pixel-art visual assets programmatically via code rather than loading external pre-drawn PNG sprite sheets.
- **Mandates:**
  - Procedural generation for terrain tiles, roads, buildings, and environmental props.
  - Deterministic generation using seeded pseudo-random number generators (PRNG).
  - Texture caching: Generate each procedural asset once into Phaser's `TextureManager` and reuse by texture key.
  - Crisp pixel-art presentation: `pixelArt: true`, `antialias: false`, `roundPixels: true`, and nearest-neighbor scaling.

### ADR-009: Isometric Projection Standards
- **Classification:** **[CONFIRMED]**
- **Decision:** Standardize on classic 2:1 isometric projection.
- **Specifications:**
  - Tile Width: `64px`
  - Tile Height: `32px`
  - Isometric Ratio: `2:1`
  - Initial Map Dimensions: `20 × 20` tiles (400 total cells)
  - Coordinate Authority: Grid coordinates `(gx, gy)` are authoritative for all world entities, footprints, and simulation logic.

### ADR-010: Directional Lighting & Shadow Model
- **Classification:** **[CONFIRMED]**
- **Decision:** Enforce uniform directional lighting across all procedural pixel assets.
- **Specifications:**
  - Global Light Source: **Upper-Left** (illuminating top and top-left facets with highlight tints).
  - Shadow Direction: Cast toward the **Lower-Right** with darkened alpha-blended facets.
  - Building Footprints: Integer multiples of 1×1 tiles (`1×1`, `2×2`, `2×3`, etc.).
  - Sprite Origins: Tile center `(0.5, 0.5)` for ground; bottom-center `(0.5, 1.0)` for tall buildings.

### ADR-011: Postponement of Online Features
- **Classification:** **[CONFIRMED]**
- **Decision:** All online features are strictly deferred until single-player mechanics are fully mature.
- **Deferred Items:**
  - Multiplayer gameplay.
  - User authentication and accounts.
  - Real-time online trading between players.
  - Cloud save synchronization.
  - Global or regional leaderboards.

---

## 2. Architectural Patterns & Standards

### ADR-012: Decoupled Event-Driven Bridge Pattern
- **Classification:** **[CONFIRMED]**
- **Decision:** React, Phaser, and the Game Domain interact exclusively through a typed pub/sub event bus (`GameEventBus`).
- **Rationale:** Prevents circular dependencies and structural coupling. Allows the game domain to be executed headlessly in unit test runners without React or Phaser dependencies.

### ADR-013: Headless, Tick-Based Simulation Domain
- **Classification:** **[CONFIRMED]**
- **Decision:** Game domain logic operates as a pure, headless simulation updated via deterministic delta ticks.
- **Rationale:** Decouples game logic from the browser render frame rate. If frame rate drops, the simulation tick rate remains consistent and deterministic.

### ADR-014: Data-Driven Game Mechanics
- **Classification:** **[CONFIRMED]**
- **Decision:** All building parameters, construction costs, production cycles, and upgrade requirements must be externalized into static data configurations (`src/data/`).
- **Rationale:** Enables balancing tweaks without modifying engine code or simulation logic.

### ADR-015: Controlled React–Phaser Lifecycle Bridge
- **Classification:** **[CONFIRMED]**
- **Decision:** Phaser initializes strictly within React's `useEffect` lifecycle via `launchGame()`, and teardown is guaranteed by `destroyGame()`.
- **Rationale:** In React 18+ StrictMode, components mount, unmount, and remount in development. Managing an explicit singleton reference prevents duplicate canvas creation, WebGL context loss, and memory leaks.

### ADR-016: Zero-Dependency Typed GameEventBus Singleton
- **Classification:** **[CONFIRMED]**
- **Decision:** A custom, strongly-typed `GameEventBus` class replaces third-party event emitter packages.
- **Rationale:** Guarantees compile-time type verification for all event keys and payloads (`GameEventMap`) across React, Phaser, and the Game Domain while adding 0 KB of dependency weight.

### ADR-017: Cursor-Anchored Isometric Camera Zoom & Viewport Navigation
- **Classification:** **[CONFIRMED]**
- **Decision:** Viewport zoom recalculates world positions before and after zooming to anchor the zoom center directly to the pointer's world coordinates.
- **Rationale:** Prevents disorienting viewport jumps when zooming, providing intuitive and smooth desktop navigation. Min/max zoom is clamped between 0.55x and 2.0x.

---

## 3. Recommendations for Subsequent Phases

### REC-001: Custom Lightweight Event Emitter
- **Classification:** **[RECOMMENDATION]**
- **Recommendation:** Implement a custom, zero-dependency typed event emitter class (`GameEventBus`) rather than adding heavy third-party event libraries.

### REC-002: Seeded PRNG Algorithm
- **Classification:** **[RECOMMENDATION]**
- **Recommendation:** Adopt a proven 32-bit PRNG (e.g., Mulberry32) for deterministic terrain generation, dithering variation, and procedural building details.

### REC-003: Web Audio API for Procedural Sound
- **Classification:** **[RECOMMENDATION]**
- **Recommendation:** Consider procedural 8-bit sound synthesis via Web Audio API oscillators for UI feedback, placement chirps, and demolition sounds, complementing the procedural graphics philosophy.

---

## 4. Deferred & Future Possibilities

### DEF-001: Cloud Backend — Supabase
- **Classification:** **[DEFERRED]**
- **Scope:** Evaluated as the candidate backend for Phase 13.
- **Potential Services:** Supabase Auth (OAuth/magic links), PostgreSQL (cloud save storage), Realtime channels (city visiting).
- **Status:** Evaluated and architecturally accommodated via storage adapter interfaces; strictly postponed until single-player completion.

### DEF-002: Expanded Map Biomes & Dynamic Weather
- **Classification:** **[DEFERRED]**
- **Scope:** Desert, snow, and volcanic biomes with dynamic rain or snow overlays.
- **Status:** Potential post-launch content expansion.

---

## 5. Phase 2 Architecture Decision Records

### ADR-018: Camera Drag vs. Tile Selection Disambiguation
- **Status:** **[ACCEPTED]**
- **Context:** Both camera panning and tile selection utilize the left mouse button. Without disambiguation, panning the world triggers unintended tile selection upon releasing the mouse button.
- **Decision:** Implement a euclidean distance threshold (`MAX_CLICK_DRAG_DISTANCE = 6` pixels). During `pointerdown`, record initial coordinates. On each `pointermove`, compute `dx * dx + dy * dy`. If movement exceeds 36 (6px distance), flag `hasExceededDragThreshold = true`. On `pointerup`, `CameraController.wasDrag()` returns true, suppressing tile selection and preserving the prior active selection.
- **Consequences:** Eliminates frustrating accidental selections during camera movement. Clicks within the 6px tolerance register reliably as tile selection.

### ADR-019: Dual Coexisting Hover and Selection Visuals
- **Status:** **[ACCEPTED]**
- **Context:** The player requires real-time feedback on the tile under the pointer while simultaneously retaining visual confirmation of their currently selected tile and its React HUD inspector details.
- **Decision:** Implement two decoupled procedural indicators at distinct render depths:
  1. **Selection Reticle:** Cyan palette (`#00f0ff` border, `#00485c` fill, central white pip `#ffffff`) anchored at `RENDER_LAYERS.SELECTION_OVERLAY` (`2000 + gx + gy`).
  2. **Hover Highlight:** Green diamond outline (`#4ade80`) anchored at `RENDER_LAYERS.HOVER_OVERLAY` (`2100 + gx + gy`).
- **Consequences:** Both indicators coexist smoothly. When hovering over the selected tile, the green diamond frames the cyan reticle. Moving away leaves the cyan reticle intact on the selected tile.

### ADR-020: Algorithmic Isometric Grid Overlay
- **Status:** **[ACCEPTED]**
- **Context:** Players need a toggleable grid overlay to visualize tile boundaries and island layout without adding texture memory or draw call overhead.
- **Decision:** Render the grid using a single `Phaser.GameObjects.Graphics` object drawn with 21 diagonal lines along constant `gx` facets and 21 diagonal lines along constant `gy` facets (`#38bdf8` at 35% opacity) at depth `RENDER_LAYERS.GRID_LINES` (`1500`). Toggling visibility is achieved via `.setVisible()` triggered by either the React HUD button or keyboard shortcut ('G').
- **Consequences:** 1 draw call, 0 additional textures in memory, perfectly aligned with 2:1 isometric diamond boundaries, instant O(1) visibility toggle.

### ADR-021: Balanced Performance Priority and Provisional Hardware Policy
- **Status:** **[ACCEPTED]**
- **Context:**
  As an ambitious browser-based city-building simulation, Pixelopolis faces the challenge of scaling visual complexity, procedural textures, and simulation depth across a broad spectrum of hardware. Web users expect instant loading and smooth playability on entry-level laptops (e.g. 2 GB RAM machines), while players on recommended and enthusiast desktops (4 GB – 8 GB+ RAM) expect rich visual fidelity, fluid 60 FPS rendering, and extended draw distances.
- **Decision:**
  Formally establish **Performance Priority: BALANCED** as a core project constitutional principle:
  1. **Provisional Hardware Targets:**
     - *Minimum:* 2 GB system RAM, targeting 30 FPS under a Low graphics preset.
     - *Recommended:* 4 GB system RAM, targeting 60 FPS under a Medium graphics preset.
     - *Comfortable:* 8 GB or more, targeting 60+ FPS with enhanced visual quality, atmospheric effects, and extended draw distances under a High graphics preset.
     - *Provisional Status:* These values represent design targets rather than verified hardware requirements. Actual compatibility will be established through empirical benchmarking on representative physical devices, recognizing that OS overhead, browser process models, GPU/iGPU driver capabilities, and concurrent software heavily impact available memory.
  2. **Mandatory Engineering Principles:** All subsequent phases must adopt 10 performance principles: memory-efficient asset generation, texture caching and reuse, chunk-based rendering, object pooling, decoupled simulation scheduling, optimized/memoized React rendering, adaptive graphics quality, proactive resource cleanup, leak prevention, and continuous performance regression testing.
  3. **Scalable Graphics Presets:** Design three distinct presets (Low, Medium, High) ensuring that the core pixel-art identity remains crisp and intact even on the Low preset.
  4. **Empirical Telemetry & Progressive Budgets:** Track JS heap, tab memory, GPU memory, FPS, frame-time variance, initial load time, and draw calls. Reject arbitrary hard memory limits without profiling; establish measured budgets progressively as city density scales.
- **Consequences:**
  Every development phase (Phases 3–14) must adhere to these 10 principles during design and implementation. Prevents performance degradation on entry-level hardware while ensuring high-end systems benefit from enhanced visual depth.

---

*This document represents the finalized technical consensus through Phase 2. Changes require formal updates to this registry.*
