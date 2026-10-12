<p align="center">
  <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/packages/vanilla/assets/dsk-logo.svg" width="64" height="64" alt="DSK logo" />
</p>

<h1 align="center">Design System Kit</h1>

<p align="center">
  Precise controls for people building creative tools.<br />
  Built by <strong>Flowscape Team</strong> with TypeScript, HTML, and CSS.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@flowscape-ui/dsk"><img src="https://img.shields.io/npm/v/@flowscape-ui/dsk?style=flat-square&amp;color=ff007a&amp;logo=npm&amp;logoColor=white" alt="npm version" /></a>
  <a href="https://github.com/Flowscape-UI/dsk/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-ff007a?style=flat-square" alt="License: MIT" /></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="Strict TypeScript" />
  <img src="https://img.shields.io/badge/Web_Components-native-a855f7?style=flat-square" alt="Native Web Components" />
  <img src="https://img.shields.io/badge/docs-EN_%2F_RU-242424?style=flat-square" alt="Documentation in English and Russian" />
  <a href="https://github.com/sponsors/Flowscape-UI"><img src="https://img.shields.io/badge/Sponsor-DSK-ff007a?style=flat-square&amp;logo=githubsponsors&amp;logoColor=white" alt="Sponsor DSK" /></a>
</p>

<p align="center">
  <a href="https://github.com/Flowscape-UI/dsk">GitHub</a> ·
  <a href="https://flowscape-ui.github.io/dsk/guide/introduction">Introduction</a> ·
  <a href="https://flowscape-ui.github.io/dsk/guide/installation">Quick start</a> ·
  <a href="https://flowscape-ui.github.io/dsk/components/inputs">API reference</a> ·
  <a href="https://flowscape-ui.github.io/dsk/ru/guide/introduction">Русская документация</a>
</p>

![Your ideas. Your tools. Your DSK.](https://raw.githubusercontent.com/Flowscape-UI/dsk/main/assets/readme/banner.svg)

## Small components. Big possibilities.

Design tools need more than ordinary form fields. Numbers should be comfortable to drag. Colors should be visible while you edit them. Rulers should follow the same coordinates as your canvas.

**DSK brings those interactions to your application.** Start with a single input or compose an entire inspector for a design tool, whiteboard, diagram editor, or animation workspace. Keep your own renderer, application state, and visual identity.

- **Precision built in.** Numeric expressions, drag adjustment, keyboard controls, stepping, bounds, and linked fields.
- **Compose your interface.** Independent inputs, color controls, rotation, curves, layers, and canvas widgets.
- **Make it yours.** CSS custom properties, exposed shadow parts, and ordinary HTML for the surrounding layout.
- **Connect to your engine.** Read properties and listen to native `input` and `change` events.
- **Use your stack.** Browser-native custom elements with examples for Vanilla, React, Vue, Svelte, Angular, and SSR setups.

## See it move

<p align="center">
  <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/assets/readme/rotation.gif" width="720" alt="A DSK angle control rotates a pink canvas object and updates its angle readout" />
</p>

<p align="center"><sub>Captured from the real documentation demo. One control, connected to your object.</sub></p>

The [angles and curves guide](https://flowscape-ui.github.io/dsk/components/geometry) shows how to connect rotation and easing to your own interface. Prefer a still image? [View the preview](https://raw.githubusercontent.com/Flowscape-UI/dsk/main/assets/readme/rotation-preview.png).

## Start building

Install DSK in your frontend project:

```sh
npm i @flowscape-ui/dsk
```

Import it once in your browser entry point:

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

Then add a control to your HTML. It works without writing an event handler:

```html
<dsk-input aria-label="Width" value="160" min="0" step="1"></dsk-input>

<dsk-input-color aria-label="Fill" value="FF007A"></dsk-input-color>

<dsk-angle aria-label="Rotation" value="45" unit="deg"></dsk-angle>
```

Custom elements need explicit closing tags in HTML. Use `<dsk-input></dsk-input>`, not the self-closing form.

### Connect a value to your canvas

Add a field and an ordinary HTML object:

```html
<dsk-input
  id="width"
  aria-label="Width"
  value="160"
  min="24"
  max="400"
></dsk-input>
<div id="shape" style="width: 160px; height: 100px; background: #ff007a"></div>
```

Listen only when you need to update application state or rendering:

```ts
import type { DskInput } from '@flowscape-ui/dsk';

const width = document.querySelector<DskInput>('#width');
const shape = document.querySelector<HTMLElement>('#shape');

if (width && shape) {
  width.addEventListener('input', () => {
    shape.style.width = `${width.value}px`;
  });
}
```

Run this after the markup exists. `input` reports live edits; `change` reports a committed edit. For framework-specific setup and browser-only imports in SSR applications, see the [installation guide](https://flowscape-ui.github.io/dsk/guide/installation).

### Match your design

```css
dsk-input,
dsk-input-color {
  --dsk-input-background: #171717;
  --dsk-input-color: #ffffff;
  --dsk-input-border: 1px solid #363636;
  --dsk-input-border-radius: 4px;
  --dsk-input-focus-color: #ff007a;
}
```

Explore [styling and customization](https://flowscape-ui.github.io/dsk/guide/styling) for inherited tokens, slots, and CSS parts.

## Inside the kit

**19 custom elements**, organized around the work your users do.

| Family                                                                    | Components                                                                                  | What you can build                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [Inputs & groups](https://flowscape-ui.github.io/dsk/components/inputs)   | `dsk-input`, `dsk-input-hex`, `dsk-input-color`, `dsk-input-upload`, `dsk-input-group`      | Property inspectors, linked dimensions, color fields, and file selection with previews. |
| [Color & eyedropper](https://flowscape-ui.github.io/dsk/components/color) | `dsk-color-area`, `dsk-color-hue`, `dsk-color-alpha`, `dsk-color-eyedropper`                | Your own color picker with opacity and screen, page, or custom sampling modes.          |
| [Angles & curves](https://flowscape-ui.github.io/dsk/components/geometry) | `dsk-angle`, `dsk-curve`                                                                    | Rotation controls, editable easing, and motion previews.                                |
| [Layer tree](https://flowscape-ui.github.io/dsk/components/layers)        | `dsk-layer-tree`, `dsk-list-value`, `dsk-list-header`, `dsk-list-footer`, `dsk-tree-search` | Searchable hierarchies with selection, renaming, and reordering.                        |
| [Canvas widgets](https://flowscape-ui.github.io/dsk/components/canvas)    | `dsk-pan-zoom`, `dsk-ruler`, `dsk-canvas-marker`                                            | Navigable workspaces with rulers, guides, and coordinate-aware overlays.                |

## Your engine. DSK controls.

The documentation includes working examples with six different rendering and editing libraries. Each walkthrough includes the integration steps, a browsable project, and downloadable source files.

| Engine                                                                                                                                                     | Explore the example                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/apps/docs/public/engines/tldraw.svg" width="20" height="20" alt="" /> **tldraw SDK**     | [Shape transforms, camera synchronization, rulers, and comments](https://flowscape-ui.github.io/dsk/examples/tldraw) |
| <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/apps/docs/public/engines/excalidraw.png" width="20" height="20" alt="" /> **Excalidraw** | [Connect DSK controls to a whiteboard](https://flowscape-ui.github.io/dsk/examples/excalidraw)                       |
| <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/apps/docs/public/engines/reactflow.svg" width="20" height="20" alt="" /> **React Flow**  | [Edit nodes and follow the viewport](https://flowscape-ui.github.io/dsk/examples/reactflow)                          |
| <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/apps/docs/public/engines/three.ico" width="20" height="20" alt="" /> **Three.js**        | [Control mesh transforms and a 3D scene](https://flowscape-ui.github.io/dsk/examples/three)                          |
| <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/apps/docs/public/engines/konva.png" width="20" height="20" alt="" /> **Konva.js**        | [Connect controls to an interactive canvas](https://flowscape-ui.github.io/dsk/examples/konva)                       |
| <img src="https://raw.githubusercontent.com/Flowscape-UI/dsk/main/apps/docs/public/engines/fabric.ico" width="20" height="20" alt="" /> **Fabric.js**      | [Edit canvas objects through a DSK inspector](https://flowscape-ui.github.io/dsk/examples/fabric)                    |

## Built in the open

DSK is a project by **Flowscape Team**, released under the [MIT License](https://github.com/Flowscape-UI/dsk/blob/main/LICENSE). We are building reusable pieces for our own creative tools and for yours.

Read the [architecture](https://github.com/Flowscape-UI/dsk/blob/main/ARCHITECTURE.md), explore the [changelog](https://github.com/Flowscape-UI/dsk/blob/main/CHANGELOG.md), or follow the [contribution guide](https://github.com/Flowscape-UI/dsk/blob/main/CONTRIBUTING.md) to get involved.

**Help us keep building.** [Support Flowscape Team on GitHub Sponsors →](https://github.com/sponsors/Flowscape-UI)
