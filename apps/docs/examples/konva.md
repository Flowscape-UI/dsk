# Konva.js + DSK

<script setup>
import { data as project } from '../.vitepress/data/konva-project.data.ts';
</script>

Build a small canvas editor with Konva's scene graph and native DSK controls. Konva draws, selects and transforms the objects. DSK supplies the position/rotation inspector, rulers, guides and a comment attached to the rectangle.

<ClientOnly><EngineExample engine="konva" /></ClientOnly>

The editor loads with this page. Drag a shape, resize or rotate it with the handles, then edit X, Y or Rotation in the inspector. Click empty space to clear selection, or drag it to pan. Click the canvas before using the wheel to zoom; press Escape to release it and continue scrolling the page. **Fit** brings both shapes into view, and **Reset** restores their initial transforms. Select the ellipse to see the same controls edit another object.

Pull a guide from either ruler. Focus a guide and press Delete to remove it. Guides are DSK visual aids; they do not make Konva snap. The comment remains attached to the rectangle when selection changes. Everything stays in memory and resets when you leave the page.

## 1. Install and reserve the host

This example uses Konva 10.7.1 in a Vite TypeScript app. No runtime framework or Konva wrapper is needed.

```sh
npm i @flowscape-ui/dsk konva@10.7.1
```

```html
<!-- index.html -->
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

The project keeps the reusable DSK panel separate from the engine:

```text
src/
  main.ts
  konva/
    mount-example.ts
  shared/
    example-shell.ts
    example-shell.css
```

## 2. Build the DSK panel

`createExampleShell` creates three `dsk-input` elements, two rulers and an overlay with a `dsk-canvas-marker`. The engine receives only `surface`. The ruler target is `viewport`, so their origin matches the canvas rather than the whole document.

<<< @/snippets/shared/example-shell.ts

The shell accepts a selection, a camera and a marker anchor. It emits callbacks for field edits and toolbar actions. Programmatic DSK value assignments do not emit `input`, so reflecting engine changes does not produce an update loop. The active field is not overwritten while it is being edited.

## 3. Mount the actual Konva stage

This is the complete adapter used by the example above. Save it as `src/konva/mount-example.ts`.

<<< @/snippets/konva/mount-example.ts

`Stage` owns navigation, `Layer` contains the shapes, and `Transformer` supplies selection handles. Clicking a shape connects it to the transformer. An empty selection disables the DSK fields. The inspector deliberately edits one object at a time.

Konva resizing changes `scaleX` and `scaleY`; it does not rewrite the rectangle's width and height. **Reset** restores scale as well as position and rotation. See the official [Transformer example](https://konvajs.org/docs/select_and_transform/Basic_demo.html).

## 4. Connect positions and rotation

The rectangle's offset is half its width and height, so its X/Y describe its center. The ellipse already has a centered origin. Both engine gestures and DSK therefore rotate around the center. Konva's rotation is measured in degrees, just like the inspector.

```ts
shell.onTransform((field, value) => {
  if (!selected) return;
  if (field === 'rotation') selected.rotation(value);
  else if (field === 'x') selected.x(value);
  else selected.y(value);
  sync();
});
```

The adapter listens to `dragmove` and `transform` to reflect canvas changes in the fields. It reads the engine's current values instead of maintaining a second object model.

## 5. Share the camera with rulers and comments

Konva stage position and scale map directly to the DSK camera:

```ts
// Both use: screen = world * zoom + pan.
shell.setCamera({
  panX: stage.x(),
  panY: stage.y(),
  zoom: stage.scaleX(),
});

// Exclude the stage transform to get an anchor in world coordinates.
const bounds = rectangle.getClientRect({ relativeTo: stage });
shell.setMarker(bounds.x + bounds.width, bounds.y + bounds.height);
```

The example uses uniform scale and an unrotated camera. The comment follows the rectangle's axis-aligned bounding box after resize or rotation. It is a DSK annotation, not a Konva document object. In a real editor, persist its text and the associated object ID in your document model.

The wheel handler first finds the world point beneath the pointer, changes scale, then adjusts stage position to keep that point stationary. See Konva's [pointer-centered zoom example](https://konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html). Document scroll offsets are not part of this camera mapping.

## 6. Add styles and start

Use the shared styles for a fixed canvas height, aligned ruler origins and an overlay that does not intercept canvas gestures:

<<< @/snippets/shared/example-shell.css

```ts
// src/main.ts
import { mountExample } from './konva/mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// Also call dispose() when your route or component unmounts.
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

The disposer disconnects the resize observer, removes DOM listeners, destroys the Konva stage and removes the DSK panel. For SSR, dynamically import this module on the client after the host exists. Konva's browser canvas and DSK custom elements must not be mounted during server rendering.

## 7. Explore and download the project

Browse every file below or download the ZIP. The engine adapter and shared shell come from the exact sources used in this page. The archive includes a built DSK package in `vendor`, so the example runs independently of this [repository](https://github.com/Flowscape-UI/dsk).

Use Node.js 22.12+ and an internet connection for dependencies. Extract the archive, open a terminal in `dsk-konva-example`, run `npm install`, then `npm run dev`. Run `npm run build` to type-check and produce a production build.

<ExampleProjectViewer :project="project" />
