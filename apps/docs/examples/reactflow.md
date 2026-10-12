# React Flow + DSK

<script setup>
import { data as project } from '../.vitepress/data/reactflow-project.data.ts';
</script>

Use the same DSK inspector, rulers and comment with a node editor. React Flow handles node selection, dragging, edges and camera navigation. Native DSK fields update the selected node's position and the rotation of its custom visual body.

<ClientOnly><EngineExample engine="reactflow" /></ClientOnly>

The editor loads automatically. Drag either node, select it and change **X**, **Y** or **Rotation**. Drag empty space to pan, use the wheel or trackpad to zoom, and choose **Fit** to see both nodes. **Select rectangle** restores the first selection; **Reset** restores the initial layout. Pull a guide from either ruler. The comment stays attached to the rectangle, including after rotation.

The edge is a real React Flow edge. This focused example keeps its two endpoints fixed and disables node deletion. Changes stay in memory and reset when you leave the page. DSK guides are visual references, not snapping constraints on React Flow nodes.

## 1. Install the dependencies

In a Vite TypeScript application:

```sh
npm i @flowscape-ui/dsk @xyflow/react@12.12.0 react@18.3.1 react-dom@18.3.1
npm i -D @types/react@18 @types/react-dom@18
```

React Flow uses React; the DSK controls remain native custom elements outside its React root. `createElement` lets us use plain TypeScript without adding JSX configuration.

```text
index.html
src/
  main.ts
  shared/
    engine-error-boundary.ts
    example-shell.ts
    example-shell.css
  reactflow/
    mount-example.ts
    shape-node.ts
    style.css
```

React Flow is MIT-licensed. This example keeps its built-in attribution. See the [official quick start](https://reactflow.dev/learn).

## 2. Create a host and the shared inspector

Add a host to `index.html`:

```html
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

Save the shared shell in `src/shared`. It creates three DSK fields, two rulers and an untransformed comment overlay. Only `shell.surface` belongs to React Flow. All overlays share the same viewport origin.

<<< @/snippets/shared/example-shell.ts

<<< @/snippets/shared/example-shell.css

The shell handles native `input` events and calls the engine adapter. Programmatic DSK value changes do not emit another input event, and the active field is not overwritten during a drag.

## 3. Define a custom node

Save this as `src/reactflow/shape-node.ts`:

<<< @/snippets/reactflow/shape-node.ts

The node model stores `position` for React Flow and `data.rotation` for our visual body. `nodeTypes` stays outside the React component, keeping its identity stable during edits. Each node provides actual React Flow `Handle` elements for the connecting edge.

### What rotation means here

React Flow's standard node position and selection box remain axis-aligned. In this example, rotation affects the node's inner visual body through CSS. Connection handles stay fixed on the outer node, so the edge does not orbit the shape when you change the angle. This is a deliberate custom-node design, not a built-in React Flow rotation property.

To rotate handles too, place them inside the rotating body and update their internals with React Flow's `useUpdateNodeInternals` after each rotation. See [custom nodes](https://reactflow.dev/learn/customization/custom-nodes) and the [rotatable node example](https://reactflow.dev/examples/nodes/rotatable-node).

## 4. Mount React Flow and connect DSK

Save this as `src/reactflow/mount-example.ts`:

<<< @/snippets/reactflow/mount-example.ts

Save the shared React error boundary as `src/shared/engine-error-boundary.ts`. It reports rendering failures to the host instead of leaving its loading indicator running:

<<< @/snippets/shared/engine-error-boundary.ts

`useNodesState` owns the node array. Canvas edits arrive through `onNodesChange`; native DSK edits call `setNodes` with a new node and a new `position` or `data` object. A ref exposes the latest nodes to native event listeners, preventing a stale React closure from editing an old selection.

Only one selected node can be edited. Empty or multiple selection disables the inspector. React effects update the displayed field values after node changes. The comment uses the rectangle's stable ID, so switching selection never moves it to the ellipse.

## 5. Keep the camera and comment aligned

React Flow and DSK use the same camera formula:

```ts
// React Flow viewport: screen = world * zoom + { x, y }
onMove(_event, { x, y, zoom }) {
  shell.setCamera({ panX: x, panY: y, zoom });
}
```

Unlike the Excalidraw and tldraw examples, no extra multiplication is needed. React Flow's viewport X/Y are already measured in screen pixels. The adapter also reads `getViewport()` inside `onInit`, so the rulers have a camera before the first gesture.

The rectangle body is 180 × 120 pixels. Its comment anchor is the lower-right corner of the rotated body's axis-aligned bounds:

```ts
const radians = (rotation * Math.PI) / 180;
const halfWidth =
  90 * Math.abs(Math.cos(radians)) + 60 * Math.abs(Math.sin(radians));
const halfHeight =
  90 * Math.abs(Math.sin(radians)) + 60 * Math.abs(Math.cos(radians));
shell.setMarker(x + 90 + halfWidth, y + 60 + halfHeight);
```

The marker receives world coordinates. Its own `.camera` performs the screen projection, so do not apply another camera transform to the overlay.

## 6. Add styles, start and clean up

Save this as `src/reactflow/style.css`. All rules are scoped to the example. React Flow's required base stylesheet is imported separately in the mounting module.

<<< @/snippets/reactflow/style.css

Start from `src/main.ts`:

```ts
import { mountExample } from './reactflow/mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// Also call dispose() when your application removes this page.
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

Unmounting React releases the engine and its effects. Destroying the shell removes DSK event listeners, ruler targets and overlays. In an SSR app, import and mount this module from the client lifecycle after the host is available:

```ts
// Inside a client mount hook, never during server rendering.
const { mountExample } = await import('./reactflow/mount-example.ts');
const dispose = mountExample(root);
// Register dispose with your framework's unmount hook.
```

The documentation follows that same rule: it starts the import automatically when the page mounts and shows a loading indicator while the engine initializes.

## 7. Explore and download the project

Browse the actual demo sources and configuration below. The ZIP includes the shared shell and a built DSK snapshot in `vendor`.

Extract it, open a terminal in `dsk-reactflow-example`, then run `npm install` and `npm run dev`. Requires Node.js 22.12+ and internet access for dependency installation. Run `npm run build` to check types and produce a standalone app. No [monorepo](https://github.com/Flowscape-UI/dsk) or additional backend is required.

<ExampleProjectViewer :project="project" />
