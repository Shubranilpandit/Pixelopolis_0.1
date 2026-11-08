# Pixelopolis — Project Constitution & Development Instructions

> Read this file before initiating any task. It is the permanent single source of truth for project identity, architecture, technology decisions, standards, and development rules.

---

## 1. Project Identity

| Attribute | Specification |
| :--- | :--- |
| **Project Name** | **Pixelopolis** |
| **Project Type** | Browser-based city-building simulation |
| **Genre** | City Builder / Management Simulation |
| **Visual Direction** | Detailed Isometric Pixel Art |
| **Primary Platform** | Desktop Web Browsers |
| **Tagline** | *A meticulously crafted isometric pixel-art city simulation* |

### Game Vision
Pixelopolis is an original isometric pixel-art city-building simulation inspired by the city-building genre and resource-management mechanics of classic titles such as *SimCity BuildIt*. 

Players will eventually be able to:
- Construct residential buildings.
- Build commercial districts.
- Establish factories and production lines.
- Develop interconnected road networks.
- Manage resources, production chains, and treasury coins.
- Grow and satisfy their population.
- Expand city boundaries across diverse terrain.
- Upgrade buildings across multiple visual and functional tiers.
- Manage essential public services (power, water, fire, police, health).
- Complete missions and unlock achievements.
- Develop large, dense, and sophisticated metropolises.

**Identity & Originality Mandate:** Pixelopolis maintains its own original identity, branding, interface, visual art, and gameplay implementation. Under no circumstances should copyrighted game assets, proprietary source code, commercial artwork, or protected interface designs from existing games be duplicated or introduced.

---

## 2. Finalized Technology Decisions

All core technology selections are confirmed. They define the implementation boundaries:

| Layer / Concern | Technology | Status | Core Responsibilities |
| :--- | :--- | :--- | :--- |
| **Game Engine** | **Phaser 3** | Confirmed | Game canvas rendering, scenes, camera controls (pan/zoom), input handling, world interaction, game objects, animations, tilemaps. |
| **Frontend Framework** | **React** | Confirmed | Main menus, HUD overlay, resource bars, construction menus, inventory, building inspection panels, settings, modal dialogs. |
| **Language** | **TypeScript** | Confirmed | Strict static typing across all modules (`strict: true`, no implicit `any`). |
| **Build Tool** | **Vite** | Confirmed | Fast local development server, optimized ESM bundling, asset processing, and production builds. |
| **State Management** | **Zustand** | Confirmed | Shared UI state and bridging reactive simulation data to React. *Note:* Pure simulation logic does not live in Zustand stores. |
| **Local Persistence** | **IndexedDB** | Confirmed | Client-side game save/load storage, multi-slot management, schema versioning, and migration handling. |
| **Unit / Integration Testing** | **Vitest** | Confirmed | Headless testing for game-domain logic, math utilities, coordinate conversion, and simulation rules without Phaser canvas dependencies. |
| **End-to-End Testing** | **Playwright** | Confirmed | Browser automation testing for full user flows, UI interactions, and canvas responsiveness. |
| **Procedural Graphics** | **Programmatic Pixel Art** | Confirmed | Procedural generation of tiles, roads, and buildings using canvas/Phaser graphics; deterministic seeded generation, texture caching. |
| **Online Functionality** | **Postponed** | Confirmed Deferred | No multiplayer, user authentication, online trading, cloud synchronization, or leaderboards until the single-player core is fully established. |
| **Future Backend** | **Supabase** | Confirmed Deferred | Evaluated for eventual cloud saves and multiplayer features; strictly deferred. |

---

## 3. Architectural Principles

These 15 principles form the permanent constitution of Pixelopolis. Every contributor and AI agent must adhere to them strictly:

1. **Modular Architecture:** Organize code into focused, self-contained, and decoupled modules with explicit public interfaces.
2. **Separation of Rendering from Game Logic:** The game-domain simulation logic must remain pure and headless, fully decoupled from Phaser rendering objects.
3. **Separation of UI State from Simulation State:** React UI state and game simulation state are distinct. Zustand bridges state to React without hosting simulation execution.
4. **Data-Driven Game Mechanics:** Game entities, costs, production rates, upgrade tiers, and balancing parameters must be defined in structured data definitions rather than hardcoded logic.
5. **Maintainable and Reusable Modules:** Design components and utility functions for high cohesion and reusability across scenes and systems.
6. **Avoid Unnecessary Dependencies:** Rely on modern TypeScript, web standards, and chosen core libraries; reject bloat and unvetted third-party packages.
7. **Strict TypeScript Typing:** Maintain zero `any` tolerance. Utilize strict typing, explicit interfaces, discrminated unions, and comprehensive type guards.
8. **Avoid Monolithic Files:** Break complex scenes, systems, or components into smaller, single-responsibility files (max ~300 lines recommended).
9. **Avoid Circular Dependencies:** Structure dependency graphs hierarchically. Never allow bidirectional or cyclic imports.
10. **Implement Appropriate Error Handling:** Validate inputs, guard against corrupt save data, and handle exceptions gracefully with actionable diagnostics.
11. **Maintain Deterministic Procedural Generation:** Use seeded pseudo-random number generators (PRNG) to ensure world and texture generation is reproducible.
12. **Optimize Graphics Rendering and Memory Usage (Balanced Performance):** Generate procedural textures once, cache them in Phaser's TextureManager, reuse sprites, utilize object pooling where beneficial, eliminate per-frame allocations, and adhere strictly to the Balanced Performance Priority.
13. **Preserve Existing Functionality:** New features or refactors must never break or silently drop existing working capabilities.
14. **Document Significant Architectural Decisions:** Record architectural decisions, tradeoffs, and structural changes in `docs/TECH_DECISIONS.md`.
15. **Avoid Unnecessary Rewrites:** Enhance and extend existing modules incrementally; never discard working code without explicit architectural justification and user approval.

---

## 4. Separation of Responsibilities

The system consists of four distinct architectural tiers with strict boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                       REACT (UI)                            │
│   HUD, Menus, Dialogs, Construction Trays, Toolbars         │
└───────────────────────────▲─────────────────────────────────┘
                            │ (Events / Read Zustand Stores)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 STATE BRIDGE (Zustand & Events)             │
│   Event Bus, Shared UI State, Snapshots of City Stats       │
└───────────────────────────▲─────────────────────────────────┘
                            │ (Events / State Updates)
┌───────────────────────────┴─────────────────────────────────┐
│                    GAME-DOMAIN LAYER                        │
│   Pure Simulation: Economy, Population, Services, Grid Logic│
└───────────────────────────▲─────────────────────────────────┘
                            │ (Command / Sync Events)
┌───────────────────────────▼─────────────────────────────────┐
│                   PHASER 3 (GAME ENGINE)                    │
│   Canvas, Camera, Isometric Renderer, Input, Scene Graph    │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    PERSISTENCE LAYER                        │
│   IndexedDB Client, Schema Migrations, Serialization        │
└─────────────────────────────────────────────────────────────┘
```

### Strict Boundaries & Rules
- **Phaser owns the game world:** Renders the canvas, animates sprites, manages the camera viewport, and tracks pointer interactions.
- **React owns the surrounding interface:** Renders overlay menus, modal dialogs, HUD metrics, and construction sidebars.
- **Game-domain layer owns gameplay and simulation:** Pure TypeScript classes and functions that compute production ticks, resource deductions, road pathfinding, and population happiness.
- **Persistence layer owns saving and loading:** Serializes grid and domain state to IndexedDB with schema migration support.
- **Hard Rule 1:** React components **must never** directly manipulate Phaser game objects, scenes, or cameras.
- **Hard Rule 2:** Phaser scenes **must never** contain inline business, economic, or progression logic.
- **Hard Rule 3:** Cross-boundary communication must occur solely through an **Event Bus** or **Zustand store subscriptions**.

---

## 5. Target Project Structure

The project will progressively scale toward the following canonical layout:

```
Pixelopolis/
├── public/
│   └── assets/
│       ├── generated/         # Cached/exported procedural texture assets
│       ├── fonts/             # Pixel art typography
│       └── audio/             # Sound effects and ambient music
├── src/
│   ├── app/                   # Application bootstrap and layout
│   │   ├── App.tsx            # Main application wrapper
│   │   ├── GameLayout.tsx     # Canvas container + React HUD layout
│   │   └── providers/         # Context and store providers
│   ├── game/                  # Phaser 3 game implementation
│   │   ├── engine/            # Phaser initialization, game config, lifecycle
│   │   ├── scenes/            # Phaser scenes (BootScene, CityScene, etc.)
│   │   ├── world/             # World grid data structures, bounds
│   │   ├── camera/            # Pan, zoom, smooth follow, boundary clamps
│   │   ├── systems/           # Scene-level visual systems (grid highlight, selection)
│   │   ├── entities/          # Isometric tile sprites, building sprites
│   │   ├── rendering/         # Depth sorting, layer management, z-indexing
│   │   ├── graphics/          # Procedural texture generators (canvas/graphics)
│   │   └── events/            # Phaser-to-Domain / Phaser-to-React event bridge
│   ├── data/                  # Static game data & balancing definitions
│   │   ├── buildings/         # Building metadata, costs, dimensions, tiers
│   │   ├── terrain/           # Terrain types, tile properties
│   │   ├── resources/         # Resource types, production rates, recipes
│   │   └── progression/       # Milestone thresholds, unlock levels
│   ├── components/            # React UI components
│   │   ├── hud/               # Top resource bar, level display, settings toggle
│   │   ├── construction/      # Building catalog, category tabs, cost tags
│   │   ├── resources/         # Resource breakdown cards, storage metrics
│   │   ├── buildings/         # Building inspector, upgrade & demolish modals
│   │   └── common/            # Buttons, modals, tooltips, pixel badges
│   ├── store/                 # Zustand state stores (UI state, city snapshots)
│   ├── persistence/           # Storage layer
│   │   ├── migrations/        # IndexedDB version migrations
│   │   ├── db.ts              # IndexedDB client & store operations
│   │   └── serializer.ts      # Game state serialization & deserialization
│   └── types/                 # Shared TypeScript interfaces & domain types
├── tests/
│   ├── unit/                  # Vitest unit tests (math, logic, pure functions)
│   ├── integration/           # Vitest integration tests (systems + stores)
│   └── e2e/                   # Playwright end-to-end browser specifications
├── docs/                      # Architectural documentation & project logs
│   ├── ARCHITECTURE.md        # Comprehensive system architecture document
│   ├── GAME_DESIGN.md         # Full game design specification
│   ├── DEVELOPMENT_ROADMAP.md # 15-phase implementation roadmap
│   ├── DEVELOPMENT_LOG.md     # Phase-by-phase progress log
│   └── TECH_DECISIONS.md      # Architecture Decision Records (ADRs)
├── GEMINI.md                  # Project constitution (this file)
├── README.md                  # Human-readable project overview
└── package.json               # (Introduced in Phase 1)
```

> [!IMPORTANT]
> **Progressive Scaffolding Policy:** Do not create hundreds of empty directories or dummy files up-front. Create directories and files strictly as their corresponding implementation phase arrives. In Phase 0, only documentation files and essential root items are created.

---

## 6. Isometric World Standards

All world positioning and spatial mechanics adhere to standard 2:1 isometric projection standards:

### Tile Geometry & Projection
- **Tile Width:** `64` pixels
- **Tile Height:** `32` pixels
- **Isometric Ratio:** `2:1`
- **Initial World Dimensions:** `20 × 20` tiles (400 total grid cells)

### Coordinate Systems
1. **Grid Coordinates `(gx, gy)`:** Integer tile indices on the 2D world grid. Authoritative for all simulation logic, building placements, and persistence.
2. **Screen / World Coordinates `(sx, sy)`:** Float pixel coordinates on the Phaser canvas. Derived dynamically for sprite positioning.

Entities and building footprints are **always stored and calculated in grid coordinates**, never in screen coordinates.

### Transformation Formulas
```
Grid to Screen:
  sx = originX + (gx - gy) * (TILE_WIDTH / 2)
  sy = originY + (gx + gy) * (TILE_HEIGHT / 2)

Screen to Grid (Pointer Picking):
  Apply camera scroll & zoom: (wx, wy) = camera.getWorldPoint(pointer.x, pointer.y)
  dx = wx - originX
  dy = wy - originY
  gx = floor((dx / (TILE_WIDTH / 2) + dy / (TILE_HEIGHT / 2)) / 2)
  gy = floor((dy / (TILE_HEIGHT / 2) - dx / (TILE_WIDTH / 2)) / 2)
```

### Depth Sorting (Z-Indexing)
To prevent isometric sorting glitches:
- **Base Ground Tiles:** `depth = gx + gy`
- **Objects & Multi-Tile Buildings:** Base depth = `(gx + footprintX - 1) + (gy + footprintY - 1)`. Vertical offset applied to maintain correct occlusion for tall structures.

---

## 7. Procedural Graphics Standards

Pixelopolis leverages programmatic pixel art to generate clean, lightweight, and extensible isometric art without relying on external art suites.

### Visual Rules
- **Pixel Art Configuration:** Phaser game instance configured with `pixelArt: true`, `antialias: false`, and `roundPixels: true`.
- **Scaling:** Nearest-neighbor scaling only. No linear smoothing.
- **Lighting Direction:** Global light source originates from the **Upper-Left** (illuminating top and top-left facets).
- **Shadow Direction:** Shadows are cast toward the **Lower-Right** with alpha-blended dark tones.
- **Sprite Origins:** 
  - Ground tiles: `(0.5, 0.5)`
  - Tall structures / buildings: Bottom-center `(0.5, 1.0)` or aligned to bottom tile center.
- **Building Footprints:** Strict integer multiples of 1×1 tiles (`1×1`, `2×2`, `2×3`, `3×3`, etc.).
- **Palette Discipline:** Restrict color usage to coherent, harmonious palettes per biome and building tier.
- **Deterministic Seeds:** All procedural generators must accept a seed to ensure deterministic reproduction.
- **Texture Reuse & Caching:** Every procedurally drawn texture is generated once onto a temporary canvas, committed to Phaser's `TextureManager` via `generateTexture()`, and reused by sprite key. Check `textures.exists(key)` before drawing.

---

## 8. Official Hardware and Performance Policy

Pixelopolis enforces a constitutional project decision:

> **Performance Priority: BALANCED**
> Pixelopolis aims to support low-end computers while preserving good visual quality and gameplay responsiveness on recommended and high-end hardware.

### 8.1 Provisional Hardware Targets
These are design targets, not verified hardware requirements. Actual compatibility must be established through empirical benchmarking on representative physical systems:

| Profile | System RAM Target | Performance Target | Target Graphics Preset |
| :--- | :--- | :--- | :--- |
| **Minimum** | **2 GB** System RAM | **30 FPS** | Low Preset |
| **Recommended** | **4 GB** System RAM | **60 FPS** | Medium Preset |
| **Comfortable** | **8 GB or more** | **60+ FPS** (enhanced effects & distance) | High Preset |

*Environmental Context:* Operating system overhead, browser architecture, GPU capabilities, available free RAM, and concurrent background applications substantially affect whether the game can run within these thresholds.

### 8.2 Mandatory Engineering Principles
All development phases must incorporate these 10 performance principles:
1. **Memory-efficient asset generation:** Avoid redundant canvas allocations during procedural sprite synthesis.
2. **Texture caching and reuse:** Never duplicate textures; check `textures.exists(key)` before drawing.
3. **Chunk-based rendering for large worlds:** Partition larger world grids into render chunks with off-screen culling.
4. **Object pooling where beneficial:** Recycle transient display objects, selection indicators, and particles.
5. **Efficient simulation scheduling:** Decouple rendering ticks from simulation ticks; throttle background calculations.
6. **Reduced unnecessary React rendering:** Memoize pure UI components and prevent wasteful re-renders from high-frequency game ticks.
7. **Adaptive graphics quality:** Dynamically or manually throttle decorative visual effects based on target presets.
8. **Efficient cleanup of unused resources:** Cleanly destroy scenes, textures, and event listeners upon unmount/shutdown.
9. **Prevention of memory leaks:** Maintain zero unbounded array growth, detached DOM references, or lingering event listeners.
10. **Continuous performance regression testing:** Audit frame-times, heap allocations, and bundle sizes in CI/test suites.

### 8.3 Graphics Presets
The game architecture accommodates three scalable graphics presets without compromising game identity:
- **Low:** Prioritizes compatibility and stable 30 FPS performance on entry-level machines. *(Note: Must not unnecessarily degrade the core pixel-art visual identity).*
- **Medium:** Balanced visual fidelity, ambient details, and steady 60 FPS performance.
- **High:** Enhanced particle effects, ambient decorations, extended rendering view distances, and smooth animations.

### 8.4 Empirical Performance Measurement
Performance budgets must be established progressively through profiling rather than arbitrary hard limits:
- **Measurable Metrics:** Track system RAM and browser-tab memory where measurable, JavaScript heap usage, GPU memory where measurable, average FPS, frame-time consistency, initial loading time, texture memory, and object count.
- **Process Memory Distinction:** Distinguish browser-process baseline memory from the incremental memory directly attributable to Pixelopolis.
- **Progressive Budgeting:** Establish measured budgets progressively and revise them when empirical evidence supports a change.

---

## 9. Antigravity Development Rules

These behavioral instructions must guide every development step:

### Before Implementing Any Feature
1. **Inspect Existing Code:** Check the current repository structure, existing files, and active implementations.
2. **Read Project Instructions:** Review `GEMINI.md` and related documents in `docs/`.
3. **Review Architecture Docs:** Check `docs/ARCHITECTURE.md` and `docs/TECH_DECISIONS.md`.
4. **Identify Dependencies & Collisions:** Determine impacted files and downstream consequences.
5. **Formulate Strategy:** Plan the minimal necessary changes.

### During Implementation
1. **Scope Precision:** Modify only files directly required for the task.
2. **Preserve Existing Functionality:** Do not break or discard working features.
3. **Follow Architectural Conventions:** Maintain established patterns and module separations.
4. **Avoid Dependency Bloat:** Do not introduce external libraries unless explicitly approved.
5. **Add Comprehensive Tests:** Write unit and/or integration tests verifying new logic.
6. **Maintain Code Clarity:** Write clean, self-documenting TypeScript with strict typing.
7. **Keep Documentation Current:** Update `docs/DEVELOPMENT_LOG.md` and related documentation.

### After Implementation
1. **Run TypeScript Verification:** `npx tsc --noEmit` (must succeed with zero errors).
2. **Execute Test Suite:** Run `vitest run` to ensure unit/integration tests pass.
3. **Verify Production Build:** Run `npm run build` to confirm bundling succeeds.
4. **Resolve Regressions:** Fix any compile errors or broken tests immediately.
5. **Honest Reporting:** Report actual command results and test outputs transparently.

### Absolute Invariants
- **Never claim tests pass without executing them.**
- **Never silently remove or downgrade features.**
- **Never perform unrequested rewrites or architectural shifts without prior discussion and approval.**
- **Never execute tasks outside the requested phase.**

---

## 10. Development Roadmap Overview

| Phase | Milestone Name | Primary Focus | Status |
| :---: | :--- | :--- | :---: |
| **0** | **Project Constitution & Workspace Initialization** | Establish documentation, architectural foundations, rules, and repository structure. | ✅ Complete |
| **1** | **Project Foundation & Phaser Integration** | Build setup (Vite, React, TS, Phaser 3), React-Phaser canvas mounting, lifecycle bridge. | ✅ Complete |
| **2** | **Isometric Grid & World Interaction** | 2:1 isometric math, camera pan/zoom controls, tile picking, hover cursor, boundaries. | ✅ Complete |
| **3** | **Procedural Graphics Engine** | Programmatic pixel-art pipeline, diamond tile rendering, texture caching, lighting models. | ⬜ Planned |
| **4** | **Terrain & Map Generation** | 20×20 seeded terrain generation, tile types (grass, water, dirt), auto-tiling borders. | ⬜ Planned |
| **5** | **Building & Construction System** | Building definitions, multi-tile placement preview, footprint validation, construction workflow. | ⬜ Planned |
| **6** | **Road & Connectivity System** | Road placement, auto-connecting isometric road segments, network connectivity graph. | ⬜ Planned |
| **7** | **Economy & Resource Management** | Currency (coins), material production cycles, storage caps, resource deduction rules. | ⬜ Planned |
| **8** | **Population Simulation** | Residential capacity, citizen happiness calculations, service demands, population growth. | ⬜ Planned |
| **9** | **Public Services & Infrastructure** | Power, water, fire, police, health coverage radii, service deficit penalties. | ⬜ Planned |
| **10** | **Progression, Missions & Achievements** | City level, XP curves, unlock trees, objective tracker, milestone rewards. | ⬜ Planned |
| **11** | **Game UI & UX Polish** | React HUD polish, audio integration hooks, notifications, inspection dialogs, responsiveness. | ⬜ Planned |
| **12** | **Local Persistence & Save/Load** | IndexedDB storage, multiple save slots, auto-save, schema migrations, export/import. | ⬜ Planned |
| **13** | **Online Infrastructure & Multiplayer** | *(Deferred)* Cloud saves, leaderboards, cross-city trading, Supabase backend. | ⏳ Deferred |
| **14** | **Testing, Optimization & Deployment** | Performance profiling, sprite batching, Playwright E2E suites, production deployment. | ⬜ Planned |

---

## 11. Current Project Status & Active Baseline

- **Current Status:** Phase 2 (Isometric Grid & World Interaction) Complete.
- **Git Milestone:** `bbd28d2` on `main` (synchronized with `origin/main`).
- **Next Phase:** Phase 3 (Procedural Graphics Engine) — awaiting explicit user approval.
