# Installation

Choose your stack and connect your first DSK component. The same package works in Vanilla, React, Vue, Svelte, and Angular through standard web components.

## Install the package

Run this command in your application directory:

::: code-group

```sh [npm]
npm i @flowscape-ui/dsk
```

```sh [pnpm]
pnpm add @flowscape-ui/dsk
```

```sh [yarn]
yarn add @flowscape-ui/dsk
```

:::

## Use a plain script without a bundler

The browser build registers the same components and exposes the library as `window.DSK`. Load the stylesheet separately. This example pins the package version so a later release cannot silently change your page:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@flowscape-ui/dsk@1.0.0/dist/styles.css"
    />
    <script
      defer
      src="https://cdn.jsdelivr.net/npm/@flowscape-ui/dsk@1.0.0/dist/dsk.global.js"
    ></script>
  </head>
  <body>
    <dsk-input aria-label="Width" value="160" min="0"></dsk-input>
  </body>
</html>
```

Use either the ESM import or the global script on a page, not both. The global build includes the page eyedropper renderer; ESM loads that renderer only when needed. For self-hosting, copy `dist/dsk.global.js` and `dist/styles.css` to your own public assets directory and replace the two URLs.

## Choose your stack

These examples target an existing client-rendered application with npm imports handled by a bundler such as Vite. Vanilla needs a `<div id="app"></div>` container and the `src/main.ts` module loaded by the page. The other tabs show the application's root component.

Each example creates a width field and displays its current value. Type or drag the field to see the value update. These are direct web-component integrations; no framework wrapper package is required.

<div class="dsk-framework-code">

::: code-group

```ts [Vanilla]
// src/main.ts
import '@flowscape-ui/dsk';

const field = document.createElement('dsk-input');
field.setAttribute('aria-label', 'Width');
field.min = 0;
field.value = 160;

const output = document.createElement('output');
output.textContent = String(field.value);
field.addEventListener('input', () => {
  output.textContent = String(field.value);
});

document.querySelector('#app')!.append(field, output);
```

```tsx [React]
// src/App.tsx (React 19+)
import '@flowscape-ui/dsk';
import { useState, type HTMLAttributes, type DetailedHTMLProps } from 'react';
import type { DskInput } from '@flowscape-ui/dsk';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-input': DetailedHTMLProps<HTMLAttributes<DskInput>, DskInput> & {
        value?: number;
        min?: number;
      };
    }
  }
}

export default function App() {
  const [width, setWidth] = useState(160);
  return (
    <>
      <dsk-input
        aria-label="Width"
        min={0}
        value={160}
        onInput={(event) => setWidth(Number(event.currentTarget.value))}
      ></dsk-input>
      <output>{width}</output>
    </>
  );
}
```

```vue [Vue]
<!-- src/App.vue (Vue 3) -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
import { ref } from 'vue';
import type { DskInput } from '@flowscape-ui/dsk';

const width = ref(160);
function updateWidth(event: Event) {
  width.value = Number((event.currentTarget as DskInput).value);
}
</script>

<template>
  <dsk-input
    aria-label="Width"
    min="0"
    :value.prop="width"
    @input="updateWidth"
  ></dsk-input>
  <output>{{ width }}</output>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte (Svelte 5) -->
<script lang="ts">
  import '@flowscape-ui/dsk';
  import type { DskInput } from '@flowscape-ui/dsk';

  let width = $state(160);
  function updateWidth(event: Event) {
    width = Number((event.currentTarget as DskInput).value);
  }
</script>

<dsk-input
  aria-label="Width"
  min="0"
  value={width}
  oninput={updateWidth}
></dsk-input>
<output>{width}</output>
```

```ts [Angular]
// src/app/app.ts (standalone component)
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import type { DskInput } from '@flowscape-ui/dsk';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-input
      aria-label="Width"
      min="0"
      [value]="width()"
      (input)="updateWidth($event)"
    ></dsk-input>
    <output>{{ width() }}</output>
  `,
})
export class App {
  readonly width = signal(160);
  updateWidth(event: Event): void {
    this.width.set(Number((event.currentTarget as DskInput).value));
  }
}
```

:::

</div>

### Additional Vue configuration

Add `isCustomElement` to your existing Vite configuration, preserving the other settings. This tells Vue to treat `dsk-*` tags as HTML elements. For Nuxt, set the same option through `vue.compilerOptions` in its configuration. [Vue documentation](https://vuejs.org/guide/extras/web-components.html).

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('dsk-'),
        },
      },
    }),
  ],
});
```

## Server-rendered applications

The server renders the page and a placeholder. The DSK control is created in the browser after the package loads. The rest of the page keeps SSR, and the initial markup stays consistent during hydration.

Install `@flowscape-ui/dsk` using the command above, then choose your project's recipe. Tabs within each recipe are **separate files or commands**: use every listed file, not just the active tab. The framework recipes assume an existing SSR application.

**Remove static `import '@flowscape-ui/dsk'` statements from server-executed files**, including shared modules and entry points. These recipes replace them with a browser-side dynamic import. Top-level `import type` declarations are safe because compilation removes them.

### Vanilla: server-generated HTML

1. Add the first tab's markup to your server template.
2. Create `src/dsk-client.ts` as a browser-only entry. Do not import it from server code.
3. Run the third tab's build commands. This example uses esbuild to bundle npm dependencies and TypeScript into browser JavaScript and emit an adjacent CSS file.
4. Configure your server to serve `public` as static files, so `/assets/dsk-client.js` and `/assets/dsk-client.css` resolve. Run this build during deployment after installing dependencies.

::: code-group

```html [server template]
<section aria-label="Object inspector">
  <div id="dsk-inspector"><p role="status">Loading controls…</p></div>
</section>
<link rel="stylesheet" href="/assets/dsk-client.css" />
<script type="module" src="/assets/dsk-client.js"></script>
```

```ts [src/dsk-client.ts]
const host = document.querySelector<HTMLElement>('#dsk-inspector');

async function mount(): Promise<void> {
  if (!host) return;
  try {
    await import('@flowscape-ui/dsk');
    if (!host.isConnected) return;
    const field = document.createElement('dsk-input');
    field.setAttribute('aria-label', 'Width');
    field.value = 160;
    field.min = 0;
    const output = document.createElement('output');
    output.textContent = '160';
    field.addEventListener('input', () => {
      output.textContent = String(field.value);
    });
    host.replaceChildren(field, output);
  } catch {
    host.textContent = 'Could not load controls. Reload the page to retry.';
  }
}

void mount();
```

```sh [build browser entry]
npm install --save-dev esbuild
npx esbuild src/dsk-client.ts --bundle --format=esm --outfile=public/assets/dsk-client.js
```

:::

### React: Next.js App Router

For Next.js App Router with React 19+, use three files:

1. Create `app/components/dsk-width.tsx` as a Client Component. `useEffect` loads DSK after mounting; the server and initial browser render show the same placeholder.
2. Add `types/dsk.d.ts` for JSX types. Ensure `tsconfig.json` includes it; the standard Next.js template includes `**/*.ts`. If you already declared the tag in the earlier example, move that declaration here instead of duplicating it.
3. Render the component in `app/page.tsx`. The page remains a Server Component. Keep the existing `app/layout.tsx`. If your project uses `src`, put `app` and `types` under it.

::: code-group

```tsx [app/components/dsk-width.tsx]
'use client';

import { useEffect, useState } from 'react';

export default function DskWidth() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [width, setWidth] = useState(160);

  useEffect(() => {
    let active = true;
    void import('@flowscape-ui/dsk').then(
      () => {
        if (active) setStatus('ready');
      },
      () => {
        if (active) setStatus('error');
      },
    );
    return () => {
      active = false;
    };
  }, []);

  if (status !== 'ready') {
    return (
      <p role="status">
        {status === 'error'
          ? 'Could not load controls. Reload the page to retry.'
          : 'Loading controls…'}
      </p>
    );
  }

  return (
    <>
      <dsk-input
        aria-label="Width"
        min={0}
        value={160}
        onInput={(event) => setWidth(Number(event.currentTarget.value))}
      ></dsk-input>
      <output>{width}</output>
    </>
  );
}
```

```ts [types/dsk.d.ts]
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { DskInput } from '@flowscape-ui/dsk';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-input': DetailedHTMLProps<HTMLAttributes<DskInput>, DskInput> & {
        value?: number;
        min?: number;
      };
    }
  }
}
```

```tsx [app/page.tsx]
import DskWidth from './components/dsk-width';

export default function Page() {
  return (
    <main>
      <h1>Object inspector</h1>
      <DskWidth />
    </main>
  );
}
```

:::

`'use client'` establishes a client boundary, but Next.js can still prerender the component on the server. That is why DSK is imported inside `useEffect`. The `active` flag prevents state updates after unmounting. [Next.js documentation](https://nextjs.org/docs/app/getting-started/server-and-client-components).

### Vue: Nuxt

1. Merge `vue.compilerOptions.isCustomElement` into your existing `nuxt.config.ts`.
2. Create `app/components/DskWidth.vue`. `onMounted` imports DSK, and `v-if` prevents the control from rendering until registration finishes.
3. Use it in `app/pages/index.vue`. If you have a custom `app/app.vue`, it must render `<NuxtPage />` for pages.

These paths follow Nuxt 4. In a standard Nuxt 3 layout, use `components/` and `pages/` without the `app/` prefix. Keep `nuxt.config.ts` at the project root.

::: code-group

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag.startsWith('dsk-'),
    },
  },
});
```

```vue [app/components/DskWidth.vue]
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import type { DskInput } from '@flowscape-ui/dsk';

const status = ref<'loading' | 'ready' | 'error'>('loading');
const width = ref(160);
let active = true;
onUnmounted(() => {
  active = false;
});

onMounted(() => {
  void import('@flowscape-ui/dsk').then(
    () => {
      if (active) status.value = 'ready';
    },
    () => {
      if (active) status.value = 'error';
    },
  );
});

function updateWidth(event: Event): void {
  width.value = Number((event.currentTarget as DskInput).value);
}
</script>

<template>
  <div v-if="status === 'ready'">
    <dsk-input
      aria-label="Width"
      min="0"
      :value.prop="width"
      @input="updateWidth"
    ></dsk-input>
    <output>{{ width }}</output>
  </div>
  <p v-else role="status">
    {{
      status === 'error'
        ? 'Could not load controls. Reload the page to retry.'
        : 'Loading controls…'
    }}
  </p>
</template>
```

```vue [app/pages/index.vue]
<script setup lang="ts">
import DskWidth from '../components/DskWidth.vue';
</script>

<template>
  <main>
    <h1>Object inspector</h1>
    <DskWidth />
  </main>
</template>
```

:::

SSR stays enabled; this recipe needs no client plugin. `onMounted` and conditional rendering control when the element is created. The same component works in a custom Vue SSR application; configure the Vue compiler's `isCustomElement` as in the Vite example above instead of using Nuxt configuration. [Vue lifecycle documentation](https://vuejs.org/api/composition-api-lifecycle.html#onmounted).

### Svelte: SvelteKit

1. Create `src/lib/DskWidth.svelte`.
2. Render it in `src/routes/+page.svelte` or your chosen route.
3. Keep SSR enabled: do not add `ssr = false` to `+page.ts` or `+layout.ts`. This example uses Svelte 5.

::: code-group

```svelte [src/lib/DskWidth.svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import type { DskInput } from '@flowscape-ui/dsk';

  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let width = $state(160);

  onMount(() => {
    let active = true;
    void import('@flowscape-ui/dsk').then(
      () => { if (active) status = 'ready'; },
      () => { if (active) status = 'error'; },
    );
    return () => { active = false; };
  });

  function updateWidth(event: Event): void {
    width = Number((event.currentTarget as DskInput).value);
  }
</script>

{#if status === 'ready'}
  <dsk-input
    aria-label="Width"
    min="0"
    value={width}
    oninput={updateWidth}
  ></dsk-input>
  <output>{width}</output>
{:else}
  <p role="status">{status === 'error'
    ? 'Could not load controls. Reload the page to retry.'
    : 'Loading controls…'}</p>
{/if}
```

```svelte [src/routes/+page.svelte]
<script lang="ts">
  import DskWidth from '$lib/DskWidth.svelte';
</script>

<h1>Object inspector</h1>
<DskWidth />
```

:::

`onMount` does not run on the server. Its callback stays synchronous so it can return cleanup; only the package import is asynchronous. This avoids state updates if the user leaves before loading finishes. [Svelte documentation](https://svelte.dev/docs/svelte/lifecycle-hooks#onMount).

### Angular SSR

For an Angular 20+ standalone application with SSR already configured:

1. Create `src/app/dsk-width.ts`. `afterNextRender` starts loading only in the browser, while `@if` preserves the placeholder until the import resolves.
2. Add `DskWidth` to the consuming component's `imports` and render `<app-dsk-width />`. The second tab shows a minimal root component; preserve your application's existing routes and other imports.
3. Keep your server entry point, hydration configuration, and `app.config.server.ts`. If your root component is named `AppComponent` in `app.component.ts`, retain that name and path.

::: code-group

```ts [src/app/dsk-width.ts]
import {
  afterNextRender,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import type { DskInput } from '@flowscape-ui/dsk';

@Component({
  selector: 'app-dsk-width',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (status() === 'ready') {
      <dsk-input
        aria-label="Width"
        min="0"
        [value]="width()"
        (input)="updateWidth($event)"
      ></dsk-input>
      <output>{{ width() }}</output>
    } @else {
      <p role="status">
        {{
          status() === 'error'
            ? 'Could not load controls. Reload the page to retry.'
            : 'Loading controls…'
        }}
      </p>
    }
  `,
})
export class DskWidth {
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly width = signal(160);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      void import('@flowscape-ui/dsk').then(
        () => {
          if (!this.destroyRef.destroyed) this.status.set('ready');
        },
        () => {
          if (!this.destroyRef.destroyed) this.status.set('error');
        },
      );
    });
  }

  updateWidth(event: Event): void {
    this.width.set(Number((event.currentTarget as DskInput).value));
  }
}
```

```ts [src/app/app.ts]
import { Component } from '@angular/core';
import { DskWidth } from './dsk-width';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DskWidth],
  template: `<h1>Object inspector</h1>
    <app-dsk-width />`,
})
export class App {}
```

:::

`CUSTOM_ELEMENTS_SCHEMA` belongs on the component containing `dsk-input`, not on every component in the application. Signals refresh the template after loading and edits; `DestroyRef` prevents updates to a destroyed component. [Angular: afterNextRender](https://angular.dev/api/core/afterNextRender).

### Verify the integration

Run your application's production build and SSR server. Open the page directly and refresh: a placeholder should appear first, followed by a field with value `160`. Editing it should update the adjacent number. Server logs should contain no `window is not defined` or `HTMLElement is not defined` errors, and the browser should show no hydration mismatch warnings.

If package loading fails, these examples show a message asking the user to reload. Registration finishes before the successful import handler runs, so no extra `customElements.whenDefined` call is needed here.

## Values and events

- `input` reports live edits; `change` reports committed edits.
- Read the component's value property. Programmatic assignments update the UI without redispatching user-edit events.
- Use properties for arrays, objects, and callbacks after element registration. Ruler highlight ranges are one example.
- In ordinary HTML, include closing tags: `<dsk-input></dsk-input>`.

The React example declares JSX types for the demonstrated tag; extend that declaration with the appropriate properties when adding other controls. Its stable `value={160}` initializes the field, while React mirrors `input` events in the output. Let DSK own the editable draft: writing every draft back through the value property can normalize it before Enter or blur and leave the output out of sync. Angular's `CUSTOM_ELEMENTS_SCHEMA` allows custom elements in the template. [React custom elements](https://react.dev/reference/react-dom/components#custom-html-elements), [Angular schemas](https://angular.dev/api/core/CUSTOM_ELEMENTS_SCHEMA).

## Styling

Components include their own base styles. Customize them with CSS variables on the element or a parent container:

```css
dsk-input {
  --dsk-input-width: 260px;
  --dsk-input-background: #202329;
  --dsk-input-color: #f0f1f3;
  --dsk-input-border: 1px solid #373d47;
  --dsk-input-focus-color: #ff007a;
}
```

The optional `@flowscape-ui/dsk/styles.css` import provides the shared `.dsk-theme` utility. See [Styling and themes](/guide/styling) for individual control customization.

Continue with [Inputs and groups](/components/inputs), or choose a component from the [DSK overview](/guide/introduction).
