---
title: Introduction
description: Meet DSK — composable web components by Flowscape Team for building editors, whiteboards, and creative tools.
---

# Introduction

**Your ideas. Your tools. Your DSK.**

Design System Kit is a collection of focused UI components for creative software, built by **Flowscape Team**. It gives developers the controls that make an editor feel precise: drag a number, adjust a color, turn an object, shape a curve, or organize a hierarchy.

Start with one control or compose an entire properties panel. DSK is built with TypeScript, HTML, and CSS and delivered as browser-native custom elements. You can use it in a plain web application and connect its values to your own rendering engine.

## Why we are building DSK

Creative applications need more than ordinary form fields. A width control should be comfortable to drag. A color field should show the color you are editing. A ruler should follow the same coordinates as the objects on the canvas.

We are building DSK to make these interactions reusable across Flowscape tools and other projects. The aim is to help teams spend more time on what their editor lets people create, while giving them control over how its interface looks and behaves.

Three ideas guide the kit:

- **Small pieces that work together.** Use a single number input, combine color controls into your own picker, or place coordinate-aware widgets around your viewport.
- **Your visual language.** Customize components with CSS variables and exposed shadow parts. Compose the surrounding layout with ordinary HTML and CSS.
- **Your application model.** Read values, listen to events, and connect them to your state. Your application owns rendering, selection, persistence, and document-wide undo history.

## Who it is for

DSK is for developers building **design tools, whiteboards, diagram editors, animation interfaces, and other interactive workspaces**. It is especially useful when users edit objects through an inspector and need both direct manipulation and precise values.

For example, an object inspector can combine numeric fields for position and size, an angle control for rotation, a color picker for appearance, and a file input for an image asset. A layer tree can represent the document hierarchy, while rulers and markers follow the editor's coordinate system.

You can adopt those pieces independently. Using a DSK input does not require replacing your existing canvas, state management, or application layout.

## What is in the kit?

The current vanilla implementation includes **19 custom elements**, grouped by the job they do.

### Inputs and file selection

The building blocks of an inspector: precise values, linked fields, and local assets.

| Component          | What it does                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| `dsk-input`        | A numeric field with typed arithmetic expressions, draggable adjustment, bounds, and stepping.                 |
| `dsk-input-hex`    | A hexadecimal field for editing and stepping through hex values.                                               |
| `dsk-input-color`  | An RGB/RGBA field with a live color swatch and configurable alpha presentation.                                |
| `dsk-input-group`  | Coordinates fields, including linked edits and mixed-value presentation for multi-object editing.              |
| `dsk-input-upload` | Selects a local file by picker or drop, shows an image thumbnail or document icon, and filters accepted types. |

[Explore inputs and groups →](/components/inputs)

### Color controls

Compose the color picker your interface needs, from a compact strip to a full panel.

| Component              | What it does                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `dsk-color-area`       | A two-dimensional saturation and brightness control.                                   |
| `dsk-color-hue`        | A slider for choosing hue.                                                             |
| `dsk-color-alpha`      | A slider for adjusting opacity.                                                        |
| `dsk-color-eyedropper` | Samples colors through supported screen, page, or application-provided sampling modes. |

[Explore color and eyedropper →](/components/color)

### Angles and curves

Visual controls for properties that are easier to understand through a shape or direction.

| Component   | What it does                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `dsk-angle` | A compass-style rotation control with a central value, configurable bounds, and multiple angle units. |
| `dsk-curve` | An editable curve control for shaping easing and working with curve points and segments.              |

[Explore angles and curves →](/components/geometry)

### Layers and hierarchy

Build an outline for the objects in your document, with the supporting pieces included only when you need them.

| Component         | What it does                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `dsk-layer-tree`  | Coordinates the layer hierarchy and drag-and-drop reordering.                              |
| `dsk-list-value`  | A layer row or branch that can be expanded, renamed, and arranged in the tree.             |
| `dsk-list-header` | An optional header region for a list.                                                      |
| `dsk-list-footer` | An optional footer region for a list.                                                      |
| `dsk-tree-search` | An optional search field that filters the tree while keeping matching branches expandable. |

[Explore the layer tree →](/components/layers)

### Canvas widgets

HTML/CSS widgets that connect to a viewport without requiring a particular rendering engine.

| Component           | What it does                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dsk-pan-zoom`      | A lightweight interactive viewport for HTML content, supporting pan and zoom.                                           |
| `dsk-ruler`         | A horizontal or vertical coordinate ruler with visible-range tick generation, highlighted ranges, and draggable guides. |
| `dsk-canvas-marker` | A label or annotation positioned in coordinates, with configurable pan and zoom tracking.                               |

The package also exports coordinate helpers for connecting your own HTML widgets to a camera. You decide which widgets follow pan, zoom, or remain fixed in the viewport.

[Explore canvas widgets →](/components/canvas)

## A first look at usage

DSK's basic integration is **import → HTML → events**. Give a component an initial value, then connect user edits to something in your application.

### Installation at a glance

Install DSK with npm:

```sh
npm i @flowscape-ui/dsk
```

See [Installation](/guide/installation) for the full setup guide and client-side initialization.

### One field, one connection

Here is a minimal width control connected to a regular HTML element. No rendering engine is needed for this example.

```html
<dsk-input
  id="width"
  value="160"
  min="40"
  max="320"
  aria-label="Shape width"
></dsk-input>

<div
  id="shape"
  style="width:160px;height:120px;margin-top:24px;background:#ff007a;border-radius:16px"
></div>
```

Run this module in the browser after the markup is available:

```ts
import '@flowscape-ui/dsk';

const width = document.querySelector('dsk-input')!;
const shape = document.querySelector<HTMLElement>('#shape')!;

width.addEventListener('input', () => {
  shape.style.width = `${width.value}px`;
});
```

The same connection can update an object in your engine instead of a DOM element. Most value controls emit `input` for live edits and `change` when an edit is committed. Programmatic assignments update the component without emitting those user-edit events; specialized components document their own events.

## Made by Flowscape Team

DSK is developed by **Flowscape Team** as a foundation for interfaces where people create and edit. The project uses the **MIT license**, and its current focus is the vanilla web-component implementation.

See the [real-world tldraw SDK example](/examples/tldraw): DSK connects to another editor’s camera and shapes through ordinary DOM events.

Browse the [source code on GitHub](https://github.com/Flowscape-UI/dsk) to explore the implementation or contribute.

If this direction is useful to your work, you can [support the project](https://github.com/sponsors/Flowscape-UI).

## Where to go next

- **Try the interactions:** explore the [interactive homepage](/) or run the playground using the [installation guide](/guide/installation).
- **Make DSK look like your product:** read [Styling and themes](/guide/styling).
- **Build a first inspector:** start with [Inputs and groups](/components/inputs), then add the controls your workflow needs.
