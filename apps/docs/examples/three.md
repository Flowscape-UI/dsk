# Three.js + DSK

<script setup>
import { data as project } from '../.vitepress/data/three-project.data.ts';
</script>

Use the same DSK inspector with a real 3D scene. Three.js owns the meshes, lighting, raycasting and camera. DSK supplies the X/Y and rotation inputs, rulers, guides and a comment marker. The example uses an orthographic camera so the 2D rulers have a precise relationship with the scene.

<ClientOnly><EngineExample engine="three" /></ClientOnly>

The scene loads with the page. Drag either object to select and move it, or edit its values in the inspector. Drag empty space to pan; hold Shift to pan from an object. After clicking the scene, use the wheel to zoom around the pointer. **Fit** brings both objects into view and **Reset** restores the original scene. Pull guides from the rulers; select a guide and press Delete to remove it.

With the canvas focused, arrow keys move the selection by one unit, Shift + arrow by ten, `+`/`-` zoom, `F` fits the scene and Escape clears the selection. The page scrolls normally until the canvas receives focus. All edits stay in memory. This example needs WebGL support.

## 1. Install the dependencies

In a Vite TypeScript app:

```sh
npm i @flowscape-ui/dsk three@0.186.1
npm i -D @types/three@0.186.0
```

Three.js does not require a UI framework. The adapter uses native DOM elements and TypeScript. Its reusable shell is also used in the other real-world examples.

```text
index.html
src/
  main.ts
  shared/
    example-shell.ts
    example-shell.css
  three/
    mount-example.ts
    style.css
```

## 2. Create the host and start the scene

```html
<!-- index.html -->
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

```ts
// src/main.ts
import { mountExample } from './three/mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// Call dispose() when your route or component unmounts.
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

The full files are in the project viewer below. The shell creates three DSK fields above a 420px viewport, places the rulers outside the renderer and adds a separate DOM overlay for the marker. Mount Three.js only into `shell.surface`; it must not replace the inspector or rulers.

## 3. Add meshes to a real scene

The main file creates a `WebGLRenderer`, a scene, an orthographic camera and two objects. Each object has an outer group for the editable transform and an inner mesh for its fixed 3D tilt:

```ts
// Inside src/three/mount-example.ts
const box = new Group();
const boxMesh = new Mesh(
  new BoxGeometry(160, 110, 50),
  new MeshStandardMaterial({ color: '#ff0073', roughness: 0.38 }),
);
boxMesh.rotation.set(0.3, -0.36, 0);
box.add(boxMesh);
box.position.set(150, -130, 0);
scene.add(box);
```

The mesh tilt makes the box's depth visible. Changing the inspector's rotation rotates the outer group around the screen's Z axis, keeping that tilt intact. A white `BoxHelper` indicates the selected group. Three.js [cameras](https://threejs.org/manual/en/cameras.html) determine the projection; DSK does not render the objects.

## 4. Map the camera to the rulers

Three.js normally uses upward-positive Y. This inspector uses downward-positive Y, like the other editor examples. The camera looks straight down the Z axis, so the mapping is exact:

```ts
// centerX / centerY use the inspector's downward-positive Y coordinates.
camera.position.set(centerX, -centerY, 1000);
camera.lookAt(centerX, -centerY, 0);
camera.zoom = zoom;
camera.updateProjectionMatrix();

shell.setCamera({
  panX: width / 2 - centerX * zoom,
  panY: height / 2 - centerY * zoom,
  zoom,
});
```

At zoom 1, one scene unit occupies one CSS pixel. A point `(x, y)` from the inspector appears at `(x * zoom + panX, y * zoom + panY)` inside the viewport. Width and height refer to that viewport, excluding the rulers and toolbar. Device pixel ratio affects the render buffer, not the ruler coordinates.

::: info Orthographic projection is deliberate
The camera stays perpendicular to the XY plane. Objects can have depth and lighting, but perspective and camera orbit are not enabled. A perspective or orbit camera cannot be described by a single 2D pan/zoom for all depths. For that design, project marker anchors with `Vector3.project(camera)` and define which work plane the rulers measure.
:::

## 5. Connect selection and DSK inputs

The shell listens to native DSK `input` events. Updating a selected group is a small coordinate conversion:

```ts
shell.onTransform((field, value) => {
  if (!selected || !Number.isFinite(value)) return;
  if (field === 'x') selected.position.x = value;
  if (field === 'y') selected.position.y = -value;
  if (field === 'rotation') selected.rotation.z = (-value * Math.PI) / 180;
  render();
});
```

The reverse path runs after each scene change:

```ts
shell.setSelection(
  selected
    ? {
        name: selected.name,
        x: selected.position.x,
        y: -selected.position.y,
        rotation: (-selected.rotation.z * 180) / Math.PI,
      }
    : null,
);
```

X/Y represent the group's center, not the top-left of its visible bounds. Rotation uses clockwise degrees in the inspector and radians in Three.js. Empty selection disables the fields. Programmatic DSK assignments are silent, and the shell avoids rewriting an input during its active edit.

On pointer down, `Raycaster.setFromCamera` tests the pointer against the real meshes. The matching group becomes selected. Pointer capture keeps dragging active when the pointer leaves the canvas; release and cancellation stop it. Keyboard movement changes the same object properties. See the [raycasting and picking guide](https://threejs.org/manual/en/picking.html).

## 6. Anchor the comment and keep rendering efficient

The comment always follows the pink box, including when the purple object is selected:

```ts
scene.updateMatrixWorld(true);
const bounds = new Box3().setFromObject(box);
shell.setMarker(bounds.max.x, -bounds.min.y);
```

For this front-facing orthographic camera, the world bounding box's rightmost and lowest coordinates give a stable projected anchor. The marker is a DOM annotation supplied by DSK; it is not a mesh. Guides are visual references and do not snap Three.js objects.

Rendering happens only after a transform, camera change or resize. There is no permanent animation loop. `ResizeObserver` keeps the render buffer and camera frustum aligned with the host. The pixel ratio is capped at 2 to bound the GPU buffer size.

## 7. Clean up and integrate into an application

The returned disposer disconnects the resize observer, aborts pointer and keyboard listeners, disposes geometries and materials, releases the renderer and WebGL context, then removes the DSK shell. Three.js GPU resources need explicit cleanup even after their canvas leaves the DOM. See the [resource cleanup guide](https://threejs.org/manual/en/cleanup.html).

For SSR, import and mount this module only after the client host exists:

```ts
// Run inside your framework's client mount hook.
const { mountExample } = await import('./three/mount-example.ts');
const dispose = mountExample(host);
// Register dispose with that component's unmount hook.
```

The example supplies basic selection and transforms, not a full 3D editor or undo history. You can keep the same DSK shell while adding your own document model, transform tools or persistence.

## 8. Explore and download the project

Browse the actual source files below, including the shared shell and the complete Three.js adapter. Download the ZIP, extract it, open a terminal in `dsk-three-example`, then run `npm install` and `npm run dev`. Use `npm run build` to check types and create a production build.

Requires Node.js 22.12+ and internet access to install dependencies. The archive includes a built DSK snapshot in `vendor`, so it runs independently of the DSK [repository](https://github.com/Flowscape-UI/dsk). Three.js is available under the [MIT license](https://github.com/mrdoob/three.js/blob/dev/LICENSE).

<ExampleProjectViewer :project="project" />
