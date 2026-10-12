# Excalidraw + DSK

<script setup>
import { data as project } from '../.vitepress/data/excalidraw-project.data.ts';
</script>

Keep Excalidraw's hand-drawn canvas and use native DSK components around it. Excalidraw owns the scene, selection, dragging, rotation and navigation. DSK adds an external transform inspector, two rulers with guides and a comment that follows the rectangle.

<ClientOnly><EngineExample engine="excalidraw" /></ClientOnly>

The editor loads automatically with this page. Drag or rotate either shape, then edit **X**, **Y** or **Rotation** in the DSK fields. **Select rectangle** restores the first selection, **Fit** brings the scene into view and **Reset** restores the two original shapes. Pull guides from the rulers and press Delete on a focused guide to remove it. Use Excalidraw's normal canvas navigation to pan and zoom.

The scene stays in memory. Leaving the page disposes the editor; coming back creates a fresh example. The comment and guides belong to the DSK overlay. They do not become Excalidraw elements or change its snapping behavior.

## 1. Install the dependencies

Start with a Vite TypeScript application:

```sh
npm i @flowscape-ui/dsk @excalidraw/excalidraw@0.18.1 react@18.3.1 react-dom@18.3.1
npm i -D @types/react@18 @types/react-dom@18
```

React is required by Excalidraw. DSK itself remains a collection of native custom elements. The example uses `createElement`, so the files below are ordinary `.ts` files and do not require JSX.

```text
index.html
src/
  main.ts
  shared/
    engine-error-boundary.ts
    example-shell.ts
    example-shell.css
  excalidraw/
    mount-example.ts
    scene.ts
    bind-dsk.ts
    style.css
```

Excalidraw is available under the MIT license. See its [official package documentation](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation). Keep the license notices when redistributing dependencies.

## 2. Reserve a host and add the DSK controls

Add a host to `index.html`:

```html
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

The shared shell creates the inputs, rulers and comment. Its `surface` is reserved for the rendering engine. The rulers and comment use the same inner viewport origin, and the comment overlay does not intercept canvas gestures.

Save these two files in `src/shared`. They are reused unchanged by the other engine examples:

<<< @/snippets/shared/example-shell.ts

<<< @/snippets/shared/example-shell.css

The important public APIs are `ruler.target = viewport`, `.camera` on each ruler and marker, and `input.value` / `input` events on the fields. The shell skips writing the active field during a drag, so a render update does not interrupt editing.

## 3. Create an Excalidraw scene

Save this as `src/excalidraw/scene.ts`. `convertToExcalidrawElements` fills in the engine's required element metadata. Stable IDs let the comment stay attached to the rectangle while selection changes.

<<< @/snippets/excalidraw/scene.ts

The helper creates fresh elements for **Reset**. Excalidraw owns their geometry and rendering; DSK does not draw substitute shapes.

## 4. Mount the editor

Save this as `src/excalidraw/mount-example.ts`:

<<< @/snippets/excalidraw/mount-example.ts

Save the small React error boundary as `src/shared/engine-error-boundary.ts`. It reports rendering failures to the host so the documentation can replace the loading indicator with a retry button:

<<< @/snippets/shared/engine-error-boundary.ts

`excalidrawAPI` supplies the public editor API. `initialData` creates the two shapes and selects the rectangle. `autoFocus: false` prevents page loading from taking keyboard focus, and `handleKeyboardGlobally: false` keeps Excalidraw shortcuts inside its editor instead of consuming input in the external DSK controls.

The example uses zen mode to keep the scene clear while preserving Excalidraw's editing tools. The host receives `data-ready="true"` after the scene is available, allowing the documentation wrapper to remove its loading indicator.

## 5. Bind selection, transforms and camera

Save this as `src/excalidraw/bind-dsk.ts`:

<<< @/snippets/excalidraw/bind-dsk.ts

The adapter has two directions:

1. `api.onChange` reads selection and geometry, then updates the DSK inspector and overlay.
2. A DSK `input` event copies the selected element with `newElementWith` and passes the scene to `api.updateScene`. The public helper updates the element version and invalidates cached geometry.

### Coordinate conversion

Excalidraw stores scene scroll before zoom. DSK expects pan in viewport pixels:

```ts
const { scrollX, scrollY, zoom } = api.getAppState();
shell.setCamera({
  panX: scrollX * zoom.value,
  panY: scrollY * zoom.value,
  zoom: zoom.value,
});
```

Both then describe `screen = world * zoom + pan`. Do not add page scrolling or the host's position in the document. DSK already works relative to its target viewport. `getCommonBounds` gives the rectangle's rotated scene bounds, so the comment follows its lower-right corner.

### Selection and rotation

This inspector accepts one unlocked rectangle or ellipse that is outside a group or frame. Empty selection, multiple selection and other element types disable the fields. X/Y describe the element's unrotated origin; Excalidraw applies its angle around the element center. DSK uses degrees and Excalidraw uses radians, so the adapter converts between them.

Native Excalidraw selection, resizing and rotation still work. DSK field changes use `CaptureUpdateAction.IMMEDIATELY`, so they also enter Excalidraw's history. This small adapter does not combine a whole input drag into one undo step. For a product integration, group commits according to your editing workflow.

See the official [imperative API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api) for scene updates, subscriptions and camera operations.

## 6. Style, start and clean up

Save these styles as `src/excalidraw/style.css`. The engine stylesheet is imported by the mounting module; these scoped rules only adjust its accent colors.

<<< @/snippets/excalidraw/style.css

Start the example from `src/main.ts`:

```ts
import { mountExample } from './excalidraw/mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// Also call dispose() when your application removes this page.
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

Cleanup unsubscribes from scene changes, unmounts React and removes DSK listeners and guide overlays. In an SSR app, dynamically import the mounting module inside the framework's client mount hook, after the host exists, and call the returned disposer on unmount:

```ts
// Inside a client mount hook, never during server rendering.
const { mountExample } = await import('./excalidraw/mount-example.ts');
const dispose = mountExample(root);
// Register dispose with your framework's unmount hook.
```

## 7. Explore and download the project

The project below includes every file needed to run this example, including the shared shell and these exact editor sources. Select a file to inspect it or copy its contents.

Download and extract the ZIP. Open a terminal in `dsk-excalidraw-example`, then run `npm install` and `npm run dev`. Requires Node.js 22.12+ and internet access for installing dependencies. The archive includes a built DSK snapshot in `vendor`, so it does not need this [monorepo](https://github.com/Flowscape-UI/dsk). Run `npm run build` for a type check and production build.

<ExampleProjectViewer :project="project" />
