# Angle and curves

## Installation

```sh
npm i @flowscape-ui/dsk
```

::: tip HTML first
Both controls work after importing the package, without an initialization function. They are standalone elements with no child markup, but HTML requires closing tags. JavaScript is only needed to connect them to your object or animation. These examples target client-rendered apps; see [installation](/guide/installation#server-rendered-applications) for SSR.
:::

## dsk-angle

`<dsk-angle>` is a compass-style circular control with a thin track, scale ticks, a direction needle, and a fixed-size draggable marker. A soft sector shows the selected angle while leaving the central value clear. Four cardinal scale labels follow the selected unit. It lives in `src/angle/`, independently of the input and color families. Zero is at the top and angles increase clockwise. By default rotation is continuous: crossing the top wraps between a full turn and zero. Set `min` or `max` to limit movement to an arc. The chosen portion from the effective minimum to `value` uses blue by default or a custom `color`.

```html
<dsk-angle
  unit="deg"
  value="90"
  step="1"
  segments="24"
  size="208"
  color="#ff0073"
  aria-label="Rotation angle"
></dsk-angle>
```

<ClientOnly><GeometryExample kind="angle" /></ClientOnly>

### Connect it to your project

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-angle value="45" aria-label="Rotation"></dsk-angle>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return <dsk-angle value="45" aria-label="Rotation"></dsk-angle>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <dsk-angle value="45" aria-label="Rotation"></dsk-angle>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<dsk-angle value="45" aria-label="Rotation"></dsk-angle>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<dsk-angle value="45" aria-label="Rotation"></dsk-angle>',
})
export class App {}
```

:::

</div>

See [framework setup](#framework-setup) for one-time React and Vue configuration. Change the unit in the demo: the physical rotation stays the same.

### Optional: rotate your object

```html
<dsk-angle id="rotation" value="45"></dsk-angle>
<div id="shape">DSK</div>
```

```ts
import '@flowscape-ui/dsk';
const angle = document.querySelector('dsk-angle#rotation');
const shape = document.querySelector<HTMLElement>('#shape');
function update() {
  if (angle && shape) shape.style.transform = `rotate(${angle.degrees}deg)`;
}
angle?.addEventListener('input', update);
update();
// On unmount: angle?.removeEventListener('input', update);
```

### Angle attributes and units

| Attribute    | Property         | Default             | Behavior                                                                                         |
| ------------ | ---------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `unit`       | `unit`           | `"deg"`             | Numeric unit: `deg`, `rad`, `pi`, `turn`, or `grad`. `PI` and `π` are accepted aliases for `pi`. |
| `value`      | `value`          | Effective `min`     | Current number in the selected unit, clamped to the active range.                                |
| `min`        | `min`            | `0`                 | Optional lower bound in the selected unit. Attribute presence enables bounded rotation.          |
| `max`        | `max`            | One revolution      | Optional upper bound in the selected unit. Attribute presence enables bounded rotation.          |
| `step`       | `step`           | One physical degree | Positive finite increment in the selected unit, used by pointer and keyboard adjustment.         |
| `snap-angle` | `snapAngle`      | `5`                 | Shift-drag interval, always in degrees. Invalid or nonpositive values fall back to 5.            |
| `segments`   | `segments`       | `24`                | Number of scale ticks, an integer from 4 to 180. Independent of the numeric step.                |
| `size`       | `size`           | `208`               | Positive square size in pixels.                                                                  |
| `color`      | `color`          | `"#557be8"`         | CSS color for the sector, needle, and marker. Invalid colors use the default.                    |
| `disabled`   | `disabled`       | `false`             | Prevents interaction and removes the control from keyboard navigation.                           |
| `readonly`   | `readOnly`       | `false`             | Prevents edits while preserving focus.                                                           |
| –            | `degrees`        | –                   | Readonly numeric value in physical degrees, independent of the selected unit.                    |
| –            | `formattedValue` | –                   | Readonly display text, including the unit, matching the center label.                            |

| Unit   | One revolution | Quarter turn  | Example label |
| ------ | -------------- | ------------- | ------------- |
| `deg`  | `360`          | `90`          | `90°`         |
| `rad`  | `2 × Math.PI`  | `Math.PI / 2` | `1.571 rad`   |
| `pi`   | `2`            | `0.5`         | `π/2`         |
| `turn` | `1`            | `0.25`        | `0.25 turn`   |
| `grad` | `400`          | `100`         | `100 grad`    |

All four numeric attributes (`value`, `min`, `max`, and `step`) use the selected unit, including numbers in initial HTML. Their order in the element's markup does not matter. The `pi` unit represents a coefficient of π: use `value="0.5"` for π/2, not an expression string. Changing `unit` after initial connection converts existing explicit values, bounds, and step so the physical angle stays the same. Missing `max` and `step` continue to mean a full revolution and one physical degree in every unit.

Rotation mode depends on attribute presence. With both `min` and `max` absent, pointer dragging and Arrow/Page keys can continue through the zero/full-turn seam, wrapping the value into the next revolution. Adding either attribute enables bounded movement: an omitted lower bound then uses zero, and an omitted upper bound uses a full revolution. Explicit `min="0" max="360"` also enables bounded movement, even though those numbers equal the defaults. Clear both attributes to restore continuous rotation. The `.min` and `.max` getters return their effective numeric values in both modes. Home and End always select the effective endpoints. Programmatic value assignments are clamped to the effective range, even in continuous mode.

The supported physical range is 0–360° inclusive; configured bounds are clamped to that revolution. A `max` below `min` collapses the available range to `min`. The endpoints 0° and 360° share a position but remain distinct values, so the ring can be completely empty or completely filled. Display rounding does not change the stored value.

```html
<!-- A restricted arc from 45° to 270°, with 5° steps. -->
<dsk-angle
  min="45"
  max="270"
  step="5"
  value="135"
  aria-label="Light direction"
></dsk-angle>

<!-- A quarter turn, expressed as a coefficient of π. -->
<dsk-angle unit="pi" value="0.5" aria-label="Object rotation"></dsk-angle>
```

Standard global HTML attributes and DOM event handlers remain available. Set an accessible name with `aria-label` or `aria-labelledby`. Boolean attributes use native presence semantics: remove `disabled` and `readonly` to turn them off. The component does not submit a form value automatically.

### Angle interaction and events

Click or touch the ring to select an angle, then drag around its arc. Pointer capture keeps a gesture active outside the control. The marker stays 10px across without a scaling animation. Continuous rotation passes through the zero/full-turn seam in either direction. With either bound attribute present, dragging stops at the endpoints instead. Escape, pointer cancellation, or focus loss cancels an active drag and restores its starting value.

Hold Shift while dragging the angle for 5° snapping. Set `snap-angle="15"` for 15° snapping regardless of `unit`. Arrows use `step`; Shift with arrows multiplies it by ten.

Focus the control with Tab or `.focus()`. Right/Up increase by `step`; Left/Down decrease it. Shift multiplies arrow increments by ten. Page Up/Page Down use ten increments, and Home/End select `min`/`max`. A native range control provides assistive-technology access and an accessible description of the angle.

`input` reports live user changes; `change` reports a completed edit with a changed value. Both events bubble and cross shadow boundaries. Keyboard edits commit immediately. Programmatic property and attribute changes update the view silently.

```ts
const angle = document.querySelector('dsk-angle');
if (!angle) throw new Error('Missing angle control');

angle.value = 90;
angle.unit = 'rad';
console.log(angle.value); // Math.PI / 2
console.log(angle.degrees); // 90

angle.addEventListener('input', () => {
  console.log('Live degrees:', angle.degrees);
});
angle.onchange = () => {
  console.log('Committed angle:', angle.value, angle.unit);
};
```

### Angle styling

Add a class to scope these changes in your app. CSS variables and `::part()` work in every framework; use a global stylesheet or an unscoped Vue style block.

<ClientOnly><GeometryExample kind="angle" styled /></ClientOnly>

```css
dsk-angle {
  --dsk-angle-size: 240px;
  --dsk-angle-color: #ff0073;
  --dsk-angle-track-color: #d8dee8;
  --dsk-angle-sector-opacity: 0.25;
  --dsk-angle-focus-color: #6366f1;
  --dsk-angle-text-color: #ffffff;
  --dsk-angle-label-color: #7b8494;
}

dsk-angle::part(needle) {
  stroke-width: 4;
}

dsk-angle::part(value) {
  font-variant-numeric: tabular-nums;
}
```

The `container` part exposes the layout wrapper and `dial` exposes the SVG. The `track` part covers the circle and tick paths, `fill` exposes the single annular sector, `needle` exposes the direction indicator, and `scale-label` exposes the cardinal labels. The `marker`, `value`, and visually hidden native `input` parts are also available. The central opening is transparent and adapts to the surrounding surface without a background override. Preserve the dial and marker geometry when styling to keep pointer positions aligned. The playground's **Angle** section includes live attributes, unit conversion, arc presets, generated HTML, an event log, and light/dark themes.

## dsk-curve

`<dsk-curve>` edits a piecewise cubic Bézier easing curve with draggable controls and nodes, coordinate fields, five built-in presets, and a motion preview. Click the line to insert a node without changing its shape. It lives in `src/curve/`, independently of the input, color, and angle families. The horizontal axis represents time and the vertical axis represents progress. Endpoints start at `(0, 0)` and `(1, 1)` and can be selected and moved in both axes, just like added nodes. Their X positions remain ordered; endpoints cannot be deleted.

```html
<dsk-curve
  value="ease-in-out"
  step="0.01"
  duration="1200"
  width="370"
  color="#ff0073"
  aria-label="Motion easing"
></dsk-curve>
```

<ClientOnly><GeometryExample kind="curve" /></ClientOnly>

### Connect it to your project

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-curve
  value="ease-in-out"
  duration="1600"
  aria-label="Motion easing"
></dsk-curve>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <dsk-curve
      value="ease-in-out"
      duration="1600"
      aria-label="Motion easing"
    ></dsk-curve>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <dsk-curve
    value="ease-in-out"
    duration="1600"
    aria-label="Motion easing"
  ></dsk-curve>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<dsk-curve value="ease-in-out" duration="1600" aria-label="Motion easing"></dsk-curve>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-curve value="ease-in-out" duration="1600" aria-label="Motion easing"></dsk-curve>',
})
export class App {}
```

:::

</div>

See [framework setup](#framework-setup) for React types and Vue configuration.

### Turn the curve into animation

X is elapsed time; Y is the progress of an action. A steep section changes quickly; a flat section changes slowly. This is a timing curve, not the spatial path of an object. The colored object uses your curve; the gray reference uses linear timing with the same duration. Switch between movement, entrance and rotation, edit the curve, then replay.

This is the animation code used by the live example. Save it as `src/curve-motion.ts`. It works with single and multiple segments through `.cssValue` and respects reduced motion.

<<< @/snippets/curve-motion.ts

Add an object and a button alongside the editor:

```html
<dsk-curve id="easing" value="ease-in-out" duration="1600"></dsk-curve>
<div id="card" style="width:100px;height:100px;background:#ff0073">DSK</div>
<button id="replay" type="button">Replay</button>
```

```ts
// src/main.ts
import '@flowscape-ui/dsk';
import { animateWithCurve } from './curve-motion';
const curve = document.querySelector('dsk-curve#easing');
const card = document.querySelector<HTMLElement>('#card');
const replay = document.querySelector<HTMLButtonElement>('#replay');
let animation: Animation | undefined;
const listeners = new AbortController();
replay?.addEventListener(
  'click',
  () => {
    if (!curve || !card) return;
    animation?.cancel();
    animation = animateWithCurve(curve, card, 'reveal');
  },
  { signal: listeners.signal },
);
// On unmount: listeners.abort(); animation?.cancel();
```

In a framework, pass DOM refs for the editor and object to the same function from a button handler. Cancel the Animation on unmount. Tag setup for every framework is above; the standalone editor does not need this code.

### The same animation in frameworks

Use `src/curve-motion.ts` shown above. Each example includes markup, DOM refs, playback and cleanup. The Vanilla version is shown just before these tabs. For SSR, move DSK registration into the client lifecycle from the installation guide.

<div class="dsk-framework-code">

::: code-group

```tsx [React]
// src/App.tsx
import { useEffect, useRef } from 'react';
import '@flowscape-ui/dsk';
import type { DskCurve } from '@flowscape-ui/dsk';
import { animateWithCurve } from './curve-motion';
export default function App() {
  const curve = useRef<DskCurve>(null);
  const card = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  useEffect(() => () => animation.current?.cancel(), []);
  function replay() {
    if (!curve.current || !card.current) return;
    animation.current?.cancel();
    animation.current = animateWithCurve(curve.current, card.current, 'reveal');
  }
  return (
    <>
      <dsk-curve ref={curve} value="ease-in-out" duration="1600"></dsk-curve>
      <div
        ref={card}
        style={{ width: 100, height: 100, background: '#ff0073' }}
      >
        DSK
      </div>
      <button onClick={replay}>Replay</button>
    </>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import '@flowscape-ui/dsk';
import type { DskCurve } from '@flowscape-ui/dsk';
import { animateWithCurve } from './curve-motion';
const curve = ref<DskCurve>();
const card = ref<HTMLElement>();
let animation: Animation | undefined;
function replay() {
  if (!curve.value || !card.value) return;
  animation?.cancel();
  animation = animateWithCurve(curve.value, card.value, 'reveal');
}
onBeforeUnmount(() => animation?.cancel());
</script>
<template>
  <dsk-curve ref="curve" value="ease-in-out" duration="1600"></dsk-curve>
  <div ref="card" style="width:100px;height:100px;background:#ff0073">DSK</div>
  <button @click="replay">Replay</button>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import '@flowscape-ui/dsk';
  import type { DskCurve } from '@flowscape-ui/dsk';
  import { animateWithCurve } from './curve-motion';
  let curve: DskCurve;
  let card: HTMLDivElement;
  let animation: Animation | undefined;
  function replay() {
    animation?.cancel();
    animation = animateWithCurve(curve, card, 'reveal');
  }
  onDestroy(() => animation?.cancel());
</script>
<dsk-curve bind:this={curve} value="ease-in-out" duration="1600"></dsk-curve>
<div bind:this={card} style="width:100px;height:100px;background:#ff0073">DSK</div>
<button onclick={replay}>Replay</button>
```

```ts [Angular]
// src/app/app.ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  DestroyRef,
  inject,
} from '@angular/core';
import '@flowscape-ui/dsk';
import type { DskCurve } from '@flowscape-ui/dsk';
import { animateWithCurve } from '../curve-motion';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-curve #curve value="ease-in-out" duration="1600"></dsk-curve>
    <div #card style="width:100px;height:100px;background:#ff0073">DSK</div>
    <button (click)="replay()">Replay</button>
  `,
})
export class App {
  @ViewChild('curve') curve?: ElementRef<DskCurve>;
  @ViewChild('card') card?: ElementRef<HTMLElement>;
  private animation?: Animation;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.animation?.cancel());
  }
  replay() {
    if (!this.curve || !this.card) return;
    this.animation?.cancel();
    this.animation = animateWithCurve(
      this.curve.nativeElement,
      this.card.nativeElement,
      'reveal',
    );
  }
}
```

:::

</div>

### Ideas for your interface

| Idea                      | Start with  | Animate              |
| ------------------------- | ----------- | -------------------- |
| Properties panel          | ease-out    | translateY + opacity |
| Camera focus on an object | ease-in-out | pan + zoom           |
| Card rotation             | ease        | rotate               |
| Progress indicator        | linear      | scaleX               |

These are application ideas, not built-in DSK subsystems. Your application chooses direction, distance and properties; the curve defines their change over time. Y stays within 0-1, so overshoot beyond that range is not supported. The demo does not loop indefinitely; replay and reset remain explicit controls.

### Curve attributes and properties

| Attribute  | Property   | Default              | Behavior                                                                                                                                                                                                                                |
| ---------- | ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`    | `value`    | Ease in out          | Accepts a preset name, four comma- or space-separated numbers, or a CSS `cubic-bezier(...)` string. Also accepts saved `curve(...)` values. Returns `cubic-bezier(...)` for one segment with default endpoints, otherwise `curve(...)`. |
| `step`     | `step`     | `0.01`               | Positive finite coordinate increment for pointer and keyboard adjustment.                                                                                                                                                               |
| `duration` | `duration` | `1200`               | Positive motion preview duration in milliseconds.                                                                                                                                                                                       |
| `width`    | `width`    | `370`                | Positive editor width in pixels. The graph stays square.                                                                                                                                                                                |
| `color`    | `color`    | `"#557be8"`          | CSS accent color for the curve, guides, handles, and motion dot.                                                                                                                                                                        |
| `grid`     | `grid`     | `true`               | Shows grid lines by default; `grid="false"` hides them. Removing the attribute restores the grid.                                                                                                                                       |
| `disabled` | `disabled` | `false`              | Prevents interaction and removes the component's controls from keyboard navigation.                                                                                                                                                     |
| `readonly` | `readOnly` | `false`              | Prevents changes to the curve while preserving focus and preview playback.                                                                                                                                                              |
| –          | `points`   | `[0.42, 0, 0.58, 1]` | Returns a fresh tuple of the first and last control coordinates. Setting it replaces the path with one cubic segment and resets endpoints.                                                                                              |
| –          | `cssValue` | –                    | Readonly CSS easing: exact `cubic-bezier(...)` for one segment with default endpoints, otherwise sampled `linear(...)`.                                                                                                                 |
| –          | `preset`   | `"ease-in-out"`      | Readonly matching preset name, or `"custom"`. There is no `preset` attribute.                                                                                                                                                           |

| Attribute | Property      | Default     | Behavior                                                                                                                           |
| --------- | ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| –         | `segments`    | One segment | Gets a deep copy of the full `CurvePath`; accepts readonly arrays of `CurveSegment` tuples.                                        |
| –         | `nodes`       | `[]`        | Readonly list of interior nodes, each with `x`, `y`, and `kind: 'node'`.                                                           |
| –         | `activePoint` | `0`         | Gets or sets the selected editable-point index: control, control, node, and so on, followed by start and end. Selection is silent. |

The `.start` and `.end` properties get or set `[x, y]` tuples (defaults `[0, 0]` and `[1, 1]`). Getters return copies and assignments are silent. Moving an endpoint translates its adjacent control handle and clamps controls to the new segment bounds. Presets and `.points` assignments reset both endpoints. With `n` segments, start and end have active-point indices `3 * n - 1` and `3 * n`.

All coordinates stay within 0–1, so the curve does not overshoot. Nodes remain ordered along X and cannot cross; controls stay within their segment's time interval during editing. Y can move independently, allowing rises and falls without time loops. Coordinates are rounded to six decimal places. Programmatic assignments and manually typed coordinates are normalized without snapping to `step`; pointer dragging snaps to the step grid, and handle arrow keys increment the current coordinate by `step`. The `value` property also accepts a readonly four-number tuple. Missing or invalid curve values fall back to Ease in out. Set a preset through `value`, rather than a separate configuration attribute.

| Preset        | Coordinates          |
| ------------- | -------------------- |
| `linear`      | `0, 0, 1, 1`         |
| `ease`        | `0.25, 0.1, 0.25, 1` |
| `ease-in`     | `0.42, 0, 1, 1`      |
| `ease-out`    | `0, 0, 0.58, 1`      |
| `ease-in-out` | `0.42, 0, 0.58, 1`   |

```html
<dsk-curve value="0.2, 0.1, 0.8, 0.9"></dsk-curve>
<dsk-curve value="cubic-bezier(0.2, 0.1, 0.8, 0.9)" grid="false"></dsk-curve>
```

Standard global HTML attributes and DOM event handlers remain available. Set an accessible name with `aria-label` or `aria-labelledby`. `disabled` and `readonly` use native boolean presence semantics. Unlike those flags, `grid` is enabled when absent and can be explicitly disabled with `grid="false"`. The component does not submit a form value automatically.

### Curve interaction and events

Click the line to insert a node and make it active. Click an existing handle to select it; drag it to move the point. Round handles control the curve shape; square handles are nodes and endpoints on the line. In a multi-segment curve, coordinate fields show the selected point. The Add point button inserts a node in the widest segment; Remove point or Delete/Backspace removes the selected interior node. Removing a node may change the curve shape. Choosing a preset resets the curve to one segment. Selection alone emits no value events.

Drag a handle to move its point; pointer capture keeps the gesture active outside the graph. Tab reaches the handles, coordinate fields, preset buttons, and preview button. Calling `.focus()` focuses the active handle. On a handle, Left/Right adjust X and Down/Up adjust Y by `step`. Shift multiplies an arrow increment by ten. Home/End move X to its allowed minimum/maximum; Shift+Home/End set Y to 0/1. Escape cancels an active drag or coordinate draft, restoring the starting value. Coordinate fields commit with Enter or focus loss; empty or invalid drafts restore the starting value. The fields provide an alternative to two-dimensional dragging.

The component dispatches bubbling, composed `input` events during user edits and `change` when a changed edit is committed. Handle keyboard adjustments and preset selections commit immediately. Canceling an edit emits a restoring `input` if the value changed, without a `change` commit. Native `oninput` and `onchange` handlers work as usual. Assigning attributes or properties updates the view silently.

```ts
const curve = document.querySelector('dsk-curve');
if (!curve) throw new Error('Missing curve editor');

curve.value = 'ease-out';
curve.points = [0.2, 0.1, 0.8, 0.9];
console.log(curve.value); // cubic-bezier(0.2, 0.1, 0.8, 0.9)
console.log(curve.preset); // custom

curve.addEventListener('input', () => {
  console.log('Live easing:', curve.cssValue);
});
curve.onchange = () => {
  console.log('Committed segments:', curve.segments);
};

curve.play(); // Preview once using the selected easing and duration.
curve.stop(); // Stop and reset the preview dot.
```

The preview animates progress according to the selected curve over `duration` milliseconds. Playback starts only when requested and leaves the dot at the endpoint when complete. With the operating system's reduced-motion preference enabled, it displays the endpoint immediately. `readonly` permits preview playback; `disabled` prevents it. Playback does not change the selected value or emit `input`/`change`. Edits, resizing, loss of window focus, and disconnection reset the preview. Disconnecting also releases interaction resources.

### Saving curves with added nodes

Use `.value` for lossless save/restore and `.cssValue` for CSS animation timing. Multi-segment values use the component-specific `curve([[c1x,c1y,c2x,c2y,endX,endY], ...])` format; this is not CSS. Each segment starts at the preceding endpoint, with the first starting at `(0, 0)` unless an explicit start is stored. The final tuple stores the movable end. When the start is moved, the format is `curve({"start":[x,y],"segments":[...]})`. `.segments` also carries an optional `.start` tuple; preserve it when copying paths, or use `.value` for serialization. The model supports up to 512 segments. Invalid paths, non-increasing endpoint X values, and time loops fall back to the default curve. The exported `CurvePath`, `CurveSegment`, and `CurvePoint` types describe this API.

```ts
const saved = curve.value;
curve.value = saved;
const segments = curve.segments;
curve.segments = segments;
element.style.animationTimingFunction = curve.cssValue;
```

For multiple segments or moved endpoints, `.cssValue` approximates the path with 64 samples per segment in a CSS `linear(...)` function. The built-in preview evaluates the actual cubic segments. Before the start X and after the end X, preview and CSS export hold the corresponding endpoint Y constant. `.points` remains available for single-cubic compatibility; assigning it removes added nodes.

### Curve styling

<ClientOnly><GeometryExample kind="curve" styled /></ClientOnly>

The alternative hides the grid and thickens the curve without changing its behavior.

```css
dsk-curve {
  --dsk-curve-width: 370px;
  --dsk-curve-color: #ff0073;
  --dsk-curve-background: #111111;
  --dsk-curve-text-color: #ffffff;
  --dsk-curve-muted-color: #667386;
  --dsk-curve-border-color: #dde3ed;
  --dsk-curve-grid-color: transparent;
}

dsk-curve::part(container) {
  border-radius: 0;
}
dsk-curve::part(curve) {
  stroke-width: 4;
}

dsk-curve::part(value) {
  font-variant-numeric: tabular-nums;
}
```

The `container` and `heading` parts expose the editor panel and title row. The graph exposes `graph-container`, `graph`, `grid`, `diagonal`, `curve`, `guide`, `endpoint`, and `axis`. All handles expose `handle`; `handle-one` and `handle-two` identify the first and last control handles. The coordinate fields expose `coordinate`. Preset controls use `presets` and `preset`. The animation section exposes `preview`, `play`, and `motion-dot`; `value` exposes the serialized curve. Node actions expose `add` and `remove`. Keep the graph and handle geometry aligned when styling parts. The playground's **Curve** section includes live settings, generated HTML, an event log, and light/dark themes.

## Framework setup {#framework-setup}

Import the package once. For Vue, configure `isCustomElement: tag => tag.startsWith("dsk-")` in the template compiler as shown in [installation](/guide/installation). Angular uses CUSTOM_ELEMENTS_SCHEMA in the examples above. For React with TypeScript, add this declaration file:

```ts
// src/dsk-geometry.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { DskAngle, DskCurve } from '@flowscape-ui/dsk';
type GeometryProps<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  value?: string | number;
  step?: string | number;
  color?: string;
  disabled?: boolean;
  readonly?: boolean;
};
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-angle': GeometryProps<DskAngle> & {
        'snap-angle'?: string | number;
        unit?: string;
        min?: string | number;
        max?: string | number;
        size?: string | number;
        segments?: string | number;
      };
      'dsk-curve': GeometryProps<DskCurve> & {
        width?: string | number;
        duration?: string | number;
        grid?: string;
      };
    }
  }
}
```

## Edit history

Angle and curve controls support Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z while focused. One completed drag is one entry; Escape cancels without adding one. Focus a curve handle to undo the whole curve; coordinate fields retain their own draft editing. External value assignments reset local history. Disabled and readonly controls do not restore history.
