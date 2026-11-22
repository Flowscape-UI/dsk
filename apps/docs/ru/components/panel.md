# Панель

`dsk-panel` - контейнер с изменяемым размером для инспекторов, инструментов и боковых панелей редактора. Внутри можно размещать обычный HTML и компоненты DSK. Стилизуйте его как `div`: доступны глобальные HTML-атрибуты, `class`, `style`, `data-*` и `aria-*`. Компонент наследует `HTMLElement`, а не `HTMLDivElement`.

## Добавить панель

Зарегистрируйте DSK в клиентской точке входа. Обработчик изменения размера не нужен. Закрывающий тег обязателен. Подключение во фреймворках и SSR описано в [Установке](../guide/installation).

```js
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
  <h2>Инспектор</h2>
  <label>Название <input value="Rectangle" /></label>
</dsk-panel>
```

```css
.inspector {
  width: 280px;
  height: 240px;
  padding: 20px;
  flex: none;
  background: #181818;
  color: white;
  --dsk-panel-handle-size: 8px;
}
.inspector::part(handle) {
  background: #557be8;
  cursor: ew-resize;
}
.inspector::part(handle):hover {
  background: #7796ff;
}
```

<ClientOnly><PanelExample /></ClientOnly>

## Направление и ограничения

`drag-end` выбирает край: left/right меняют ширину, top/bottom - высоту. При перетаскивании слева или сверху противоположный край остаётся на месте. Панель корректирует CSS `left` или `top`, если окружающая раскладка ещё не закрепляет противоположный край. Сохраните относительное позиционирование по умолчанию или задайте явное позиционирование. Смещения влияют на визуальное положение; размещением соседей управляет ваш CSS. Для раскладки редактора используйте flex/grid.

`min-size` и `max-size` принимают неотрицательные числа в CSS-пикселях и ограничивают изменение размера по выбранной оси. Отсутствующее, пустое или некорректное значение не добавляет ограничений (физический минимум - ноль). Если максимум меньше минимума, используется минимум. Изменение атрибута само по себе не меняет размер до следующего редактирования. Также действуют CSS `min-width`, `max-width`, `min-height`, `max-height`; при конфликте приоритет у CSS.

## Положение ручки

`offset` / свойство `offset` сдвигает ручку наружу, `inset` / свойство `inset` внутрь. Оба принимают конечные числа в пикселях, включая отрицательные; по умолчанию 0. Итоговое расстояние от выбранного края: `inset - offset`. Например, `offset="8" inset="2"` даёт -6 px. Положение влияет только на ручку, а не размер панели. Не обрезайте внешнюю ручку через `overflow: hidden` у предков.

```html
<dsk-panel offset="8" inset="2" min-size="160" max-size="480">
  <p>DSK</p>
</dsk-panel>
```

## Атрибуты и свойства

| Атрибут        | Свойство      | По умолчанию   | Назначение                                                                     |
| -------------- | ------------- | -------------- | ------------------------------------------------------------------------------ |
| `drag-end`     | `dragEnd`     | `right`        | `left`, `right`, `top`, `bottom`; некорректное значение заменяется на `right`. |
| `min-size`     | `minSize`     | `0`            | Минимальная ширина или высота при редактировании, в пикселях.                  |
| `max-size`     | `maxSize`     | `Infinity`     | Максимальная ширина или высота при редактировании, в пикселях.                 |
| `offset`       | `offset`      | `0`            | Смещение ручки наружу в пикселях, может быть отрицательным.                    |
| `inset`        | `inset`       | `0`            | Смещение ручки внутрь в пикселях, может быть отрицательным.                    |
| `step`         | `step`        | `1`            | Положительный шаг клавиатуры в пикселях.                                       |
| `disabled`     | `disabled`    | `false`        | Отключает изменение размера и убирает край из Tab-навигации.                   |
| `readonly`     | `readOnly`    | `false`        | Отключает изменение размера, сохраняя возможность фокусировки.                 |
| `handle-label` | `handleLabel` | `Resize panel` | Доступное название края для изменения размера.                                 |

Булевы атрибуты действуют по факту присутствия. Disabled/readonly блокируют только изменение размера, а не дочерние элементы. Размер задаётся обычным CSS или через `panel.style.width` / `panel.style.height`. Программные изменения не отправляют события; внешние назначения `style` или `class` панели сбрасывают локальную историю размеров.

## Стили края

Shadow part `handle` поддерживает обычный CSS: фон, курсор, рамку, прозрачность. Для вертикального края задавайте ширину, для горизонтального - высоту. Длина всегда соответствует панели. Переменная `--dsk-panel-handle-size` задаёт толщину в обеих ориентациях. Край расположен внутри padding box панели; при необходимости зарезервируйте место для него через padding.

| CSS-свойство                    | По умолчанию                |
| ------------------------------- | --------------------------- |
| `--dsk-panel-handle-size`       | `6px`                       |
| `--dsk-panel-handle-background` | `transparent`               |
| `--dsk-panel-handle-cursor`     | `ew-resize` или `ns-resize` |
| `--dsk-panel-handle-z-index`    | `1`                         |
| `--dsk-panel-focus-color`       | `#557be8`                   |

<ClientOnly><PanelExample styled /></ClientOnly>

## Клавиатура и история

Сфокусируйте край через Tab. Стрелки влево/вправо двигают вертикальный край, вверх/вниз - горизонтальный. Shift умножает `step` на десять. Escape отменяет текущее перетаскивание. Ctrl/Cmd+Z отменяет изменение, Ctrl/Cmd+Shift+Z возвращает его. Завершённое перетаскивание создаёт одну запись истории. Потеря фокуса, отмена указателя, отключение от DOM или смена края отменяют незавершённое перетаскивание.

## События

`input` отправляется во время изменения размера; `change` - один раз при завершении изменившего размер перетаскивания или после изменения с клавиатуры. Undo/redo отправляют оба события. Отмена при необходимости отправляет `input` с восстановленным размером, но не `change`.

Оба события - всплывающие composed `CustomEvent<PanelResizeDetail>`. Размеры соответствуют вычисленным CSS width/height в локальных пикселях; включение рамки и отступов зависит от `box-sizing`. События дочерних полей также всплывают: проверяйте target.

```ts
import type { PanelResizeDetail } from '@flowscape-ui/dsk';

const panel = document.querySelector('dsk-panel')!;
panel.addEventListener('change', (event) => {
  if (event.target !== panel || !(event instanceof CustomEvent)) return;
  const { width, height, dragEnd } = (event as CustomEvent<PanelResizeDetail>)
    .detail;
  console.log(width, height, dragEnd);
});
```

## Подключение во фреймворках

Сохраните CSS из примеров выше в `src/editor.css`. Достаточно импорта и разметки; обработчики нужны только для связи с приложением.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
  <h2>Инспектор</h2>
  <label>Название <input /></label>
</dsk-panel>
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
    <dsk-panel
      className="inspector"
      drag-end="right"
      min-size="160"
      max-size="480"
    >
      <h2>Инспектор</h2>
      <label>
        Название <input />
      </label>
    </dsk-panel>
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
  <dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
    <h2>Инспектор</h2>
    <label>Название <input /></label>
  </dsk-panel>
</template>
```

```svelte [Svelte]
<script lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<dsk-panel class="inspector" drag-end="right" min-size="160" max-size="480">
  <h2>Инспектор</h2>
  <label>Название <input /></label>
</dsk-panel>
```

```ts [Angular]
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<dsk-panel
    class="inspector"
    drag-end="right"
    min-size="160"
    max-size="480"
  >
    <h2>Инспектор</h2>
    <label>Название <input /></label>
  </dsk-panel>`,
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
