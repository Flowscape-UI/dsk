# Canvas widgets

HTML/CSS widgets for your editor coordinate system: a small pan/zoom viewport, markers, rulers and guides. Use them together or connect them to your own engine.

```sh
npm i @flowscape-ui/dsk
```

::: tip HTML first
Tag examples work after importing the package without a constructor call. All custom elements need closing tags. Viewports and markers can contain your own HTML. Connecting widgets to one camera needs a small event handler. These examples are client-rendered; see [installation](/guide/installation#server-rendered-applications) for SSR.
:::

## dsk-pan-zoom

<ClientOnly><CanvasExample kind="pan" /></ClientOnly>

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
  <div
    style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white"
  >
    DSK
  </div>
</dsk-pan-zoom>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <dsk-pan-zoom aria-label="Interactive canvas" style={{ height: '320px' }}>
      <div
        style={{
          position: 'absolute',
          left: '-60px',
          top: '-60px',
          width: '120px',
          height: '120px',
          background: '#ff0073',
          color: 'white',
        }}
      >
        DSK
      </div>
    </dsk-pan-zoom>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
    <div
      style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white"
    >
      DSK
    </div>
  </dsk-pan-zoom>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
  <div style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white">DSK</div>
</dsk-pan-zoom>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
      <div
        style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white"
      >
        DSK
      </div>
    </dsk-pan-zoom>
  `,
})
export class App {}
```

:::

</div>

See [framework setup](#framework-setup) for React and Vue. Give the viewport a height and the object dimensions. World origin (0,0) starts at the center.

### Viewport behavior and API

`dsk-pan-zoom` is a small pan/zoom surface for demos and previews, not a document editor. Importing the package registers it and exports `DskPanZoom`. It needs no framework. Put ordinary HTML in the default slot, with world origin `(0, 0)` initially centered in the viewport. Use `slot="overlay"` for fixed UI.

```html
<dsk-pan-zoom aria-label="Interactive preview" style="height:320px">
  <div
    style="position:absolute;transform:translate(-50%,-50%);padding:40px;background:#557be8;color:white"
  >
    Hello canvas
  </div>
  <button
    slot="overlay"
    style="position:absolute;right:12px;bottom:12px"
    id="reset-view"
  >
    Reset
  </button>
</dsk-pan-zoom>
```

```ts
import '@flowscape-ui/dsk';
const viewport = document.querySelector('dsk-pan-zoom')!;
document
  .querySelector('#reset-view')!
  .addEventListener('click', () => viewport.reset());
viewport.addEventListener('viewportchange', () => {
  const ruler = document.querySelector('dsk-ruler');
  if (ruler) ruler.camera = viewport.camera;
});
```

- Drag with the primary or middle mouse button, or with one finger, to pan.
- Wheel/two-finger trackpad scrolling pans. Ctrl/Meta + wheel and trackpad pinch zoom around the pointer. Shift + vertical scrolling pans horizontally.
- Two touch pointers pan and zoom around their midpoint. Lifting one finger continues panning without a jump.
- Focus the viewport: arrows pan, Shift increases the step, `+`/`-` zoom, `0` or Home resets. Keep the focus ring visible.
- `.zoomBy(factor)` zooms around the viewport center; `.reset()` restores a centered view at 100%. Zoom is limited to 25–400%.
- `.camera` reads a copy of `{ panX, panY, zoom }`. Assignment validates finite coordinates and a positive zoom, clamps zoom, cancels active gestures, and is silent. `viewportchange` reports interaction, reset, zoomBy, and resize updates. Connect its detail directly to `ruler.camera` when their viewport starts align.

The viewport captures touch gestures only within its own bounds (`touch-action: none`); page scrolling remains available outside it. Buttons, inputs, links, DSK controls and overlay content retain their own pointer/keyboard behavior. Mark other interactive content with `data-pan-zoom-ignore`. Pointer capture, cancellation and disconnect cleanup are handled internally. Resizing preserves the world point at the center.

Style `::part(viewport)`, `::part(world)`, `::part(overlay)` and `--dsk-pan-zoom-background`, `--dsk-pan-zoom-grid-color`, `--dsk-pan-zoom-focus-color`. Give the host a height. This component does not implement selection, object resizing, inertia, history, or a rendering engine. Laptop gestures follow the browser's standard wheel/pointer event mapping; native hardware behavior should also be checked on target devices.

The `dsk-pan-zoom` dotted grid lives inside the transformed world (`::part(grid)`). Its spacing and dot size scale with the camera, and scene rotations also rotate the grid. `--dsk-pan-zoom-grid-color` controls its color. The tiled region remains bounded around the visible world during pan. Grid opacity fades linearly from full visibility at 70% zoom to zero at 55%. At 55% or below, the grid is detached from the DOM and its geometry is not recalculated; zooming in reattaches the same lightweight grid element.

## dsk-canvas-marker

<ClientOnly><CanvasExample kind="marker" /></ClientOnly>

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<div style="position:relative;height:240px;overflow:hidden">
  <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
</div>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
      <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
    </div>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <div style="position:relative;height:240px;overflow:hidden">
    <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
  </div>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<div style="position:relative;height:240px;overflow:hidden">
  <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
</div>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div style="position:relative;height:240px;overflow:hidden">
      <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
    </div>
  `,
})
export class App {}
```

:::

</div>

Toggle tracking flags in the demo and zoom in. The world marker follows (60,60); the fixed screen label stays at (12,12). Turning off both flags puts the first marker at screen (60,60).

### Marker styling

```css
dsk-canvas-marker {
  --dsk-marker-background: #171717;
  --dsk-marker-color: #ff70ae;
  --dsk-marker-padding: 10px 12px;
  --dsk-marker-radius: 0px;
  --dsk-marker-shadow: none;
}
dsk-canvas-marker::part(container) {
  border: 1px solid #ff70ae;
}
```

<ClientOnly><CanvasExample kind="marker" styled /></ClientOnly>

### Marker API

| Attribute / property | Default                         | Purpose                                                                                       |
| -------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| x / .x, y / .y       | 0, 0                            | World position; invalid attribute numbers fall back to zero.                                  |
| pan-x, pan-y         | 0, 0                            | Camera translation in CSS pixels.                                                             |
| zoom                 | 1                               | Zoom clamped to 1e-12 through 1e12.                                                           |
| .camera              | `{ panX: 0, panY: 0, zoom: 1 }` | Reads or assigns all camera values; assignment rejects nonfinite values and nonpositive zoom. |
| label                | Marker                          | Fallback text when the default slot is empty. No separate label property.                     |

Markers have no built-in dragging or value events. Place a button in the slot for an action. Property changes update positioning silently. CSS defaults: --dsk-marker-background: #557be8; --dsk-marker-color: #fff; --dsk-marker-padding: 6px 9px; --dsk-marker-radius: 6px; --dsk-marker-shadow: 0 2px 8px #0002; --dsk-marker-z-index: 1. The same CSS works in every framework; use an unscoped Vue style block.

## Coordinate model and markers

Coordinate-aware HTML/CSS components live in `src/canvas-widgets/`: `dsk-ruler.ts` contains the ruler, `coordinates.ts` provides public coordinate adapters, `helpers/` contains internal ruler calculations, and `index.ts` declares the family exports. `dsk-canvas-marker.ts` provides an annotation widget. All public imports remain available from `@flowscape-ui/dsk`.

The shared `CanvasCamera` model is `{ panX, panY, zoom }`, with positive finite zoom and pan measured in viewport CSS pixels. The mapping is `screen = world * zoom + pan`. Update the camera when your engine pans or zooms; the kit does not subscribe to engine-specific events.

```html
<div id="viewport" style="position:relative;height:300px;overflow:hidden">
  <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
  <dsk-canvas-marker x="12" y="12" follow-pan="false" follow-zoom="false">
    Screen overlay
  </dsk-canvas-marker>
</div>
```

Place widgets inside an untransformed, positioned overlay aligned with your engine's viewport. Do not apply the engine camera transform to that overlay as well: that would transform widgets twice. Slotted HTML can contain buttons or other interactive controls.

```ts
import type { CanvasCamera } from '@flowscape-ui/dsk';

function updateCamera(camera: CanvasCamera) {
  document.querySelectorAll('dsk-canvas-marker').forEach((marker) => {
    marker.camera = camera;
  });
  document.querySelectorAll('dsk-ruler').forEach((ruler) => {
    ruler.camera = camera;
  });
}

updateCamera({ panX: 100, panY: -40, zoom: 2 });
// The world marker at (120, 80) appears at (340, 120) CSS pixels.
// The screen overlay stays at (12, 12).
```

Marker attributes `x` and `y` set its position; `pan-x`, `pan-y`, and `zoom` also allow declarative camera configuration. The `.camera` property updates all three camera values. `label` supplies fallback text when no content is slotted.

| Attribute / property                | Default | Effect                                                                                        |
| ----------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `follow-pan` / `followPan`          | `true`  | Include camera translation in the position. Set the attribute to `"false"` to disable.        |
| `follow-zoom` / `followZoom`        | `true`  | Include camera zoom in the position. Set the attribute to `"false"` to disable.               |
| `scale-with-zoom` / `scaleWithZoom` | `false` | Also scale the marker's size when following zoom. Presence enables it; `"false"` disables it. |

By default, a marker moves with its world position while its text and size stay readable at every zoom. Disable both tracking flags for a fixed screen position. Style it with `::part(container)`, `::part(pin)`, `::part(label)` (fallback text), and `--dsk-marker-background`, `--dsk-marker-color`, `--dsk-marker-padding`, `--dsk-marker-radius`, `--dsk-marker-shadow`, and `--dsk-marker-z-index`.

Rulers accept the same `.camera`, `follow-pan`, and `follow-zoom` controls. These affect their coordinate scales and guides, not their DOM placement or physical size. A horizontal ruler automatically uses X for ticks and Y for guides; a vertical ruler uses Y for ticks and X for guides. Existing `offset`, `zoom`, `guideOffset`, and `guideZoom` APIs remain available. Assigning `.camera = null` stops camera-driven updates and retains the last mapping.

### Binding ordinary HTML

<ClientOnly><CanvasExample kind="html" /></ClientOnly>

Use `bindCanvasWidget` for your own HTML without creating a custom element:

```ts
import {
  bindCanvasWidget,
  projectCanvasPoint,
  unprojectCanvasPoint,
} from '@flowscape-ui/dsk';

const element = document.createElement('button');
element.textContent = 'Add comment';
document.querySelector('#viewport')!.append(element);
const camera = { panX: 100, panY: -40, zoom: 2 };
const binding = bindCanvasWidget(element, {
  camera,
  position: { x: 120, y: 80 },
  followPan: true,
  followZoom: true,
  scaleWithZoom: false,
});

binding.update({ camera: { panX: 80, panY: -20, zoom: 1.5 } });
const screen = projectCanvasPoint({ x: 120, y: 80 }, camera);
const world = unprojectCanvasPoint(screen, camera);
console.log(world); // { x: 120, y: 80 }

// On teardown, restore the element's original positioning styles.
binding.dispose();
element.remove();
```

The binding owns inline `position`, `left`, `top`, `translate`, `scale`, and `transform-origin` while active, restoring their original values on disposal. Updates merge supplied options with previous ones. Projection helpers also accept `{ followPan, followZoom }` as their third argument; `resolveCanvasCamera` returns the effective camera for those flags.

This model supports axis-aligned pan and uniform zoom. For rotated or nonlinear coordinate systems, project positions using your engine, then pass viewport coordinates with both tracking flags disabled. Use CSS pixels rather than the canvas backing buffer's device pixels.

## dsk-ruler

<ClientOnly><CanvasExample kind="ruler" /></ClientOnly>

### Add the component

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<div>
  <dsk-ruler
    target="#ruler-target"
    snap="10"
    aria-label="Horizontal ruler"
  ></dsk-ruler>
  <div
    id="ruler-target"
    style="height:240px;position:relative;background:#171717"
  ></div>
</div>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <div>
      <dsk-ruler
        target="#ruler-target"
        snap="10"
        aria-label="Horizontal ruler"
      ></dsk-ruler>
      <div
        id="ruler-target"
        style={{ height: '240px', position: 'relative', background: '#171717' }}
      ></div>
    </div>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <div>
    <dsk-ruler
      target="#ruler-target"
      snap="10"
      aria-label="Horizontal ruler"
    ></dsk-ruler>
    <div
      id="ruler-target"
      style="height:240px;position:relative;background:#171717"
    ></div>
  </div>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<div>
  <dsk-ruler target="#ruler-target" snap="10" aria-label="Horizontal ruler"></dsk-ruler>
  <div id="ruler-target" style="height:240px;position:relative;background:#171717"></div>
</div>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div>
      <dsk-ruler
        target="#ruler-target"
        snap="10"
        aria-label="Horizontal ruler"
      ></dsk-ruler>
      <div
        id="ruler-target"
        style="height:240px;position:relative;background:#171717"
      ></div>
    </div>
  `,
})
export class App {}
```

:::

</div>

`dsk-ruler` draws the visible portion of a coordinate axis. Importing the package registers it and exports `DskRuler`, `RulerOrientation`, `RulerRange`, and `RulerGuideDetail`. There is no configured minimum or maximum coordinate: pan through positive and negative coordinates with `offset`. Coordinates use JavaScript finite numbers and their precision limits. SVG ticks and labels are generated only for the viewport, with bounded tick allocation; updates are batched into animation frames. SVG stays sharp at browser zoom and on high-DPI screens.

```html
<dsk-ruler
  aria-label="Horizontal ruler"
  offset="-50"
  zoom="1"
  highlights="[[25,125],[180,220]]"
  guides="[150]"
  snap="1"
  target="#editor"
></dsk-ruler>
<div id="editor" style="height:300px"></div>
```

Place the ruler alongside your editor, with the start of the ruler aligned to the viewport's coordinate origin. Its default horizontal height is 24px and width follows its container. Vertical rulers have a default width of 24px and take their parent's height; give the parent a definite height. Guide overlay coordinates account for the difference between ruler and target client rectangles.

| Attribute / property | Default      | Meaning                                                                                                                                            |
| -------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orientation`        | `horizontal` | `horizontal`, `horizontal-reversed`, `vertical`, `vertical-reversed`. Reversed changes the tick edge, not the coordinate order.                    |
| `offset`             | `0`          | World coordinate at the start of the ruler.                                                                                                        |
| `zoom`               | `1`          | CSS pixels per world unit; effective range `1e-12` to `1e12`.                                                                                      |
| `step`               | `0`          | Preferred major tick interval; zero selects an adaptive 1/2/5 interval. At low zoom, a multiple of the requested step avoids crowded labels.       |
| `snap`               | `0`          | Guide snapping in world units; zero allows continuous dragging.                                                                                    |
| `highlights`         | `[]`         | JSON array of `[a,b]` world-coordinate intervals. Property accepts readonly `RulerRange[]`. Endpoints can be supplied in either order.             |
| `guides`             | `[]`         | JSON array of world coordinates; property accepts readonly numbers.                                                                                |
| `target`             | none         | CSS selector in the ruler's document/shadow root for the guide area. The property accepts an `HTMLElement` or `null` to return to selector lookup. |
| `disabled`           | absent       | Presence prevents guide creation, movement, and deletion.                                                                                          |

Malformed array attributes fall back to empty arrays; malformed entries and nonfinite numbers are ignored. Property assignments are silent. `formatLabel` accepts `(value: number) => string`, or `null` for the default numeric formatter. Use it for units or localized labels. `refresh()` schedules a redraw, useful after application layout changes that move elements without resizing them. Resize, browser resize, and scroll are already observed; listeners and overlays are cleaned up on disconnection.

### Mapping an editor's coordinates

The mapping is `pixel = (world - offset) * zoom`. `toPixel(world)` and `toValue(pixel)` expose both directions; pixel coordinates are local to the ruler's start. For an editor that uses `pixel = world * scale + pan`, set `zoom = scale` and `offset = -pan / scale`. Update these properties when the engine pans or zooms. Use one ruler for X and one for Y, with independent offsets and the same zoom when the engine scales uniformly.

```ts
const ruler = document.querySelector('dsk-ruler')!;
ruler.zoom = 2;
ruler.offset = -100;
ruler.highlights = [
  [25, 125],
  [180, 220],
];
ruler.formatLabel = (value) => `${value} px`;
console.log(ruler.toPixel(0)); // 200
```

### Guides

Press and drag at least 4 CSS pixels from the scale into the target area to create a guide; a click alone does not create one. Horizontal rulers create horizontal guides (Y coordinates), and vertical rulers create vertical guides (X coordinates). Each line spans the target area, without drawing a marker over the ruler. Its coordinate follows pointer movement perpendicular to the ruler and uses `snap` when specified. Existing lines can be dragged again with the primary mouse button. Wheel and trackpad navigation, middle-button pan, and touch gestures pass through guides to the underlying target. During target pointer gestures or wheel navigation, guide hit areas are temporarily inactive so they do not steal the cursor. The target must implement its own pan/zoom handlers and accept forwarded events. Escape cancels; releasing outside the target cancels and restores the previous guides. Without a target, guide events still work, but no external guide overlay is drawn.

Focus a guide and use arrow keys to move it by `snap` or one unit (Shift multiplies by ten); Delete/Backspace removes it. Enter on the ruler creates a guide at the target midpoint along the guide coordinate axis. Guide lines are keyboard-focusable and named with their coordinate. A native top-layer popover prevents ancestor clipping; the guide surface covers only the target and permits pointer interaction except along the guide hit areas.

`guideinput` emits preview coordinates during dragging. `guidechange` emits on commit or keyboard edits. Both are bubbling, composed `CustomEvent<RulerGuideDetail>` with `guides`, `value`, and `index`. During dragging, `.guides` retains committed values; read `event.detail.guides` for the preview. On deletion, `guides` contains the remaining coordinates while `value` and `index` identify the removed guide. Listen to these events to store guides in an editor's document model.

### Ruler styling

<ClientOnly><CanvasExample kind="ruler" styled /></ClientOnly>

For an alternative appearance, set --dsk-ruler-guide-color to #ff70ae, --dsk-ruler-accent to #ffffff and --dsk-ruler-highlight to #ff007330.

Use ordinary host CSS for sizing and fonts, and `::part(scale)`, `::part(tick)`, `::part(label)`, `::part(highlight)`, `::part(guide-overlay)`, `::part(guide-label)`, and `::part(guide)` for internal styling. Guide lines use the guide part's `::after` pseudo-element. No global CSS is applied.

| CSS variable              | Default                |
| ------------------------- | ---------------------- |
| `--dsk-ruler-size`        | `24px`                 |
| `--dsk-ruler-background`  | `#292929`              |
| `--dsk-ruler-color`       | `#a1a1a1`              |
| `--dsk-ruler-tick-color`  | `#777`                 |
| `--dsk-ruler-highlight`   | `rgba(85,123,232,.28)` |
| `--dsk-ruler-accent`      | `#0d99ff`              |
| `--dsk-ruler-guide-color` | `#f2994a`              |
| `--dsk-ruler-guide-width` | `1px`                  |

The playground includes paired rulers, multiple selected ranges, guide editing, and a grid/object demonstration driven by the same zoom and offset.

A guide becomes active when dragged or focused by clicking or tabbing. After creation, focus stays on it, so Delete works immediately. Active guides use `--dsk-ruler-accent` (blue); inactive guides use `--dsk-ruler-guide-color` (orange). Only the active guide shows its coordinate badge beside the line, in the base guide color. Clicking elsewhere removes that badge and returns the line to its inactive color. Customize the badge with `::part(guide-label)`.

Guide coordinates are measured from the target area's top edge for horizontal guides, or left edge for vertical guides: `pixel = (coordinate - guideOffset) * guideZoom`. `guide-offset` / `.guideOffset` defaults to `offset`, and `guide-zoom` / `.guideZoom` defaults to `zoom`. Supply the perpendicular axis's camera values when X and Y pan or scale independently: the horizontal ruler uses X for its scale and Y for its guides; the vertical ruler uses Y for its scale and X for its guides. The overlay clips lines where its source ruler overlaps the target, keeping the ruler unobscured.

## One viewport, a marker and two rulers

The scales start at the viewport origin; the marker lives in its untransformed overlay. The canvas-demo grid reserves 24px at the left and top. Keep example IDs unique on your page.

```html
<div id="canvas-demo" class="canvas-demo">
  <span></span>
  <dsk-ruler class="ruler-x" aria-label="X ruler" snap="10"></dsk-ruler>
  <dsk-ruler
    class="ruler-y"
    orientation="vertical"
    aria-label="Y ruler"
    snap="10"
  ></dsk-ruler>
  <dsk-pan-zoom aria-label="Canvas">
    <div class="canvas-object">DSK</div>
    <dsk-canvas-marker
      slot="overlay"
      x="60"
      y="60"
      label="Comment"
    ></dsk-canvas-marker>
  </dsk-pan-zoom>
</div>
```

```css
.canvas-demo {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  grid-template-rows: 24px 320px;
}
.ruler-x {
  grid-column: 2;
  grid-row: 1;
}
.ruler-y {
  grid-column: 1;
  grid-row: 2;
}
.canvas-demo dsk-pan-zoom {
  grid-column: 2;
  grid-row: 2;
  height: 320px;
}
.canvas-object {
  position: absolute;
  left: -60px;
  top: -60px;
  width: 120px;
  height: 120px;
  background: #ff0073;
  color: white;
}
```

Save this shared adapter as src/connect-canvas-widgets.ts. The live demos use the same code. Rulers receive their target through a property rather than a global selector.

<<< @/snippets/connect-canvas-widgets.ts

```ts
// src/main.ts
import '@flowscape-ui/dsk';
import { connectCanvasWidgets } from './connect-canvas-widgets';
const root = document.querySelector<HTMLElement>('#canvas-demo');
if (!root) throw new Error('Missing canvas demo');
const dispose = connectCanvasWidgets(root);
// Call dispose() before removing the view.
```

React: call the adapter with ref.current in useEffect and return dispose. Vue: call in onMounted and clean up in onBeforeUnmount. Svelte: return dispose from onMount. Angular: call in ngAfterViewInit and clean up with DestroyRef.onDestroy. Pass the DOM container, not a framework component instance.

Assigning viewport.camera is silent. After assignment, explicitly update marker/ruler cameras or call your synchronization function. With your own engine, supply the same panX, panY and zoom from its camera event.

## Framework setup {#framework-setup}

Import the package once. Configure Vue isCustomElement for dsk- as shown in [installation](/guide/installation). Angular uses CUSTOM_ELEMENTS_SCHEMA from the examples. For React with TypeScript, add:

```ts
// src/dsk-canvas.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { DskPanZoom, DskCanvasMarker, DskRuler } from '@flowscape-ui/dsk';
type Props<T> = DetailedHTMLProps<HTMLAttributes<T>, T>;
type Tracking = { 'follow-pan'?: string; 'follow-zoom'?: string };
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-pan-zoom': Props<DskPanZoom>;
      'dsk-canvas-marker': Props<DskCanvasMarker> &
        Tracking & {
          x?: string | number;
          y?: string | number;
          label?: string;
          'pan-x'?: string | number;
          'pan-y'?: string | number;
          zoom?: string | number;
          'scale-with-zoom'?: string;
        };
      'dsk-ruler': Props<DskRuler> &
        Tracking & {
          orientation?: string;
          offset?: string | number;
          zoom?: string | number;
          step?: string | number;
          snap?: string | number;
          target?: string;
          highlights?: string;
          guides?: string;
          disabled?: boolean;
          'guide-offset'?: string | number;
          'guide-zoom'?: string | number;
        };
    }
  }
}
```

## Edit history

Focus the viewport or ruler for Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z. Camera drags are grouped; wheel events within 180 ms form one edit. Rulers restore guide creation, movement and deletion. Restoring guides emits guidechange with the complete guides array, index -1 and value 0 to identify snapshot restoration. Camera history emits viewportchange. Canvas markers do not own editable state or history.
