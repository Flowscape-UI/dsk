# Changelog

Notable changes to Design System Kit are grouped by the library version from `packages/vanilla/package.json`, newest first. Each entry includes its status and an ISO 8601 recording timestamp. For unreleased versions, the timestamp records this changelog snapshot, not an npm publication. See the [repository](https://github.com/Flowscape-UI/dsk) for source code.

## 1.0.0 - 2026-10-12

- **Status:** Ready for release.
- **Recorded at:** `2026-10-12T12:10:00+03:00` (Europe/Chisinau).

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

- Prepared 1.0.0 for publication, with release-readiness validation and an optional first-publish npm credential. Publication remains an explicit owner action.

- Organized each component family around an explicit public index and internal helpers, preserving the package API and custom-element registration.

- Replaced the library Vite/tsc build with tsdown, preserving CSS exports, raw SVG assets, lazy ESM chunks, and public declarations.
- Raised the development Node.js minimum to 24.11 and pinned 24.19.0 for CI.
- Added a `/dsk/` Pages build containing only documentation, with base-aware theme links and engine icons.

- Consolidated npm ignore rules in `packages/vanilla/.npmignore`, removed obsolete root test artifacts and the empty local pnpm store, and removed the roadmap document.
- Organized this changelog by library version and recording timestamp, keeping publication status explicit.

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

- Excluded the local playground from Pages and corrected installation CDN examples for version 1.0.0.
- Applied distribution-only exports when packing with pnpm and validated the exact archive before publication.

- Infinite input dragging in Firefox now uses pointer events for locked movement and release. Values update while the button is held, and dragging ends on release even when compatibility mouse events are suppressed.
- Drag reversal at numeric bounds discards outward overshoot, so reversing direction adjusts the value immediately.
- Angle unit conversion preserves physical angles and explicit bounds independently of initial HTML attribute order. The dial's sector leaves a transparent opening around its center value.
- Patched the VitePress outline to guard against missing container and marker references during navigation.

### Verification notes

- Browser suites are separate from `pnpm check`; CI currently runs the component and distribution browser suites, not the documentation suite.
- Some older documentation browser expectations remain out of sync with the homepage. See the dated [verification note in Contributing](CONTRIBUTING.md#ci-and-known-verification-gaps). This changelog does not mark those scenarios as fixed.
