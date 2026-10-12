# Подключение

Выберите свой стек и подключите первый компонент DSK. Один пакет работает в Vanilla, React, Vue, Svelte и Angular через стандартные веб-компоненты.

## Установите пакет

Выполните команду в папке своего приложения:

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

## Обычный script без сборщика

Браузерная сборка регистрирует те же компоненты и предоставляет библиотеку через `window.DSK`. Стили подключаются отдельно. В примере зафиксирована версия пакета, чтобы следующий релиз не изменил страницу без вашего участия:

```html
<!doctype html>
<html lang="ru">
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
    <dsk-input aria-label="Ширина" value="160" min="0"></dsk-input>
  </body>
</html>
```

На одной странице используйте либо ESM-импорт, либо глобальный скрипт. Глобальная сборка включает рендерер пипетки для страницы, а ESM загружает его только при необходимости. Для размещения на своём сервере скопируйте `dist/dsk.global.js` и `dist/styles.css` в папку публичных ресурсов и замените два адреса в примере.

## Выберите свой стек

Примеры рассчитаны на существующее клиентское приложение с обработкой npm-импортов через сборщик, например Vite. Для Vanilla нужен контейнер `<div id="app"></div>` и подключённый модуль `src/main.ts`. В остальных вкладках показан корневой компонент приложения.

Каждый пример создаёт поле ширины и отображает его текущее значение. Измените поле вводом или перетаскиванием, чтобы увидеть обновление. Это прямое использование веб-компонентов DSK; отдельные пакеты-обёртки для фреймворков не нужны.

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

### Дополнительная настройка Vue

Добавьте `isCustomElement` в существующую конфигурацию Vite, сохранив остальные настройки. Так Vue будет воспринимать теги `dsk-*` как HTML-элементы. Для Nuxt задайте тот же параметр через `vue.compilerOptions` в его конфигурации. [Документация Vue](https://vuejs.org/guide/extras/web-components.html).

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

## Приложения с SSR

На сервере отрисовывается страница и заглушка, а сам DSK-контрол создаётся в браузере после загрузки пакета. Это сохраняет SSR для остальной страницы и одинаковую начальную разметку при гидратации.

Сначала установите `@flowscape-ui/dsk` командой выше. Затем выберите рецепт для своего проекта. Вкладки внутри каждого рецепта – **отдельные файлы или команды**: нужны все показанные файлы, а не только активная вкладка. Примеры рассчитаны на уже созданное SSR-приложение соответствующего фреймворка.

**Удалите статический `import '@flowscape-ui/dsk'` из файлов, которые выполняются на сервере**, включая общие модули и точку входа. В рецептах ниже он заменён динамическим импортом в браузере. `import type` безопасен на верхнем уровне, поскольку удаляется при компиляции.

### Vanilla: HTML от сервера

1. Добавьте разметку из первой вкладки в шаблон своего сервера.
2. Создайте `src/dsk-client.ts`. Это только браузерная точка входа; не импортируйте её из серверного кода.
3. Выполните команды сборки из третьей вкладки. Здесь esbuild собирает npm-зависимости и TypeScript в браузерный JavaScript и создаёт соседний CSS-файл.
4. Настройте свой сервер на раздачу папки `public` как статических файлов: URL `/assets/dsk-client.js` и `/assets/dsk-client.css` должны открываться. Запускайте эту сборку при развёртывании после установки зависимостей.

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

Для Next.js с App Router и React 19+ нужны три файла:

1. Создайте клиентский компонент `app/components/dsk-width.tsx`. `useEffect` загружает DSK после монтирования; до этого сервер и браузер показывают одинаковую заглушку.
2. Добавьте `types/dsk.d.ts` для JSX-типов. Убедитесь, что `tsconfig.json` включает этот файл; стандартный шаблон Next.js включает `**/*.ts`. Если тип тега уже объявлен в примере выше, перенесите объявление сюда, не дублируйте его.
3. Подключите компонент в `app/page.tsx`. Страница остаётся серверным компонентом. Существующий `app/layout.tsx` менять не нужно. Если проект использует папку `src`, поместите `app` и `types` внутри неё.

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

Директива `'use client'` задаёт границу клиентского компонента, но Next.js всё ещё может предварительно отрисовывать его на сервере. Поэтому импорт DSK находится именно в `useEffect`. При уходе со страницы флаг `active` предотвращает обновление состояния после размонтирования. [Документация Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components).

### Vue: Nuxt

1. Добавьте `vue.compilerOptions.isCustomElement` в существующий `nuxt.config.ts`, сохранив остальные настройки.
2. Создайте `app/components/DskWidth.vue`. Импорт DSK выполняется в `onMounted`, а `v-if` не создаёт контрол до завершения регистрации.
3. Подключите компонент в `app/pages/index.vue`. Если у вас собственный `app/app.vue`, он должен выводить `<NuxtPage />` для страниц.

Пути ниже соответствуют Nuxt 4. В стандартной структуре Nuxt 3 используйте `components/` и `pages/` без префикса `app/`. `nuxt.config.ts` остаётся в корне.

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

SSR остаётся включённым; отдельный клиентский плагин для этого рецепта не нужен. `onMounted` и условный вывод контролируют момент создания элемента. Тот же компонент подходит для собственного Vue SSR-приложения; вместо Nuxt-конфига настройте `isCustomElement` в компиляторе Vue, как в примере Vite выше. [Жизненный цикл Vue](https://vuejs.org/api/composition-api-lifecycle.html#onmounted).

### Svelte: SvelteKit

1. Создайте `src/lib/DskWidth.svelte`.
2. Подключите его в `src/routes/+page.svelte` или на нужном маршруте.
3. Сохраните SSR включённым: добавлять `ssr = false` в `+page.ts` или `+layout.ts` не нужно. Пример использует Svelte 5.

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

`onMount` не выполняется на сервере. Его колбэк здесь синхронный и возвращает функцию очистки; асинхронно выполняется только загрузка пакета. Это позволяет не обновлять состояние, если пользователь уйдёт со страницы до завершения загрузки. [Документация Svelte](https://svelte.dev/docs/svelte/lifecycle-hooks#onMount).

### Angular SSR

Для standalone-приложения Angular 20+ с уже настроенным SSR:

1. Создайте `src/app/dsk-width.ts`. `afterNextRender` запускает загрузку только в браузере, а `@if` сохраняет заглушку до завершения импорта.
2. Добавьте `DskWidth` в `imports` компонента, который его отображает, и вставьте `<app-dsk-width />` в шаблон. Во второй вкладке показан минимальный корневой компонент; сохраните существующие маршруты и остальные импорты своего приложения.
3. Не меняйте серверную точку входа, настройки гидратации и `app.config.server.ts`. Если ваш корневой компонент называется `AppComponent` и находится в `app.component.ts`, сохраните эти имя и путь.

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

`CUSTOM_ELEMENTS_SCHEMA` нужен в компоненте с тегом `dsk-input`, а не во всех компонентах приложения. Signals обновляют шаблон после загрузки и редактирования; `DestroyRef` защищает от обновления уже уничтоженного компонента. [Angular: afterNextRender](https://angular.dev/api/core/afterNextRender).

### Как проверить подключение

Запустите production-сборку и SSR-сервер вашего приложения. Откройте страницу прямым переходом и обновите её: сначала должна появиться заглушка, затем поле со значением `160`. Изменение поля должно обновлять число рядом. В серверном логе не должно быть ошибок `window is not defined` или `HTMLElement is not defined`, а в браузере – предупреждений о несовпадении разметки при гидратации.

Если загрузка пакета завершится ошибкой, примеры покажут сообщение с предложением перезагрузить страницу. Регистрация завершена к моменту выполнения обработчика успешного импорта; дополнительный `customElements.whenDefined` здесь не требуется.

## Значения и события

- `input` сообщает об изменении во время взаимодействия; `change` – о подтверждённом изменении.
- Читайте значение через свойство компонента. Программные присваивания обновляют интерфейс без повторной отправки пользовательских событий.
- Для массивов, объектов и функций используйте свойства после регистрации элемента. Например, так можно передать диапазоны выделения линейки.
- В обычном HTML пишите закрывающие теги: `<dsk-input></dsk-input>`.

В React-примере объявление JSX добавляет типы для показанного тега; при подключении других компонентов расширяйте его их свойствами. Постоянное `value={160}` задаёт начальное значение поля, а React отображает события `input` в выводе. Редактируемым значением управляет DSK: обратная запись каждого промежуточного ввода через свойство value может нормализовать его до Enter или потери фокуса и рассинхронизировать вывод. В Angular `CUSTOM_ELEMENTS_SCHEMA` разрешает пользовательские элементы в шаблоне. [React о custom elements](https://react.dev/reference/react-dom/components#custom-html-elements), [Angular о схемах](https://angular.dev/api/core/CUSTOM_ELEMENTS_SCHEMA).

## Оформление

Компоненты содержат собственные базовые стили. Для их изменения задайте CSS-переменные на элементе или родительском контейнере:

```css
dsk-input {
  --dsk-input-width: 260px;
  --dsk-input-background: #202329;
  --dsk-input-color: #f0f1f3;
  --dsk-input-border: 1px solid #373d47;
  --dsk-input-focus-color: #ff007a;
}
```

Необязательный импорт `@flowscape-ui/dsk/styles.css` предоставляет общую утилиту `.dsk-theme`. Настройка конкретных контролов описана в разделе [«Стили и темы»](/ru/guide/styling).

Продолжите с [полями и группами](/ru/components/inputs) или выберите нужный компонент в [обзоре DSK](/ru/guide/introduction).
