# Architecture

This document explains ownership and design decisions. For installation and complete attributes, events, and styling APIs, use the [component reference](apps/docs/components/inputs.md) and [documentation guides](apps/docs/guide/introduction.md). For development commands, use [CONTRIBUTING.md](CONTRIBUTING.md).

## Workspaces

`packages/vanilla` provides `@flowscape-ui/dsk`, a standalone ESM library with no runtime framework. The page eyedropper lazy-loads `dom-to-image-more`; canvas and native modes do not load it. Source is strict TypeScript. tsdown produces `dist/index.js`, additional lazy ESM chunks, source maps, and `dist/styles.css`, and bundles public declarations into `dist/index.d.ts` using TypeScript. A second configuration produces the minified browser IIFE `dist/dsk.global.js` with the `DSK` global and its dependencies inlined. Consumers explicitly import the CSS. Importing the JavaScript entry registers the library's custom elements.

`apps/playground` consumes the public API through `workspace:*`. During development, the `development` export points to source files for hot reload without a separate watcher. TypeScript resolves development types directly from source. Production builds and external consumers use `dist`; `dependsOn: ["^build"]` ensures the library builds before its consumers.

`apps/docs` is a VitePress site with a Vue theme. Markdown files become website pages. English content lives under `guide/`, `components/`, and `examples/`; Russian counterparts use the same paths under `ru/`. The site includes local full-text search, a dark-only theme, live component examples, and downloadable integration projects. It builds into `apps/docs/dist`. Root Markdown files describe [repository](https://github.com/Flowscape-UI/dsk) maintenance and are separate from website content.

## Boundaries

Each component family owns an explicit `index.ts` that exports its supported API and registers its custom elements. The package entry imports the shared stylesheet and re-exports these six family indexes. Keep component classes and public adapters in the family root; keep internal models, parsers, rendering helpers, and interaction controllers in its `helpers/` directory. Public types defined by a model are explicitly re-exported by the family index, without exposing all model functions. Internal implementation files import concrete modules rather than their own family index to avoid registration cycles.

For example, `angle/dsk-angle.ts` implements the public element, `angle/helpers/angle-model.ts` owns its math, and `angle/index.ts` exposes `DskAngle`, `AngleUnit`, and `AngleNumber`. Canvas coordinate adapters are public API in `canvas-widgets/coordinates.ts`; ruler calculations are internal in `canvas-widgets/helpers/ruler-model.ts`. Every source directory has an index.ts, including each helpers directory. Helper indexes expose internal modules for discovery but are not re-exported wholesale by family indexes. Keep runtime imports concrete where importing the helper barrel would eagerly load the page eyedropper renderer. These indexes organize source code and do not introduce new npm subpath exports.

Applications may depend on libraries; libraries must not depend on applications. Do not import another workspace's `src/` files directly. Future implementations belong in `packages/react`, `packages/vue`, or similar directories when their development begins. Extract shared logic only when there is a concrete need.

The library entry registers 19 custom elements. Component families live in `input/`, `color/`, `angle/`, `curve/`, `layer-tree/`, and `canvas-widgets/`. Exported helpers let applications connect their own state and renderers; DSK does not own an editor's document model or document-wide undo history. React, Vue, and third-party engines used by documentation examples are application dependencies, not library runtime requirements.

The package entry evaluates browser APIs such as `HTMLElement` and `customElements`. SSR applications must import it on the client after their host is mounted. There is no separate server-renderable component implementation.

## Styling and accessibility

Public library variables and classes use the `dsk-` prefix. The shared stylesheet defines optional tokens scoped to `.dsk-theme`; components also own their Shadow DOM styles, defaults, and component-specific variables. A `.dsk-theme` wrapper is not required to instantiate them. The documentation's dark-only presentation does not restrict themes in consuming applications. Global CSS resets belong only in applications.

Components should support keyboard interaction, visible focus, accessible names, disabled states, and resource cleanup. The eyedropper detects browser support and exposes its availability to applications.

Component-local undo/redo shares the internal `DskHistory<T>` store in `src/helpers/history.ts`. It keeps at most 100 immutable snapshots, discards redo after a new committed edit, and does not own DOM events. `DskControlHistory<T>` bridges snapshot capture and keyboard shortcuts. Components decide transaction boundaries and restore through their own event contracts. Linked inputs and layer trees capture composite snapshots. Uploads and presentation-only wrappers have no history. This is not application-wide document history.

## Input base and value representations

`DskInputBase` owns the shared shadow layout, drag handle, native text field, pointer capture and lock, keyboard controls, selection, history, looping, tags, events, forms, and cleanup. It exposes standard `input` and `change` events, reflected configuration properties, a string `value`, and numeric `valueAsNumber`. The abstract base is exported for extensions but is not itself registered as a custom element.

`DskInput` and `DskInputHex` implement `parseValue`, `formatValue`, and `evaluateValue`. The decimal component handles numeric values and arithmetic expressions; HEX specializes bounds, integer steps, channel conversion, and the default hash handle through protected hooks. Additional hooks include `getValueOptions`, `normalizeValue`, `adjustValue`, `getKeyboardStep`, `defaultHandleSvg`, `valueInputMode`, `accessibleLabel`, `invalidMessage`, `refreshValue`, `onConfigurationChanged`, and `upgradeProperties`. Subclasses extend this contract rather than duplicate shared event handlers.

The text field permits incomplete drafts. Committing evaluates the representation's expression grammar, applies bounds, and restores the previous value for invalid input. Pointer dragging uses capture so a gesture can continue outside the handle; disconnecting the component releases interaction resources. The progression option changes the drag response, while the step controls its numeric increment. History shortcuts use the physical `KeyZ` code, independently of keyboard layout.

HEX values retain display order (one channel, RGB, or RGBA) while their numeric rank treats red as least significant, followed by green, blue, and alpha. Arithmetic on that rank maps `FF0000 + 1` to `000100` in format 6. Drag and keyboard steps instead fill channels sequentially, preserving completed channels: `FF0000 → FF0100 → FF0200`. Decreasing drains channels in reverse order. Loops preserve channel-step overshoot at the whole-value bounds. Bounds and explicit HEX expression operands use this same rank. Changing formats converts channels without silent quantization; values that cannot narrow exactly are cleared.

`DskInputColor` extends `DskInputHex` and restricts its canonical `format` to RGB (6) or RGBA (8) through the HEX `formatAttribute` and `resolveFormat` hooks. It inherits the HEX value and interaction rules while showing a live color square in the handle. A bundled `assets/patterns/checkerboard.svg` background reveals transparency; valid literal drafts update the overlaid color, while empty or invalid drafts leave the checkerboard visible. The base `renderDefaultHandle` hook updates the existing wrapper, preserving drag listeners and the inherited `src` image override.

CSS custom properties and the `container`, `handle`, `input`, and `tag` parts expose styling without leaking component selectors into applications. All three input types share this styling contract. Color inputs additionally expose `swatch` and `color` parts and `--dsk-input-swatch-size`. Where available, `ElementInternals` integrates named fields with forms and reset behavior.

`DskInputGroup` coordinates child controls, including linked values and mixed-value presentation. Its adapter API supports integration with additional control types. Group synchronization must not create recursive user events or lose the values remembered for mixed selections.

`DskInputUpload` is an independent `HTMLElement`, not a numeric input subclass. It selects one local `File` through a picker or drop, filters against `accept`, displays an image preview or document icon, and reports rejected files through `dsk-upload-reject`. It does not upload data to a server. Its image object URLs are owned by the component and released when no longer needed.

## Color components

`src/color/` is a separate component family, independent of `src/input/` and `DskInputBase`. It owns color-specific models and conversion helpers. The existing `DskInputColor` remains in the input family.

`DskColorArea` extends `HTMLElement` directly. It stores hue, saturation, and HSV brightness independently, preserving hue when the color becomes gray or black. Its readonly `color` property derives an uppercase opaque HEX color. A layered gradient represents the saturation and brightness plane, and a marker shows the current selection.

The area reconciles width and height to the larger requested dimension, maintaining a square even when only one dimension is provided. Pointer capture supports dragging beyond its bounds; native channel range controls provide keyboard and assistive-technology access. User edits dispatch standard `input` and `change` events, while programmatic updates are silent. Disconnection cleans up event listeners and size observation. Color area styling uses its own `--dsk-color-area-*` variables and `surface`/`marker` parts.

`DskColorHue` and `DskColorAlpha` share the internal `DskColorSliderBase` in `src/color/helpers/`, independent of input components. It owns pointer capture, cancellation, native range accessibility, keyboard controls, sizing, and event cleanup. Hue spans 0–360 inclusive; keeping 360 distinct from 0 preserves the right endpoint even though both produce red. Alpha spans 0–100 and accepts an opaque RGB HEX color independently of opacity. Its `rgba` getter returns `#RRGGBBAA`.

Slider markers have a fixed diameter. Only horizontal motion is aligned to device pixels; the stationary vertical axis stays exactly centered. The alpha marker composites its selected RGBA color over its own checkerboard to avoid adding opacity over the already translucent track. A composed `<dsk-color-picker>` remains a future component; the playground demonstrates application-level wiring of the three existing controls.

`DskColorEyedropper` extends `HTMLElement` directly within `src/color/`. Missing or empty `mode` resolves to native when supported and page otherwise; null/undefined setters and reset remove the explicit choice. Explicit mode names are preserved and do not fall back. Canvas mode (`custom` is a compatibility alias) delegates to `helpers/live-eyedropper.ts` for live sampling and a noninteractive magnifier overlay. An application-provided `.sampler` takes precedence over explicit `source`; absent both, canvas discovery follows the pointer. `createCanvasSampler` in `eyedropper-source.ts` maps viewport coordinates to a readable backing store, reads a small region, and composites transparency over white. Editors with WebGL/WebGPU, layered rendering, or their own compositing provide pixels through a sampler or registered mode. Canvas mode never rasterizes or replaces the page.

Live selection refreshes during animation frames, including with a stationary pointer, and samples again on commit. Wheel, middle-button drag, and Space + drag pass through to editor navigation. Scroll and resize retain selection and reread layout coordinates. Text controls keep keyboard interaction, and clicks outside sampleable content reach the page. One non-native selection per document is allowed. Cleanup removes temporary UI, listeners, and animation work. Abort signals and session identity prevent obsolete asynchronous hover results or canceled selections from changing state.

Page mode, selected explicitly or automatically when native picking is unavailable, lazy-loads a DOM-to-image renderer. Each activation captures the current viewport from current DOM state, including live form-control values, after document fonts settle, rather than reusing a previous capture. It provides a canvas surface to the shared magnifier controller. This frozen image permits picking arbitrary page content with known rendering differences, preparation cost, and resource limitations. Navigation stays frozen during selection. An explicitly requested unsupported mode never switches to page.

`registerMode` and `unregisterMode` manage instance-owned named adapters. `EyeDropperModeAdapter` controls optional labels and synchronous support checks, then creates an `EyeDropperSession` with a sampler, optional captured surface, and cleanup. Direct sampler registration is shorthand for a live session. Session signals and disposal cover success, cancellation, failures, replacement, and late preparation. `.modes` reports built-in and registered capabilities without listing the legacy alias. Reserved built-in names cannot be replaced; unknown names remain unsupported. `.sampler` overrides only canvas/custom mode.

Explicit `mode="native"` invokes the browser's `EyeDropper.open()` synchronously from user activation, leaving screen sampling and the overlay to the browser. Secure context and native constructor are required. `.supported` checks the chosen mode; `.nativeSupported` checks native capability. Unsupported modes disable the button without switching mode. Browser-native magnifiers cannot be styled.

The `color` attribute and property store opaque uppercase `#RRGGBB`; `.value` is a property alias. Successful picks emit standard bubbling, composed `input` and `change` events, including repeated selections of the same color. `pickstart` reports a selection request, `cancel` reports cancellation, and `pickerror` exposes `{ error }`. Custom-mode `colorpreview` exposes `{ color, x, y, pixels: ImageData }` without committing a value. `.open()` resolves to the selected color or `null`, and `.cancel()` aborts the session. Color/mode/source/sampler/grid updates, disabling, and disconnection cancel silently so late results cannot overwrite new state. The component does not provide a form value automatically. CSS parts and `--dsk-color-eyedropper-*` variables style both the button and custom magnifier; `slot="magnifier"` replaces the magnifier's contents while retaining positioning and interaction. Native browser UI cannot be styled. A browser-only implementation, whether JavaScript or WASM, cannot bypass the browser's operating system access restrictions.

## Angle control

`src/angle/` contains `DskAngle`, an independent `HTMLElement`, and its angle model. It does not inherit from `DskInputBase` or depend on color components. The model handles units, bounds, stepping, and display formatting; the component owns rendering and interaction.

Public `value`, `min`, `max`, and `step` are numbers in the selected `unit`: `deg`, `rad`, `pi`, `turn`, or `grad`. Geometry always represents a physical angle within a single revolution, starting at the top and increasing clockwise. Changing units after initial connection converts explicit numeric attributes to preserve the angle, bounds, and increment. Initial HTML attribute order does not change their interpretation. The readonly `degrees` property provides a common integration value, and `formattedValue` exposes the center label.

The SVG draws a thin circular track, scale ticks, four cardinal labels, a soft annular sector, and a direction needle. The sector's geometry leaves a transparent central opening for the value; it does not mask the center with a theme-dependent background. The scale labels use the selected unit. The `segments` attribute controls tick count independently of step precision, while the marker stays 10px across. Pointer capture supports rotation outside the ring. Without either bound attribute, rotation is continuous and values wrap at the zero/full-turn seam. Presence of `min` or `max` enables a bounded arc, including explicit zero-to-full-turn bounds; removing both restores continuous rotation. The numeric `min` and `max` getters still report effective bounds in either mode. Escape, pointer cancellation, or focus loss restores the starting value. A hidden native range provides keyboard and assistive-technology access. Native `input` and `change` events report live and committed user edits; programmatic updates remain silent. Disconnection releases listeners and active interaction resources.

The control exposes its own `--dsk-angle-*` variables and `container`, `dial`, `track`, `fill`, `needle`, `scale-label`, `marker`, `value`, and `input` parts. Sector opacity and scale label color have dedicated variables. The playground demonstrates unit conversion, restricted arcs, live styling, and event handling.

## Curve editor

`src/curve/` contains the independent `DskCurve` custom element and its piecewise cubic Bézier model. Endpoints default to `(0, 0)` and `(1, 1)` but are editable through handles, coordinate fields, and `.start`/`.end` tuples. They keep their time order and cannot be deleted. All coordinates stay within 0–1. Nodes preserve their X order and segment controls are bounded during editing to prevent time loops. Horizontal position represents time and vertical position represents progress.

Clicking the line uses nearest-point hit testing and De Casteljau subdivision to add a node without changing the shape. Selecting a point shows its coordinates; dragging, arrow keys, and native fields edit it. The keyboard-accessible Add point button splits the widest segment. Delete or Remove point joins the selected node's neighboring segments using their outer controls. Presets reset to one segment.

The `value` attribute accepts presets, four coordinates, CSS `cubic-bezier(...)`, or the component's `curve(...)` serialization, using an object with `start` and `segments` when the start is moved. `.value` preserves the full path; `.segments` returns deep-copied six-coordinate segment tuples with an optional `.start` tuple; `.nodes` exposes interior nodes; `.activePoint` selects a flattened editable-point index. `.points` preserves the original outer-control tuple API and resets to a single cubic when assigned. `.cssValue` returns exact CSS for one cubic with default endpoints or a `linear(...)` approximation sampled 64 times per segment. Invalid paths fall back to the default. Coordinates are rounded to six decimals; pointer movement snaps to step, while typed and programmatic coordinates do not.

The shadow tree contains a square SVG graph, dynamic handles and coordinate fields, node actions, presets, preview, and serialized output. Delegated listeners support dynamically inserted points. Pointer capture tracks dragging; `input` reports live edits and `change` commits. Escape restores the starting path, including cancellation of insertion. Selection and programmatic assignments remain silent.

Before/after the editable endpoint X range, preview and CSS hold endpoint Y constant. The preview inverts segment X to evaluate actual cubic progress over `duration`. `.play()` previews once; `.stop()` resets it. Reduced motion displays the endpoint immediately. Readonly allows preview; disabled prevents it. Disconnecting releases listeners, capture, observation, and animation resources. Styling uses `--dsk-curve-*` variables and shadow parts, including `handle`, `coordinate`, `add`, and `remove`. The playground provides live attributes, generated HTML, an event log, reset, and light/dark themes.

## Layers and canvas widgets

`src/layer-tree/` owns hierarchical rows, selection, renaming, filtering, and reordering. It registers `dsk-layer-tree`, `dsk-list-value`, `dsk-list-header`, `dsk-list-footer`, and `dsk-tree-search`. Applications connect these UI operations to their own document hierarchy.

`src/canvas-widgets/` owns `dsk-pan-zoom`, `dsk-ruler`, and `dsk-canvas-marker`. The pan/zoom element hosts ordinary HTML; rulers and markers can also follow a third-party editor's camera. The shared camera uses `panX`, `panY`, and positive `zoom`, with `screen = world * zoom + pan`. `projectCanvasPoint` and `unprojectCanvasPoint` convert in opposite directions. `bindCanvasWidget` positions ordinary HTML in an untransformed overlay and restores its managed inline styles on disposal.

Keep camera math in the library helpers and engine-specific coordinate conversion in the application adapter. The homepage's focus-to-interact behavior, dot fade thresholds, camera entrance animation, and mobile inspector layout belong to the documentation application, not a universal component contract.

## Documentation examples and source projects

The Vue theme in `apps/docs/.vitepress/theme/` supplies navigation, example wrappers, the homepage, and the project viewer. `ExamplePanel` gives live examples a shared layout and styling contract. See [the panel guide](apps/docs/.vitepress/theme/EXAMPLES.md) before adding a new demo wrapper.

Runnable integration code lives in `apps/docs/snippets/`. Engine adapters use public DSK exports and connect controls, selection, camera state, and overlays to tldraw, Excalidraw, React Flow, Three.js, Konva.js, or Fabric.js. Shared example UI lives in `snippets/shared/`.

`EngineExample` dynamically imports the selected engine after client mounting, starts automatically, and shows loading or retry states. Generation checks prevent stale initialization from replacing a newer example. Navigation disposes the current adapter, its listeners, and observers. Browser-dependent imports must stay out of server evaluation.

Build-time data loaders in `.vitepress/data/` produce the file explorer data and downloadable ZIP projects from the example sources. Archives include a built DSK tarball in `vendor/`, so they use the same library snapshot as the documentation build. The library must therefore build before the documentation. When an adapter changes, verify the live example, the displayed source, and the archive together.

`pnpm-workspace.yaml` applies a VitePress patch from `patches/` that guards outline updates after their DOM references disappear. Keep this patch in mind when upgrading VitePress; verify whether the guard is still needed rather than silently dropping it.

## Test ownership

| Location                               | Purpose                                                      | Runner                                                        |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `packages/vanilla/tests/unit/`         | Pure models, parsing, stepping, and coordinate math          | Node.js test runner                                           |
| `packages/vanilla/tests/browser/`      | Component behavior through the playground                    | Package-owned Playwright config, port 5183                    |
| `packages/vanilla/tests/distribution/` | Built ESM/IIFE, CSS, SVG assets, and lazy eyedropper loading | Separate Playwright config after build                        |
| `packages/vanilla/tests/types/`        | Built public exports as a NodeNext consumer                  | Dedicated TypeScript config after build                       |
| `apps/docs/tests/e2e/`                 | Documentation, homepage, demos, and source downloads         | Docs-owned Playwright config, production preview on port 5184 |

Root scripts delegate to their owning workspaces. Browser suites store their results inside those workspaces and run separately from `pnpm check`. Unit/browser test type checking uses source files, while public declaration checks use built exports without the `development` condition. CI currently runs `pnpm check` and the component and distribution browser suites; documentation browser tests are a separate local command.

## Deployment and publication

`pnpm pages:build` builds the library and documentation at `/dsk/` into `apps/docs/dist`. The playground remains local and is excluded from deployment. It calls workspace builds directly, so the Pages base cannot reuse a root-path Turbo cache entry. Normal builds retain `/`. Custom theme links use `withBase`; raw sidebar icon paths use the configured base.

The Pages workflow deploys on pushes to `main` or manual dispatch. The npm workflow handles published, non-prerelease GitHub releases and verifies `v<package version>`, the changelog status, and the publication guard before testing and publishing through OIDC. External Pages/npm setup is described in [Contributing](CONTRIBUTING.md#github-pages-and-npm-releases). Creating the workflows does not publish a release.

## Distribution

The library exports its JavaScript entry, `styles.css`, `logo.svg`, `global`, and `package.json`. The `development` condition resolves JavaScript and style types from source; normal consumption resolves built JavaScript and declarations from `dist`. `pnpm pack` applies `publishConfig.exports` so the published manifest contains only existing distribution paths, even in development mode. The npm workflow publishes this verified tarball rather than the workspace directory. `tsdown.config.ts` owns both output formats, raw SVG imports, and copying the CSS declaration and MIT license into `dist`. ESM keeps page-eyedropper chunks lazy; the IIFE includes them in one script. Both formats use the same separate stylesheet.

The package allowlist is `files: ["dist", "assets"]`. Package-local `.npmignore` rules live in `packages/vanilla/.npmignore`; there is no root npm ignore file. Tests and documentation applications are not library distribution files. `prepack` builds the library before a local archive is created. The [repository](https://github.com/Flowscape-UI/dsk) uses the MIT license. The library is publishable for the approved 1.0.0 release preparation. The root and applications remain private. Actual publication remains a separate owner action. Consumer-facing guides show the intended npm installation, while manifests remain the source of truth for release configuration.
