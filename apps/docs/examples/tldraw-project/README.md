# DSK + tldraw

A standalone version of the documentation example. Requires Node.js 22.12+ and npm. Internet access is needed to install React, tldraw and the development tools.

## Run

Extract the entire ZIP, including the `vendor` folder. Open a terminal in `dsk-tldraw-example` (the folder containing `package.json`):

```sh
npm install
npm run dev
```

Open the localhost URL printed by Vite. To check types and create a production build:

```sh
npm run build
npm run preview
```

## Files

- `index.html` provides the page and editor host.
- `src/main.ts` mounts the example and disposes it during hot reload.
- `src/mount-example.ts` creates the controls and tldraw editor.
- `src/bind-dsk.ts` synchronizes the camera, selection, inputs and annotation.
- `src/style.css` styles the reusable editor; `src/page.css` styles this page.
- `tsconfig.json` configures strict TypeScript and Vite's browser types.
- `.env.example` documents the optional deployment key.
- `vendor/flowscape-ui-dsk.tgz` contains the built DSK snapshot used by these docs, including its MIT license. npm installs it through the local dependency in `package.json`. No [monorepo](https://github.com/Flowscape-UI/dsk) or workspace setup is required.

## Customize

Change the initial shapes in `mount-example.ts`, the bindings in `bind-dsk.ts`, and the CSS variables in `style.css`. Set `<html lang="ru">` in `index.html` for Russian controls. Shapes and comments are not persisted across reloads.

## Deployment

tldraw has a separate SDK license: https://tldraw.dev/community/license. Local development on localhost works without a key. Public deployment requires a valid key for the deployed hostname. Copy `.env.example` to `.env.local`, set `VITE_TLDRAW_LICENSE_KEY`, then rebuild. Keep tldraw's attribution.
