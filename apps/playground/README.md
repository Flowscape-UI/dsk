# Playground

In Color properties, select RGBA and set Alpha editor to Percent for separate RGB and 0–100% opacity fields. Drag the `%` handle to change opacity; select HEX to return to one RGBA field.

The small moon/sun button at the top left switches between light and dark themes. The selection is saved locally when browser storage is available; the initial default is light. Component previews inherit matching theme variables.

Theme changes reveal the new theme in a 400 ms circle expanding from the button, inspired by [Magic UI's Animated Theme Toggler](https://magicui.design/docs/components/animated-theme-toggler). The implementation uses the native View Transitions API without a framework dependency. Reduced-motion preferences and browsers without the API use an immediate switch. Repeated clicks during the reveal are ignored until it finishes.

Mouse dragging uses Pointer Lock with a visible virtual resize cursor that wraps across viewport edges. Values change only in response to mouse movement; holding still never changes the value. Release commits and restores the native cursor at its original lock position; Escape, focus loss, or interruption cancels the drag. The browser cannot move the native cursor to the virtual cursor position. If Pointer Lock is unavailable or denied, ordinary dragging remains available with screen limits and no automatic changes. Touch and pen use ordinary dragging. Numeric min/max bounds still apply.

An interactive development environment for vanilla components. Run `pnpm dev:playground` from the [repository](https://github.com/Flowscape-UI/dsk) root to start it on port 5173. It imports the public API of `@flowscape-ui/dsk`.

The first example is `<dsk-input>`. Drag its handle horizontally, enter a number directly, or use the keyboard. Change the optional attributes in the controls to explore bounds, step sizes, placeholder text, handle images, and progression modes. Event feedback shows how `input` and `change` are emitted.

The Properties panel exposes `value`, `min`, `max`, `step`, `progression`, `placeholder`, and `src`, plus Disabled and Read only switches. Clearing a bound removes that limit. The HTML panel updates with the current attributes.

Four presets provide starting points:

- Basic: value `40`, bounds `0`–`100`, and step `1`.
- Decimals: value `0.5`, bounds `0`–`1`, and step `0.01`.
- Unbounded: value `0`, step `1`, and no bounds.
- Placeholder: an empty value with the hint “Enter a number”.

The Event log keeps the eight most recent `input` and `change` events. Changing a property is a programmatic update, so it does not add an event. Clear resets the log and change counter; Reset example restores the Basic preset.

Changes to the library source and playground reload through Vite. Add new component examples in `index.html` and `src/main.ts`; keep application styling in `src/style.css`.

The separate HEX input section previews `<dsk-input-hex>`. Choose format 1 or 2 for a single channel, 3 or 6 for RGB, or 8 for RGBA. Adjust the value, HEX bounds, decimal integer step, handle image, loop flag, and select-on-focus flag. Its HTML, event log, and reset button are independent of the numeric example.

The initial HEX value is `FE0000`. Increment twice to see `FE0000 → FF0000 → FF0100`: red stays full while green increases, followed by blue and alpha. Format changes preserve channels when exactly representable. See the [component documentation](../../packages/vanilla/README.md#hex-input) for conversion and expression rules.

The Color input section previews `<dsk-input-color>` with initial `format="8"` and `value="557BE880"`. Choose RGB (6) or RGBA (8), then adjust the value, HEX bounds, decimal integer step, optional image source, looping, and select-on-focus. The handle displays the current color over a black-and-white checkerboard, so alpha is visible. An empty or invalid draft shows only the checkerboard; arithmetic expressions show a color once committed.

Use Opaque, 50% alpha, and Transparent to compare the same RGB color at different alpha values. These examples switch to RGBA and clear custom bounds and image sources. An image source overrides the swatch; clearing it restores the live color. Switching 8 to 6 removes alpha, while 6 to 8 appends opaque alpha (`FF`). The color HTML, event log, Clear button, and Reset color button are independent of the other examples. Reset color restores `557BE880` in format 8 and clears its settings.
