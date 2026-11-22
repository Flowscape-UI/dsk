# Transform box

`dsk-transform-box` gives ordinary HTML movement, rotation, and resizing. It does not create an editor selection frame. You choose the drag surface and add only the handles you need. All elements have explicit closing tags.

## Start with movement

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-transform-box width="200" height="130" x="12" y="20">
  <strong>DSK</strong>
</dsk-transform-box>
```

```css
dsk-transform-box {
  background: #252128;
  color: white;
  padding: 12px;
}
```

<ClientOnly><EditorExample kind="transform" /></ClientOnly>

Drag the free surface. Text selection and native form controls retain their interaction. Movement uses CSS translation relative to the original layout position; it does not reposition siblings or constrain the box to a canvas.

## Use a header and content

```html
<dsk-transform-box width="240" height="150">
  <dsk-transform-header>Inspector</dsk-transform-header>
  <dsk-transform-content>
    <label>Name <input value="Rectangle" /></label>
  </dsk-transform-content>
</dsk-transform-box>
```

The header must be a direct child. When present, only the header starts movement. `dsk-transform-content` protects its descendants from transforms; place handles outside it. Without a header, free areas of the box can start movement. Neither wrapper initializes an editor or changes application state.

<ClientOnly><EditorExample kind="transform" variant="header" /></ClientOnly>

## Add rotation and resize handles

```html
<dsk-transform-box class="object" width="200" height="130" snap-angle="15">
  <dsk-transform-header>Move</dsk-transform-header>
  <dsk-transform-content>Your HTML</dsk-transform-content>
  <dsk-transform-box-handle-rotate
    aria-label="Rotate"
  ></dsk-transform-box-handle-rotate>
  <dsk-transform-box-handle-resize
    direction="br"
    aria-label="Resize bottom right"
  ></dsk-transform-box-handle-resize>
</dsk-transform-box>
```

```css
.object {
  background: #252128;
  color: white;
}
.object dsk-transform-header {
  padding: 10px;
  cursor: grab;
}
.object dsk-transform-content {
  padding: 12px;
}
.object dsk-transform-box-handle-rotate {
  position: absolute;
  top: -26px;
  left: calc(50% - 10px);
}
.object dsk-transform-box-handle-resize {
  position: absolute;
  right: -6px;
  bottom: -6px;
}
.object dsk-transform-box-handle-rotate:focus-visible,
.object dsk-transform-box-handle-resize:focus-visible {
  box-shadow: 0 0 0 3px #ff007a;
}
```

<ClientOnly><EditorExample kind="transform" variant="handles" /></ClientOnly>

Add any number of handles. Resize directions are `t`, `l`, `r`, `b`, `tl`, `tr`, `bl`, and `br`; default is `br`. Position them yourself with CSS. Crossing the opposite edge continues resizing with nonnegative dimensions; this does not mirror the content. Rotation is around the box center. `movable="false"` disables movement while allowing enabled handles to operate.

## Attributes and properties

| Attribute         | Property          | Default      | Meaning                                                 |
| ----------------- | ----------------- | ------------ | ------------------------------------------------------- |
| `x`, `y`          | `x`, `y`          | `0`          | Translation in local CSS pixels.                        |
| `width`, `height` | `width`, `height` | `200`, `140` | Nonnegative dimensions in pixels.                       |
| `angle`           | `angle`           | `0`          | Rotation in degrees.                                    |
| `movable`         | `movable`         | `true`       | Only the string `false` disables movement.              |
| `step`            | `step`            | `1`          | Keyboard movement/resize step and normal rotation step. |
| `snap-angle`      | `snapAngle`       | `15`         | Shift rotation interval in degrees.                     |
| `disabled`        | `disabled`        | `false`      | Block user transforms.                                  |
| `readonly`        | `readOnly`        | `false`      | Block edits while allowing focus.                       |
| -                 | `value`           | object       | `{ x, y, width, height, angle }`, read/write.           |

`disabled` and `readonly` are presence attributes; remove them to turn them off. They do not disable child inputs. Each handle also supports its own `disabled` property/attribute, `aria-label`, classes, styles, and child markup. Programmatic assignments are silent and reset local history. Set transforms through the API rather than overwriting the host's `transform` style.

## Events and keyboard

`input` fires during an edit; `change` commits an edit. Both bubble across shadow boundaries and carry `TransformBoxDetail`: `{ x, y, width, height, angle, action }`, where `action` is `move`, `resize`, or `rotate`. Child input events also bubble, so filter the target.

```ts
const box = document.querySelector('dsk-transform-box')!;
box.addEventListener('change', (event) => {
  if (event.target !== box) return;
  console.log(box.value);
});
box.value = { x: 20, y: 30, width: 240, height: 160, angle: 15 };
```

Focus the box/header to move with arrows. Focus a handle to rotate or resize with arrows. Shift increases movement/resize steps and enables angle snapping. Escape cancels an active drag. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo/redo; a pointer gesture is one entry. Provide a visible focus style for your handles, as in the CSS above.

## Custom appearance

Style hosts and child elements directly. `::part(content)` targets the internal flex wrapper. `--dsk-transform-color` and `--dsk-transform-handle-background` control default handle colors. Internal position variables are updated by the component; use `x`, `y`, `width`, `height`, and `angle` for values. Your content remains your responsibility, including overflow and responsive layout.

<ClientOnly><EditorExample kind="transform" variant="handles" styled /></ClientOnly>

## Framework examples

Save the CSS shown above in `src/editor.css`. Imports and markup are enough; add handlers only when connecting application behavior.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<dsk-transform-box class="object" width="200" height="130">
  <dsk-transform-header>Move</dsk-transform-header>
  <dsk-transform-content>DSK</dsk-transform-content>
  <dsk-transform-box-handle-rotate
    aria-label="Rotate"
  ></dsk-transform-box-handle-rotate>
  <dsk-transform-box-handle-resize
    direction="br"
    aria-label="Resize"
  ></dsk-transform-box-handle-resize>
</dsk-transform-box>
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
    <dsk-transform-box className="object" width="200" height="130">
      <dsk-transform-header>Move</dsk-transform-header>
      <dsk-transform-content>DSK</dsk-transform-content>
      <dsk-transform-box-handle-rotate aria-label="Rotate"></dsk-transform-box-handle-rotate>
      <dsk-transform-box-handle-resize
        direction="br"
        aria-label="Resize"
      ></dsk-transform-box-handle-resize>
    </dsk-transform-box>
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
  <dsk-transform-box class="object" width="200" height="130">
    <dsk-transform-header>Move</dsk-transform-header>
    <dsk-transform-content>DSK</dsk-transform-content>
    <dsk-transform-box-handle-rotate
      aria-label="Rotate"
    ></dsk-transform-box-handle-rotate>
    <dsk-transform-box-handle-resize
      direction="br"
      aria-label="Resize"
    ></dsk-transform-box-handle-resize>
  </dsk-transform-box>
</template>
```

```svelte [Svelte]
<script lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<dsk-transform-box class="object" width="200" height="130">
  <dsk-transform-header>Move</dsk-transform-header>
  <dsk-transform-content>DSK</dsk-transform-content>
  <dsk-transform-box-handle-rotate aria-label="Rotate"></dsk-transform-box-handle-rotate>
  <dsk-transform-box-handle-resize direction="br" aria-label="Resize"></dsk-transform-box-handle-resize>
</dsk-transform-box>
```

```ts [Angular]
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<dsk-transform-box class="object" width="200" height="130">
    <dsk-transform-header>Move</dsk-transform-header>
    <dsk-transform-content>DSK</dsk-transform-content>
    <dsk-transform-box-handle-rotate
      aria-label="Rotate"
    ></dsk-transform-box-handle-rotate>
    <dsk-transform-box-handle-resize
      direction="br"
      aria-label="Resize"
    ></dsk-transform-box-handle-resize>
  </dsk-transform-box>`,
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
