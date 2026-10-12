# Fabric.js + DSK

<script setup>
import { data as project } from '../.vitepress/data/fabric-project.data.ts';
</script>

Use Fabric's interactive canvas as the rendering engine and DSK as its external inspector. Fabric manages object selection, dragging, scaling and rotation. The same DSK inputs, rulers and comment used by the other examples connect to Fabric's public API.

<ClientOnly><EngineExample engine="fabric" /></ClientOnly>

The editor loads with the page. Drag the rectangle or ellipse, use the handles to resize/rotate, or change X, Y and Rotation in the DSK panel. Click empty space to clear selection and drag it to pan. Click the canvas before wheel zoom; Escape releases focus so the page can scroll normally. **Fit** shows both shapes; **Reset** restores their initial transforms.

The comment follows the rectangle even when another object is selected. Pull guides from the rulers and press Delete on a focused guide to remove it. These are DSK overlays, not Fabric objects or snapping constraints. Changes are kept in memory until you leave the page.

## 1. Install and reserve the host

This example uses Fabric 7.4.0 with Vite and TypeScript. Fabric and DSK both work without a runtime framework.

```sh
npm i @flowscape-ui/dsk fabric@7.4.0
```

```html
<!-- index.html -->
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

```text
src/
  main.ts
  fabric/
    mount-example.ts
  shared/
    example-shell.ts
    example-shell.css
```

## 2. Create the DSK inspector and overlay

The shared shell keeps native controls outside Fabric's gesture surface. Its rulers target the inner viewport, and its comment receives world coordinates plus the same camera as the canvas.

<<< @/snippets/shared/example-shell.ts

`setSelection` updates the controls and disables them when nothing is selected. `onTransform` receives user edits. Assigning a DSK input value from code is silent; this prevents a feedback loop. The shell also avoids rewriting a field during an active edit.

## 3. Mount Fabric and create the objects

Save this as `src/fabric/mount-example.ts`. This is the adapter running in the live example.

<<< @/snippets/fabric/mount-example.ts

`Canvas` adds its own interaction layer over the HTML canvas. Both objects use explicit center origins, so the inspector's X/Y represent the center. Selection is limited to one of the two shapes; dragging empty space pans instead of starting a multi-selection rectangle.

Fabric supplies the visible transform handles. DSK does not draw an imitation of them or replace Fabric's interaction model.

## 4. Read selection and apply DSK edits

Fabric's `left`/`top` correspond to the object's configured origin. `angle` is measured in degrees. With centered origins, the adapter can use the values directly:

```ts
shell.onTransform((field, value) => {
  const object = selected();
  if (!object) return;
  if (field === 'rotation') object.rotate(value);
  else object.set(field === 'x' ? 'left' : 'top', value);

  // External changes must refresh controls and hit-testing coordinates.
  object.setCoords();
  canvas.requestRenderAll();
  sync();
});
```

Calling `setCoords()` matters: setting an object's properties alone does not refresh the cached coordinates used by hit testing and selection controls. The adapter reads the active object after each render so direct canvas gestures update DSK too. See Fabric's [object geometry API](https://fabricjs.com/api/classes/fabricobject/).

The inspector intentionally handles only the rectangle and ellipse. Extending it to groups or multiple selection requires deciding whether X/Y refer to the group's parent coordinates or the overall scene.

## 5. Convert the viewport transform

Fabric stores its camera as a six-value affine matrix. This example uses only uniform scale and translation, so it maps to DSK without an additional offset:

```ts
// Fabric matrix: [zoom, 0, 0, zoom, panX, panY].
// DSK: screen = world * zoom + pan.
const matrix = canvas.viewportTransform;
shell.setCamera({
  panX: matrix[4],
  panY: matrix[5],
  zoom: canvas.getZoom(),
});

// getBoundingRect() returns scene coordinates, before the camera transform.
const bounds = rectangle.getBoundingRect();
shell.setMarker(bounds.left + bounds.width, bounds.top + bounds.height);
```

Do not apply the camera to the comment's anchor first: `dsk-canvas-marker` applies it itself. The viewport's location on the page is unrelated to the camera translation. A rotated/skewed viewport would require a different ruler integration; this example deliberately keeps the camera axis aligned.

For pointer-centered wheel zoom, `canvas.zoomToPoint()` takes a point in viewport pixels and the new zoom factor. Panning changes the matrix translation with `setViewportTransform()`. Both operations refresh the rulers and marker. See the [Canvas API](https://fabricjs.com/api/classes/canvas/).

## 6. Add styles and lifecycle cleanup

The shared stylesheet aligns the rulers with the canvas, fixes the viewport height and gives the DSK panel its dark theme:

<<< @/snippets/shared/example-shell.css

```ts
// src/main.ts
import { mountExample } from './fabric/mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// Also call dispose() when the owning route or component unmounts.
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

Cleanup disconnects the resize observer and DOM listeners, removes Fabric subscriptions, and calls `canvas.dispose()`. Fabric finishes a pending render before releasing its resources. The adapter's disposed guard prevents that final render from updating the removed DSK panel.

For SSR, import the mounting module in a client lifecycle hook after the host exists. The canvas, DOM controls and resize observer belong to the browser.

## 7. Explore and download the project

The file explorer below contains the complete runnable example, including comments and the shared shell. Downloading the ZIP gives you these same sources plus a built DSK package in `vendor`.

Use Node.js 22.12+ and an internet connection for installing dependencies. Extract the ZIP, open a terminal in `dsk-fabric-example`, run `npm install`, then `npm run dev`. Run `npm run build` to verify types and build the application.

<ExampleProjectViewer :project="project" />
