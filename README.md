# Pixelopolis

> **An original browser-based isometric pixel-art city-building and management simulation.**

Pixelopolis is an expansive, browser-first city-building game where players plan, construct, and manage a thriving metropolis on an isometric grid. From modest rural beginnings to a bustling high-density urban core, players balance resource extraction, factory production, municipal services, road networks, and citizen happiness.

Rendered in charming, procedurally generated pixel art with a classic 2:1 isometric projection, Pixelopolis combines deep simulation mechanics with immediate accessibility in desktop web browsers.

---

## Game Vision

Pixelopolis delivers a rich, strategic single-player city-building experience inspired by genre classics like *SimCity BuildIt*, while establishing its own original identity, aesthetics, and mechanics:

- 🏘️ **Residential Expansion:** Construct houses, suburban neighborhoods, and towering apartment complexes to grow your population.
- 🏪 **Commercial Districts:** Establish bustling retail zones and markets that generate coin revenues based on surrounding foot traffic.
- 🏭 **Industrial Supply Chains:** Build factories and resource processors to turn raw materials into construction goods and manufactured items.
- 🛣️ **Connected Road Networks:** Lay out efficient transportation grids with automatic isometric road stitching and network flow verification.
- 🪙 **Balanced Economy:** Manage city funds (coins), taxes, construction material inventories, and operational budgets.
- 👥 **Citizen Needs & Happiness:** Ensure access to power, clean water, healthcare, fire protection, and policing while mitigating industrial pollution.
- 🗺️ **World Exploration & Land Expansion:** Unlock new plots across procedurally generated terrain, overcoming natural obstacles like rivers and hills.
- ⬆️ **Tiered Building Upgrades:** Upgrade structures to higher density tiers, unlocking increased capacity, greater revenues, and advanced visual designs.
- 🏆 **Missions & Progression:** Follow guided mayor goals, unlock achievements, and level up your city rating.
- 🎨 **100% Procedural Pixel Art:** Clean, deterministic, and cached programmatic graphics that load instantly and scale crisply.

*Pixelopolis is an independent, original intellectual property with custom mechanics, brand identity, and procedurally generated assets.*

---

## Technology Stack

The project relies on a modern, decoupled web architecture engineered for long-term scalability and strict separation of concerns:

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Game Engine** | **Phaser 3** | Canvas rendering, isometric scene management, camera pan/zoom, sprite depth sorting, and pointer interaction. |
| **User Interface** | **React 18+** | High-performance HTML/CSS HUD, construction menus, inspector drawers, dialogs, and settings overlays. |
| **Language** | **TypeScript** | Strict static typing across all modules (`strict: true`, no implicit `any`). |
| **Build & Dev Tool** | **Vite** | Ultra-fast Hot Module Replacement (HMR) and optimized ES module bundling. |
| **State Bridge** | **Zustand** | UI state management and reactive data bridge between the simulation domain and React components. |
| **Persistence** | **IndexedDB** | Client-side game save/load storage with multi-slot support and schema migrations. |
| **Unit Testing** | **Vitest** | Pure TypeScript test runner for simulation logic, math, and domain systems. |
| **E2E Testing** | **Playwright** | Browser-driven automated testing verifying end-to-end user workflows. |
| **Future Backend** | **Supabase** | *(Deferred)* Cloud saves, leaderboards, and asynchronous player trading (introduced post-single-player). |

---

## Development Philosophy & Architectural Principles

Pixelopolis is built upon 15 core architectural principles:

1. **Modular Architecture:** Self-contained modules with minimal coupling and explicit public interfaces.
2. **Rendering Separated from Logic:** The simulation domain operates headlessly and deterministically; Phaser is strictly a presentation and input layer.
3. **UI State Separated from Simulation:** React manages interface interactions; Zustand mirrors relevant simulation state snapshots without hosting game ticks.
4. **Data-Driven Mechanics:** Entity attributes, construction recipes, upgrade prerequisites, and balance parameters reside in structured configuration data.
5. **Maintainable & Reusable Code:** Composable systems designed for unit testability and long-term maintenance.
6. **Minimal Dependencies:** Zero tolerance for bloat; standard web APIs and lightweight, proven libraries only.
7. **Strict TypeScript:** Full type safety, strong interfaces, and strict compiler enforcement.
8. **No Monolithic Files:** Small, focused files adhering to the Single Responsibility Principle.
9. **No Circular Dependencies:** Clean directional DAG imports.
10. **Robust Error Handling:** Defensive validation on inputs, actions, and persistence data.
11. **Deterministic Procedural Generation:** Seed-based PRNG ensures consistent terrain and visual output.
12. **Optimized Graphics & Memory:** Procedural textures are drawn once, cached in Phaser's `TextureManager`, and reused across instances with object pooling where beneficial.
13. **Preserve Working Functionality:** Every incremental phase preserves and validates all prior features.
14. **Documented Decisions:** Major design choices recorded via Architecture Decision Records (`docs/TECH_DECISIONS.md`).
15. **Avoid Unnecessary Rewrites:** Evolution over revolution; improve and extend existing foundations.

---

## Hardware Targets & Performance Policy

Pixelopolis commits to a foundational project posture:

> **Performance Priority: BALANCED**
> The game is engineered to accommodate low-end computer hardware while offering rich visuals and responsive 60 FPS gameplay on recommended and high-end systems.

### Provisional Hardware Targets
*These specifications represent design targets rather than verified hardware requirements. Actual compatibility will be established progressively via real-world benchmarking on representative hardware.*

| Specification | Minimum Target | Recommended Target | Comfortable Target |
| :--- | :--- | :--- | :--- |
| **System RAM** | **2 GB** System RAM | **4 GB** System RAM | **8 GB or more** |
| **Target Frame Rate** | **30 FPS** (Low preset) | **60 FPS** (Medium preset) | **60+ FPS** (High preset) |
| **Graphics Settings** | Low Preset | Medium Preset | High Preset |
| **Target Experience** | Smooth, accessible city simulation | Fluid 60 FPS with full ambient animations | Enhanced particle effects & draw distance |

*Environmental Caveat:* Operating system footprint, browser tab overhead, GPU performance, available free RAM, and background software directly affect whether the application operates comfortably within these thresholds.

### Mandatory Engineering Principles
1. **Memory-efficient asset generation:** Avoid excess canvas allocations when procedurally synthesizing sprites.
2. **Texture caching and reuse:** Commit procedural textures to Phaser's `TextureManager` and reuse by key.
3. **Chunk-based rendering for large worlds:** Partition the grid into spatial chunks to support frustum culling.
4. **Object pooling where beneficial:** Recycle transient game objects, previews, and indicators.
5. **Efficient simulation scheduling:** Decouple simulation ticks from rendering loops and throttle background processing.
6. **Reduced unnecessary React rendering:** Prevent high-frequency game ticks from triggering unneeded React re-renders.
7. **Adaptive graphics quality:** Support Low, Medium, and High graphics presets without degrading pixel-art identity.
8. **Efficient cleanup of unused resources:** Safely destroy textures, listeners, and scenes on unmount.
9. **Prevention of memory leaks:** Maintain zero unbounded data structures or detached DOM elements.
10. **Continuous performance regression testing:** Track frame rates, heap usage, and memory in automated testing.

### Empirical Profiling & Progressive Budgets
Rather than imposing arbitrary hard memory limits up-front, Pixelopolis tracks measurable telemetry (JS heap, tab memory, GPU memory, FPS, frame-time variance, initial load time, texture count) and refines performance budgets empirically as city scale expands.

---

## Target Project Architecture

```
Pixelopolis/
├── public/
│   └── assets/
│       ├── generated/         # Cached procedural texture exports
│       ├── fonts/             # Pixel typography
│       └── audio/             # Sound effects & soundtrack
├── src/
│   ├── app/                   # Root application bootstrap & layouts
│   ├── game/                  # Phaser 3 scenes, camera, isometric engine, rendering
│   ├── data/                  # Static definitions (buildings, terrain, resources, progression)
│   ├── components/            # React UI components (HUD, construction, dialogs)
│   ├── store/                 # Zustand state stores
│   ├── persistence/           # IndexedDB client, migrations, serializers
│   └── types/                 # Shared TypeScript interfaces & models
├── tests/
│   ├── unit/                  # Vitest unit tests
│   ├── integration/           # Vitest integration tests
│   └── e2e/                   # Playwright browser tests
├── docs/                      # Full project documentation & logs
├── GEMINI.md                  # Project constitution & development instructions
└── README.md                  # Project overview (this file)
```

---

## Development Roadmap

The development of Pixelopolis is structured across 15 distinct, sequential phases:

| Phase | Milestone | Scope & Deliverable | Status |
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
| **13** | **Online Infrastructure & Multiplayer** | Cloud saves, social city visits, trading (*strictly deferred post-single-player*). | ⏳ Deferred |
| **14** | **Testing, Optimization & Deployment** | Performance profiling, sprite batching, Playwright E2E suites, production deployment. | ⬜ Planned |

---

## Quick Start & Development Scripts

```bash
# Install dependencies
npm install

# Start local Vite development server (http://localhost:3000)
npm run dev

# Run Vitest unit & integration tests
npm test

# Run Playwright end-to-end browser smoke tests
npm run test:e2e

# Run production build (type checking + Vite bundling)
npm run build
```

---

## Current Status

- **Active Phase:** Phase 2 — Isometric Grid & World Interaction.
- **State:** ✅ Complete. Robust 2:1 isometric tile interaction has been established featuring precise raycasting, green hover diamond highlights, cyan click-to-select indicator reticles with coordinate inspection in React HUD, drag-vs-click thresholding (preventing accidental tile selection during camera pan), algorithmic toggleable isometric grid overlay ('G' key and HUD button), Vitest unit test suite (20 tests), Playwright E2E suites (3 tests), and verified production build.
- **Next Milestone:** Phase 3 — Procedural Graphics Engine (awaiting explicit user approval).
