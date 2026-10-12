# tldraw SDK + DSK

<script setup>
import { data as project } from '../.vitepress/data/tldraw-project.data.ts';
</script>

Use DSK inside an existing editor rather than replacing its engine. This example keeps tldraw responsible for shapes, selection, transforms, camera navigation and undo. DSK supplies two rulers, a comment marker and a small transform inspector.

<ClientOnly><TldrawExample /></ClientOnly>

The example starts automatically. Drag or rotate the rectangle with tldraw, then change X, Y or Rotation in the DSK inputs. Select the ellipse to inspect another object. Use the mouse wheel/trackpad to navigate, or **Fit** to bring the shapes back. Pull a guide from either ruler and use Delete on the focused guide to remove it. The comment follows the rectangle even when a different object is selected.

The SDK loads when this page opens, with a loading indicator until the editor is ready. Edits stay in memory and reset when you leave the page. The comment is a DSK annotation, not a tldraw comment thread. Guides are visual aids; they do not add snapping constraints to tldraw.

::: info tldraw license
This example uses tldraw 5.5.2 and React 18.3.1. tldraw has its own license, separate from DSK's MIT license. Local development works without a key. Deploying this example requires a valid tldraw license key for your host; set `VITE_TLDRAW_LICENSE_KEY` before building. Keep the SDK's attribution. See the [official license and key instructions](https://tldraw.dev/community/license).
:::

## 1. Install the dependencies

In a Vite TypeScript application:

```sh
npm i @flowscape-ui/dsk tldraw@5.5.2 react@18.3.1 react-dom@18.3.1
npm i -D @types/react@18 @types/react-dom@18
```

React is required by tldraw, not by DSK. The example uses React's `createElement` so the adapter and entry files remain plain TypeScript. You can also render `<Tldraw />` in your existing React app and pass its `onMount` editor to the same DSK adapter.

```text
index.html
src/
  main.ts
  mount-example.ts
  bind-dsk.ts
  style.css
```

## 2. Reserve the editor area

The viewport has a fixed height. A 24px row and column around it hold the rulers. Their origins align with the inner viewport, not with the page or the inspector above it.

```html
<!-- index.html -->
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

The mounting function below creates these three independent areas:

- DSK inputs outside tldraw's event surface.
- A React root containing the real `Tldraw` component.
- An untransformed overlay containing `dsk-canvas-marker`.

The overlay does not intercept canvas gestures. DSK rulers target the viewport element through `.target`; no global selector is needed.

## 3. Mount tldraw and create two shapes

Save this as `src/mount-example.ts`. It is the exact code used by the live example. `onMount` gives us the editor instance; no global editor variable is needed.

<<< @/snippets/tldraw/mount-example.ts

The normal tldraw selection tools still work with `hideUi`. This hides its toolbar so DSK controls are easy to see; it does not replace tldraw's editor or suppress its attribution. `autoFocus: false` prevents loading the demo from taking focus away from the documentation.

## 4. Translate camera coordinates

tldraw and DSK express pan differently:

```ts
// tldraw: viewportPoint = (pagePoint + cameraPosition) * zoom
// DSK:    viewportPoint = worldPoint * zoom + pan
const { x, y, z } = editor.getCamera();
const camera = { panX: x * z, panY: y * z, zoom: z };
xRuler.camera = camera;
yRuler.camera = camera;
comment.camera = camera;
```

For example, tldraw camera `{ x: 40, y: -20, z: 2 }` becomes DSK `{ panX: 80, panY: -40, zoom: 2 }`. A point at `(100, 50)` appears at `(280, 60)` CSS pixels inside the viewport.

Do not add document scroll or the viewport's page offset here. Both rulers and the marker already use the viewport origin. Do not apply another CSS camera transform to the overlay. For other engines, derive the equivalent mapping from their camera API. See tldraw's [coordinate systems](https://tldraw.dev/sdk-features/coordinates) and [camera API](https://tldraw.dev/sdk-features/camera).

## 5. Connect selection, inputs and the comment

Save this as `src/bind-dsk.ts`. The `react` function here is tldraw's reactive subscription, not a React hook. It tracks the camera, selection and shape changes and returns a disposer.

<<< @/snippets/tldraw/bind-dsk.ts

The connection works in both directions:

1. tldraw changes a shape or selection. The subscription updates DSK fields, rulers and the marker.
2. A DSK `input` event updates the selected tldraw shape. Programmatic DSK value assignments are silent, so they do not create an event loop.
3. Rotation converts degrees to radians and uses `rotateShapesBy` to rotate around the object's center. X/Y may also change during that rotation.
4. A history stopping point starts each field edit, keeping undo grouped rather than adding a separate undo step for every pointer movement.

The active field is not rewritten during an edit. DSK inputs receive focus outside the editor, and `editor.blur()` prevents editor shortcuts from consuming their keyboard input.

### Selection boundaries

This inspector deliberately edits one unlocked shape whose parent is the current page. Empty selection, multiple selection and nested shapes disable the inputs. A nested shape's X/Y are relative to its parent; supporting them requires a deliberate page-to-parent transform, not treating those coordinates as page coordinates. See tldraw's [shape transforms](https://tldraw.dev/sdk-features/shape-transforms).

### Comment attachment

The annotation stores a reference to the rectangle's stable shape ID. `getShapePageBounds` supplies its page-space bounding box; the marker follows its bottom-right corner after movement, resize or rotation. Deleting the rectangle hides the marker; undo restores it. Switching selection does not move the comment to another shape. In a real product, store the shape ID and comment content in your document model, and decide whether the anchor belongs to the bounding box or to a local point on the shape.

## 6. Add the styles

Save this as `src/style.css`. The important layout rule is the shared viewport origin. The remaining rules make the inspector match the documentation. tldraw's stylesheet is imported separately by the mounting file.

<<< @/snippets/tldraw/style.css

## 7. Start and clean up

```ts
// src/main.ts
import { mountExample } from './mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// On route unmount: dispose();
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

The disposer stops the reactive subscription, removes DSK listeners and unmounts React. Removing the rulers also removes their guide overlays. For SSR, load this module only on the client after the host element exists; neither tldraw nor DSK should be initialized on the server.

For a public deployment, create `.env.local` with your tldraw public license key and rebuild:

```dotenv
VITE_TLDRAW_LICENSE_KEY=your-public-tldraw-license-key
```

No wrapper package, tldraw fork or DSK-specific rendering engine is involved. The same approach applies to your own editor: map its camera, read its selection and update its model through its public API.

## 8. Explore and download the project

Browse the complete file structure below. Each file includes its source and a short explanation. The editor files are the same ones used by the live demo, so the downloadable project stays in sync with this guide.

Download and extract the ZIP, open a terminal in `dsk-tldraw-example`, then run `npm install` and `npm run dev`. Requires Node.js 22.12+ and internet access for dependency installation. The archive includes a built DSK snapshot in `vendor`; npm installs it automatically. No [monorepo](https://github.com/Flowscape-UI/dsk) setup is needed. Use `npm run build` to check types and build the app. The tldraw deployment key described above is still required for public hosting.

<ExampleProjectViewer :project="project" />
