# Inputs and groups

Explore each control in turn: numbers, HEX, color, groups, and files. Each section contains its own example, integration for all five environments, API, and styling variant. The final inspector combines them to edit one object.

Install with `npm i @flowscape-ui/dsk` and register with a browser-side `import '@flowscape-ui/dsk'`. For SSR, follow the [installation recipes](/guide/installation#server-rendered-applications).

::: tip Standalone fields and groups

`dsk-input`, `dsk-input-hex`, `dsk-input-color`, and `dsk-input-upload` need no child content. `dsk-input-group` is a container for other fields.

In ordinary **HTML, custom elements require closing tags**, even when empty: `<dsk-input></dsk-input>`. They are not void elements like native `<input>`. Writing `<dsk-input />` does not close it in HTML and can incorrectly nest subsequent markup.

**React JSX** and **Vue SFC** compilers support self-closing `<dsk-input />` syntax. These examples use paired tags so the markup also works in ordinary HTML.

:::

## dsk-input

Change the object width: type expressions, drag the handle, change the step, or enable readonly.

<ClientOnly><SingleInputExample kind="dsk-input" /></ClientOnly>

### Add an input

Once DSK is loaded, this HTML is enough:

```html
<dsk-input value="120" aria-label="Width"></dsk-input>
```

You can type a value, drag the handle, and use the arrow keys immediately. No initialization function, state, or event handler is needed. The component includes its own styles.

To limit the value and display a unit, add attributes:

```html
<dsk-input
  value="120"
  min="40"
  max="200"
  step="1"
  tag="px"
  aria-label="Width"
></dsk-input>
```

This starts at **120**, allows values from **40 to 200**, changes by **1** when dragging or using arrow keys, and displays **px** beside the value.

### Connect it to your project

Install once:

```sh
npm i @flowscape-ui/dsk
```

Choose your environment below. These examples assume an existing **client-rendered app** with a bundler such as Vite. DSK needs JavaScript to register its custom elements, but you do not need to write JavaScript to make an input work. Import the package once, then use the tag wherever you need it.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input value="120" aria-label="Width"></dsk-input>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input value="120" aria-label="Width"></dsk-input>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input value="120" aria-label="Width"></dsk-input>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input value="120" aria-label="Width"></dsk-input>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<dsk-input value="120" aria-label="Width"></dsk-input>',
})
export class App {}
```

:::

</div>

**React with TypeScript and Vue need a one-time configuration**, shown below. Vanilla, Svelte, and the Angular example above need no additional custom-element configuration.

<details>
<summary>React + TypeScript: allow DSK input tags in JSX</summary>

Create `src/dsk.d.ts`. This only teaches TypeScript about the tags; it adds no runtime code. The declaration below covers the attributes used in the examples on this page. Add it once, even if you use several different inputs.

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DskInput,
  DskInputHex,
  DskInputColor,
  DskInputGroup,
  DskInputUpload,
} from '@flowscape-ui/dsk';

type FieldProps<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  value?: string | number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  tag?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-input': FieldProps<DskInput>;
      'dsk-input-hex': FieldProps<DskInputHex> & { hex?: string | number };
      'dsk-input-color': FieldProps<DskInputColor> & {
        format?: string | number;
        'alpha-mode'?: 'hex' | 'percent';
      };
      'dsk-input-group': DetailedHTMLProps<
        HTMLAttributes<DskInputGroup>,
        DskInputGroup
      > & {
        linked?: string;
        'has-mixed-values'?: string;
        'mixed-label'?: string;
      };
      'dsk-input-upload': DetailedHTMLProps<
        HTMLAttributes<DskInputUpload>,
        DskInputUpload
      > & {
        accept?: string;
        placeholder?: string;
        disabled?: boolean;
      };
    }
  }
}
```

</details>

<details>
<summary>Vue + Vite: recognize dsk-* tags as custom elements</summary>

In your existing `vite.config.ts`, add `isCustomElement` to the Vue plugin options. Keep your other project settings.

```ts
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

For Next.js, Nuxt, SvelteKit, or another server-rendered app, use the [SSR installation examples](/guide/installation#server-rendered-applications) to load DSK in the browser. The input markup stays the same.

### Optional: read the value

Add an event listener only when your application needs to react to an edit. For example, start with the same field:

```html
<dsk-input value="120" aria-label="Width"></dsk-input>
```

Then listen for a confirmed value in your browser entry file:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input');
field?.addEventListener('change', () => {
  console.log(field.value); // The current value, e.g. "140".
});
```

`change` fires when the user commits an edit. Use `input` for live updates while typing or dragging. The canvas above is a demonstration of listening to these events; you do not need its code or any demo files to use the input itself.

### API and behavior

This table applies to `dsk-input`, `dsk-input-hex`, and `dsk-input-color`. Groups and uploads have separate APIs below. Global HTML attributes (`id`, `class`, `style`, `title`) remain available.

| Attribute             | Property            | Default                                           | Behavior                                                       |
| --------------------- | ------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| `value`               | `value`             | `""`                                              | Current value; empty displays the placeholder.                 |
| `min / max`           | `min / max`         | `""`                                              | Optional bounds; omitted decimal bounds are unbounded.         |
| `step`                | `step`              | `"" → 1`                                          | Positive drag and fallback keyboard increment.                 |
| `key-horizontal-step` | `keyHorizontalStep` | `"" → step`                                       | Left / Right increment.                                        |
| `key-vertical-step`   | `keyVerticalStep`   | `"" → step`                                       | Down / Up increment.                                           |
| `placeholder`         | `placeholder`       | `""`                                              | Hint for an empty field.                                       |
| `src`                 | `src`               | `""`                                              | Handle image URL; broken images fall back to the default icon. |
| `progression`         | `progression`       | `linear`                                          | linear, exponential, logarithmic drag response.                |
| `positioning`         | `positioning`       | `center`                                          | left, center, right text and placeholder alignment.            |
| `tag`                 | `tag`               | `""`                                              | Display-only suffix or prefix; not part of the value.          |
| `tag-position`        | `tagPosition`       | `right`                                           | left or right position for the tag.                            |
| `tag-gap`             | `tagGap`            | `4px`                                             | CSS column gap; nonnegative bare numbers mean pixels.          |
| `select-on-focus`     | `selectOnFocus`     | `false`                                           | Select all when focus first enters.                            |
| `loopafter`           | `loopAfter`         | `false`                                           | Wrap at both bounds during drag and keyboard edits.            |
| `loopafter-min`       | `loopAfterMin`      | `false`                                           | Wrap below min to max.                                         |
| `loopafter-max`       | `loopAfterMax`      | `false`                                           | Wrap above max to min.                                         |
| `disabled`            | `disabled`          | `false`                                           | Prevent interaction and disable form submission.               |
| `readonly`            | `readOnly`          | `false`                                           | Keep focus and reading, prevent edits.                         |
| `name`                | `name`              | `""`                                              | Name for native form submission.                               |
| `aria-label`          | `ariaLabel`         | `Numeric value / Hexadecimal value / Color value` | Accessible name forwarded to the internal field.               |

`disabled` and `readonly` use presence semantics: even `disabled="false"` disables the field. `select-on-focus` and the three `loopafter*` flags accept the literal string `"false"`; removing them also disables the behavior. Wrapping requires two finite bounds with `max > min`, preserves overshoot, and does not apply to manual entry or `.value` assignments. Enabled `loopafter` turns on both directions regardless of the individual flags.

The `tag` never changes the value or submitted data. Invalid `positioning` falls back to `center`, `tag-position` to `right`, and an invalid CSS gap to `4px`. Numeric value, bound, and step setters accept numbers, strings, `null`, or `undefined`; empty values clear the field and nullish bound/step assignments remove their attributes.

`value` reads as a string. `valueAsNumber` reads a number or `NaN` for empty/invalid drafts and accepts numeric assignments. `focus(options?)`, `blur()`, and `select()` control the internal field. Do not parse unfinished expressions into your model.

```html
<dsk-input
  value="160"
  min="0"
  max="360"
  step="1"
  key-horizontal-step="1"
  key-vertical-step="10"
  tag="px"
  tag-position="right"
  tag-gap="6px"
  positioning="right"
  select-on-focus
  loopafter
  aria-label="Width"
></dsk-input>
```

### Interaction

Use `positioning="left"`, `positioning="center"`, or `positioning="right"` to align the value and placeholder within the text field. The default is `center`; missing, empty, or unsupported attribute values also use `center`. Update it at runtime through the attribute or the typed `field.positioning` property (`InputPositioning`). The handle stays on the left, and changing alignment does not modify the value or emit input events. CSS through `::part(input)` can still override the alignment.

```html
<dsk-input value="40" positioning="right" aria-label="Width"></dsk-input>
```

The component contains a drag handle on the left and an editable numeric field on the right. Drag the handle right to increase the value and left to decrease it. Pointer dragging supports mouse, pen, and touch.

Mouse dragging uses Pointer Lock with a visible virtual resize cursor that wraps across viewport edges. Values change only in response to mouse movement; holding still never changes the value. Release commits and restores the native cursor at its original lock position; Escape, focus loss, or interruption cancels the drag. The browser cannot move the native cursor to the virtual cursor position. If Pointer Lock is unavailable or denied, ordinary dragging remains available with screen limits and no automatic changes. Touch and pen use ordinary dragging. Numeric min/max bounds still apply.

You can also type directly into the field. Enter or focus loss commits the value and clamps it to the bounds. Incomplete text is allowed while editing; an invalid draft restores the last committed value. Manually entered values are not rounded to a step grid.

Keyboard adjustments apply only while the internal text field is focused. Clicking or tabbing into it activates them; Escape removes focus, so subsequent arrow keys no longer adjust that field.

| Key                      | Action                                                                         |
| ------------------------ | ------------------------------------------------------------------------------ |
| Arrow Right / Arrow Left | Increase / decrease by `key-horizontal-step`, falling back to `step`.          |
| Arrow Up / Arrow Down    | Increase / decrease by `key-vertical-step`, falling back to `step`.            |
| Page Up / Page Down      | Increase / decrease by ten ordinary `step` increments.                         |
| Enter                    | Commit the current draft.                                                      |
| Escape                   | Cancel the draft or active drag, restore its previous value, and remove focus. |

Home and End retain their usual text editing behavior. Arrow keys combined with Shift, Alt, Ctrl, or Meta also keep native editing behavior; they do not adjust the number. Disabled and readonly fields cannot be adjusted, and Escape can still remove focus from a readonly field. Each numeric keyboard adjustment respects bounds and emits `input` followed by `change` only when the value changes.

The progression controls drag distance, not the allowed value range:

- `linear` changes the value at a constant rate.
- `exponential` makes larger drags change the value faster.
- `logarithmic` makes larger drags change the value more slowly.

All three modes support zero and negative values. Dragging starts from the value at pointer-down and uses whole increments of `step`. In linear mode, each four horizontal pixels correspond to one increment.

Reaching `min` or `max` resets the drag reference to that bound. Further outward movement is discarded, so reversing direction immediately begins accumulating steps away from the bound. Escape still restores the original value from pointer-down.

### Expressions, selection, and history

Manual entry accepts `+`, `-`, `*`, `/`, parentheses, unary signs, decimal numbers, and scientific notation. Enter or blur evaluates the expression and clamps its result to the bounds: `(20 + 5) * 2` becomes `50`. Invalid expressions and division by zero restore the last committed value. Expressions are parsed without executing JavaScript. While editing, `value` contains the draft; `valueAsNumber` remains `NaN` for expression text until it is committed. Programmatic `value` assignments still accept numeric values, not expressions. Arrow-key adjustment evaluates a valid draft before applying the step.

Enable `select-on-focus` or `select-on-focus="true"` to select the whole value when focus enters the field. It defaults to false and supports the boolean `selectOnFocus` property. Later clicks while focused place the caret normally; `select-on-focus="false"` disables automatic selection.

```html
<dsk-input value="40" select-on-focus aria-label="Value"></dsk-input>
```

While focused, use Ctrl+Z to undo and Ctrl+Shift+Z to redo (Cmd on macOS). These shortcuts use the physical `KeyZ` key, so they work independently of the active keyboard layout. Each field keeps its own history of up to 100 committed states. A confirmed text edit, keyboard increment, or completed drag is one history step. Undo during an uncommitted edit restores the committed value; redo restores that draft. A new edit after undo clears the redo branch. Restoring committed values emits `input` and `change`; restoring a draft emits only `input`. Disabled and readonly fields cannot change through history shortcuts. Programmatic value assignments, form resets, and changes to min/max/step establish a new history baseline. Escape cancels the current draft or drag without adding a history entry.

### Events and forms

Numeric, HEX, and color fields emit bubbling, composed `input` and `change` events without a custom `detail`. During `input`, the value may be an incomplete draft. Use committed `change` for document history and validate values for live previews. Groups forward their children's events; upload also emits `dsk-upload-reject`.

The three editable value types participate in native forms through ElementInternals in supported browsers. `name` sets the key, `disabled` excludes the value, and `form.reset()` restores the initial value. Empty fields submit an empty string. Groups submit no separate value; upload files must be appended manually. Attributes such as `required`, `pattern`, `type`, and `multiple` do not add native input validation to these custom elements.

```html
<form id="inspector-form">
  <dsk-input name="width" value="160" min="0" aria-label="Width"></dsk-input>
  <dsk-input-color
    name="fill"
    value="FF007A"
    aria-label="Fill"
  ></dsk-input-color>
  <button type="reset">Reset</button>
</form>
```

```ts
const form = document.querySelector<HTMLFormElement>('#inspector-form')!;
console.log(new FormData(form).get('width')); // "160"
```

### CSS and an alternative appearance

```css
/* Add class="custom-input" to the field. */
dsk-input.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input.custom-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Add `class="custom-input"` to the tag and place the CSS above in your stylesheet. In React use `className="custom-input"`. The same CSS works in every framework; in Vue use a regular, unscoped `<style>` block for this example.

```html
<dsk-input class="custom-input" value="120" aria-label="Width"></dsk-input>
```

<ClientOnly><SingleInputExample kind="dsk-input" styled /></ClientOnly>

| CSS variable                | Default             |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-handle-width`  | `30px`              |

`::part(...)`: `container`, `handle`, `input`, `tag`.

Set `font` on the host for typography. `--dsk-input-font-size` applies to upload only. Replace handle images using `src`; there is no arbitrary icon slot. Keep focus visible.

## dsk-input-hex

Change the HEX format and preview the fill. A single channel becomes grayscale; RGB/RGBA becomes color. Narrowing the format may clear values that cannot be converted exactly.

<ClientOnly><SingleInputExample kind="dsk-input-hex" /></ClientOnly>

### Add the component

Once DSK is loaded, this HTML is enough:

```html
<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
```

You can type HEX values, drag the handle, and use the arrow keys immediately. No initialization function, state, or event handler is needed. The component includes its own styles.

To choose the number of HEX digits, add `hex`:

```html
<dsk-input-hex hex="8" value="557BE880" aria-label="HEX value"></dsk-input-hex>
```

This uses **8 HEX digits** for red, green, blue, and alpha. The value contains no leading `#`.

### Connect it to your project

Install once:

```sh
npm i @flowscape-ui/dsk
```

Choose your environment below. These examples assume an existing **client-rendered app** with a bundler such as Vite. DSK needs JavaScript to register its custom elements, but you do not need to write JavaScript to make an input work. Import the package once, then use the tag wherever you need it.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
  `,
})
export class App {}
```

:::

</div>

Use the one-time [React TypeScript and Vue configuration](#connect-it-to-your-project) from the first example. You do not need to repeat it for each input.

For Next.js, Nuxt, SvelteKit, or another server-rendered app, use the [SSR installation examples](/guide/installation#server-rendered-applications) to load DSK in the browser. The input markup stays the same.

### Optional: read the value

Add an event listener only when your application needs to react to an edit. For example, start with the same field:

```html
<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
```

Then listen for a confirmed value in your browser entry file:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-hex');
field?.addEventListener('change', () => {
  console.log(field.value);
});
```

`change` fires when the user commits an edit. Use `input` for live updates while typing or dragging. The canvas above is a demonstration of listening to these events; you do not need its code or any demo files to use the input itself.

### API and behavior

Inherits the [shared dsk-input attributes, properties, and methods](#dsk-input). Differences are listed below.

`<dsk-input-hex>` inherits the same handle dragging, keyboard adjustment, progression, selection, history, looping, tags, alignment, forms, events, and styling API. Its default handle is a hash SVG; use `src` to replace it with an image. The handle does not add a `#` to the field value.

```html
<dsk-input-hex
  hex="6"
  value="FE0000"
  step="1"
  select-on-focus
  aria-label="Color channels"
></dsk-input-hex>
```

The `hex` attribute selects the format; the default is `6`. The typed `hex` property reads a `HexFormat` number and accepts a supported number, its string form, or `null`/`undefined` to remove the attribute:

| `hex` | Channel layout                   | Full range            |
| ----- | -------------------------------- | --------------------- |
| `1`   | One channel, one HEX digit       | `0`–`F`               |
| `2`   | One channel, two HEX digits      | `00`–`FF`             |
| `3`   | RGB, one HEX digit per channel   | `000`–`FFF`           |
| `6`   | RGB, two HEX digits per channel  | `000000`–`FFFFFF`     |
| `8`   | RGBA, two HEX digits per channel | `00000000`–`FFFFFFFF` |

Literal input accepts an optional leading `#`, is normalized to uppercase, and is padded on the left to the selected width. A value longer than the selected format is invalid. For example, `#ab` becomes `0000AB` in format 6. A complete literal such as `1e3` is HEX (`0001E3` in format 6), not scientific notation. The `value` and submitted form value omit the leading `#`.

### Channel order and bounds

Drag and keyboard adjustment fill channels in order: red, green, blue, then alpha. A completed channel stays at its maximum while the next channel increases. Decreasing drains channels in reverse order. Step sizes count channel units rather than changes to the numeric rank:

```text
FE0000 + 1 → FF0000
FF0000 + 1 → FF0100
FF0100 - 1 → FF0000
FFFFFF00 + 1 → FFFFFF01   (RGBA)
```

`valueAsNumber` retains a positional channel rank with red as the least significant channel. In format 6, `FF0000` has rank 255 and `000100` has rank 256. This representation is used for bounds and arithmetic expressions; drag and keyboard steps use sequential channel filling instead.

`min` and `max` are HEX strings interpreted in the selected format and ordered by the same channel rank. Missing bounds use the format's full range. For example, `min="FE0000" max="010100"` spans ranks 254 through 257 in format 6. The usual clamp and loop flags operate on that range. Manual entry and programmatic value updates clamp; looping applies to drag and keyboard adjustment.

`step`, `key-horizontal-step`, and `key-vertical-step` use positive decimal safe integers. Fractional, zero, negative, unsafe, or invalid steps use their fallback: `step` defaults to `1`, and each keyboard step defaults to the effective `step`.

### HEX expressions

Manual expressions support the same safe arithmetic operators as the numeric input. Operands are decimal unless prefixed with `0x` or `#`; explicit HEX operands are decoded using the configured channel order. The result must be a whole-number rank.

```text
0xFF0000 + 1 → 000100
#FF0000 + 1  → 000100
255 + 1      → 000100
```

A complete HEX literal is recognized before expression evaluation. Add an operator when you intend arithmetic. Programmatic `.value` assignments accept literals; expressions are evaluated during user editing. Expression arithmetic changes the numeric rank, not the channel-filling position used by dragging and arrow keys.

### Changing formats

Changing `hex` converts the current value by channels:

- Format 3 to 6 expands each nibble by multiplying it by 17: `F80` becomes `FF8800`.
- Format 6 to 8 adds opaque alpha: `FF8800` becomes `FF8800FF`.
- Format 8 to 6 discards alpha.
- Converting bytes to nibbles is allowed only when every retained byte is a multiple of 17. Otherwise the value becomes empty, avoiding silent rounding.
- A single channel becomes red, with green and blue set to zero and alpha opaque when present. A color converted to one channel keeps red.

Form reset restores the initial value converted from its original format into the currently selected format. The same exact-conversion rules apply, including clearing a value that cannot narrow without rounding.

The playground includes a separate HEX example with format, value, bounds, step, image, loop, and select-on-focus controls, plus its own HTML and event readouts.

### CSS and an alternative appearance

```css
/* Add class="custom-input" to the field. */
dsk-input-hex.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-hex.custom-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Add `class="custom-input"` to the tag and place the CSS above in your stylesheet. In React use `className="custom-input"`. The same CSS works in every framework; in Vue use a regular, unscoped `<style>` block for this example.

```html
<dsk-input-hex
  class="custom-input"
  value="557BE8"
  aria-label="HEX value"
></dsk-input-hex>
```

<ClientOnly><SingleInputExample kind="dsk-input-hex" styled /></ClientOnly>

| CSS variable                | Default             |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-handle-width`  | `30px`              |

`::part(...)`: `container`, `handle`, `input`, `tag`.

Set `font` on the host for typography. `--dsk-input-font-size` applies to upload only. Replace handle images using `src`; there is no arbitrary icon slot. Keep focus visible.

## dsk-input-color

RGBA updates the object fill. Compare the combined field with percentage alpha mode, and switch between RGB and RGBA.

<ClientOnly><SingleInputExample kind="dsk-input-color" /></ClientOnly>

### Add the component

Once DSK is loaded, this HTML is enough:

```html
<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
```

You can edit the HEX color, drag the swatch, and adjust opacity immediately. No initialization function, state, or event handler is needed. The component includes its own styles.

To edit transparency as a percentage, add `format` and `alpha-mode`:

```html
<dsk-input-color
  value="FF007A80"
  format="8"
  alpha-mode="percent"
  aria-label="Fill"
></dsk-input-color>
```

This displays a **color swatch**, the HEX color, and a separate **opacity percentage**. `80` is the alpha byte, approximately 50% opacity.

### Connect it to your project

Install once:

```sh
npm i @flowscape-ui/dsk
```

Choose your environment below. These examples assume an existing **client-rendered app** with a bundler such as Vite. DSK needs JavaScript to register its custom elements, but you do not need to write JavaScript to make an input work. Import the package once, then use the tag wherever you need it.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
  `,
})
export class App {}
```

:::

</div>

Use the one-time [React TypeScript and Vue configuration](#connect-it-to-your-project) from the first example. You do not need to repeat it for each input.

For Next.js, Nuxt, SvelteKit, or another server-rendered app, use the [SSR installation examples](/guide/installation#server-rendered-applications) to load DSK in the browser. The input markup stays the same.

### Optional: read the value

Add an event listener only when your application needs to react to an edit. For example, start with the same field:

```html
<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
```

Then listen for a confirmed value in your browser entry file:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-color');
field?.addEventListener('change', () => {
  console.log(field.value);
});
```

`change` fires when the user commits an edit. Use `input` for live updates while typing or dragging. The canvas above is a demonstration of listening to these events; you do not need its code or any demo files to use the input itself.

### API and behavior

Inherits the [shared dsk-input attributes, properties, and methods](#dsk-input). Differences are listed below.

`<dsk-input-color>` extends `DskInputHex` and replaces the default hash handle with a live color swatch. It inherits HEX parsing, sequential channel filling, expressions, integer stepping, bounds, dragging, history, looping, selection, tags, alignment, forms, and events.

```html
<dsk-input-color
  format="8"
  value="557BE880"
  step="1"
  aria-label="Fill color"
></dsk-input-color>
```

Use `format="6"` for RGB or `format="8"` for RGBA. The default and unsupported-format fallback are `6`; one-channel and three-digit formats are not available on this element. The typed `format` property reads a `ColorFormat` number (`6` or `8`) and accepts either number, its string form, or `null`/`undefined` to remove the attribute. The inherited JavaScript `hex` property maps to the same setting. Color markup uses the canonical `format` attribute; a `hex` HTML attribute is ignored.

Changing 6 to 8 appends opaque alpha (`557BE8` becomes `557BE8FF`). Changing 8 to 6 removes alpha (`557BE880` becomes `557BE8`). The submitted value is the uppercase HEX string without a leading `#`; alpha is present only in format 8. Bounds are HEX strings in the chosen format, and steps are positive decimal safe integers, with the same fallback rules as the HEX input.

### Alpha editing modes

For `format="8"`, `alpha-mode="hex"` (default) edits the complete RGBA value in one field. Set `alpha-mode="percent"` to show a six-digit RGB editor with a separate `dsk-input` for opacity on the right:

```html
<dsk-input-color
  format="8"
  alpha-mode="percent"
  value="557BE880"
></dsk-input-color>
```

The percent field accepts 0–100 and supports manual entry, expressions, arrows, and dragging its `%` handle. Its step is one percentage point. RGB edits and the color handle preserve alpha; opacity edits preserve RGB. Both editors share the color input's Undo/Redo history and emit `input`/`change` from the color host. The public `value`, `valueAsNumber`, and submitted form value keep their RGBA representation. Switching modes preserves the exact alpha byte. Format 6 always shows a single RGB field.

Percentages map to the nearest 8-bit alpha (`50%` maps to `80`). Values loaded from HEX display up to two decimal places (`80` displays as `50.2%`). The typed `alphaMode` property accepts `'hex'`, `'percent'`, or `null`/`undefined`; invalid attributes fall back to HEX mode. Customize the right field with `--dsk-input-alpha-width` (default `76px`) and the `alpha`, `alpha-input`, and `alpha-handle` parts.

### Color preview

The handle layers the color over a black-and-white checkerboard SVG. The checkerboard is visible through transparent pixels in RGBA mode. Valid literal drafts update the swatch immediately, including short literals normalized to the selected width. An empty or invalid draft shows the checkerboard alone, so the previous color never lingers. Expression text also shows the checkerboard until the expression is committed.

Set `src` to replace the swatch with an image. Clearing `src` restores the live swatch. The default checkerboard is bundled from `assets/patterns/checkerboard.svg`; consumers do not need to serve a separate asset.

The shared input CSS variables and parts remain available. `--dsk-input-swatch-size` sets the square's size (default `16px`). The additional `swatch` part is the outer checkerboard square and the `color` part is its inner SVG rectangle. The rectangle uses SVG `fill` for its color; a CSS fill override replaces the live preview color.

```css
dsk-input-color {
  --dsk-input-swatch-size: 18px;
}

dsk-input-color::part(swatch) {
  border-radius: 3px;
}
```

The playground has a separate color example with live parameters, opaque/translucent/transparent presets, generated HTML, and event output.

### CSS and an alternative appearance

```css
/* Add class="custom-input" to the field. */
dsk-input-color.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-color.custom-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Add `class="custom-input"` to the tag and place the CSS above in your stylesheet. In React use `className="custom-input"`. The same CSS works in every framework; in Vue use a regular, unscoped `<style>` block for this example.

```html
<dsk-input-color
  class="custom-input"
  value="FF007A"
  aria-label="Fill"
></dsk-input-color>
```

<ClientOnly><SingleInputExample kind="dsk-input-color" styled /></ClientOnly>

| CSS variable                | Default             |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-handle-width`  | `30px`              |
| `--dsk-input-swatch-size`   | `16px`              |
| `--dsk-input-alpha-width`   | `76px`              |

`::part(...)`: `container`, `handle`, `input`, `tag`, `swatch`, `color`, `alpha`, `alpha-input`, `alpha-handle`.

`color` is an SVG rectangle: overriding `fill` replaces the live swatch. `alpha-input` and `alpha-handle` are exported from the nested field.

Set `font` on the host for typography. `--dsk-input-font-size` applies to upload only. Replace handle images using `src`; there is no arbitrary icon slot. Keep focus visible.

## dsk-input-group

Two fields control width and height. linked copies edits; has-mixed-values shows differing values without losing the real dimensions.

<ClientOnly><SingleInputExample kind="dsk-input-group" /></ClientOnly>

### Add the component

Once DSK is loaded, this HTML is enough:

```html
<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

Place fields inside the group. They are arranged together and remain editable immediately. No initialization function, state, or event handler is needed. The component includes its own styles.

To synchronize the fields when the user edits one of them, add `linked`:

```html
<dsk-input-group linked="true">
  <dsk-input-group>
    <dsk-input value="120" aria-label="Width"></dsk-input>
    <dsk-input value="80" aria-label="Height"></dsk-input>
  </dsk-input-group>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

Without `linked`, the fields are independent. With **linked="true"**, an edit copies the value to the other fields. This does not preserve an aspect ratio.

### Connect it to your project

Install once:

```sh
npm i @flowscape-ui/dsk
```

Choose your environment below. These examples assume an existing **client-rendered app** with a bundler such as Vite. DSK needs JavaScript to register its custom elements, but you do not need to write JavaScript to make an input work. Import the package once, then use the tag wherever you need it.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return (
    <dsk-input-group>
      <dsk-input value="120" aria-label="Width"></dsk-input>
      <dsk-input value="80" aria-label="Height"></dsk-input>
    </dsk-input-group>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-group>
    <dsk-input value="120" aria-label="Width"></dsk-input>
    <dsk-input value="80" aria-label="Height"></dsk-input>
  </dsk-input-group>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-input-group>
      <dsk-input value="120" aria-label="Width"></dsk-input>
      <dsk-input value="80" aria-label="Height"></dsk-input>
    </dsk-input-group>
  `,
})
export class App {}
```

:::

</div>

Use the one-time [React TypeScript and Vue configuration](#connect-it-to-your-project) from the first example. You do not need to repeat it for each input.

For Next.js, Nuxt, SvelteKit, or another server-rendered app, use the [SSR installation examples](/guide/installation#server-rendered-applications) to load DSK in the browser. The input markup stays the same.

### Optional: read the value

Add an event listener only when your application needs to react to an edit. For example, start with the same field:

```html
<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

Then listen for a confirmed value in your browser entry file:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-group');
field?.addEventListener('change', () => {
  console.log(field.values);
});
```

`change` fires when the user commits an edit. Use `input` for live updates while typing or dragging. The canvas above is a demonstration of listening to these events; you do not need its code or any demo files to use the input itself.

### API and behavior

| `dsk-input-group` attribute | Property                  | Default |
| --------------------------- | ------------------------- | ------- |
| `linked`                    | `linked: boolean`         | `false` |
| `has-mixed-values`          | `hasMixedValues: boolean` | `false` |
| `mixed-label`               | `mixedLabel: string`      | `Mixed` |

`linked` uses presence semantics; `has-mixed-values="false"` disables automatic comparison. Set `aria-label` on the group and label its individual controls.

| Property / method               | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `inputs`                        | Readonly array of fields in DOM order           |
| `values`                        | Strings or `null` for mixed fields              |
| `storedValues`                  | Actual strings regardless of mixed presentation |
| `setMixed(field, mixed = true)` | Set manual mixed presentation                   |
| `isMixed(field)`                | Read mixed state                                |
| `registerInput(field, adapter)` | Register an adapter                             |
| `unregisterInput(field)`        | Remove an adapter; returns boolean              |

`<dsk-input-group>` coordinates existing DSK, native HTML, and custom inputs. Importing the package registers it and exports `DskInputGroup` and the `InputGroupAdapter` type.

```html
<dsk-input-group id="dimensions" mixed-label="Mixed" aria-label="Dimensions">
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <input type="number" value="80" aria-label="Height" />
</dsk-input-group>
```

`linked` is a boolean presence attribute, absent by default. Set `group.linked = true` or add `linked` to copy subsequent user edits to every editable field. Remove the attribute or set the property to `false` to unlink; `linked="false"` still counts as present. Enabling linking alone does not overwrite existing values. Values are copied directly, without proportional scaling. Use compatible formats and constraints because each control still applies its own validation and normalization. Disabled and readonly fields are skipped, and nested groups remain independent.

```ts
const group = document.querySelector('dsk-input-group')!;
const width = document.querySelector('dsk-input')!;
group.linked = true;
group.mixedLabel = 'Multiple values';
group.setMixed(width);
console.log(group.isMixed(width)); // true
console.log(group.values); // [null, "80"]
group.setMixed(width, false); // Restore the saved value and placeholder.
```

Mixed state belongs to the group in memory, separately for each field. There is no `mixed` attribute on inputs. The group saves the value and placeholder, clears the value, and writes `mixed-label` (default `Mixed`) into the ordinary placeholder. By default, the application chooses mixed fields through `setMixed`. Typing replaces that state with the new value; a linked edit also clears mixed state on editable peers. Removing mixed without an edit restores the saved value, unless application code has already supplied another value. The label never becomes an input value. Native controls must support placeholders to display the label; use an adapter for controls such as selects or sliders with another presentation.

Enable `has-mixed-values="true"` (or `group.hasMixedValues = true`) for automatic focus-based presentation. When actual field values differ, all inactive fields display the mixed placeholder and return `null` in `group.values`. Focusing a field by click or keyboard restores its value; the previous field saves its current value and shows the placeholder. With focus outside the fields, all differing fields show placeholders. Equal values remain visible. `has-mixed-values="false"` or removing the attribute disables this mode and restores values. The default is off; the empty attribute also enables it.

`group.storedValues` returns the actual values in DOM order, including values temporarily hidden by placeholders. HTML inputs use an empty string for their visible value, not the literal string `"null"`. Linked editing updates stored peer values too; if all values become equal, the automatic mixed presentation clears. Use either automatic mode or explicit per-field `setMixed` for a given workflow; explicit mixed flags remain independent of the automatic comparison.

Automatic mixed presentation needs only HTML; `setMixed` is an optional API for applications that explicitly manage individual fields, not a requirement for `has-mixed-values`:

```html
<dsk-input-group has-mixed-values="true" mixed-label="Mixed">
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <input type="number" value="80" aria-label="Height" />
</dsk-input-group>
```

`inputs` returns controls in DOM order. `values` returns strings, with `null` for mixed fields. The group has an accessible group role; label the group and its individual controls. Child fields retain focus, keyboard handling, and form ownership. Mixed fields have an empty value for form submission; the group does not submit a separate form value.

Listen for bubbling `input` and `change` on the group and read `group.values`. Peer writes are silent, so a user edit produces only the source event. Programmatic `.value` assignments are also silent and do not synchronize peers. An unchanged `change` following `input` does not repeat the synchronization.

Custom elements with a writable string/number `.value` and bubbling `input`/`change` events participate automatically. Events emitted inside Shadow DOM must be composed. For the default mixed presentation, expose a writable `.placeholder` and accept an empty value. Other control APIs can use an adapter:

```ts
const custom = document.querySelector<HTMLElement>('#custom-field')!;
group.registerInput(custom, {
  getValue: (field) => field.dataset.amount ?? '',
  setValue: (field, value) => {
    field.dataset.amount = value;
    field.textContent = value;
  },
  setMixed(field, mixed, label) {
    field.textContent = mixed ? label : this.getValue(field);
  },
});
// The custom field dispatches bubbling input/change after user edits.
// group.unregisterInput(custom) removes the adapter.
```

Adapter writes should be silent. Optional `setMixed` owns the custom mixed presentation and preserves its own value; without it, the group uses the default empty value and placeholder behavior. Registered controls must be descendants of this group. Internal controls of a recognized custom element are not counted separately.

Style children normally, use `::part(container)` for the group layout, and configure `--dsk-input-group-gap` (default `8px`) or `--dsk-input-group-wrap` (default `nowrap`). The group does not impose a link button: bind any application-owned toggle to `.linked`.

### CSS and an alternative appearance

```css
/* Add class="custom-input" to the group. */
dsk-input-group.custom-input {
  --dsk-input-group-gap: 12px;
  --dsk-input-group-wrap: wrap;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-height: 38px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-group.custom-input::part(container) {
  align-items: center;
}
dsk-input-group.custom-input dsk-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Add `class="custom-input"` to the tag and place the CSS above in your stylesheet. In React use `className="custom-input"`. The same CSS works in every framework; in Vue use a regular, unscoped `<style>` block for this example.

```html
<dsk-input-group class="custom-input">
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

<ClientOnly><SingleInputExample kind="dsk-input-group" styled /></ClientOnly>

| CSS variable             | Default  |
| ------------------------ | -------- |
| `--dsk-input-group-gap`  | `8px`    |
| `--dsk-input-group-wrap` | `nowrap` |

`::part(...)`: `container`.

## dsk-input-upload

Choose an image for the object or a PDF/TXT file for its label. Change accept, try a rejected file, and clear the selection.

<ClientOnly><SingleInputExample kind="dsk-input-upload" /></ClientOnly>

### Add the component

Once DSK is loaded, this HTML is enough:

```html
<dsk-input-upload aria-label="File"></dsk-input-upload>
```

Click to choose a file or drop one onto the field. The filename and preview update automatically. No initialization function, state, or event handler is needed. The component includes its own styles.

To limit the file types, add `accept`:

```html
<dsk-input-upload
  accept="image/*,.pdf,.doc,.docx"
  placeholder="Choose a file"
  aria-label="File"
></dsk-input-upload>
```

This accepts **images, PDF, DOC, and DOCX**. The component shows an image thumbnail or a document icon and filename. Selecting a file does **not** upload it to a server.

### Connect it to your project

Install once:

```sh
npm i @flowscape-ui/dsk
```

Choose your environment below. These examples assume an existing **client-rendered app** with a bundler such as Vite. DSK needs JavaScript to register its custom elements, but you do not need to write JavaScript to make an input work. Import the package once, then use the tag wherever you need it.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-upload aria-label="File"></dsk-input-upload>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input-upload aria-label="File"></dsk-input-upload>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-upload aria-label="File"></dsk-input-upload>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-upload aria-label="File"></dsk-input-upload>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: ` <dsk-input-upload aria-label="File"></dsk-input-upload> `,
})
export class App {}
```

:::

</div>

Use the one-time [React TypeScript and Vue configuration](#connect-it-to-your-project) from the first example. You do not need to repeat it for each input.

For Next.js, Nuxt, SvelteKit, or another server-rendered app, use the [SSR installation examples](/guide/installation#server-rendered-applications) to load DSK in the browser. The input markup stays the same.

### Optional: read the value

Add an event listener only when your application needs to react to an edit. For example, start with the same field:

```html
<dsk-input-upload aria-label="File"></dsk-input-upload>
```

Then listen for a confirmed value in your browser entry file:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-upload');
field?.addEventListener('change', () => {
  console.log(field.file);
});
```

`change` fires when a file is selected or cleared. `field.file` is a `File` or `null`; send it to your server only when your application needs to. The canvas above is a demonstration of listening to these events; you do not need its code or any demo files to use the input itself.

### API and behavior

| `dsk-input-upload` attribute | Property                 | Default         |
| ---------------------------- | ------------------------ | --------------- |
| `accept`                     | `accept: string`         | `""`            |
| `placeholder`                | `placeholder: string`    | `Choose a file` |
| `disabled`                   | `disabled: boolean`      | `false`         |
| `aria-label`                 | `ariaLabel`              | `Choose file`   |
| –                            | `file: File              | null`           | `null` |
| –                            | `files: readonly File[]` | `[]`            |
| –                            | `clear(): void`          | –               |

Group and upload do not inherit the numeric API. For example, `min`, `step`, `tag`, and `readonly` do not configure upload. `files` is read-only; assign `file` instead.

`<dsk-input-upload>` selects one local file. It does not upload data automatically.

```html
<dsk-input-upload
  accept="image/*,.pdf,.doc,.docx"
  placeholder="Choose a file"
  aria-label="Attachment"
></dsk-input-upload>
```

Click or press Enter/Space to open the native picker, or drop a file onto the field. Images display a thumbnail; documents display a colored extension icon. Unsupported or damaged images fall back to the document icon. Operating-system file icons are not available through the browser File API.

- `accept`: comma-separated extensions (including the leading dot), MIME types, or `image/*`, `audio/*`, `video/*`. Empty accepts all types. Matching is case-insensitive. Both the picker result and dropped files are checked. MIME matching uses `File.type`; use explicit extensions for formats whose MIME type may be empty.
- `disabled`: boolean attribute/property that prevents user interaction.
- `placeholder`: empty-state text; defaults to `Choose a file`.
- `file`: selected `File` or `null`; assign a File to initialize or replace the selection. The same filter applies to assignments.
- `files`: a fresh read-only array containing zero or one file.
- `clear()`: removes the selection without emitting input/change events.

User selection and removal emit bubbling, composed `input` and `change` events. Programmatic assignments are silent. A rejected file leaves the current selection unchanged and emits `dsk-upload-reject` with `{ files, accept, reason }`; reason is `type` or `multiple`. File validation here is for selection UX; applications must validate uploads on their server. Changing `accept` affects subsequent selections, not the current file.

```ts
const upload = document.querySelector('dsk-input-upload')!;
upload.addEventListener('change', () => {
  const file = upload.file;
  if (!file) return;
  const body = new FormData();
  body.append('attachment', file);
  // Send body using your application's upload endpoint.
});
```

The control is not form-associated: append its file to FormData explicitly. File object URLs are released on replacement, clearing, and disconnection. Preview generation never reads documents as HTML.

Use the shared `--dsk-input-width`, `--dsk-input-height`, `--dsk-input-background`, `--dsk-input-color`, `--dsk-input-border`, `--dsk-input-border-radius`, `--dsk-input-focus-color`, and `--dsk-input-font-size` variables. Shadow parts: `container`, `button`, `icon`, `filename`, `clear`, `status`.

### CSS and an alternative appearance

```css
/* Add class="custom-input" to the field. */
dsk-input-upload.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-upload.custom-input::part(filename) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Add `class="custom-input"` to the tag and place the CSS above in your stylesheet. In React use `className="custom-input"`. The same CSS works in every framework; in Vue use a regular, unscoped `<style>` block for this example.

```html
<dsk-input-upload class="custom-input" aria-label="File"></dsk-input-upload>
```

<ClientOnly><SingleInputExample kind="dsk-input-upload" styled /></ClientOnly>

| CSS variable                | Default             |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-font-size`     | `14px`              |

`::part(...)`: `container`, `button`, `icon`, `filename`, `clear`, `status`.

## Individual example source {#single-input-source}

These optional files implement the documentation canvases and their extra controls. **You do not need them to use the inputs.** The simple markup above is sufficient. If you reuse the full demo, its returned cleanup function removes listeners and releases image URLs. Load demo modules only in the browser for SSR.

<details>
<summary>single-input.ts</summary>

<<< @/snippets/single-input.ts

</details>

<details>
<summary>single-input.css</summary>

<<< @/snippets/single-input.css

</details>

## Combined object inspector

All five components work together here. X/Y change position, the group changes dimensions, HEX changes corner radius, RGBA changes fill and opacity, and upload changes the image or label. Model state appears below the canvas; Reset restores the fields and camera.

<ClientOnly><InputLab /></ClientOnly>

### Start with a small combination

The full inspector above includes all five components. To understand how to connect fields to an object, start with just **width, height, and fill**. The inputs work on their own; the event handler only updates the preview object.

**1. Add the markup.** Choose a framework tab. These are client-rendered examples; use the same React TypeScript / Vue setup and SSR guidance as the first input.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html; load src/main.ts from the next step -->
<section class="input-preview">
  <dsk-input-group>
    <dsk-input
      data-size="width"
      value="120"
      min="40"
      max="200"
      aria-label="Width"
    ></dsk-input>
    <dsk-input
      data-size="height"
      value="80"
      min="40"
      max="200"
      aria-label="Height"
    ></dsk-input>
  </dsk-input-group>
  <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
  <div class="preview-object">dsk</div>
</section>

<script type="module" src="/src/main.ts"></script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
import './input-preview.css';
import { updatePreview } from './input-preview';

export default function App() {
  return (
    <section onInput={updatePreview} className="input-preview">
      <dsk-input-group>
        <dsk-input
          data-size="width"
          value="120"
          min="40"
          max="200"
          aria-label="Width"
        ></dsk-input>
        <dsk-input
          data-size="height"
          value="80"
          min="40"
          max="200"
          aria-label="Height"
        ></dsk-input>
      </dsk-input-group>
      <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
      <div className="preview-object">dsk</div>
    </section>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
import './input-preview.css';
import { updatePreview } from './input-preview';
</script>

<template>
  <section @input="updatePreview" class="input-preview">
    <dsk-input-group>
      <dsk-input
        data-size="width"
        value="120"
        min="40"
        max="200"
        aria-label="Width"
      ></dsk-input>
      <dsk-input
        data-size="height"
        value="80"
        min="40"
        max="200"
        aria-label="Height"
      ></dsk-input>
    </dsk-input-group>
    <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
    <div class="preview-object">dsk</div>
  </section>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
  import './input-preview.css';
  import { updatePreview } from './input-preview';
</script>

<section oninput={updatePreview} class="input-preview">
  <dsk-input-group>
    <dsk-input data-size="width" value="120" min="40" max="200" aria-label="Width"></dsk-input>
    <dsk-input data-size="height" value="80" min="40" max="200" aria-label="Height"></dsk-input>
  </dsk-input-group>
  <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
  <div class="preview-object">dsk</div>
</section>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { updatePreview } from '../input-preview';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrl: '../input-preview.css',
  template: `
    <section (input)="updatePreview($event)" class="input-preview">
      <dsk-input-group>
        <dsk-input
          data-size="width"
          value="120"
          min="40"
          max="200"
          aria-label="Width"
        ></dsk-input>
        <dsk-input
          data-size="height"
          value="80"
          min="40"
          max="200"
          aria-label="Height"
        ></dsk-input>
      </dsk-input-group>
      <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
      <div class="preview-object">dsk</div>
    </section>
  `,
})
export class App {
  readonly updatePreview = updatePreview;
}
```

:::

</div>

**2. Add one small event handler.** Create `src/input-preview.ts`. It reads the fields and updates the object's CSS. Incomplete numeric or color drafts leave the last valid preview unchanged. Every framework above uses this same function.

```ts
// src/input-preview.ts
import type { DskInput } from '@flowscape-ui/dsk';

export function updatePreview(event: {
  currentTarget: EventTarget | null;
}): void {
  const root = event.currentTarget;
  if (!(root instanceof HTMLElement)) return;
  const object = root.querySelector<HTMLElement>('.preview-object');
  if (!object) return;

  for (const size of ['width', 'height'] as const) {
    const field = root.querySelector<DskInput>(
      `dsk-input[data-size="${size}"]`,
    );
    if (field && Number.isFinite(field.valueAsNumber)) {
      object.style[size] = `${field.valueAsNumber}px`;
    }
  }
  const fill = root.querySelector('dsk-input-color');
  if (fill && /^[0-9A-F]{6}$/.test(fill.value)) {
    object.style.backgroundColor = `#${fill.value}`;
  }
}
```

**3. Add the styles.** Create `src/input-preview.css`:

```css
/* src/input-preview.css */
.input-preview {
  display: grid;
  gap: 16px;
  --dsk-input-group-wrap: wrap;
}
.preview-object {
  display: grid;
  place-items: center;
  width: 120px;
  height: 80px;
  border-radius: 16px;
  background: #ff007a;
  color: white;
}
```

**Vanilla only:** connect the listener in `src/main.ts`. The framework tabs already connect it in their templates.

```ts
// src/main.ts (Vanilla only)
import '@flowscape-ui/dsk';
import './input-preview.css';
import { updatePreview } from './input-preview';

document
  .querySelector('.input-preview')
  ?.addEventListener('input', updatePreview);
```

### Optional: full inspector source

The files below power the complete inspector on this page, including pan/zoom, uploads, reset, and the state readout. They are not required for the small example above. If you reuse the full demo, call `mountInputLab(host)` in the browser after your container mounts, and call the returned cleanup function when that container unmounts. Keep both files together. For Russian labels, use `mountInputLab(host, 'ru')`.

<details>
<summary>input-lab.ts</summary>

<<< @/snippets/input-lab.ts

</details>

<details>
<summary>input-lab.css</summary>

<<< @/snippets/input-lab.css

</details>
