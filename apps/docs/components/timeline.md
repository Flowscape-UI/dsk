# Timeline

`dsk-timeline` edits tracks, clips, and keyframes and supplies a playback clock. Your application decides how values affect its objects. No rendering engine is required. The examples below animate an ordinary HTML object.

## Add a timeline

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-timeline duration="4" aria-label="Animation"></dsk-timeline>
```

The empty timeline already supports seeking and playback. Assign data through the `tracks` property, not a JSON HTML attribute:

```ts
const timeline = document.querySelector('dsk-timeline')!;
timeline.tracks = [
  {
    id: 'x',
    label: 'Position X',
    keyframes: [
      { id: 'start', time: 0, value: -60 },
      { id: 'end', time: 4, value: 60 },
    ],
  },
];
```

<ClientOnly><EditorExample kind="timeline" /></ClientOnly>

This demo combines three independent properties. Position and opacity use direct track keys; rotation uses a clip. Move the playhead or press Play to see the object respond.

## Data and time coordinates

| Type                | Fields                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `TimelineTrack`     | `id`, `label`, optional `clips`, `keyframes`, `locked`, `muted`, `part`. |
| `TimelineClip`      | `id`, `label`, `start`, `duration`, optional `keyframes`, `part`.        |
| `TimelineKeyframe`  | `id`, `time`, optional numeric `value`, `easing`, `label`, `part`.       |
| `TimelineSelection` | `trackId`, `clipId: string \| null`, `keyframeId: string \| null`.       |

All time values are seconds. Direct keys use absolute timeline time; clip keys use time relative to the clip start. Clips are optional and can coexist with direct keys. Track IDs are unique across the timeline, clip IDs within their track, key IDs within their owner. Assignments validate and clone the data; the getter returns independent copies with `clips` always present. Mutating a returned copy does not update the timeline.

`tracks = ...` is a silent replacement that clears selection and local history. Use editing commands below for undoable changes. Clip geometry fits the timeline duration. Keys outside a visible duration are retained but hidden, so trimming does not erase animation data.

## Connect values to your object

Create these two files. The live examples use the same implementation. Import the connector only on the client. `evaluateTimelineTrack()` returns `{ clipId, value }[]`: direct keys use `clipId: null`; clips contribute only while active. Muted tracks return no samples; locked tracks still evaluate. If clips overlap, your application chooses how to combine their samples. This example uses the first sample per property.

`src/timeline-data.ts`:

<<< ../snippets/timeline-data.ts

`src/connect-timeline.ts`:

<<< ../snippets/connect-timeline.ts

The connector subscribes to time and data edits and returns cleanup. Call it once after mounting and dispose it before removing the page. Framework examples below use these files.

## Edit keys, select, lock, and mute

<ClientOnly><EditorExample kind="timeline" variant="advanced" /></ClientOnly>

Select a track/header for direct keys or a clip for clip-local keys. The value field is used for new keys. Select an existing key to edit its outgoing interpolation. Choose Custom Bezier to set X1, Y1, X2, and Y2. Lock blocks user and keyframe-command editing of that track; Mute changes its participation in evaluation. Mute does not stop the timeline clock.

```ts
timeline.addKeyframe('x', null, { id: 'middle', time: 2, value: 0 });
timeline.updateKeyframe('x', null, 'middle', {
  value: 30,
  easing: 'ease-in-out',
});
timeline.removeKeyframe('x', null, 'middle');
timeline.setTrackState('x', { locked: true, muted: false });
timeline.select([{ trackId: 'x', clipId: null, keyframeId: 'start' }]);
timeline.deleteSelection();
```

Pass a clip ID instead of null for clip keys. These editing commands return whether a change occurred; invalid targets/data can throw. Disabled/readonly block editing commands. `setTrackState()` can unlock a track. `selection` is the primary selection or null; `selections` contains all selected items. `select(items)` changes selection and emits selection events, without creating data history.

## Interpolation

`easing` belongs to the segment leaving a key. Default is `linear`; supported presets are `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, plus `step` and a custom `[x1, y1, x2, y2]` cubic Bezier array. All custom coordinates must be finite and within 0-1. `step` holds the left value until the next key. Numeric samplers hold endpoint values; duplicate times use the last supplied key; keys without numeric values are ignored.

```ts
import { evaluateTimelineKeyframes } from '@flowscape-ui/dsk';
const value = evaluateTimelineKeyframes(
  [
    { id: 'a', time: 0, value: 0, easing: [0.42, 0, 1, 1] },
    { id: 'b', time: 1, value: 100 },
  ],
  0.5,
);
```

The return value is `number | undefined`. The sampler calculates values; it does not mutate a DOM object or start an animation loop.

## Attributes and properties

| Attribute        | Property        | Default  | Purpose                                                               |
| ---------------- | --------------- | -------- | --------------------------------------------------------------------- |
| `duration`       | `duration`      | `12`     | Timeline length; minimum 0.01 seconds.                                |
| `current-time`   | `currentTime`   | `0`      | Playhead, clamped to duration. Programmatic assignment is silent.     |
| `zoom`           | `zoom`          | `1`      | Horizontal scale, minimum 0.1.                                        |
| `step`           | `step`          | `0.25`   | Grid and keyboard increment, minimum 0.001 seconds.                   |
| `snap`           | `snap`          | `true`   | Set `snap="false"` to disable snapping.                               |
| `snap-elements`  | `snapElements`  | `true`   | Set `false` to disable element magnets while retaining grid snapping. |
| `snap-threshold` | `snapThreshold` | `8`      | Magnetic distance in pixels, nonnegative.                             |
| `range-start`    | `rangeStart`    | `0`      | Playback start.                                                       |
| `range-end`      | `rangeEnd`      | duration | Playback end, at least 0.001 after start.                             |
| `loop`           | `loop`          | `false`  | Repeat the playback range; presence attribute.                        |
| `disabled`       | `disabled`      | `false`  | Block interaction and playback.                                       |
| `readonly`       | `readOnly`      | `false`  | Block edits, retain seeking and playback.                             |

`play()`, `pause()`, `togglePlayback()` control the clock; `playing` is read-only. Playback starts at the range beginning when the current time is outside the range. Changing range bounds pauses playback. Range handles also support arrows. Range changes are view state and do not enter track history. Disconnection stops playback.

## Events

| Event                    | Detail                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| `input`, `change`        | `{ tracks, action }`, `TimelineEditDetail`; live edit and committed edit. |
| `timeupdate`             | `{ time }` for interactive seeking/playback.                              |
| `selectionchange`        | Primary `TimelineSelection` or null.                                      |
| `selectionschange`       | Array of selections.                                                      |
| `rangechange`            | `{ start, end }` for range-handle interaction.                            |
| `play`, `pause`, `ended` | Playback lifecycle.                                                       |

Events bubble and cross shadow boundaries. Actions include `move`, `resize`, `reorder`, `history`, `keyframe`, `delete`, and `track-state`. Assigning properties is distinct from user input: update your application explicitly after silent assignments. Listen to `input` for live changes and `change` for persistence.

## Keyboard, selection, and snapping

- Space toggles playback when the timeline is focused. Drag the ruler to seek.
- Drag a track header to reorder it; Alt+Up/Down reorders from the keyboard.
- Drag clips or keys; arrows move focused items, Shift uses a larger step. Alt+arrows resize a clip end.
- Shift+click toggles selection; drag empty lane space for a selection rectangle. Shift+Enter toggles the focused item. Group movement keeps time spacing, clamping the group together at boundaries.
- Delete/Backspace or `deleteSelection()` removes editable selected items as one history edit. Locked tracks are preserved.
- Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z undo/redo track edits. Escape cancels a gesture.
- Magnets include the playhead, clip boundaries, keys, range bounds, and timeline boundaries. Alt temporarily disables pointer snapping. A guide marks the magnetic target.

## Appearance

<ClientOnly><EditorExample kind="timeline" styled /></ClientOnly>

```css
dsk-timeline {
  --dsk-timeline-accent: #ff007a;
  --dsk-timeline-radius: 0px;
  --dsk-timeline-row-height: 48px;
  --dsk-timeline-keyframe-angle: 0deg;
}
dsk-timeline::part(clip) {
  background: #28403d;
}
dsk-timeline::part(selected-keyframe) {
  filter: brightness(1.3);
}
```

Supported parts include `toolbar`, `play-button`, `time`, `viewport`, `board`, `ruler-row`, `ruler-label`, `ruler`, `tick`, `track`, `track-header`, `lane`, `clip`, `keyframe`, `keyframe-marker`, `resize-start`, `resize-end`, `playhead`, `playhead-marker`, `playback-range`, `range-start`, `range-end`, `selection-box`, and `snap-guide`. State parts include `selected-track`, `selected-track-header`, `selected-lane`, `selected-clip`, `selected-keyframe`, `locked-track`, and `muted-track`. Data `part` strings add custom whitespace-separated CSS identifiers. A named `toolbar` slot accepts your controls.

Token prefix: `--dsk-timeline-`. Color suffixes: `background`, `text`, `border`, `muted`, `accent`, `accent-text`, `header-background`, `selected-track-background`, `selected-header-background`, `clip-background`, `clip-border`, `clip-text`, `keyframe-color`, `handle-background`, `snap-color`. Layout/type suffixes: `font-size`, `line-height`, `font-family`, `mono-font-family`, `time-font-size`, `tick-font-size`, `label-width`, `row-height`, `ruler-height`, `max-height`, `radius`, `clip-inset`, `keyframe-size`, `keyframe-angle`, `handle-width`, `touch-handle-width`, `playhead-width`, `selection-shadow`, `muted-opacity`.

## Framework examples

Create the two files from the section above. `object` is ordinary HTML: give it a size and background. The `.stage` container reserves space for motion.

```css
/* src/editor.css */
.stage {
  height: 180px;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.object {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  background: #ff007a;
  color: white;
}
```

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<div class="stage"><div id="object" class="object">DSK</div></div>
<dsk-timeline duration="4"></dsk-timeline>
<script type="module">
  import '@flowscape-ui/dsk/styles.css';
  import './editor.css';
  import { connectTimeline } from './connect-timeline.ts';
  const dispose = connectTimeline(
    document.querySelector('dsk-timeline'),
    document.querySelector('#object'),
  );
  // In an SPA, call dispose() when unmounting this view.
</script>
```

```tsx [React]
import { useEffect, useRef } from 'react';
import type { DskTimeline } from '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
import { connectTimeline } from './connect-timeline';
export default function App() {
  const timeline = useRef<DskTimeline>(null);
  const object = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (timeline.current && object.current)
      return connectTimeline(timeline.current, object.current);
  }, []);
  return (
    <>
      <div className="stage">
        <div ref={object} className="object">
          DSK
        </div>
      </div>
      <dsk-timeline ref={timeline} duration="4"></dsk-timeline>
    </>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { DskTimeline } from '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
import { connectTimeline } from './connect-timeline';
const timeline = ref<DskTimeline>();
const object = ref<HTMLDivElement>();
let dispose: (() => void) | undefined;
onMounted(() => {
  if (timeline.value && object.value)
    dispose = connectTimeline(timeline.value, object.value);
});
onBeforeUnmount(() => dispose?.());
</script>
<template>
  <div class="stage"><div ref="object" class="object">DSK</div></div>
  <dsk-timeline ref="timeline" duration="4"></dsk-timeline>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import type { DskTimeline } from '@flowscape-ui/dsk';
  import '@flowscape-ui/dsk/styles.css';
  import './editor.css';
  import { connectTimeline } from './connect-timeline';
  let timeline: DskTimeline;
  let object: HTMLDivElement;
  onMount(() => connectTimeline(timeline, object));
</script>
<div class="stage"><div bind:this={object} class="object">DSK</div></div>
<dsk-timeline bind:this={timeline} duration="4"></dsk-timeline>
```

```ts [Angular]
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  type AfterViewInit,
  type OnDestroy,
} from '@angular/core';
import type { DskTimeline } from '@flowscape-ui/dsk';
import { connectTimeline } from './connect-timeline';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<div class="stage"><div #object class="object">DSK</div></div>
    <dsk-timeline #timeline duration="4"></dsk-timeline>`,
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('timeline') timeline!: ElementRef<DskTimeline>;
  @ViewChild('object') object!: ElementRef<HTMLDivElement>;
  private dispose?: () => void;
  ngAfterViewInit() {
    this.dispose = connectTimeline(
      this.timeline.nativeElement,
      this.object.nativeElement,
    );
  }
  ngOnDestroy() {
    this.dispose?.();
  }
}
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
