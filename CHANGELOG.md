# Changelog

Notable changes to Design System Kit are grouped by the library version from `packages/vanilla/package.json`, newest first. Each entry includes its publication status. A date in an unreleased entry heading does not indicate an npm publication. See the [repository](https://github.com/Flowscape-UI/dsk) for source code.

## 1.1.0 - 2026-10-13

- **Status:** Released.
- **Released at:** `2026-10-13T00:07:27+03:00` (Europe/Chisinau).

### Added

- Configurable `snap-angle` (5 degrees by default) for Shift-dragging angles.
- Package discovery keywords and live npm version badges in both READMEs.
- Local undo/redo for angles, color controls, curves, guides, cameras, linked fields, and tree edits.

### Changed

- Reuse one bounded history store across editable components. Uploads and non-editable wrappers do not keep history.
- Document keyboard history and angle snapping in English and Russian, with a playground control for the snap interval.

### Fixed

- Linked field undo restores distinct original values as a group.
- Homepage ruler guides preserve canvas activation during touch gestures and focus transfers.

## 1.0.0 - 2026-10-12

- **Status:** Released.
- **Released at:** `2026-10-12T13:19:15+03:00` (Europe/Chisinau).

### Added

- GitHub Actions workflows for Pages deployment and guarded npm trusted publishing from versioned GitHub releases.
- A browser IIFE build exposed as `DSK`, plus direct ESM/IIFE distribution smoke tests.

- The `dsk-input` numeric control with manual entry, arithmetic expressions, draggable adjustment, bounds, looping, selectable drag progression, per-field history, select-on-focus, and independent horizontal/vertical keyboard steps.
- The `dsk-input-hex` control with single-channel, RGB, and RGBA formats, HEX expressions and bounds, exact format conversion, and a replaceable drag handle.
- The `dsk-input-color` RGB/RGBA control with live swatches, a transparency checkerboard, and `alpha-mode="hex|percent"`. Percent mode combines RGB editing with a draggable opacity field while preserving RGBA values and shared history.
- `dsk-input-group` for coordinated fields, linked editing, mixed values, and custom control adapters.
- `dsk-input-upload` for single-file selection and drop, accepted-type filtering, image previews, document icons, rejection events, and clearing. Files remain local until the application chooses to send them.
- Independent `dsk-color-area`, `dsk-color-hue`, and `dsk-color-alpha` controls for composing color interfaces with pointer and keyboard input.
- `dsk-color-eyedropper` with native screen picking where supported, page snapshots, live canvas sampling, registered application modes, and a customizable non-native magnifier. Page mode captures the visible viewport.
- `dsk-angle` with a compass-style dial, a center value, continuous rotation, optional bounded arcs, and degree, radian, pi, turn, and gradian units.
- `dsk-curve` with editable endpoints and Bézier segments, point insertion/removal, presets, serialized paths, CSS easing output, and motion preview.
- Layer hierarchy controls: `dsk-layer-tree`, `dsk-list-value`, `dsk-list-header`, `dsk-list-footer`, and `dsk-tree-search`, including selection, renaming, reordering, and search.
- `dsk-pan-zoom`, `dsk-ruler`, and `dsk-canvas-marker`, plus exported camera-coordinate helpers and bindings for ordinary HTML overlays.
- A VitePress documentation website with English and Russian guides, local search, framework-specific installation examples, multi-file SSR examples, API references, and interactive component demos.
- Shared documentation example panels and reusable object previews, including motion examples for curves.
- Real-world examples for tldraw SDK, Excalidraw, React Flow, Three.js, Konva.js, and Fabric.js. Each includes a walkthrough, an IDE-style source explorer, and a downloadable standalone project with a built DSK snapshot.
- Automatic client-side loading for engine examples, with loading indicators, failure/retry states, navigation cleanup, and engine logos in documentation navigation.
- A presentation README with project branding, badges, usage examples, component and integration overviews, and a GIF captured from the rotation demo.
- Strict TypeScript source and public declarations, unit tests, component and documentation browser suites, and a built public API type check.
- A pnpm/Turborepo workspace with the library, playground, and documentation, using Vite, ESLint, Prettier, and GitHub Actions.

### Changed

- Replaced the npm package API manual with a visual introduction matching the repository README, including shared branding, demos, and links to the documentation.

- Prepared 1.0.0 for publication, with release-readiness validation and an optional first-publish npm credential. Publication remains an explicit owner action.

- Organized each component family around an explicit public index and internal helpers, preserving the package API and custom-element registration.

- Replaced the library Vite/tsc build with tsdown, preserving CSS exports, raw SVG assets, lazy ESM chunks, and public declarations.
- Raised the development Node.js minimum to 24.11 and pinned 24.19.0 for CI.
- Added a `/dsk/` Pages build containing only documentation, with base-aware theme links and engine icons.

- Consolidated npm ignore rules in `packages/vanilla/.npmignore`, removed obsolete root test artifacts and the empty local pnpm store, and removed the roadmap document.
- Organized this changelog by library version, keeping publication status explicit without a separate recording timestamp.

- Linked the [DSK GitHub repository](https://github.com/Flowscape-UI/dsk) throughout project documentation, package metadata, and website navigation; replaced the homepage placeholder with a source link.

- Extracted the exported `DskInputBase` extension contract to share parsing hooks, interaction, history, form integration, and styling across numeric, HEX, and color inputs.
- HEX and color drag/keyboard adjustment fill R, G, B, then A without clearing completed channels: `FF0000` to `FF0100` to `FF0200`. Reverse steps drain channels in reverse order; loops apply at whole-value bounds.
- Undo/Redo shortcuts use the physical `KeyZ` key across keyboard layouts. Escape cancels unfinished edits and removes input focus.
- Infinite dragging follows actual pointer movement with a wrapping virtual cursor instead of automatic edge adjustment.
- The documentation homepage uses a dark-only design, an interactive canvas, responsive inspectors, animated feature sections, an installation card, and a shared support button. The canvas becomes interactive after explicit focus so ordinary page scrolling remains available beforehand.
- Homepage canvas dots scale with the camera, fade between 70% and 55% zoom, and detach below that range.
- Documentation footer layout accounts for the sidebar while the homepage retains its full-width footer layout.
- Moved library tests into `packages/vanilla/tests/unit`, `tests/browser`, and `tests/types`; moved documentation browser tests into `apps/docs/tests/e2e`. Playwright configs and dependencies now belong to those workspaces. Root commands delegate to them, including `pnpm test:docs`.
- Updated [repository](https://github.com/Flowscape-UI/dsk) guidance to document current workspace ownership, bilingual content, browser-only imports, test commands, and publication boundaries.

### Fixed

- Allowed one layout unit of platform font-metric rounding in page-eyedropper fixture widths while retaining pixel-edge and glyph-coverage checks.
- Removed the npm token fallback from the release workflow and documented first-package creation through local staged publishing before configuring OIDC.
- Selected full Chromium for library browser checks on Linux and macOS so CI exercises browser-level Pointer Lock and profile zoom rather than headless shell.
- Excluded the local playground from Pages and corrected installation CDN examples for version 1.0.0.
- Applied distribution-only exports when packing with pnpm and validated the exact archive before publication.

- Infinite input dragging in Firefox now uses pointer events for locked movement and release. Values update while the button is held, and dragging ends on release even when compatibility mouse events are suppressed.
- Drag reversal at numeric bounds discards outward overshoot, so reversing direction adjusts the value immediately.
- Angle unit conversion preserves physical angles and explicit bounds independently of initial HTML attribute order. The dial's sector leaves a transparent opening around its center value.
- Patched the VitePress outline to guard against missing container and marker references during navigation.

### Verification notes

- Browser suites are separate from `pnpm check`; CI currently runs the component and distribution browser suites, not the documentation suite.
- Some older documentation browser expectations remain out of sync with the homepage. See the dated [verification note in Contributing](CONTRIBUTING.md#ci-and-known-verification-gaps). This changelog does not mark those scenarios as fixed.
