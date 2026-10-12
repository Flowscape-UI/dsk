# Color and eyedropper

Build a color picker from independent controls: saturation/brightness, hue, opacity, and eyedropper. Each works on its own. Connect them with events only when your application needs a shared color.

Install once, then choose your framework in any example:

```sh
npm i @flowscape-ui/dsk
```

::: tip HTML first

After the browser loads `@flowscape-ui/dsk`, these tags work without an initialization function or event handler. They need closing tags in HTML. Examples below assume a client-rendered app with a bundler such as Vite. For SSR, use the [installation recipes](/guide/installation#server-rendered-applications).

:::

## dsk-color-area

Choose saturation and brightness without changing the hue.

<ClientOnly><ColorExample kind="area" /></ClientOnly>

### Add the component

```html
<dsk-color-area
  hue="333"
  saturation="100"
  brightness="100"
  aria-label="Fill color"
></dsk-color-area>
```

### Connect it to your project

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-area
  hue="333"
  saturation="100"
  brightness="100"
  aria-label="Fill color"
></dsk-color-area>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return (
    <dsk-color-area
      hue="333"
      saturation="100"
      brightness="100"
      aria-label="Fill color"
    ></dsk-color-area>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-area
    hue="333"
    saturation="100"
    brightness="100"
    aria-label="Fill color"
  ></dsk-color-area>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-area hue="333" saturation="100" brightness="100" aria-label="Fill color"></dsk-color-area>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-color-area hue="333" saturation="100" brightness="100" aria-label="Fill color"></dsk-color-area>',
})
export class App {}
```

:::

</div>

Import the package once. React TypeScript needs the declarations in [framework setup](#framework-setup); Vue needs the one-time `isCustomElement` configuration shown there. No demo controller is required.

### Optional: read the result

Add a listener only when you need to update your model or another element:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-area');
control?.addEventListener('change', () => {
  console.log(control.color);
});
```

Use `input` instead of `change` for live updates. The preview object above demonstrates this connection; the control itself does not need the preview code.

### CSS and an alternative appearance

Add `class="custom-color"` to the tag (`className` in React), then put this CSS in your stylesheet. In Vue use an unscoped `<style>` block. The same CSS works in every framework.

```css
dsk-color-area.custom-color {
  --dsk-color-area-radius: 0px;
  --dsk-color-area-marker-size: 20px;
  --dsk-color-area-focus-color: #ff0073;
}
dsk-color-area.custom-color::part(surface) {
  outline: 1px solid #606066;
  outline-offset: 4px;
}
```

<ClientOnly><ColorExample kind="area" styled /></ClientOnly>

### API and behavior

| Attribute / property                 | Default     | Purpose                                                       |
| ------------------------------------ | ----------- | ------------------------------------------------------------- |
| `hue`                                | `0`         | Degrees, wrapped to [0, 360).                                 |
| `saturation`                         | `100`       | Saturation, 0–100%.                                           |
| `brightness`                         | `100`       | HSV brightness, 0–100%.                                       |
| `step`                               | `1`         | Keyboard step in percentage points; Shift ×10.                |
| `width`, `height`                    | `208 × 208` | Positive pixel sizes; the larger dimension sets both sides.   |
| `disabled`, `readonly` / `.readOnly` | `false`     | Disable interaction, or prevent edits while preserving focus. |
| `.color`                             | `#FF0000`   | Readonly opaque RGB HEX.                                      |

Numeric setters accept numbers, numeric strings, `null`, or `undefined`; nullish values remove the attribute. Invalid channels use their defaults; percentages clamp to 0–100. Invalid or nonpositive sizes and steps use defaults. `disabled` and `readonly` are presence attributes: even `disabled="false"` disables a control. Global HTML attributes and accessible names remain available. These controls do not submit a form value automatically.

`input` reports live user edits and `change` reports commits. Both bubble and cross shadow boundaries; read properties rather than `event.detail`. Programmatic assignments update the display silently. Escape cancels a gesture and restores its starting value. `.focus()` forwards to the internal keyboard control.

Saturation increases left to right; brightness increases bottom to top. Tab selects a channel; Left/Right change saturation, Up/Down change brightness, and Home/End choose 0/100. A gray or black selection preserves the hue. Pointer capture allows dragging outside the square.

The area stays square: `width="240" height="180"` produces 240 × 240. Inline width/height follow the same rule. CSS sizing uses `--dsk-color-area-width` and `--dsk-color-area-height` (208px defaults); their larger requested size wins. The default radius is 4px, focus color is #557be8, and marker is 14px. Parts: `surface`, `marker`. Do not override marker position geometry.

## dsk-color-hue

Choose a hue along the spectrum.

<ClientOnly><ColorExample kind="hue" /></ClientOnly>

### Add the component

```html
<dsk-color-hue hue="333" aria-label="Hue"></dsk-color-hue>
```

### Connect it to your project

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-hue hue="333" aria-label="Hue"></dsk-color-hue>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-color-hue hue="333" aria-label="Hue"></dsk-color-hue>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-hue hue="333" aria-label="Hue"></dsk-color-hue>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-hue hue="333" aria-label="Hue"></dsk-color-hue>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<dsk-color-hue hue="333" aria-label="Hue"></dsk-color-hue>',
})
export class App {}
```

:::

</div>

Import the package once. React TypeScript needs the declarations in [framework setup](#framework-setup); Vue needs the one-time `isCustomElement` configuration shown there. No demo controller is required.

### Optional: read the result

Add a listener only when you need to update your model or another element:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-hue');
control?.addEventListener('change', () => {
  console.log(control.color);
});
```

Use `input` instead of `change` for live updates. The preview object above demonstrates this connection; the control itself does not need the preview code.

### CSS and an alternative appearance

Add `class="custom-color"` to the tag (`className` in React), then put this CSS in your stylesheet. In Vue use an unscoped `<style>` block. The same CSS works in every framework.

```css
dsk-color-hue.custom-color {
  --dsk-color-slider-height: 24px;
  --dsk-color-slider-radius: 0px;
  --dsk-color-slider-marker-size: 20px;
  --dsk-color-slider-focus-color: #ff0073;
}
```

<ClientOnly><ColorExample kind="hue" styled /></ClientOnly>

### API and behavior

| Attribute / property                 | Default     | Purpose                                                     |
| ------------------------------------ | ----------- | ----------------------------------------------------------- |
| `hue`                                | `0`         | Degrees clamped to 0–360; 360 stays at the right endpoint.  |
| `.color`                             | `#FF0000`   | Readonly fully saturated RGB HEX.                           |
| `step`                               | `1`         | Positive keyboard increment.                                |
| `width`, `height`                    | `208`, `16` | Positive pixel sizes; CSS sizing is supported.              |
| `disabled`, `readonly` / `.readOnly` | `false`     | Disabled removes keyboard access; readonly preserves focus. |

Numeric setters accept numbers, numeric strings, `null`, or `undefined`; nullish values remove the attribute. Invalid channels use their defaults; percentages clamp to 0–100. Invalid or nonpositive sizes and steps use defaults. `disabled` and `readonly` are presence attributes: even `disabled="false"` disables a control. Global HTML attributes and accessible names remain available. These controls do not submit a form value automatically.

`input` reports live user edits and `change` reports commits. Both bubble and cross shadow boundaries; read properties rather than `event.detail`. Programmatic assignments update the display silently. Escape cancels a gesture and restores its starting value. `.focus()` forwards to the internal keyboard control.

Click or drag the track. Right/Up increase, Left/Down decrease; Shift and Page Up/Down use ten steps. Home/End choose endpoints. Pointer cancellation or focus loss cancels an active drag. Each keyboard adjustment commits once.

CSS variables: `--dsk-color-slider-width` (208px), `--dsk-color-slider-height` (16px), `--dsk-color-slider-radius` (999px), `--dsk-color-slider-marker-size` (14px), `--dsk-color-slider-focus-color` (#557be8). Parts: `track`, `marker`, `input`. Keep the hidden native range accessible.

## dsk-color-alpha

Adjust opacity while keeping the base color.

<ClientOnly><ColorExample kind="alpha" /></ClientOnly>

### Add the component

```html
<dsk-color-alpha
  color="#FF0073"
  alpha="60"
  aria-label="Opacity"
></dsk-color-alpha>
```

### Connect it to your project

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-alpha
  color="#FF0073"
  alpha="60"
  aria-label="Opacity"
></dsk-color-alpha>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return (
    <dsk-color-alpha
      color="#FF0073"
      alpha="60"
      aria-label="Opacity"
    ></dsk-color-alpha>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-alpha
    color="#FF0073"
    alpha="60"
    aria-label="Opacity"
  ></dsk-color-alpha>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-alpha color="#FF0073" alpha="60" aria-label="Opacity"></dsk-color-alpha>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-color-alpha color="#FF0073" alpha="60" aria-label="Opacity"></dsk-color-alpha>',
})
export class App {}
```

:::

</div>

Import the package once. React TypeScript needs the declarations in [framework setup](#framework-setup); Vue needs the one-time `isCustomElement` configuration shown there. No demo controller is required.

### Optional: read the result

Add a listener only when you need to update your model or another element:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-alpha');
control?.addEventListener('change', () => {
  console.log(control.rgba);
});
```

Use `input` instead of `change` for live updates. The preview object above demonstrates this connection; the control itself does not need the preview code.

### CSS and an alternative appearance

Add `class="custom-color"` to the tag (`className` in React), then put this CSS in your stylesheet. In Vue use an unscoped `<style>` block. The same CSS works in every framework.

```css
dsk-color-alpha.custom-color {
  --dsk-color-slider-height: 24px;
  --dsk-color-slider-radius: 0px;
  --dsk-color-slider-marker-size: 20px;
  --dsk-color-slider-focus-color: #ff0073;
}
```

<ClientOnly><ColorExample kind="alpha" styled /></ClientOnly>

### API and behavior

| Attribute / property                 | Default     | Purpose                                                            |
| ------------------------------------ | ----------- | ------------------------------------------------------------------ |
| `color`                              | `#FF0000`   | Opaque RGB, 3 or 6 HEX digits, optional #; invalid colors use red. |
| `alpha`                              | `100`       | Opacity percentage, 0–100.                                         |
| `.rgba`                              | `#FF0000FF` | Readonly #RRGGBBAA; alpha rounded to a byte.                       |
| `step`                               | `1`         | Positive keyboard increment.                                       |
| `width`, `height`                    | `208`, `16` | Positive pixel sizes; CSS sizing is supported.                     |
| `disabled`, `readonly` / `.readOnly` | `false`     | Disabled removes keyboard access; readonly preserves focus.        |

Numeric setters accept numbers, numeric strings, `null`, or `undefined`; nullish values remove the attribute. Invalid channels use their defaults; percentages clamp to 0–100. Invalid or nonpositive sizes and steps use defaults. `disabled` and `readonly` are presence attributes: even `disabled="false"` disables a control. Global HTML attributes and accessible names remain available. These controls do not submit a form value automatically.

`input` reports live user edits and `change` reports commits. Both bubble and cross shadow boundaries; read properties rather than `event.detail`. Programmatic assignments update the display silently. Escape cancels a gesture and restores its starting value. `.focus()` forwards to the internal keyboard control.

Click or drag the track. Right/Up increase, Left/Down decrease; Shift and Page Up/Down use ten steps. Home/End choose endpoints. Pointer cancellation or focus loss cancels an active drag. Each keyboard adjustment commits once.

CSS variables: `--dsk-color-slider-width` (208px), `--dsk-color-slider-height` (16px), `--dsk-color-slider-radius` (999px), `--dsk-color-slider-marker-size` (14px), `--dsk-color-slider-focus-color` (#557be8). Parts: `track`, `marker`, `input`. Keep the hidden native range accessible.

Changing `color` preserves `alpha`. Three-digit RGB expands to six digits. RGBA, named colors, and CSS functions are not accepted as the base color. A checkerboard keeps zero opacity visible.

## dsk-color-eyedropper

Pick a color from a canvas, page snapshot, or the screen.

### Try different modes

Choose a **Mode**, then press the eyedropper button. Pick the same sample in Canvas and Custom: grayscale to compare the magnifier and result. You can select Native even when unsupported; the explanation tells you why its button is unavailable. Switching modes cancels the current session and preserves the selected color.

<ClientOnly><ColorExample kind="eyedropper" /></ClientOnly>

| Mode              | What changes                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Canvas            | Reads live pixels from the three samples with the DSK magnifier.                                                 |
| Page              | Captures an approximate page snapshot; you can sample page content, but snapshot navigation is frozen.           |
| Native            | Opens the browser's screen picker; DSK CSS cannot change its system magnifier.                                   |
| Custom: grayscale | The demo registers grayscale: it converts canvas pixels to gray before the magnifier and selection receive them. |
| Auto              | Uses Native when supported, otherwise Page.                                                                      |

Page mode captures the visible viewport by default. Offscreen branches become empty layout spacers, so their contents, images and canvases do not need to be rendered. A small overscan preserves nearby edges and shadows. Visible descendants, including fixed elements, remain in the snapshot. No custom filter is needed for long pages.

**grayscale is not built into DSK.** It is an example application mode. [See its complete registration code below](#custom-mode-example).

### Add the component

```html
<dsk-color-eyedropper aria-label="Pick a color"></dsk-color-eyedropper>
```

The tag above automatically chooses native screen picking when supported, otherwise a page snapshot. The interactive example starts in `mode="canvas"`; its mode selector lets you compare built-in modes and an application-defined mode.

### Connect it to your project

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-eyedropper aria-label="Pick a color"></dsk-color-eyedropper>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return (
    <dsk-color-eyedropper aria-label="Pick a color"></dsk-color-eyedropper>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-eyedropper aria-label="Pick a color"></dsk-color-eyedropper>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-eyedropper aria-label="Pick a color"></dsk-color-eyedropper>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-color-eyedropper aria-label="Pick a color"></dsk-color-eyedropper>',
})
export class App {}
```

:::

</div>

Import the package once. React TypeScript needs the declarations in [framework setup](#framework-setup); Vue needs the one-time `isCustomElement` configuration shown there. No demo controller is required.

### Optional: read the result

Add a listener only when you need to update your model or another element:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-eyedropper');
control?.addEventListener('change', () => {
  console.log(control.color);
});
```

Use `input` instead of `change` for live updates. The preview object above demonstrates this connection; the control itself does not need the preview code.

### CSS and an alternative appearance

Add `class="custom-color"` to the tag (`className` in React), then put this CSS in your stylesheet. In Vue use an unscoped `<style>` block. The same CSS works in every framework.

```css
dsk-color-eyedropper.custom-color {
  --dsk-color-eyedropper-size: 40px;
  --dsk-color-eyedropper-background: #1a181a;
  --dsk-color-eyedropper-color: #f5f5f5;
  --dsk-color-eyedropper-border-color: #303033;
  --dsk-color-eyedropper-hover-background: #1b191b;
  --dsk-color-eyedropper-active-color: #ff0073;
  --dsk-color-eyedropper-focus-color: #ff0073;
  --dsk-color-eyedropper-radius: 0px;
  --dsk-color-eyedropper-magnifier-size: 144px;
  --dsk-color-eyedropper-magnifier-radius: 0px;
}
```

<ClientOnly><ColorExample kind="eyedropper" styled /></ClientOnly>

### Try canvas mode

The picker needs no event handler to select and remember a color. This JavaScript only draws the three sample colors. In an editor, point `source` at the canvas you already render. In a framework, draw after the canvas mounts; the eyedropper markup is unchanged.

```html
<dsk-color-eyedropper
  mode="canvas"
  source="#editor-canvas"
  aria-label="Pick color"
></dsk-color-eyedropper>
<canvas id="editor-canvas" width="180" height="96"></canvas>
<script type="module" src="/src/canvas-demo.ts"></script>
```

```ts
// src/canvas-demo.ts
import '@flowscape-ui/dsk';
const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas');
const context = canvas?.getContext('2d');
if (context) {
  ['#FF0073', '#7755FF', '#FFC857'].forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(index * 60, 0, 60, 96);
  });
}
```

### Add your own mode {#custom-mode-example}

1. Use the canvas and drawing code from the example above.
2. Create `src/eyedropper-grayscale.ts` with the code below. This is the exact file used by the interactive example.
3. Register the mode on your eyedropper instance and select it through `.mode`.

<<< @/snippets/eyedropper-grayscale.ts

Add this after drawing the canvas in `src/canvas-demo.ts`:

```ts
import { registerGrayscaleMode } from './eyedropper-grayscale';

const picker = document.querySelector('dsk-color-eyedropper');
if (picker) {
  const unregister = registerGrayscaleMode(picker);
  picker.mode = 'grayscale';
  // Call unregister() when your view is removed.
}
```

`isSupported` checks for a source. `createSession` creates a selection session. Its `sample` reads a small canvas region and replaces RGB channels with a weighted gray value. The canvas stays colored; only the magnifier pixels and selected color become gray. This is a demonstration filter, not a color-space conversion.

An application mode could instead read your renderer's pixels or composite layers. Return `dispose` when a session owns temporary resources; this example owns none. In a framework, register after the element mounts and call the returned `unregister()` when the view unmounts. For SSR, import this module only in the browser.

Build your own mode menu from `picker.modes` (id, label, supported) if needed. Remove the mode attribute or assign `picker.mode = null` to restore automatic mode selection.

### API and behavior

| Attribute          | Property          | Default                             | Behavior                                                                                                                                                                                                                                          |
| ------------------ | ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`            | `color`           | `""`                                | Last selected opaque RGB HEX. Accepts three or six digits with an optional `#`; returns uppercase `#RRGGBB`. Empty or invalid values return an empty string.                                                                                      |
| –                  | `value`           | `""`                                | Read/write property alias of `color`. There is no `value` attribute.                                                                                                                                                                              |
| `size`             | `size`            | `32`                                | Positive square button size in pixels. Invalid or nonpositive values use the default.                                                                                                                                                             |
| `mode`             | `mode`            | Native if supported, otherwise page | A missing or empty mode chooses by native support; `.mode` returns the resolved name. Explicit `canvas`, `page`, `native`, registered names, and legacy canvas alias `custom` are preserved. Unsupported explicit names never silently fall back. |
| `source`           | `source`          | Unset                               | Attribute: a canvas CSS selector in the component's root. Property: an `HTMLCanvasElement` reference, `null`, or `undefined`. With no explicit source or sampler, custom mode discovers a canvas under the pointer.                               |
| –                  | `sampler`         | Unset                               | Optional `EyeDropperSampler` for canvas/custom mode. Takes precedence over `source` there; other modes do not use this override. Return `null` outside sampleable content.                                                                        |
| –                  | `pageOptions`     | Viewport defaults                   | `EyeDropperPageOptions` for page snapshots. Controls font/image embedding, scroll preservation, pseudo-elements, and style/node filters. Does not affect other modes.                                                                             |
| –                  | `modes`           | Built-in modes                      | Readonly list of `{ id, label, supported }` for canvas, page, native, and instance registrations. The custom alias is not listed separately.                                                                                                      |
| `magnifier-pixels` | `magnifierPixels` | `9`                                 | Number of source pixels per magnifier edge. Rounded and clamped to 3–31; even values advance to the next odd number. Invalid/nonpositive values use 9. Applies to all non-native modes.                                                           |
| `disabled`         | `disabled`        | `false`                             | Boolean presence semantics; prevents picking and removes button keyboard access.                                                                                                                                                                  |
| –                  | `supported`       | Browser dependent                   | Readonly capability check for the selected mode. Native mode requires a secure context and `EyeDropper`. Custom availability does not guarantee that a particular canvas is readable.                                                             |
| –                  | `nativeSupported` | Browser dependent                   | Readonly native support check, regardless of selected mode.                                                                                                                                                                                       |
| –                  | `picking`         | `false`                             | Readonly active-selection state.                                                                                                                                                                                                                  |

`color` and `value` setters accept strings, `null`, or `undefined`; null and undefined remove the attribute. `size` and `magnifierPixels` accept `ColorNumber` (number, numeric string, null, or undefined). The `mode` setter accepts a built-in or registered name, null, or undefined. Removing or emptying `mode`, or assigning null/undefined, restores automatic selection: native when supported, otherwise page. The playground reset uses this rule too. Standard HTML global attributes and DOM event properties remain available. `aria-label` customizes the button's accessible name. `.focus()` forwards to the button. The element does not submit a form value automatically.

### Eyedropper selection and events

```ts
import { type EyeDropperErrorDetail } from '@flowscape-ui/dsk';

const eyedropper = document.querySelector('dsk-color-eyedropper');
if (!eyedropper) throw new Error('Missing eyedropper');

eyedropper.onchange = () => {
  console.log('Selected color:', eyedropper.color);
};
eyedropper.addEventListener('cancel', () => {
  console.log('Selection canceled; previous color preserved');
});
eyedropper.addEventListener('pickerror', (event) => {
  const { error } = (event as CustomEvent<EyeDropperErrorDetail>).detail;
  console.error(error.message);
});
```

Each successful selection updates `color`, emits `input`, then emits `change`. Both events bubble and cross shadow boundaries. They fire even if the chosen color matches the previous value: the user has completed another selection. Read the result from `.color` or `.value` in the handler; these are standard events without a color payload in `detail`. Programmatic assignments are silent.

`pickstart` signals that selection was requested. Escape, cancellation, or `.cancel()` emits `cancel`, preserves the previous color, and emits no value events. `pickerror` exposes `detail.error` for unsupported modes or failures other than cancellation; `EyeDropperErrorDetail` is exported for typed handlers.

`.open(): Promise<string | null>` starts selection and resolves to the selected HEX color, or `null` if no selection completes. Invoke it directly from a click or keyboard activation handler so native mode retains user activation. `.cancel(): void` aborts an active session. The built-in button handles activation itself and is disabled while selection is active. Programmatic color, mode, source, sampler, page-option, or magnifier-pixel changes, disabling, and disconnection abort pending work silently; late results cannot overwrite new state.

In live canvas mode, move the pointer to preview, click a sampleable pixel to select, or use arrow keys and Enter for keyboard selection. With an explicit visible canvas, keyboard selection starts at its center; arrows also work before the first valid sample. Arrows move by one viewport CSS pixel; Shift moves by ten. Escape cancels. Space is reserved for editor navigation. Wheel, middle-button dragging, right-click, and Space + dragging pass through to the application; the editor implements pan and zoom. Scroll and resize update coordinates without ending selection. Switching windows or hiding the page cancels. Focused text controls retain keyboard behavior. Only one non-native selection can be active per document. Page snapshot mode freezes navigation for the captured view.

Canvas, page, and registered modes emit `colorpreview` across shadow boundaries with `EyeDropperPreviewDetail`: `{ color, x, y, pixels }`. Coordinates are viewport CSS pixels; `pixels` is square `ImageData` with the highlighted pixel at its center. Live samples refresh while the pointer is stationary, reflecting renderer updates and zoom. Preview never changes `.color` or emits value events. Outside sampleable content, the magnifier hides and clicks do not commit a color; other controls remain usable in live modes. Native mode uses the browser's preview UI.

### Page snapshots

```html
<dsk-color-eyedropper mode="page"></dsk-color-eyedropper>
```

Page mode selects from a fresh snapshot of the current viewport, including HTML outside a canvas. Each activation reads the current DOM and live control values, such as input values, checked states, and selected options, and waits for document fonts to be ready before capture. It does not reuse a previous selection's snapshot or rely only on initial markup. The DOM renderer loads only when this mode is used. Preparing large pages or embedding image/font resources can take time. The captured view remains static during selection, so page navigation and editor pan/zoom are unavailable until selection ends. The same magnifier styles, slot, and preview events apply.

The default capture copies all computed CSS properties, including styles originating in stylesheets, inline attributes, JavaScript updates, and browser defaults. It embeds available fonts and images, preserves element scroll positions, and captures supported pseudo-element styles separately. Animations and transitions are frozen at their captured values. The exported `eyeDropperPagePseudoElements` list includes `::before`, `::after`, `::placeholder`, `::marker`, `::first-letter`, `::first-line`, and `::file-selector-button`. When no list is supplied, the capture also discovers simple pseudo-elements declared in readable stylesheets. Browser-unsupported pseudo-elements are skipped. Explicit entries must be simple `::name` selectors, without selector arguments or element selectors.

Use the JavaScript property `.pageOptions` to reduce capture work for a known page or supply an explicit allowlist. Omitted options keep the full defaults; there is no corresponding HTML attribute.

| Option            | Default                               | Behavior                                                                                                                                                                              |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `embedFonts`      | `true`                                | Embed accessible font resources in the snapshot.                                                                                                                                      |
| `inlineImages`    | `true`                                | Embed accessible image resources, including CSS image resources.                                                                                                                      |
| `preserveScroll`  | `true`                                | Preserve scroll positions inside captured elements.                                                                                                                                   |
| `pseudoElements`  | Default list and stylesheet discovery | A readonly string array replaces the default set and disables discovery. Use `false` or `[]` to skip pseudo-element style capture.                                                    |
| `styleProperties` | All computed properties               | A readonly array of CSS property names restricts copied styles on both elements and pseudo-elements. `[]` copies none. Layout and typography properties must be included when needed. |
| `filterStyles`    | Include all                           | `(element, property, pseudo) => boolean` further filters copied properties. `pseudo` is a pseudo-element name or `null` for the element itself.                                       |
| `filter`          | Include page content                  | `(node) => boolean` excludes unwanted nodes. The capture root and internal safety exclusions cannot be overridden.                                                                    |

```ts
import {
  eyeDropperPagePseudoElements,
  type EyeDropperPageOptions,
} from '@flowscape-ui/dsk';

const picker = document.querySelector('dsk-color-eyedropper');
if (!picker) throw new Error('Missing eyedropper');

const options: EyeDropperPageOptions = {
  // Keep the built-in pseudo-elements and add a browser-specific one.
  pseudoElements: [...eyeDropperPagePseudoElements, '::-webkit-slider-thumb'],
  // This application does not need to capture its debug overlay.
  filter: (node) =>
    !(node instanceof Element && node.matches('[data-debug-overlay]')),
};
picker.pageOptions = options;

// Reset every option to its full default before the next capture.
picker.pageOptions = null;
```

For a deliberately limited surface, `picker.pageOptions = { styleProperties: ['color', 'background-color'], pseudoElements: ['::placeholder'] }` copies only those computed properties and that pseudo-element. Use a complete list for the surface's layout and text styles if its appearance needs to be retained. `filterStyles` can narrow that list further or filter the default complete set. Capture geometry and animation freezing remain managed by the component. Filters apply to the cloned capture, not the live page; excluding a node also excludes its descendants. Assigning options replaces the previous configuration; arrays are copied and the returned options object is frozen. Assign `null` or `undefined` to reset. Changing options ends an active selection.

These defaults improve DOM rendering fidelity; they do not grant access to the browser's final compositor pixels. Native form controls, backdrop effects, some CSS compositing, fonts, and external resources can still render differently inside an SVG snapshot. Firefox can omit browser-painted checkbox and radio appearances even when their current checked state is serialized correctly. CSS-drawn controls do not depend on that native painting. Closed shadow roots, cross-origin frames, protected content, tainted canvases, and inaccessible resources cannot be captured reliably. Disabling resource embedding can make resources disappear from the snapshot. This mode does not capture browser chrome or other windows. Use canvas or a renderer-backed mode when accurate live editor pixels and navigation matter; choose native when supported for browser-controlled screen sampling.

### Register an application mode

Register modes on each component instance before assigning their names. A sampler callback is sufficient when the renderer already has everything needed to read pixels:

```ts
import { createCanvasSampler } from '@flowscape-ui/dsk';

const picker = document.querySelector('dsk-color-eyedropper');
const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas');
if (!picker || !canvas) throw new Error('Missing editor elements');

picker.registerMode('my-editor', createCanvasSampler(canvas));
picker.mode = 'my-editor';
console.table(picker.modes);
```

`registerMode(name, adapterOrSampler): void` accepts lowercase names matching `[a-z][a-z0-9-]*`. Built-in names `canvas`, `page`, `native`, and alias `custom` are reserved; registering or unregistering them throws `TypeError`. A sampler uses the request contract below. An `EyeDropperModeAdapter` also controls its label, support check, preparation, and cleanup:

```ts
import { createCanvasSampler } from '@flowscape-ui/dsk';
const picker = document.querySelector('dsk-color-eyedropper');
const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas');
if (!picker || !canvas) throw new Error('Missing editor elements');
picker.source = canvas;
picker.registerMode('my-editor', {
  label: 'My editor',
  isSupported: ({ source }) => source !== null,
  createSession: ({ source, signal }) => {
    if (!source || signal.aborted) {
      throw new DOMException('Selection canceled', 'AbortError');
    }
    return {
      sample: createCanvasSampler(source),
      dispose: () => {
        // Release renderer-owned temporary resources, if any.
      },
    };
  },
});
```

`EyeDropperModeContext` contains `{ host, document, signal, source }`. `createSession` returns an `EyeDropperSession` or a promise of one. A session provides `sample`, optional synchronous `dispose()`, and an optional canvas `surface` covering the captured viewport. Supply a surface only when the mode intentionally freezes the view; live renderer integrations need only a sampler. Snapshot sessions cancel on scroll or resize. Honor the abort signal during preparation and clean up resources acquired before a session is returned. The component disposes returned sessions once on selection, cancellation, failure, and mode changes, including sessions that finish preparation after cancellation. Keep disposal nonthrowing; a thrown disposal error prevents a successful commit and reports `pickerror`. Adapter and session methods retain their `this` binding, so class-based integrations are supported. `.sampler` belongs to canvas/custom mode and never replaces a registered adapter's sampler.

The `.modes` list contains `EyeDropperModeInfo` entries for application menus. Keep `isSupported` synchronous and free of side effects; re-register the adapter after external capability changes to refresh the button. Unknown mode names disable selection and report a support error on `.open()`. `unregisterMode(name): boolean` removes an instance registration and reports whether one existed. Removing the active registration ends its selection without silently changing the requested mode.

### Live canvas and renderer integration

For a readable 2D canvas, set `source="#editor-canvas"` or assign `.source = canvas`. Assigning the property clears the selector attribute; assigning `null` or `undefined` removes the explicit source. The getter returns the resolved canvas or `null`. The adapter reads the current backing store, maps viewport coordinates using the canvas's current layout and backing-store dimensions, and composites transparent pixels over white. It supports the default `object-fit: fill` and positive axis-aligned CSS scaling. It does not rerender the DOM or change page styling. Prefer drawing an opaque editor background when its appearance matters. Drawing external images without CORS permission taints a canvas and prevents pixel reads.

The exported `createCanvasSampler(canvas)` creates the same adapter for composition. For WebGL, WebGPU, multiple canvas layers, custom color management, or a renderer with its own camera, assign an `EyeDropperSampler` instead. The renderer supplies the final visible pixels and handles its own coordinate mapping:

```ts
import { createCanvasSampler, type EyeDropperSampler } from '@flowscape-ui/dsk';

const picker = document.querySelector('dsk-color-eyedropper');
const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas');
if (!picker || !canvas) throw new Error('Missing editor elements');

const readCanvas = createCanvasSampler(canvas);
const sampler: EyeDropperSampler = (request) => {
  // An editor can flush its latest frame here before reading pixels.
  return readCanvas(request);
};
picker.sampler = sampler;
picker.mode = 'canvas';
```

`EyeDropperSampleRequest` contains `{ x, y, size, signal }`: viewport CSS coordinates, an odd square sample size, and an abort signal. Return opaque sRGB `ImageData` of `size × size` with the selected pixel at its center, `null` outside sampleable content, or a promise of either. Perform a small region read and honor cancellation; expensive full-frame GPU readbacks can stall interaction. Obsolete asynchronous hover results are ignored after navigation or cancellation. A click requests fresh pixels at its chosen position; later pointer movement does not change that deliberate selection. In canvas/custom mode, `.sampler` takes precedence over `source`; without either, the component discovers a canvas under the pointer.

This integration reads the editor's pixels, not arbitrary rendered HTML or the operating system display. CSS overlays, filters, rotation, and other browser compositing on top of a canvas are not automatically part of its backing store; provide the final composite through `sampler` when needed. JavaScript, Rust compiled to WASM, and other browser code share the same screen-access restrictions. Without native browser support or a separately installed host, a browser UI kit cannot provide unrestricted picking outside the page.

**Mode migration:** omit or empty `mode` for native when available, otherwise page. Explicitly use `canvas` for live pixels, or retain `custom` as its canvas alias; neither is the automatic default. Explicit `page` always requests a snapshot, and explicit `native` stays unavailable on unsupported browsers. Unknown names are unsupported rather than falling back. Existing magnifier variables, slots, and value events apply to all non-native modes. All modes return opaque RGB HEX, not original alpha or source color-space metadata.

For whole-screen picking, explicitly choose native mode:

```html
<dsk-color-eyedropper mode="native"></dsk-color-eyedropper>
```

The browser's [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper/open) requires HTTPS or a trustworthy local origin, user activation, and browser support. `.supported` checks the chosen mode and disables the button when unavailable. Native mode never silently falls back. Its cursor and magnifier belong to the browser; our styles and slots apply to canvas, page, and registered modes.

### Eyedropper styling

```css
dsk-color-eyedropper {
  --dsk-color-eyedropper-size: 32px;
  --dsk-color-eyedropper-background: #1a181a;
  --dsk-color-eyedropper-color: #f5f5f5;
  --dsk-color-eyedropper-border-color: #303033;
  --dsk-color-eyedropper-hover-background: #1b191b;
  --dsk-color-eyedropper-active-color: #ff0073;
  --dsk-color-eyedropper-focus-color: #ff0073;
  --dsk-color-eyedropper-radius: 0px;
}
```

The `button`, `icon`, and `status` shadow parts expose the button, SVG, and visually hidden live status message. Keep the status accessible when customizing it.

### Custom magnifier

The default magnifier has a 120px circular lens, a 9 × 9 pixel grid, an outlined center pixel, a swatch, and a HEX label. Change its appearance without changing selection logic:

```css
dsk-color-eyedropper {
  --dsk-color-eyedropper-magnifier-size: 160px;
  --dsk-color-eyedropper-magnifier-radius: 0px;
  --dsk-color-eyedropper-magnifier-border: 2px solid #fff;
  --dsk-color-eyedropper-magnifier-shadow: 0 4px 12px #0008;
  --dsk-color-eyedropper-magnifier-background: #20232b;
  --dsk-color-eyedropper-magnifier-color: #fff;
  --dsk-color-eyedropper-magnifier-offset: 20px;
  --dsk-color-eyedropper-grid-color: #fff;
  --dsk-color-eyedropper-grid-opacity: 1;
  --dsk-color-eyedropper-crosshair-border: 1px solid #fff;
  --dsk-color-eyedropper-crosshair-shadow: 0 0 0 1px #000;
  --dsk-color-eyedropper-readout-radius: 0px;
  --dsk-color-eyedropper-readout-display: flex;
}

dsk-color-eyedropper::part(value) {
  font-family: monospace;
}
```

`magnifier-offset` is a pixel offset (numeric or px). The shadow value uses `filter: drop-shadow()`, so spread/inset values are not supported. Use grid opacity `0` to hide the grid, or readout display `none` to hide the label. `magnifier-pixels` controls how much source detail is shown independently of lens size.

The white grid uses `mix-blend-mode: difference` to invert the pixels beneath its lines. For a fixed grid color, override `mix-blend-mode: normal` on `::part(grid)`.

Shadow parts available during non-native selection: `overlay` (positioning layer), `magnifier` (positioned wrapper), `lens` (clipped frame), `pixels` (enlarged canvas), `grid`, `crosshair`, `readout`, `swatch`, and `value`. Captured-surface modes also expose `snapshot`. Keep the live overlay and magnifier noninteractive so navigation reaches the editor; snapshot modes intentionally intercept interaction. The wrapper exposes the highlighted color as `--dsk-color-eyedropper-selected-color` and `data-color`.

For a completely different layout, supply `slot="magnifier"`. The component keeps positioning, keyboard handling, sampling, and cancellation; your content replaces the entire default lens and readout:

```html
<dsk-color-eyedropper
  id="custom-picker"
  mode="canvas"
  source="#editor-canvas"
  magnifier-pixels="11"
>
  <div slot="magnifier" class="my-loupe">
    <canvas class="my-pixels" aria-hidden="true"></canvas>
    <span class="my-hex"></span>
  </div>
</dsk-color-eyedropper>
```

```css
.my-loupe {
  padding: 8px;
  border: 2px solid var(--dsk-color-eyedropper-selected-color, #fff);
  border-radius: 16px;
  background: #15171c;
  color: white;
}
.my-pixels {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  image-rendering: pixelated;
}
```

```ts
import { type EyeDropperPreviewDetail } from '@flowscape-ui/dsk';

const picker = document.querySelector('dsk-color-eyedropper#custom-picker');
const canvas = picker?.querySelector<HTMLCanvasElement>('.my-pixels');
const label = picker?.querySelector<HTMLElement>('.my-hex');
if (!picker || !canvas || !label) throw new Error('Missing custom magnifier');

picker.addEventListener('colorpreview', (event) => {
  const { color, pixels } = (event as CustomEvent<EyeDropperPreviewDetail>)
    .detail;
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext('2d')?.putImageData(pixels, 0, 0);
  label.textContent = color;
});
```

The playground's **Eyedropper** section demonstrates live canvas selection while panning and zooming, page snapshots, native picking, and an `editor` registration that composites two canvas layers. Page mode exposes font, image, and pseudo-style capture toggles with a configuration example. It also provides magnifier size/shape/grid settings, selected-color output, and lifecycle events.

## Framework setup {#framework-setup}

These settings are needed only once per application. Keep your existing configuration; do not create a new wrapper component for each color control.

<details>
<summary>React + TypeScript</summary>

Add this declaration file alongside your input declarations. It describes the attributes used above and does not add runtime code.

```ts
// src/dsk-color.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DskColorArea,
  DskColorHue,
  DskColorAlpha,
  DskColorEyedropper,
} from '@flowscape-ui/dsk';

type ColorProps<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  hue?: string | number;
  saturation?: string | number;
  brightness?: string | number;
  color?: string;
  alpha?: string | number;
  width?: string | number;
  height?: string | number;
  step?: string | number;
  disabled?: boolean;
  readonly?: boolean;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-color-area': ColorProps<DskColorArea>;
      'dsk-color-hue': ColorProps<DskColorHue>;
      'dsk-color-alpha': ColorProps<DskColorAlpha>;
      'dsk-color-eyedropper': DetailedHTMLProps<
        HTMLAttributes<DskColorEyedropper>,
        DskColorEyedropper
      > & {
        color?: string;
        size?: string | number;
        mode?: string;
        source?: string;
        'magnifier-pixels'?: string | number;
        disabled?: boolean;
      };
    }
  }
}
```

</details>

<details>
<summary>Vue + Vite</summary>

If you already configured `isCustomElement` for `dsk-*`, nothing else is needed. Otherwise merge this option into your Vue plugin:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('dsk-'),
        },
      },
    }),
  ],
});
```

</details>

## Combine the controls

Hue changes the area, the area changes the alpha slider’s base color, and alpha gives the final RGBA. They do not link automatically: this small handler defines the relationship.

<ClientOnly><ColorExample kind="combined" /></ClientOnly>

Choose your framework. This minimal version writes the result into an output; the preview above applies the same RGBA to the canvas object.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<section class="color-picker">
  <dsk-color-area
    hue="333"
    saturation="100"
    brightness="100"
    width="180"
  ></dsk-color-area>
  <dsk-color-hue hue="333" width="180"></dsk-color-hue>
  <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
  <output>#FF007399</output>
</section>

<script type="module">
  import '@flowscape-ui/dsk';
  import { updateColor } from '/src/color-picker.ts';
  document
    .querySelector('.color-picker')
    .addEventListener('input', updateColor);
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
import { updateColor } from './color-picker';

export default function App() {
  return (
    <section className="color-picker" onInput={updateColor}>
      <dsk-color-area
        hue="333"
        saturation="100"
        brightness="100"
        width="180"
      ></dsk-color-area>
      <dsk-color-hue hue="333" width="180"></dsk-color-hue>
      <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
      <output>#FF007399</output>
    </section>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
import { updateColor } from './color-picker';
</script>

<template>
  <section class="color-picker" @input="updateColor">
    <dsk-color-area
      hue="333"
      saturation="100"
      brightness="100"
      width="180"
    ></dsk-color-area>
    <dsk-color-hue hue="333" width="180"></dsk-color-hue>
    <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
    <output>#FF007399</output>
  </section>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
import { updateColor } from './color-picker';
</script>

<section class="color-picker" oninput={updateColor}>
  <dsk-color-area hue="333" saturation="100" brightness="100" width="180"></dsk-color-area>
  <dsk-color-hue hue="333" width="180"></dsk-color-hue>
  <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
  <output>#FF007399</output>
</section>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { updateColor } from '../color-picker';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="color-picker" (input)="updateColor($event)">
      <dsk-color-area
        hue="333"
        saturation="100"
        brightness="100"
        width="180"
      ></dsk-color-area>
      <dsk-color-hue hue="333" width="180"></dsk-color-hue>
      <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
      <output>#FF007399</output>
    </section>
  `,
})
export class App {
  readonly updateColor = updateColor;
}
```

:::

</div>

Create the shared handler file. No initialization is needed because the markup already contains matching initial values.

```ts
// src/color-picker.ts
export function updateColor(event: {
  currentTarget: EventTarget | null;
}): void {
  const root = event.currentTarget;
  if (!(root instanceof HTMLElement)) return;
  const area = root.querySelector('dsk-color-area');
  const hue = root.querySelector('dsk-color-hue');
  const alpha = root.querySelector('dsk-color-alpha');
  const output = root.querySelector('output');
  if (!area || !hue || !alpha || !output) return;
  area.hue = hue.hue;
  alpha.color = area.color;
  output.value = alpha.rgba;
  output.style.backgroundColor = alpha.rgba;
}
```

Add this CSS globally, or use an unscoped Vue style block. In React use `className` as shown in the tab.

```css
.color-picker {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
}
.color-picker output {
  padding: 12px;
  background: #ff007399;
  color: white;
}
```

## Edit history

Area, hue, alpha and eyedropper controls support Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z while focused. A completed drag or successful pick is one entry. Cancelled actions add none. History is local to each control; external assignments to its edited channel reset it. Restoration emits input and change.
