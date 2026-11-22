# Док-панели

Переносите HTML-панели между собственными зонами. DSK не навязывает четыре края экрана, сетку или оформление. `dsk-dock` управляет взаимодействием, `dsk-dock-zone` обозначает место назначения, `dsk-dock-item` содержит панель. Всем тегам нужны закрывающие теги.

## Добавьте две зоны

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-dock class="workspace">
  <dsk-dock-zone id="left" aria-label="Слева">
    <dsk-dock-item id="inspector" aria-label="Инспектор">
      <button type="button" data-dsk-dock-handle>Перенести инспектор</button>
      <label>Название <input value="Прямоугольник" /></label>
    </dsk-dock-item>
  </dsk-dock-zone>
  <dsk-dock-zone id="right" aria-label="Справа"></dsk-dock-zone>
</dsk-dock>
```

```css
.workspace {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.workspace dsk-dock-zone {
  min-height: 120px;
  padding: 12px;
  border: 1px dashed #555;
}
.workspace dsk-dock-item {
  background: #252128;
  color: white;
  padding: 12px;
}
.workspace [data-dsk-dock-handle] {
  cursor: grab;
}
.workspace dsk-dock-zone[data-drag-over] {
  background: #321728;
  border-color: #ff007a;
}
```

<ClientOnly><EditorExample kind="dock" /></ClientOnly>

Используйте обычную кнопку как ручку: она поддерживает фокус и доступное название. Стили пакета устанавливают ручкам `touch-action: none`. Содержимое вне ручки сохраняет обычное взаимодействие. При переносе существующий элемент добавляется в конец зоны, его DOM и значения полей сохраняются. В зоне может быть несколько панелей. DSK не создаёт вкладки, не меняет размер панелей, не сортирует элементы внутри зоны и не сохраняет раскладку автоматически.

## Пустые зоны поверх интерфейса

Селектор `:has(> dsk-dock-item)` различает занятые и пустые зоны. Пустые зоны позиционируются абсолютно и появляются только при наличии `data-dragging` у dock. Занятые зоны остаются в обычном потоке. Сам контейнер должен иметь размеры, например от холста редактора.

```css
.workspace {
  position: relative;
  display: block;
  min-height: 220px;
}
.workspace dsk-dock-zone:has(> dsk-dock-item) {
  min-height: 0;
  padding: 0;
  border: 0;
}
.workspace dsk-dock-zone:not(:has(> dsk-dock-item)) {
  display: none;
  position: absolute;
  top: 12px;
  width: 30%;
  min-height: 100px;
  z-index: 2;
  background: #252128;
}
.workspace #left:not(:has(> dsk-dock-item)) {
  left: 12px;
}
.workspace #right:not(:has(> dsk-dock-item)) {
  right: 12px;
}
.workspace[data-dragging] dsk-dock-zone:not(:has(> dsk-dock-item)) {
  display: block;
}
```

<ClientOnly><EditorExample kind="dock" variant="overlay" /></ClientOnly>

Новые зоны обнаруживаются автоматически, регистрация не нужна. Их можно размещать внутри обёрток в пределах одного dock. Вложенные dock управляют только своими элементами. Зона назначения должна быть видимой и доступной во время сброса и не может находиться внутри переносимой панели. Для перекрывающихся зон задайте осмысленный порядок наложения.

## API

| Элемент         | API                                 | Назначение                                                                       |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| `dsk-dock`      | `disabled`, `readOnly` (`readonly`) | Запрет пользовательского переноса; атрибуты включаются присутствием.             |
| `dsk-dock-zone` | `disabled`                          | Исключить зону из переноса; из заблокированной исходной зоны нельзя начать жест. |
| `dsk-dock-item` | `disabled`                          | Запретить пользовательское перемещение этой панели.                              |
| `dsk-dock`      | `zones`, `items`                    | Актуальные массивы принадлежащих dock элементов; только чтение.                  |
| `dsk-dock`      | `dock(item, zone): boolean`         | Программный перенос без события изменения; false для той же зоны.                |
| `dsk-dock`      | `cancel()`                          | Отменить текущий жест.                                                           |

`dock()` является присваиванием со стороны приложения и работает при disabled/readonly. Метод выбрасывает ошибку, если панель/зона принадлежат другому dock или зона находится внутри панели. Локальной истории отмены нет: сохраняйте раскладку и подключайте историю приложения через события.

```ts
const dock = document.querySelector('dsk-dock')!;
const item = dock.querySelector('dsk-dock-item')!;
const destination = dock.querySelectorAll('dsk-dock-zone')[1]!;
dock.dock(item, destination);
```

## События и отмена

Все события всплывают и проходят границы Shadow DOM: `CustomEvent<DockDetail>`. Данные содержат ссылки на элементы `{ item, from, to }`; за пределами зон `to` может быть null.

| Событие      | Когда                                                                 |
| ------------ | --------------------------------------------------------------------- |
| `dockstart`  | Жест становится активным; можно отменить.                             |
| `dockover`   | Меняется предполагаемая зона назначения.                              |
| `beforedock` | Перед допустимым переносом; можно отменить.                           |
| `change`     | Панель перенесена в другую зону.                                      |
| `dockend`    | Успешное завершение переноса.                                         |
| `dockcancel` | Жест закончился без переноса, в том числе при сбросе в исходную зону. |

```ts
import type { DockDetail } from '@flowscape-ui/dsk';
const dock = document.querySelector('dsk-dock')!;
dock.addEventListener('beforedock', (event) => {
  if (event.target !== dock || !(event instanceof CustomEvent)) return;
  const { to } = (event as CustomEvent<DockDetail>).detail;
  if (to?.id === 'reserved') event.preventDefault();
});
```

Проверяйте `event.target`: вложенные поля могут вызывать собственные `change`. Перенос начинается после небольшого смещения указателя. Escape, отмена указателя, потеря фокуса окна и удаление компонента отменяют жест. С клавиатуры: фокус на ручке, Space/Enter для начала, стрелки для выбора доступных зон в порядке DOM, Space/Enter для переноса. Tab отменяет перенос и продолжает обычную навигацию.

## Стилизация

Обычный CSS доступен для всего light DOM. `data-dragging` появляется у dock и переносимой панели, `data-dock-active` отмечает доступные зоны, `data-drag-over` отмечает текущую зону. Эти состояния принадлежат DSK и удаляются после жеста.

`dsk-dock::part(preview)` стилизует плавающую подпись. Переменные: `--dsk-dock-preview-background` (по умолчанию `#202024`), `--dsk-dock-preview-color` (`#fff`), `--dsk-dock-preview-border` (`#777`). Текст берётся из `aria-label` панели, иначе используется `Panel`. Часть `status` предназначена для доступных объявлений; для оформления подписи не нужно делать её видимой.

## Подключение во фреймворках

Сохраните CSS из примеров выше в `src/editor.css`. Достаточно импорта и разметки; обработчики нужны только для связи с приложением.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<dsk-dock class="workspace">
  <dsk-dock-zone aria-label="Слева">
    <dsk-dock-item aria-label="Инспектор">
      <button type="button" data-dsk-dock-handle>Перенести инспектор</button>
      <input value="DSK" />
    </dsk-dock-item>
  </dsk-dock-zone>
  <dsk-dock-zone aria-label="Справа"></dsk-dock-zone>
</dsk-dock>
<script type="module">
  import '@flowscape-ui/dsk';
  import '@flowscape-ui/dsk/styles.css';
  import './editor.css';
</script>
```

```tsx [React]
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
export default function App() {
  return (
    <dsk-dock className="workspace">
      <dsk-dock-zone aria-label="Слева">
        <dsk-dock-item aria-label="Инспектор">
          <button type="button" data-dsk-dock-handle>
            Перенести инспектор
          </button>
          <input defaultValue="DSK" />
        </dsk-dock-item>
      </dsk-dock-zone>
      <dsk-dock-zone aria-label="Справа"></dsk-dock-zone>
    </dsk-dock>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<template>
  <dsk-dock class="workspace">
    <dsk-dock-zone aria-label="Слева">
      <dsk-dock-item aria-label="Инспектор">
        <button type="button" data-dsk-dock-handle>Перенести инспектор</button>
        <input value="DSK" />
      </dsk-dock-item>
    </dsk-dock-zone>
    <dsk-dock-zone aria-label="Справа"></dsk-dock-zone>
  </dsk-dock>
</template>
```

```svelte [Svelte]
<script lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<dsk-dock class="workspace">
  <dsk-dock-zone aria-label="Слева">
    <dsk-dock-item aria-label="Инспектор">
      <button type="button" data-dsk-dock-handle>Перенести инспектор</button>
      <input value="DSK" />
    </dsk-dock-item>
  </dsk-dock-zone>
  <dsk-dock-zone aria-label="Справа"></dsk-dock-zone>
</dsk-dock>
```

```ts [Angular]
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<dsk-dock class="workspace">
    <dsk-dock-zone aria-label="Слева">
      <dsk-dock-item aria-label="Инспектор">
        <button type="button" data-dsk-dock-handle>Перенести инспектор</button>
        <input value="DSK" />
      </dsk-dock-item>
    </dsk-dock-zone>
    <dsk-dock-zone aria-label="Справа"></dsk-dock-zone>
  </dsk-dock>`,
})
export class App {}
```

:::

</div>

## Настройка фреймворка

В Angular подключите CSS глобально через список `styles` в `projects.<ваше-приложение>.architect.build.options` файла `angular.json`. Сохраните существующие строки и добавьте стили пакета и `src/editor.css` ([глобальные стили Angular CLI](https://github.com/angular/angular-cli/wiki/stories-global-styles)).

```json
{
  "styles": [
    "node_modules/@flowscape-ui/dsk/dist/styles.css",
    "src/styles.css",
    "src/editor.css"
  ]
}
```

Примеры рассчитаны на клиентский рендеринг. Для SSR используйте клиентский импорт и очистку из [Установки](/ru/guide/installation#приложения-с-ssr). Для Vue настройте `isCustomElement: tag => tag.startsWith("dsk-")`. Для React с TypeScript добавьте файл объявлений ниже. Он только описывает JSX и не заменяет импорт библиотеки. Не дублируйте объявления уже настроенных тегов.

```ts
// src/dsk-editor.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DskPanel,
  DskTransformBox,
  DskTransformHeader,
  DskTransformContent,
  DskTransformBoxHandleRotate,
  DskTransformBoxHandleResize,
  DskTimeline,
  DskDock,
  DskDockZone,
  DskDockItem,
} from '@flowscape-ui/dsk';
type Props<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  width?: string | number;
  height?: string | number;
  x?: string | number;
  y?: string | number;
  angle?: string | number;
  duration?: string | number;
  'drag-end'?: string;
  'min-size'?: string | number;
  'max-size'?: string | number;
  offset?: string | number;
  inset?: string | number;
  direction?: string;
  'snap-angle'?: string | number;
  movable?: string;
  disabled?: boolean;
  readonly?: boolean;
};
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-panel': Props<DskPanel>;
      'dsk-transform-box': Props<DskTransformBox>;
      'dsk-transform-header': Props<DskTransformHeader>;
      'dsk-transform-content': Props<DskTransformContent>;
      'dsk-transform-box-handle-rotate': Props<DskTransformBoxHandleRotate>;
      'dsk-transform-box-handle-resize': Props<DskTransformBoxHandleResize>;
      'dsk-timeline': Props<DskTimeline>;
      'dsk-dock': Props<DskDock>;
      'dsk-dock-zone': Props<DskDockZone>;
      'dsk-dock-item': Props<DskDockItem>;
    }
  }
}
```
