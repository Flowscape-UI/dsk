# Panel

`dsk-panel` is a resizable container for inspectors, toolbars, and editor sidebars. Put ordinary HTML or DSK controls inside and style the host like a `div`. It supports global HTML attributes, `class`, `style`, `data-*`, and `aria-*`. It extends `HTMLElement`, not `HTMLDivElement`.

## Add a panel

Register DSK once in your client entry. No resize handler is required. Use an explicit closing tag. For framework and SSR setup, see [Installation](../guide/installation).

```js
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
  <h2>Inspector</h2>
  <label>Name <input value="Rectangle" /></label>
</dsk-panel>
```

```css
.inspector {
  width: 280px;
  height: 240px;
  padding: 20px;
  flex: none;
  background: #181818;
  color: white;
  --dsk-panel-handle-size: 8px;
}
.inspector::part(handle) {
  background: #557be8;
  cursor: ew-resize;
}
.inspector::part(handle):hover {
  background: #7796ff;
}
```

<ClientOnly><PanelExample /></ClientOnly>

## Resize direction and limits

`drag-end` selects the edge. Left/right change width; top/bottom change height. Dragging left or top keeps the opposite edge in place. The panel adjusts its CSS `left` or `top` when its layout does not already anchor the opposite edge. Keep the default relative positioning, or use an explicitly positioned panel. These offsets affect visual placement; siblings are still laid out by your CSS. Use flex/grid to define the surrounding editor layout.

`min-size` and `max-size` accept nonnegative numbers in CSS pixels. They limit user resizing along the selected axis. Omitted, empty, or invalid values add no restriction (the physical minimum is zero). If maximum is smaller than minimum, minimum wins. Changing a limit does not resize the panel until the next edit. Normal CSS `min-width`, `max-width`, `min-height`, and `max-height` also apply; conflicting CSS constraints take precedence.

## Handle placement

`offset` / property `offset` moves the handle outward; `inset` / property `inset` moves it inward. Both accept finite pixel numbers, including negatives; default is 0. The distance from the selected edge is `inset - offset`: `offset="8" inset="2"` gives -6 px. This positions the handle, not the panel. Avoid clipping an external handle with ancestor `overflow: hidden`.

```html
<dsk-panel offset="8" inset="2" min-size="160" max-size="480">
  <p>DSK</p>
</dsk-panel>
```

## Attributes and properties

| Attribute      | Property      | Default        | Purpose                                                          |
| -------------- | ------------- | -------------- | ---------------------------------------------------------------- |
| `drag-end`     | `dragEnd`     | `right`        | `left`, `right`, `top`, or `bottom`; invalid values use `right`. |
| `min-size`     | `minSize`     | `0`            | Minimum editable width or height in pixels.                      |
| `max-size`     | `maxSize`     | `Infinity`     | Maximum editable width or height in pixels.                      |
| `offset`       | `offset`      | `0`            | Outward handle offset in pixels; may be negative.                |
| `inset`        | `inset`       | `0`            | Inward handle offset in pixels; may be negative.                 |
| `step`         | `step`        | `1`            | Positive keyboard step in pixels.                                |
| `disabled`     | `disabled`    | `false`        | Disable resizing and remove the handle from tab navigation.      |
| `readonly`     | `readOnly`    | `false`        | Disable resizing but keep the handle focusable.                  |
| `handle-label` | `handleLabel` | `Resize panel` | Accessible name for the resize handle.                           |

Boolean attributes work by presence. Disabled/readonly affect resizing only, not child controls. Set dimensions using ordinary CSS or `panel.style.width` / `panel.style.height`. Programmatic changes are silent; external host `style` or `class` assignments reset local resize history.

## Style the edge

The shadow part `handle` supports normal CSS, including background, cursor, border, and opacity. Set its width for a vertical edge or height for a horizontal edge. Its length always follows the panel. `--dsk-panel-handle-size` sets thickness for either orientation. The handle is inside the panel's padding box; reserve space for it with padding if necessary.

| CSS property                    | Default                    |
| ------------------------------- | -------------------------- |
| `--dsk-panel-handle-size`       | `6px`                      |
| `--dsk-panel-handle-background` | `transparent`              |
| `--dsk-panel-handle-cursor`     | `ew-resize` or `ns-resize` |
| `--dsk-panel-handle-z-index`    | `1`                        |
| `--dsk-panel-focus-color`       | `#557be8`                  |

<ClientOnly><PanelExample styled /></ClientOnly>

## Keyboard and history

Focus the handle with Tab. Left/right arrows move a vertical edge; up/down move a horizontal edge. Shift multiplies `step` by ten. Escape cancels an active drag. Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z redoes. A complete drag is one history entry. Losing focus, pointer cancellation, disconnection, or changing the edge cancels an unfinished drag.

## Listen to changes

`input` fires while resizing; `change` fires once when a changed drag is released, or after a keyboard edit. Undo/redo emit both. Cancellation emits `input` with the restored size when necessary, without a committed `change`.

Both are bubbling, composed `CustomEvent<PanelResizeDetail>` events. Dimensions are computed CSS width/height in local pixels, so `box-sizing` determines whether they include padding and borders. Child input events also bubble normally: filter by target when listening on the panel.

```ts
import type { PanelResizeDetail } from '@flowscape-ui/dsk';

const panel = document.querySelector('dsk-panel')!;
panel.addEventListener('change', (event) => {
  if (event.target !== panel || !(event instanceof CustomEvent)) return;
  const { width, height, dragEnd } = (event as CustomEvent<PanelResizeDetail>)
    .detail;
  console.log(width, height, dragEnd);
});
```

## Framework examples

Save the CSS shown above in `src/editor.css`. Imports and markup are enough; add handlers only when connecting application behavior.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
  <h2>Inspector</h2>
  <label>Name <input /></label>
</dsk-panel>
<script type="module">
  import '@flowscape-ui/dsk';
  import '@flowscape-ui/dsk/styles.css';
  import './editor.css';
</script>
```

```tsx [React]
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
export default function App() {
  return (
    <dsk-panel
      className="inspector"
      drag-end="right"
      min-size="160"
      max-size="480"
    >
      <h2>Inspector</h2>
      <label>
        Name <input />
      </label>
    </dsk-panel>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<template>
  <dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
    <h2>Inspector</h2>
    <label>Name <input /></label>
  </dsk-panel>
</template>
```

```svelte [Svelte]
<script lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
  <h2>Inspector</h2>
  <label>Name <input /></label>
</dsk-panel>
```

```ts [Angular]
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<dsk-panel
    class="inspector"
    drag-end="right"
    min-size="160"
    max-size="480"
  >
    <h2>Inspector</h2>
    <label>Name <input /></label>
  </dsk-panel>`,
})
export class App {}
```

:::

</div>

## Framework setup

For Angular, keep CSS in the global `styles` list at `projects.<your-app>.architect.build.options` in `angular.json`. Preserve existing entries and add the package stylesheet and `src/editor.css` ([Angular CLI global styles](https://github.com/angular/angular-cli/wiki/stories-global-styles)).

```json
{
  "styles": [
    "node_modules/@flowscape-ui/dsk/dist/styles.css",
    "src/styles.css",
    "src/editor.css"
  ]
}
```

These examples target client-rendered apps. For SSR use the client imports and cleanup in [Installation](/guide/installation#server-rendered-applications). Configure Vue with `isCustomElement: tag => tag.startsWith("dsk-")`. For React with TypeScript add the declaration file below. This only describes JSX; it does not replace the library import. Do not duplicate declarations for tags already configured.

```ts
// src/dsk-editor.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DskPanel,
  DskTransformBox,
  DskTransformHeader,
  DskTransformContent,
  DskTransformBoxHandleRotate,
  DskTransformBoxHandleResize,
  DskTimeline,
  DskDock,
  DskDockZone,
  DskDockItem,
} from '@flowscape-ui/dsk';
type Props<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  width?: string | number;
  height?: string | number;
  x?: string | number;
  y?: string | number;
  angle?: string | number;
  duration?: string | number;
  'drag-end'?: string;
  'min-size'?: string | number;
  'max-size'?: string | number;
  offset?: string | number;
  inset?: string | number;
  direction?: string;
  'snap-angle'?: string | number;
  movable?: string;
  disabled?: boolean;
  readonly?: boolean;
};
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-panel': Props<DskPanel>;
      'dsk-transform-box': Props<DskTransformBox>;
      'dsk-transform-header': Props<DskTransformHeader>;
      'dsk-transform-content': Props<DskTransformContent>;
      'dsk-transform-box-handle-rotate': Props<DskTransformBoxHandleRotate>;
      'dsk-transform-box-handle-resize': Props<DskTransformBoxHandleResize>;
      'dsk-timeline': Props<DskTimeline>;
      'dsk-dock': Props<DskDock>;
      'dsk-dock-zone': Props<DskDockZone>;
      'dsk-dock-item': Props<DskDockItem>;
    }
  }
}
```
