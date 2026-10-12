# @flowscape-ui/dsk

The framework-free TypeScript/HTML/CSS implementation of Design System Kit for FlowScape. The package has no runtime framework dependency and provides the `<dsk-input>` numeric, `<dsk-input-hex>` HEX, and `<dsk-input-color>` color custom elements, with a shared `DskInputBase` for extensions. The separate color family includes a square saturation and brightness area, hue and alpha controls, and a live canvas/native screen eyedropper. The independent `<dsk-angle>` provides compass-style circular angle selection with a soft filled sector, and `<dsk-curve>` edits cubic Bézier easing with a motion preview.

Install with `npm i @flowscape-ui/dsk`. This package includes ESM and standalone browser builds, TypeScript declarations, and shared styles.

## Getting started

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

Importing the package registers `<dsk-input>`, `<dsk-input-hex>`, `<dsk-input-color>`, `<dsk-color-area>`, `<dsk-color-hue>`, `<dsk-color-alpha>`, `<dsk-color-eyedropper>`, `<dsk-angle>`, and `<dsk-curve>`. The `DskInput`, `DskInputHex`, `DskInputColor`, `DskColorArea`, `DskColorHue`, `DskColorAlpha`, `DskColorEyedropper`, `DskAngle`, `DskCurve`, and abstract `DskInputBase` classes and `kit` metadata are also exported.

```html
<dsk-input
  aria-label="Width"
  min="0"
  max="200"
  value="40"
  step="1"
  key-horizontal-step="1"
  key-vertical-step="10"
  progression="linear"
></dsk-input>
```

Use an explicit closing tag. HTML custom elements are not void elements, so `<dsk-input />` does not close the element in an HTML document.

## Attributes and properties

### Input groups

`<dsk-input-group>` coordinates existing DSK, native HTML, and custom inputs. Importing the package registers it and exports `DskInputGroup` and the `InputGroupAdapter` type.

```html
<dsk-input-group id="dimensions" mixed-label="Mixed" aria-label="Dimensions">
  <dsk-input id="width" value="120" aria-label="Width"></dsk-input>
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

### Numeric input attributes

All component attributes are optional. Standard global HTML attributes such as `id`, `class`, `style`, and `title` remain available. Give each field an accessible name with `aria-label`.

| Attribute             | Property            | Default    | Behavior                                                                                                                |
| --------------------- | ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `value`               | `value`             | `""`       | Current numeric value as a string; an empty value shows the placeholder.                                                |
| `min`                 | `min`               | `""`       | Optional lower bound.                                                                                                   |
| `max`                 | `max`               | `""`       | Optional upper bound.                                                                                                   |
| `step`                | `step`              | `""`       | Drag increment and fallback keyboard increment; defaults to an effective increment of `1`. Must be positive and finite. |
| `key-horizontal-step` | `keyHorizontalStep` | `""`       | Increment for Left / Right while the field is focused. Falls back to `step`.                                            |
| `key-vertical-step`   | `keyVerticalStep`   | `""`       | Increment for Down / Up while the field is focused. Falls back to `step`.                                               |
| `placeholder`         | `placeholder`       | `""`       | Hint shown when empty.                                                                                                  |
| `src`                 | `src`               | `""`       | Image URL for the drag handle; omitted or broken images use a default target icon.                                      |
| `progression`         | `progression`       | `"linear"` | Drag response: `linear`, `exponential`, or `logarithmic`.                                                               |
| `disabled`            | `disabled`          | `false`    | Disables interaction.                                                                                                   |
| `readonly`            | `readOnly`          | `false`    | Allows focusing the value without changing it.                                                                          |
| `name`                | `name`              | `""`       | Field name for form submission in browsers with form-associated custom elements.                                        |

The numeric `valueAsNumber` property reads the current value as a number, or `NaN` when empty or while editing an invalid draft. It also accepts numeric assignments. Use `.value` when an empty state matters. The `value` attribute reflects the current value, including incomplete text during manual editing.

```ts
const field = document.querySelector('dsk-input');
if (!field) throw new Error('Missing dsk-input element');

field.value = '64';
field.min = '0';
field.max = '100';
field.step = '0.5';
field.keyHorizontalStep = 0.1;
field.keyVerticalStep = 5;
field.progression = 'logarithmic';

console.log(field.value); // "64"
console.log(field.valueAsNumber); // 64
```

Programmatic changes do not emit `input` or `change`. Values set through the API are clamped to the active bounds; invalid values become empty. An invalid or nonpositive step falls back to `1`; invalid bounds are ignored. If `max` is less than `min`, `min` is the effective bound. An unsupported progression falls back to linear behavior.

Keyboard steps accept positive finite numbers, including decimals. Each missing, blank, invalid, zero, or negative keyboard step falls back independently to the effective `step`. Their properties read the attribute text as a string and accept numbers, strings, `null`, or `undefined`; `null` and `undefined` remove the attribute. Changes take effect on the next key press and do not change drag sensitivity.

Call `focus()`, `blur()`, or `select()` on the custom element to control the internal text field.

## Interaction

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

## Expressions, selection, and history

Manual entry accepts `+`, `-`, `*`, `/`, parentheses, unary signs, decimal numbers, and scientific notation. Enter or blur evaluates the expression and clamps its result to the bounds: `(20 + 5) * 2` becomes `50`. Invalid expressions and division by zero restore the last committed value. Expressions are parsed without executing JavaScript. While editing, `value` contains the draft; `valueAsNumber` remains `NaN` for expression text until it is committed. Programmatic `value` assignments still accept numeric values, not expressions. Arrow-key adjustment evaluates a valid draft before applying the step.

Enable `select-on-focus` or `select-on-focus="true"` to select the whole value when focus enters the field. It defaults to false and supports the boolean `selectOnFocus` property. Later clicks while focused place the caret normally; `select-on-focus="false"` disables automatic selection.

```html
<dsk-input value="40" select-on-focus aria-label="Value"></dsk-input>
```

While focused, use Ctrl+Z to undo and Ctrl+Shift+Z to redo (Cmd on macOS). These shortcuts use the physical `KeyZ` key, so they work independently of the active keyboard layout. Each field keeps its own history of up to 100 committed states. A confirmed text edit, keyboard increment, or completed drag is one history step. Undo during an uncommitted edit restores the committed value; redo restores that draft. A new edit after undo clears the redo branch. Restoring committed values emits `input` and `change`; restoring a draft emits only `input`. Disabled and readonly fields cannot change through history shortcuts. Programmatic value assignments, form resets, and changes to min/max/step establish a new history baseline. Escape cancels the current draft or drag without adding a history entry.

## HEX input

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

## Color input

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

## Color area

`<dsk-color-area>` selects saturation and brightness for a given HSV hue. It is a standalone `HTMLElement` in `src/color/`, with no dependency on the input components or `DskInputBase`. The existing `<dsk-input-color>` remains a text input in the input family.

```html
<dsk-color-area
  hue="60"
  saturation="15"
  brightness="78"
  width="208"
  aria-label="Fill color"
></dsk-color-area>
```

The gradient runs from white at the top left to the fully saturated hue at the top right, with black along the bottom. Saturation increases from left to right; brightness increases from bottom to top. Changing either channel leaves the hue intact, including when the selected color is gray or black.

| Attribute    | Property     | Default     | Behavior                                                                            |
| ------------ | ------------ | ----------- | ----------------------------------------------------------------------------------- |
| `hue`        | `hue`        | `0`         | Hue in degrees, wrapped into the range 0 inclusive to 360 exclusive.                |
| `saturation` | `saturation` | `100`       | Saturation percentage, clamped to 0–100.                                            |
| `brightness` | `brightness` | `100`       | HSV brightness percentage, clamped to 0–100.                                        |
| `step`       | `step`       | `1`         | Positive finite keyboard increment in percentage points. Shift multiplies it by 10. |
| `width`      | `width`      | —           | Optional positive size in pixels. The larger requested dimension sets both sides.   |
| `height`     | `height`     | —           | Optional positive size in pixels. A single dimension alone also sets both sides.    |
| `disabled`   | `disabled`   | `false`     | Prevents interaction and removes the channel controls from keyboard navigation.     |
| `readonly`   | `readOnly`   | `false`     | Prevents changes while preserving keyboard focus.                                   |
| —            | `color`      | `"#FF0000"` | Readonly opaque color string in uppercase `#RRGGBB` format, derived from HSV.       |

Standard global HTML attributes, including `id`, `class`, `style`, `title`, `hidden`, `data-*`, and accessible naming attributes, remain available. Boolean attributes follow native HTML presence semantics: remove `disabled` or `readonly` to turn them off. This component does not submit a form value; read `.color` and store it in your application or a named form field when needed.

### Square sizing

The area is always square. `width="260" height="180"` produces 260 × 260 pixels; reversing the dimensions gives the same result. With only `width="160"` or only `height="160"`, both sides are 160 pixels. With neither dimension, the default is 208 × 208 pixels. Updating dimensions can grow or shrink the square.

Inline CSS `width` and `height` are reconciled using the same larger-dimension rule. Use the component's width and height custom properties for stylesheet sizing:

```css
dsk-color-area {
  --dsk-color-area-width: 240px;
  --dsk-color-area-height: 180px;
  --dsk-color-area-radius: 6px;
  --dsk-color-area-marker-size: 16px;
  --dsk-color-area-focus-color: #6366f1;
}
```

This example renders a 240 × 240 square. The `surface` and `marker` parts expose the palette and selection marker for styling. Avoid overriding their geometry if you want the marker to track the selected color accurately.

The marker keeps a fixed 14px diameter by default, including during dragging. Its sharp outline moves on the device-pixel grid to avoid visual size jitter at fractional display scales. Set `--dsk-color-area-marker-size` to choose another fixed size. Display alignment does not round the stored saturation or brightness.

### Interaction and events

Click or touch the palette to move the marker to that position, then drag to continue selecting. Pointer capture keeps selection active outside the square and clamps values to its edges. Escape cancels the current gesture and restores its starting saturation and brightness.

The palette exposes two visually hidden native range controls with accessible channel names. Tab moves between saturation and brightness, and focus is shown on the palette. Left and Right change saturation; Down and Up change brightness. Each arrow direction focuses its corresponding channel. Home and End set the focused channel to 0 or 100. `.focus()` focuses saturation.

`input` fires as the user changes the selection; `change` fires when the gesture is committed. Both events bubble and cross shadow boundaries. Read the current channels or `.color` from the component. Setting attributes or JavaScript properties updates the display silently.

```ts
const area = document.querySelector('dsk-color-area');
if (!area) throw new Error('Missing color area');

area.hue = 210;
area.addEventListener('input', () => {
  console.log('Live color:', area.color);
});
area.onchange = () => {
  console.log('Committed color:', area.color);
};
```

Normal DOM event properties and listeners, including `onchange` and `onclick`, work as they do on other HTML elements. Inline event attributes follow the page's content security policy. The playground includes a dedicated color area with live channel and size controls, disabled and readonly states, a selected-color swatch, generated HTML, and an event log.

## Hue and alpha sliders

`<dsk-color-hue>` and `<dsk-color-alpha>` are independent horizontal color controls in `src/color/`. Importing the package registers both and exports `DskColorHue` and `DskColorAlpha`. They do not depend on the input components.

```html
<dsk-color-hue hue="60" aria-label="Fill hue"></dsk-color-hue>
<dsk-color-alpha
  color="#FFFF00"
  alpha="50"
  aria-label="Fill opacity"
></dsk-color-alpha>
```

| Component | Attribute / property                 | Default       | Behavior                                                                                                                                      |
| --------- | ------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Hue       | `hue`                                | `0`           | Degrees, clamped to 0–360 inclusive. Both endpoints are red; 360 keeps the marker at the right edge.                                          |
| Hue       | `.color` (readonly)                  | `"#FF0000"`   | Fully saturated, fully bright RGB HEX for the selected hue.                                                                                   |
| Alpha     | `alpha`                              | `100`         | Opacity percentage, clamped to 0–100.                                                                                                         |
| Alpha     | `color`                              | `"#FF0000"`   | Opaque RGB HEX, with optional `#`; three-digit shorthand is accepted. Normalized to uppercase `#RRGGBB`. Unsupported colors fall back to red. |
| Alpha     | `.rgba` (readonly)                   | `"#FF0000FF"` | Selected color as uppercase `#RRGGBBAA`; alpha is rounded to the nearest byte.                                                                |
| Both      | `step`                               | `1`           | Positive keyboard step in degrees or percentage points.                                                                                       |
| Both      | `width`, `height`                    | `208`, `16`   | Positive dimensions in pixels; ordinary CSS sizing is also supported.                                                                         |
| Both      | `disabled`, `readonly` / `.readOnly` | `false`       | Native boolean presence semantics. Disabled removes keyboard access; readonly preserves focus without allowing edits.                         |

Numeric properties accept numbers, numeric strings, `null`, or `undefined`. Null and undefined remove the attribute. Invalid numeric channels use their defaults; invalid or nonpositive sizes and steps use their defaults. Updating alpha's `color` preserves its `alpha`. Neither component submits a form value automatically. Standard HTML global attributes, event properties such as `onchange`, and DOM listeners remain available.

Click, tap, or drag to select. Pointer capture allows movement beyond the track; values clamp at the endpoints. Arrow Right/Up increase the value, Left/Down decrease it, Shift and Page Up/Down use ten steps, and Home/End choose the endpoints. Escape, pointer cancellation, and focus loss cancel an active gesture. Reconnection restores listeners without duplicates.

`input` reports live user changes, and `change` reports a committed value different from the starting value. Both bubble and cross shadow boundaries. Each keyboard adjustment commits once. Programmatic changes are silent. The native range control exposed through `part="input"` provides assistive-technology access; `.focus()` forwards to it.

The hue track is a full rainbow. Alpha uses a transparent-to-opaque gradient over a checkerboard. Its marker also shows the selected opacity on an independent checkerboard, while the white border stays visible even at zero opacity. Both markers keep a fixed 14px diameter and remain vertically centered during interaction; horizontal pixel alignment prevents shimmering at fractional display scales.

Use `--dsk-color-slider-width`, `--dsk-color-slider-height`, `--dsk-color-slider-radius`, `--dsk-color-slider-marker-size`, and `--dsk-color-slider-focus-color` for styling. The `track`, `marker`, and `input` parts are exposed. The shared slider base is internal to the color implementation, not a registered element.

To connect them to a color area:

```ts
const area = document.querySelector('dsk-color-area');
const hue = document.querySelector('dsk-color-hue');
const alpha = document.querySelector('dsk-color-alpha');
if (!area || !hue || !alpha) throw new Error('Missing color controls');

function updateColor(): void {
  area.hue = hue.hue;
  alpha.color = area.color;
}
hue.addEventListener('input', updateColor);
area.addEventListener('input', () => {
  alpha.color = area.color;
});
alpha.onchange = () => {
  console.log(alpha.rgba);
};
updateColor();
```

The playground's **Hue & alpha** section demonstrates this composition, live settings, and event output without adding a separate picker component.

## Color eyedropper

`<dsk-color-eyedropper>` lives in the independent `src/color/` family. Without a mode, it uses the browser's native screen picker when supported and otherwise prepares a page snapshot. Choose `mode="canvas"` for live canvas/editor pixels, `mode="page"` for an approximate snapshot of arbitrary page content, or `mode="native"` to require the browser picker. Canvas mode preserves page animation, pan, and zoom. Applications can register additional named modes with the shared magnifier, events, and styling API. The previous `mode="custom"` name remains a canvas alias.

```html
<dsk-color-eyedropper
  mode="canvas"
  source="#editor-canvas"
  aria-label="Pick fill color"
  onchange="console.log(this.color)"
></dsk-color-eyedropper>
<canvas id="editor-canvas" width="800" height="600"></canvas>
```

### Eyedropper attributes and properties

| Attribute          | Property          | Default                             | Behavior                                                                                                                                                                                                                                          |
| ------------------ | ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`            | `color`           | `""`                                | Last selected opaque RGB HEX. Accepts three or six digits with an optional `#`; returns uppercase `#RRGGBB`. Empty or invalid values return an empty string.                                                                                      |
| —                  | `value`           | `""`                                | Read/write property alias of `color`. There is no `value` attribute.                                                                                                                                                                              |
| `size`             | `size`            | `32`                                | Positive square button size in pixels. Invalid or nonpositive values use the default.                                                                                                                                                             |
| `mode`             | `mode`            | Native if supported, otherwise page | A missing or empty mode chooses by native support; `.mode` returns the resolved name. Explicit `canvas`, `page`, `native`, registered names, and legacy canvas alias `custom` are preserved. Unsupported explicit names never silently fall back. |
| `source`           | `source`          | Unset                               | Attribute: a canvas CSS selector in the component's root. Property: an `HTMLCanvasElement` reference, `null`, or `undefined`. With no explicit source or sampler, custom mode discovers a canvas under the pointer.                               |
| —                  | `sampler`         | Unset                               | Optional `EyeDropperSampler` for canvas/custom mode. Takes precedence over `source` there; other modes do not use this override. Return `null` outside sampleable content.                                                                        |
| —                  | `pageOptions`     | Full capture                        | `EyeDropperPageOptions` for page snapshots. Controls font/image embedding, scroll preservation, pseudo-elements, and style/node filters. Does not affect other modes.                                                                             |
| —                  | `modes`           | Built-in modes                      | Readonly list of `{ id, label, supported }` for canvas, page, native, and instance registrations. The custom alias is not listed separately.                                                                                                      |
| `magnifier-pixels` | `magnifierPixels` | `9`                                 | Number of source pixels per magnifier edge. Rounded and clamped to 3–31; even values advance to the next odd number. Invalid/nonpositive values use 9. Applies to all non-native modes.                                                           |
| `disabled`         | `disabled`        | `false`                             | Boolean presence semantics; prevents picking and removes button keyboard access.                                                                                                                                                                  |
| —                  | `supported`       | Browser dependent                   | Readonly capability check for the selected mode. Native mode requires a secure context and `EyeDropper`. Custom availability does not guarantee that a particular canvas is readable.                                                             |
| —                  | `nativeSupported` | Browser dependent                   | Readonly native support check, regardless of selected mode.                                                                                                                                                                                       |
| —                  | `picking`         | `false`                             | Readonly active-selection state.                                                                                                                                                                                                                  |

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

Offscreen branches are replaced by empty layout spacers by default. Their text, images and canvas pixels are not cloned or embedded. A lightweight geometry pass still visits the DOM to retain visible descendants of offscreen parents, including fixed elements. A 128 CSS pixel overscan preserves nearby shadows and edges; unusually large effects extending beyond it may be omitted. The output bitmap is always viewport-sized, and no custom node filter is needed for long pages.

For retained elements, the default capture copies all computed CSS properties, including styles originating in stylesheets, inline attributes, JavaScript updates, and browser defaults. It embeds available fonts and images, preserves element scroll positions, and captures supported pseudo-element styles separately. Animations and transitions are frozen at their captured values. The exported `eyeDropperPagePseudoElements` list includes `::before`, `::after`, `::placeholder`, `::marker`, `::first-letter`, `::first-line`, and `::file-selector-button`. When no list is supplied, the capture also discovers simple pseudo-elements declared in readable stylesheets. Browser-unsupported pseudo-elements are skipped. Explicit entries must be simple `::name` selectors, without selector arguments or element selectors.

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
  --dsk-color-eyedropper-background: #fff;
  --dsk-color-eyedropper-color: #394354;
  --dsk-color-eyedropper-border-color: #dce2eb;
  --dsk-color-eyedropper-hover-background: #f0f3f9;
  --dsk-color-eyedropper-active-color: #557be8;
  --dsk-color-eyedropper-focus-color: #557be8;
  --dsk-color-eyedropper-radius: 7px;
}
```

The `button`, `icon`, and `status` shadow parts expose the button, SVG, and visually hidden live status message. Keep the status accessible when customizing it.

### Custom magnifier

The default magnifier has a 120px circular lens, a 9 × 9 pixel grid, an outlined center pixel, a swatch, and a HEX label. Change its appearance without changing selection logic:

```css
dsk-color-eyedropper {
  --dsk-color-eyedropper-magnifier-size: 160px;
  --dsk-color-eyedropper-magnifier-radius: 12px;
  --dsk-color-eyedropper-magnifier-border: 2px solid #fff;
  --dsk-color-eyedropper-magnifier-shadow: 0 4px 12px #0008;
  --dsk-color-eyedropper-magnifier-background: #20232b;
  --dsk-color-eyedropper-magnifier-color: #fff;
  --dsk-color-eyedropper-magnifier-offset: 20px;
  --dsk-color-eyedropper-grid-color: #fff;
  --dsk-color-eyedropper-grid-opacity: 1;
  --dsk-color-eyedropper-crosshair-border: 1px solid #fff;
  --dsk-color-eyedropper-crosshair-shadow: 0 0 0 1px #000;
  --dsk-color-eyedropper-readout-radius: 6px;
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

## Angle control

`<dsk-angle>` is a compass-style circular control with a thin track, scale ticks, a direction needle, and a fixed-size draggable marker. A soft sector shows the selected angle while leaving the central value clear. Four cardinal scale labels follow the selected unit. It lives in `src/angle/`, independently of the input and color families. Zero is at the top and angles increase clockwise. By default rotation is continuous: crossing the top wraps between a full turn and zero. Set `min` or `max` to limit movement to an arc. The chosen portion from the effective minimum to `value` uses blue by default or a custom `color`.

```html
<dsk-angle
  unit="deg"
  value="90"
  step="1"
  segments="24"
  size="208"
  color="#557be8"
  aria-label="Rotation angle"
></dsk-angle>
```

### Angle attributes and units

| Attribute  | Property         | Default             | Behavior                                                                                         |
| ---------- | ---------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `unit`     | `unit`           | `"deg"`             | Numeric unit: `deg`, `rad`, `pi`, `turn`, or `grad`. `PI` and `π` are accepted aliases for `pi`. |
| `value`    | `value`          | Effective `min`     | Current number in the selected unit, clamped to the active range.                                |
| `min`      | `min`            | `0`                 | Optional lower bound in the selected unit. Attribute presence enables bounded rotation.          |
| `max`      | `max`            | One revolution      | Optional upper bound in the selected unit. Attribute presence enables bounded rotation.          |
| `step`     | `step`           | One physical degree | Positive finite increment in the selected unit, used by pointer and keyboard adjustment.         |
| `segments` | `segments`       | `24`                | Number of scale ticks, an integer from 4 to 180. Independent of the numeric step.                |
| `size`     | `size`           | `208`               | Positive square size in pixels.                                                                  |
| `color`    | `color`          | `"#557be8"`         | CSS color for the sector, needle, and marker. Invalid colors use the default.                    |
| `disabled` | `disabled`       | `false`             | Prevents interaction and removes the control from keyboard navigation.                           |
| `readonly` | `readOnly`       | `false`             | Prevents edits while preserving focus.                                                           |
| —          | `degrees`        | —                   | Readonly numeric value in physical degrees, independent of the selected unit.                    |
| —          | `formattedValue` | —                   | Readonly display text, including the unit, matching the center label.                            |

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

```css
dsk-angle {
  --dsk-angle-size: 240px;
  --dsk-angle-color: #557be8;
  --dsk-angle-track-color: #d8dee8;
  --dsk-angle-sector-opacity: 0.1;
  --dsk-angle-focus-color: #6366f1;
  --dsk-angle-text-color: #25282d;
  --dsk-angle-label-color: #7b8494;
}

dsk-angle::part(value) {
  font-variant-numeric: tabular-nums;
}
```

The `container` part exposes the layout wrapper and `dial` exposes the SVG. The `track` part covers the circle and tick paths, `fill` exposes the single annular sector, `needle` exposes the direction indicator, and `scale-label` exposes the cardinal labels. The `marker`, `value`, and visually hidden native `input` parts are also available. The central opening is transparent and adapts to the surrounding surface without a background override. Preserve the dial and marker geometry when styling to keep pointer positions aligned. The playground's **Angle** section includes live attributes, unit conversion, arc presets, generated HTML, an event log, and light/dark themes.

## Curve editor

`<dsk-curve>` edits a piecewise cubic Bézier easing curve with draggable controls and nodes, coordinate fields, five built-in presets, and a motion preview. Click the line to insert a node without changing its shape. It lives in `src/curve/`, independently of the input, color, and angle families. The horizontal axis represents time and the vertical axis represents progress. Endpoints start at `(0, 0)` and `(1, 1)` and can be selected and moved in both axes, just like added nodes. Their X positions remain ordered; endpoints cannot be deleted.

```html
<dsk-curve
  value="ease-in-out"
  step="0.01"
  duration="1200"
  width="370"
  color="#557be8"
  aria-label="Motion easing"
></dsk-curve>
```

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
| —          | `points`   | `[0.42, 0, 0.58, 1]` | Returns a fresh tuple of the first and last control coordinates. Setting it replaces the path with one cubic segment and resets endpoints.                                                                                              |
| —          | `cssValue` | —                    | Readonly CSS easing: exact `cubic-bezier(...)` for one segment with default endpoints, otherwise sampled `linear(...)`.                                                                                                                 |
| —          | `preset`   | `"ease-in-out"`      | Readonly matching preset name, or `"custom"`. There is no `preset` attribute.                                                                                                                                                           |

| Attribute | Property      | Default     | Behavior                                                                                                                           |
| --------- | ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| —         | `segments`    | One segment | Gets a deep copy of the full `CurvePath`; accepts readonly arrays of `CurveSegment` tuples.                                        |
| —         | `nodes`       | `[]`        | Readonly list of interior nodes, each with `x`, `y`, and `kind: 'node'`.                                                           |
| —         | `activePoint` | `0`         | Gets or sets the selected editable-point index: control, control, node, and so on, followed by start and end. Selection is silent. |

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

```css
dsk-curve {
  --dsk-curve-width: 370px;
  --dsk-curve-color: #557be8;
  --dsk-curve-background: #fff;
  --dsk-curve-text-color: #202b3c;
  --dsk-curve-muted-color: #667386;
  --dsk-curve-border-color: #dde3ed;
  --dsk-curve-grid-color: #e9edf3;
}

dsk-curve::part(value) {
  font-variant-numeric: tabular-nums;
}
```

The `container` and `heading` parts expose the editor panel and title row. The graph exposes `graph-container`, `graph`, `grid`, `diagonal`, `curve`, `guide`, `endpoint`, and `axis`. All handles expose `handle`; `handle-one` and `handle-two` identify the first and last control handles. The coordinate fields expose `coordinate`. Preset controls use `presets` and `preset`. The animation section exposes `preview`, `play`, and `motion-dot`; `value` exposes the serialized curve. Node actions expose `add` and `remove`. Keep the graph and handle geometry aligned when styling parts. The playground's **Curve** section includes live settings, generated HTML, an event log, and light/dark themes.

## Extending the input base

Extend `DskInputBase` to add another value representation while keeping shared interaction behavior. It is abstract and is not registered as a custom element. Register your subclass under your own valid custom-element name.

Implement these three protected methods:

| Method                                    | Contract                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `parseValue(value: NumericValue): number` | Convert a literal or numeric assignment to the internal numeric representation. Return `NaN` when invalid.                    |
| `formatValue(value: number): string`      | Convert a valid internal number to its canonical display string.                                                              |
| `evaluateValue(text: string): number`     | Evaluate a user draft at commit or adjustment time; return `NaN` when invalid. Use a parser rather than executing JavaScript. |

```ts
import { DskInputBase, type NumericValue } from '@flowscape-ui/dsk';

class AppQuantityInput extends DskInputBase {
  protected override parseValue(value: NumericValue): number {
    const text = String(value ?? '').trim();
    const number = text === '' ? NaN : Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  protected override formatValue(value: number): string {
    return String(value);
  }

  protected override evaluateValue(text: string): number {
    return this.parseValue(text);
  }

  protected override get valueInputMode(): string {
    return 'decimal';
  }
}

customElements.define('app-quantity-input', AppQuantityInput);
```

This minimal example accepts numeric literals. Override `evaluateValue` with a safe evaluator to add expressions. The protected extension hooks are:

| Hook                                                     | Purpose                                                                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getValueOptions(): NumericOptions`                      | Resolve bounds, progression, step, and loop settings for the representation.                                                                                 |
| `normalizeValue(value: NumericValue): string`            | Customize normalization; the default parses, clamps, then formats.                                                                                           |
| `adjustValue(start, count, options): number`             | Customize numeric adjustment; the default uses shared stepping and looping.                                                                                  |
| `getKeyboardStep(value, fallback): number`               | Validate and resolve a keyboard increment.                                                                                                                   |
| `defaultHandleSvg`                                       | Supply trusted SVG markup for the default handle.                                                                                                            |
| `renderDefaultHandle(element: HTMLElement): void`        | Update the existing default handle wrapper after markup and state synchronization. Preserve the wrapper so image overrides and drag listeners remain intact. |
| `valueInputMode`                                         | Select the internal input's `inputmode`.                                                                                                                     |
| `accessibleLabel` / `invalidMessage`                     | Set the fallback accessible name and validation message.                                                                                                     |
| `refreshValue(value = this.value): void`                 | Cancel active dragging, normalize the value, and establish a fresh history baseline without user events.                                                     |
| `initialValue`                                           | Read the value captured at first connection through a protected readonly getter, for custom form reset behavior.                                             |
| `onConfigurationChanged(name, oldValue, newValue): void` | Respond to additional observed attributes. Add them to `static observedAttributes` alongside the base list.                                                  |
| `upgradeProperties`                                      | Include custom properties assigned before element registration; extend the base list.                                                                        |

Use these hooks instead of copying event listeners or modifying the base class's private state. Override lifecycle callbacks only when necessary, and call the corresponding `super` method so focus, pointer, history, and form cleanup remain intact.

`DskInputHex` additionally exposes the protected `formatAttribute` getter (default `"hex"`) and `resolveFormat(value: string | null): HexFormat` method. Override them when specializing format configuration; `DskInputColor` uses `"format"` and restricts the result to 6 or 8.

## Looping at bounds

Use `loopafter="true"` (or simply `loopafter`) to enable both directions at once. Its TypeScript property is `loopAfter`, defaulting to false. While enabled, it takes precedence over both individual flags, even if they are explicitly false. Disabling or removing it restores the behavior of `loopafter-min` and `loopafter-max` without changing their attributes.

```html
<dsk-input value="100" min="0" max="100" step="2" loopafter></dsk-input>
```

Enable `loopafter-max="true"` to wrap above `max`, and `loopafter-min="true"` to wrap below `min`. Both flags default to false. A bare attribute enables the flag; an explicit `"false"` disables it. TypeScript properties are `loopAfterMax` and `loopAfterMin`.

```html
<dsk-input
  value="100"
  min="0"
  max="100"
  step="2"
  loopafter-min="true"
  loopafter-max="true"
></dsk-input>
```

Wrapping preserves the overshoot: `100 + 2 → 2`, `0 - 2 → 98`, and `99 + 2 → 1`. Landing exactly on a bound keeps that bound; steps spanning several ranges preserve the remainder. Each flag controls only its own boundary. Dragging and keyboard steps (including Page Up/Down) use the same rule. Both bounds must be finite with a finite positive difference; otherwise normal clamping applies. Manual entry and programmatic value assignments continue to clamp. Escape still cancels a drag back to its starting value.

## Events

Use normal DOM listeners or event handler properties. `input` reports live user edits, while `change` reports a committed edit. Both events bubble and cross the component's shadow boundary. The event target is the `<dsk-input>` element.

```ts
const field = document.querySelector('dsk-input');
if (!field) throw new Error('Missing dsk-input element');

field.addEventListener('input', () => {
  console.log('Live value:', field.value);
});

field.onchange = () => {
  console.log('Committed value:', field.valueAsNumber);
};

field.onclick = () => {
  console.log('Field clicked');
};
```

Inline handlers such as `onclick` and `onchange` work under the same browser content security policy rules as other HTML elements. Prefer `addEventListener` when attaching application behavior.

## Forms

In browsers that support form-associated custom elements, a named field participates in `FormData`. Disabled fields are omitted; readonly fields remain included. Resetting the form restores the field's initial value. The component uses `ElementInternals` for this integration.

## Styling

### Inline tags

Set `tag` to display a plain-text prefix or suffix next to the editable value. It is empty by default. Use `tag-position="left"` for a prefix or `tag-position="right"` (the default) for a suffix. `tag-gap` accepts a CSS gap length such as `8px` or `0.5em`; bare nonnegative numbers are pixels. The default and invalid-value fallback are `4px`.

```html
<dsk-input
  value="50"
  tag="%"
  tag-position="right"
  tag-gap="4px"
  aria-label="Opacity"
></dsk-input>
<dsk-input
  value="123"
  tag="#"
  tag-position="left"
  tag-gap="0"
  aria-label="Value"
></dsk-input>
```

`positioning` aligns the value and tag as a group. The tag follows the current value or placeholder as its width changes. Long tags are clipped within the field. Tags are not editable, are rendered as text rather than HTML, and are excluded from `value`, events, and form submission. A `#` tag is only a visual prefix: use `<dsk-input-hex>` when the field should parse HEX values.

The corresponding TypeScript properties are `tag`, `tagPosition` (`InputTagPosition`), and `tagGap`. Setting `tag` to an empty string or removing the attribute hides it. Style the tag with `dsk-input::part(tag)`. Include the unit or purpose in `aria-label`; the tag also provides an accessible description for the internal input.

Tags cannot be selected and ignore pointer events. The native input fills the entire area to the right of the handle, including the tag and empty space. Clicking or dragging anywhere in that area interacts with the input. Only its text layout adapts to the tag, gap, and alignment.

### CSS customization

The component uses a shadow root for its internal layout. Style the host normally and use CSS custom properties or exposed parts for the internals:

```css
dsk-input {
  --dsk-input-width: 214px;
  --dsk-input-height: 30px;
  --dsk-input-background: #f5f5f7;
  --dsk-input-color: #111827;
  --dsk-input-border: 1px solid #9ca3af;
  --dsk-input-border-radius: 8px;
  --dsk-input-focus-color: #6366f1;
  --dsk-input-handle-width: 30px;
}

dsk-input::part(input) {
  font-variant-numeric: tabular-nums;
}
```

Available parts are `container`, `handle`, `input`, and `tag`. The shared `.dsk-theme` class applies the library's theme variables to a container; the component also works without it. The library does not apply a global CSS reset.

## Development

Composite editors can override `editorText` and `editorValue` to separate the visible draft from the stored value, and `getAdjustmentOptions` to constrain handle/keyboard editing independently of normalization. Protected `updateUserValue`, `commitUserValue`, `cancelUserValue`, and `restoreUserHistory` let auxiliary editors use the same host events and history.

Component SVG assets live in `assets/`, grouped by purpose: `cursor/` for cursor graphics, `icons/` for component icons, and `patterns/` for reusable backgrounds such as the transparency checkerboard. Import them with Vite's `?raw` suffix to preserve inline SVG styling such as `currentColor`. The build embeds these assets in the JavaScript bundle, so consumers do not need to serve them separately.

Source code and tests use strict TypeScript. The package exports `DskInput`, `DskInputHex`, `DskInputColor`, `DskInputBase`, `DskColorArea`, `DskColorHue`, `DskColorAlpha`, `DskColorEyedropper`, `DskAngle`, `DskCurve`, and types such as `Progression`, `NumericOptions`, `NumericValue`, `HexFormat`, `ColorFormat`, `EyeDropperErrorDetail`, `EyeDropperSampler`, `EyeDropperSampleRequest`, `EyeDropperPreviewDetail`, `EyeDropperPageOptions`, `AngleNumber`, `AngleUnit`, `CurvePoints`, `CurvePreset`, `CurveValue`, and `CurveNumber`. The `createCanvasSampler` helper adapts live 2D canvases to the eyedropper's provider API; `eyeDropperPagePseudoElements` exposes the default page-capture pseudo-element list. Importing the package also extends `HTMLElementTagNameMap`, so `document.createElement` returns the matching typed class for each registered component. TypeScript consumers receive generated declarations through the package exports.

Build from the [repository](https://github.com/Flowscape-UI/dsk) root with `pnpm --filter @flowscape-ui/dsk build`. tsdown emits ESM with lazy chunks, a minified `dsk.global.js` IIFE exposing `window.DSK`, separate `styles.css`, and bundled TypeScript declarations in `dist/`. Development requires Node.js 24.11+; `.node-version` pins the tested runtime. The playground imports the source through the `development` export condition, so no initial build is needed during development.

Run `pnpm --filter @flowscape-ui/dsk test` for the model behavior tests in `tests/unit/`. Test folders mirror the structure of `src/`. The suite runs TypeScript directly with Node.js 24's built-in type stripping and test runner and covers parsing, bounds, increments, drag progression, safe expressions, channel filling, and format conversion.

From the [repository](https://github.com/Flowscape-UI/dsk) root, run `pnpm test:browser` for browser interaction tests. Windows uses installed Microsoft Edge; on Linux and macOS, run `pnpm --filter @flowscape-ui/dsk exec playwright install chromium` first. See [Contributing](../../CONTRIBUTING.md) for the full development checks.

## Layer tree

Importing the package registers `dsk-layer-tree`, `dsk-list-value`, `dsk-list-header`, and `dsk-list-footer`, and exports their `DskLayerTree`, `DskListValue`, `DskListHeader`, and `DskListFooter` classes. The structure is declarative, like a nested HTML list; no initialization script is needed.

```html
<dsk-layer-tree aria-label="Document layers">
  <dsk-list-value open>
    <dsk-list-header>Frame</dsk-list-header>
    <dsk-list-value label="Title"></dsk-list-value>
    <dsk-list-value label="Artwork">
      <dsk-list-value label="Image"></dsk-list-value>
      <dsk-list-value label="Caption"></dsk-list-value>
    </dsk-list-value>
    <dsk-list-footer>End of frame</dsk-list-footer>
  </dsk-list-value>
</dsk-layer-tree>
```

Place child `dsk-list-value` elements directly inside their parent value. A direct `dsk-list-header` supplies the row content; otherwise the `label` attribute supplies plain text. A direct `dsk-list-footer` appears beneath the children while the branch is open. At the tree root, a header and footer remain visible outside the branches. These header/footer elements receive their slots automatically. Keep interactive controls in the footer or mark custom row actions with `data-dsk-tree-action`; native buttons, links, inputs, selects, and textareas are already excluded from row toggling.

Click a row to focus it and toggle its branch. `open` and `disabled` are boolean presence attributes/properties (remove them to turn them off). Branches start collapsed. Leaves have no visible disclosure icon. Disabled branches still support expansion and collapse by mouse or keyboard, so their descendants can be inspected. The disabled row itself cannot move. Its descendants are dimmed uniformly and can move or change nesting only within the same nearest disabled group; they cannot leave it, and outside layers cannot enter. A descendant with its own disabled attribute forms a separate boundary. Set `--dsk-tree-disabled-opacity` (default `0.45`) to customize the dimming. Disabled leaves are skipped by keyboard navigation. Standard attributes, inline styles, classes, and custom CSS work on every component.

The tree provides a single tab stop among rows. Up/Down navigate visible enabled rows, Right opens a branch or enters its first child, Left closes it or moves to its parent, Home/End move to the first/last visible row, and Enter/Space toggle. Closing a branch that contains keyboard focus returns focus to its row. Collapsed contents become inert immediately while their height animates. The animation respects `prefers-reduced-motion`.

### Layer API and events

- `tree.items`: all descendant values belonging to this tree.
- `tree.visibleItems`: navigable visible rows, including disabled branches that can be expanded.
- `item.items`: direct child values.
- `item.label`, `item.open`, `item.disabled`: reflected properties.
- `item.expandable`: whether the item contains child values or a footer.
- `item.toggle()` / `item.toggle(true | false)`: toggle, open, or close a branch, including disabled branches.
- `toggle`: a bubbling, composed `CustomEvent<ListToggleDetail>` with `detail.open`, emitted by user interaction and `toggle()`. Direct assignments to `.open` are silent. `event.target` identifies the branch.

### Tree styling and icons

Use ordinary CSS on your headers, footers, and slot contents. Style internal structure with `dsk-list-value::part(row)`, `::part(toggle)`, `::part(icon)`, `::part(label)`, `::part(children)`, or `::part(branch)`. The tree exposes `header`, `list`, and `footer` parts. No global CSS reset is applied.

```html
<dsk-list-value label="Artwork">
  <span slot="expand-icon">+</span>
  <span slot="collapse-icon">−</span>
  <img slot="icon" src="/icons/artwork.svg" width="16" height="16" alt="" />
  <dsk-list-value label="Image"></dsk-list-value>
</dsk-list-value>
```

Custom disclosure icons are shown as supplied, without automatic rotation. The defaults are directional chevrons. Supply both `expand-icon` and `collapse-icon` for distinct states, and `icon` to replace the layer symbol. Decorative icon slots are hidden from accessibility APIs; the row name comes from its header or `label`, and can be overridden with `aria-label`.

```css
dsk-layer-tree {
  --dsk-tree-indent: 24px;
  --dsk-tree-row-height: 36px;
  --dsk-tree-hover-background: #eef2ff;
  --dsk-tree-focus-color: #557be8;
  --dsk-tree-duration: 200ms;
}
dsk-list-value::part(row) {
  border-radius: 4px;
}
dsk-list-header {
  font-weight: 600;
}
```

| Variable                      | Default        |
| ----------------------------- | -------------- |
| `--dsk-tree-color`            | `inherit`      |
| `--dsk-tree-background`       | `transparent`  |
| `--dsk-tree-indent`           | `20px`         |
| `--dsk-tree-row-height`       | `34px`         |
| `--dsk-tree-row-padding`      | `0 10px`       |
| `--dsk-tree-gap`              | `8px`          |
| `--dsk-tree-radius`           | `6px`          |
| `--dsk-tree-icon-size`        | `16px`         |
| `--dsk-tree-icon-color`       | `currentColor` |
| `--dsk-tree-hover-background` | `#eef1f7`      |
| `--dsk-tree-focus-color`      | `#557be8`      |
| `--dsk-tree-duration`         | `180ms`        |
| `--dsk-tree-easing`           | `ease`         |
| `--dsk-tree-footer-padding`   | `8px 12px`     |
| `--dsk-tree-muted-color`      | `#737b8c`      |

### Reordering layers

Reordering is enabled by default. Drag near the top or bottom edge of a row to insert before or after it; a blue line with a ring marks the destination. Drag onto the middle of a row to move inside it; a blue outline and translucent fill highlight the destination group. Any row can become a group by receiving children. The destination opens after a successful drop. Moving left across indentation targets an ancestor level; dropping before/after a root row or onto empty tree space moves the layer out to the root. The source stays in place until drop, with a translucent browser drag image under the cursor. Branches move with all descendants. Cyclic moves and moves across a disabled-group boundary are rejected; descendants may move within their own disabled group. Escape or dropping outside the tree cancels the move.

Alt+Up / Alt+Down moves the focused row one sibling position. Alt+Right nests it inside the preceding sibling, and Alt+Left moves it out, immediately after its parent. Focus remains on the moved row. Disabled rows cannot be dragged. Set `draggable="false"` on a particular `dsk-list-value` to keep it from being moved, or `reorderable="false"` / `tree.reorderable = false` to disable all reordering. Buttons and other interactive row actions keep their usual behavior.

A successful move changes the light DOM and emits bubbling, composed `reorder` with `LayerReorderDetail`: `item`, `oldParent`, `parent` (destination), `position` (`before`, `after`, or `inside`), `oldIndex`, and `newIndex`. Indices count values within their respective parents, excluding headers and footers. Listen to this event to update the editor's own document model. The preceding `beforereorder` event has the same detail and is cancelable with `preventDefault()`; no event is emitted for a drop that leaves the order unchanged. `--dsk-tree-drop-background` customizes the translucent inside-group highlight.

```ts
import type { LayerReorderDetail } from '@flowscape-ui/dsk';

const tree = document.querySelector('dsk-layer-tree')!;
tree.addEventListener('reorder', (event) => {
  const { item, oldIndex, newIndex } = (
    event as CustomEvent<LayerReorderDetail>
  ).detail;
  console.log(item.id, oldIndex, newIndex);
});
```

Style the insertion marker through `dsk-layer-tree::part(drop-indicator)` and its `::before` circle, or use these inherited CSS variables:

| Variable                         | Default   |
| -------------------------------- | --------- |
| `--dsk-tree-drop-color`          | `#0d99ff` |
| `--dsk-tree-drop-line-width`     | `2px`     |
| `--dsk-tree-drop-dot-size`       | `6px`     |
| `--dsk-tree-drop-dot-background` | `#fff`    |

The marker uses a manual popover so container overflow does not clip it. The browser owns the native drag preview and its translucency; it uses the actual row, including custom icons and header styling.

### Optional search

Add a direct `dsk-tree-search` child to enable search without application JavaScript. Omit the element to omit search. It has no content of its own, but, like all HTML custom elements, still requires a closing tag.

```html
<dsk-layer-tree aria-label="Layers">
  <dsk-tree-search placeholder="Find a layer"></dsk-tree-search>
  <dsk-list-value label="Page">
    <dsk-list-value label="Title"></dsk-list-value>
  </dsk-list-value>
</dsk-layer-tree>
```

The search field is automatically placed above the tree header. It matches substrings of displayed names, ignoring case and surrounding query whitespace. Matching rows and their ancestors remain visible; ancestors expand to reveal the results. A matching group keeps its descendants available, even when their names do not match. Its expansion and the expansion of its descendants remain user-controlled during search. Clearing or removing the search restores the previous hidden/open states, and application-hidden rows remain hidden throughout. Label edits and inserted rows update results automatically. Use one search field per tree.

`DskTreeSearch` is exported. Its `.value` property reflects `value` and supports programmatic filtering. `placeholder`, `aria-label`, and `disabled` configure the native search input. User edits emit native bubbling `input` and forwarded `change`; programmatic value changes are silent. Style the field using `dsk-tree-search::part(input)`, `--dsk-tree-search-padding`, `--dsk-tree-search-background`, `--dsk-tree-search-border`, and existing tree radius/focus variables.

### Renaming a layer

Double-click a row or press F2 to edit its name in place. `item.startRename()` also starts editing. Enter or blur commits; Escape cancels. Empty names are rejected, and whitespace at the edges is trimmed. A row with its own `disabled` attribute cannot be renamed. The row is not draggable while editing.

A successful edit updates `label` and the displayed header text, then emits bubbling, composed `rename` with `ListRenameDetail` (`oldLabel`, `label`). The event target is the edited `dsk-list-value`. Listen to it to update the application's document model. `item.displayName` reads the name used for editing and search.

For a decorated header, wrap the editable name in `data-dsk-name`. Only that element's text changes; adjacent icons, buttons, metadata, and header markup remain in place. Without this marker, the first nonempty text node in the header is the editable name. Without a header, the `label` attribute is used.

```html
<dsk-list-value>
  <dsk-list-header>
    <strong data-dsk-name>Cover</strong><span> Frame</span>
  </dsk-list-header>
</dsk-list-value>
```

Style the inline input with `dsk-list-value::part(editor)`, `--dsk-tree-editor-background`, and `--dsk-tree-focus-color`.

## Canvas widgets

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

## Ruler

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

## Lightweight HTML viewport

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

## Brand asset

The shared square DSK logo is available at `@flowscape-ui/dsk/logo.svg`. With Vite, import `@flowscape-ui/dsk/logo.svg?url` and use the URL for an image or favicon. Keep its width and height equal. Documentation and playground use this same source asset.

The `dsk-pan-zoom` dotted grid lives inside the transformed world (`::part(grid)`). Its spacing and dot size scale with the camera, and scene rotations also rotate the grid. `--dsk-pan-zoom-grid-color` controls its color. The tiled region remains bounded around the visible world during pan. Grid opacity fades linearly from full visibility at 70% zoom to zero at 55%. At 55% or below, the grid is detached from the DOM and its geometry is not recalculated; zooming in reattaches the same lightweight grid element.
