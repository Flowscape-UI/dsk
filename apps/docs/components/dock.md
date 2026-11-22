# Dock

Move HTML panels between destinations you define. DSK does not impose four screen edges, a grid, or panel appearance. `dsk-dock` owns the interaction, `dsk-dock-zone` is a destination, and `dsk-dock-item` contains the panel. Every tag needs a closing tag.

## Add two zones

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-dock class="workspace">
  <dsk-dock-zone id="left" aria-label="Left">
    <dsk-dock-item id="inspector" aria-label="Inspector">
      <button type="button" data-dsk-dock-handle>Move inspector</button>
      <label>Name <input value="Rectangle" /></label>
    </dsk-dock-item>
  </dsk-dock-zone>
  <dsk-dock-zone id="right" aria-label="Right"></dsk-dock-zone>
</dsk-dock>
```

```css
.workspace {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.workspace dsk-dock-zone {
  min-height: 120px;
  padding: 12px;
  border: 1px dashed #555;
}
.workspace dsk-dock-item {
  background: #252128;
  color: white;
  padding: 12px;
}
.workspace [data-dsk-dock-handle] {
  cursor: grab;
}
.workspace dsk-dock-zone[data-drag-over] {
  background: #321728;
  border-color: #ff007a;
}
```

<ClientOnly><EditorExample kind="dock" /></ClientOnly>

Use a native button for the handle so it has keyboard focus and an accessible name. The stylesheet supplies `touch-action: none` on handles. Content outside the handle keeps normal interaction. On drop, the existing item is appended to the destination, preserving its DOM and field values. A zone can hold multiple items. DSK does not automatically create tabs, resize panels, reorder items within a zone, or persist the workspace.

## Empty zones as overlays

Use `:has(> dsk-dock-item)` to distinguish occupied destinations. Empty zones use absolute positioning and appear only while the dock has `data-dragging`. Keep occupied zones in normal flow. Your container still needs its own dimensions, for example from the editor canvas.

```css
.workspace {
  position: relative;
  display: block;
  min-height: 220px;
}
.workspace dsk-dock-zone:has(> dsk-dock-item) {
  min-height: 0;
  padding: 0;
  border: 0;
}
.workspace dsk-dock-zone:not(:has(> dsk-dock-item)) {
  display: none;
  position: absolute;
  top: 12px;
  width: 30%;
  min-height: 100px;
  z-index: 2;
  background: #252128;
}
.workspace #left:not(:has(> dsk-dock-item)) {
  left: 12px;
}
.workspace #right:not(:has(> dsk-dock-item)) {
  right: 12px;
}
.workspace[data-dragging] dsk-dock-zone:not(:has(> dsk-dock-item)) {
  display: block;
}
```

<ClientOnly><EditorExample kind="dock" variant="overlay" /></ClientOnly>

New zones are discovered dynamically; there is no registration call. Put them anywhere inside the same dock, including wrappers. Nested docks own their own items and zones. A destination must be visible and enabled at drop time; it cannot be inside the moved item. Give overlapping zones a deliberate stacking order.

## API

| Element         | API                                 | Meaning                                                                    |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| `dsk-dock`      | `disabled`, `readOnly` (`readonly`) | Block user docking; presence attributes.                                   |
| `dsk-dock-zone` | `disabled`                          | Exclude the zone from user docking; a disabled source cannot start a drag. |
| `dsk-dock-item` | `disabled`                          | Prevent user movement of this item.                                        |
| `dsk-dock`      | `zones`, `items`                    | Current arrays of owned elements, read-only getters.                       |
| `dsk-dock`      | `dock(item, zone): boolean`         | Silent programmatic move; returns false for the same destination.          |
| `dsk-dock`      | `cancel()`                          | Cancel the active gesture.                                                 |

Programmatic `dock()` is an application assignment and is not blocked by disabled/readonly. It throws if the item/zone belongs to another dock or the zone is inside the item. It does not create a local undo history. Persist layout or integrate application history through events.

```ts
const dock = document.querySelector('dsk-dock')!;
const item = dock.querySelector('dsk-dock-item')!;
const destination = dock.querySelectorAll('dsk-dock-zone')[1]!;
dock.dock(item, destination);
```

## Events and cancellation

All events bubble and are composed `CustomEvent<DockDetail>`. Detail contains element references: `{ item, from, to }`; `to` can be null outside a destination.

| Event        | When                                                           |
| ------------ | -------------------------------------------------------------- |
| `dockstart`  | Gesture becomes active; cancelable.                            |
| `dockover`   | Candidate destination changes.                                 |
| `beforedock` | Before a valid move; cancelable.                               |
| `change`     | Item has moved to another zone.                                |
| `dockend`    | Successful move completed.                                     |
| `dockcancel` | Active gesture ends without a move, including same-zone drops. |

```ts
import type { DockDetail } from '@flowscape-ui/dsk';
const dock = document.querySelector('dsk-dock')!;
dock.addEventListener('beforedock', (event) => {
  if (event.target !== dock || !(event instanceof CustomEvent)) return;
  const { to } = (event as CustomEvent<DockDetail>).detail;
  if (to?.id === 'reserved') event.preventDefault();
});
```

Filter `event.target`: child controls can emit their own `change` events. Moving begins after a small pointer threshold. Escape, pointer cancellation, window blur, and disconnection cancel it. Keyboard: focus the handle, Space/Enter to pick up, arrows to choose enabled destinations in DOM order, Space/Enter to drop. Tab cancels before normal focus navigation.

## Styling contract

Everything in your light DOM can use normal CSS. `data-dragging` appears on the dock and dragged item; `data-dock-active` marks available zones; `data-drag-over` marks the current candidate. These states are owned by DSK and removed after the gesture.

`dsk-dock::part(preview)` styles the floating label. Tokens: `--dsk-dock-preview-background` (default `#202024`), `--dsk-dock-preview-color` (`#fff`), `--dsk-dock-preview-border` (`#777`). Its text comes from the item's `aria-label`, falling back to `Panel`. The `status` part is the accessible live announcement; do not make it visible merely to style the preview.

## Framework examples

Save the CSS shown above in `src/editor.css`. Imports and markup are enough; add handlers only when connecting application behavior.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<dsk-dock class="workspace">
  <dsk-dock-zone aria-label="Left">
    <dsk-dock-item aria-label="Inspector">
      <button type="button" data-dsk-dock-handle>Move inspector</button>
      <input value="DSK" />
    </dsk-dock-item>
  </dsk-dock-zone>
  <dsk-dock-zone aria-label="Right"></dsk-dock-zone>
</dsk-dock>
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
    <dsk-dock className="workspace">
      <dsk-dock-zone aria-label="Left">
        <dsk-dock-item aria-label="Inspector">
          <button type="button" data-dsk-dock-handle>
            Move inspector
          </button>
          <input defaultValue="DSK" />
        </dsk-dock-item>
      </dsk-dock-zone>
      <dsk-dock-zone aria-label="Right"></dsk-dock-zone>
    </dsk-dock>
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
  <dsk-dock class="workspace">
    <dsk-dock-zone aria-label="Left">
      <dsk-dock-item aria-label="Inspector">
        <button type="button" data-dsk-dock-handle>Move inspector</button>
        <input value="DSK" />
      </dsk-dock-item>
    </dsk-dock-zone>
    <dsk-dock-zone aria-label="Right"></dsk-dock-zone>
  </dsk-dock>
</template>
```

```svelte [Svelte]
<script lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<dsk-dock class="workspace">
  <dsk-dock-zone aria-label="Left">
    <dsk-dock-item aria-label="Inspector">
      <button type="button" data-dsk-dock-handle>Move inspector</button>
      <input value="DSK" />
    </dsk-dock-item>
  </dsk-dock-zone>
  <dsk-dock-zone aria-label="Right"></dsk-dock-zone>
</dsk-dock>
```

```ts [Angular]
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<dsk-dock class="workspace">
    <dsk-dock-zone aria-label="Left">
      <dsk-dock-item aria-label="Inspector">
        <button type="button" data-dsk-dock-handle>Move inspector</button>
        <input value="DSK" />
      </dsk-dock-item>
    </dsk-dock-zone>
    <dsk-dock-zone aria-label="Right"></dsk-dock-zone>
  </dsk-dock>`,
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
