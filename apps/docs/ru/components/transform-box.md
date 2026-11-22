# Трансформация

`dsk-transform-box` добавляет обычному HTML перемещение, вращение и изменение размера. Компонент не рисует рамку выделения редактора. Вы выбираете область перетаскивания и добавляете только нужные ручки. Всем элементам нужны закрывающие теги.

## Начните с перемещения

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-transform-box width="200" height="130" x="12" y="20">
  <strong>DSK</strong>
</dsk-transform-box>
```

```css
dsk-transform-box {
  background: #252128;
  color: white;
  padding: 12px;
}
```

<ClientOnly><EditorExample kind="transform" /></ClientOnly>

Тяните свободную область. Выделение текста и работа обычных полей сохраняются. Перемещение использует CSS-трансляцию относительно исходного положения в раскладке: соседние элементы не сдвигаются, границы холста автоматически не ограничивают объект.

## Заголовок и содержимое

```html
<dsk-transform-box width="240" height="150">
  <dsk-transform-header>Инспектор</dsk-transform-header>
  <dsk-transform-content>
    <label>Название <input value="Прямоугольник" /></label>
  </dsk-transform-content>
</dsk-transform-box>
```

Заголовок должен быть прямым потомком. При его наличии перемещение начинается только за заголовок. `dsk-transform-content` защищает взаимодействие с содержимым от трансформаций; ручки размещайте снаружи него. Без заголовка перемещение начинается за свободные области контейнера. Обёртки не создают редактор и не управляют состоянием приложения.

<ClientOnly><EditorExample kind="transform" variant="header" /></ClientOnly>

## Ручки вращения и размера

```html
<dsk-transform-box class="object" width="200" height="130" snap-angle="15">
  <dsk-transform-header>Переместить</dsk-transform-header>
  <dsk-transform-content>Ваш HTML</dsk-transform-content>
  <dsk-transform-box-handle-rotate
    aria-label="Повернуть"
  ></dsk-transform-box-handle-rotate>
  <dsk-transform-box-handle-resize
    direction="br"
    aria-label="Изменить размер справа снизу"
  ></dsk-transform-box-handle-resize>
</dsk-transform-box>
```

```css
.object {
  background: #252128;
  color: white;
}
.object dsk-transform-header {
  padding: 10px;
  cursor: grab;
}
.object dsk-transform-content {
  padding: 12px;
}
.object dsk-transform-box-handle-rotate {
  position: absolute;
  top: -26px;
  left: calc(50% - 10px);
}
.object dsk-transform-box-handle-resize {
  position: absolute;
  right: -6px;
  bottom: -6px;
}
.object dsk-transform-box-handle-rotate:focus-visible,
.object dsk-transform-box-handle-resize:focus-visible {
  box-shadow: 0 0 0 3px #ff007a;
}
```

<ClientOnly><EditorExample kind="transform" variant="handles" /></ClientOnly>

Количество ручек произвольное. Направления ресайза: `t`, `l`, `r`, `b`, `tl`, `tr`, `bl`, `br`; по умолчанию `br`. Позиции задаются CSS. При переходе через противоположный край ресайз продолжается, размеры остаются неотрицательными, содержимое не отражается. Вращение происходит вокруг центра. `movable="false"` отключает перемещение, но сохраняет работу доступных ручек.

## Атрибуты и свойства

| Атрибут           | Свойство          | По умолчанию | Назначение                                                 |
| ----------------- | ----------------- | ------------ | ---------------------------------------------------------- |
| `x`, `y`          | `x`, `y`          | `0`          | Смещение в локальных CSS-пикселях.                         |
| `width`, `height` | `width`, `height` | `200`, `140` | Неотрицательные размеры в пикселях.                        |
| `angle`           | `angle`           | `0`          | Угол в градусах.                                           |
| `movable`         | `movable`         | `true`       | Только строка `false` отключает перемещение.               |
| `step`            | `step`            | `1`          | Шаг клавиатурного перемещения/ресайза и обычного вращения. |
| `snap-angle`      | `snapAngle`       | `15`         | Шаг вращения с Shift в градусах.                           |
| `disabled`        | `disabled`        | `false`      | Запретить пользовательские трансформации.                  |
| `readonly`        | `readOnly`        | `false`      | Запретить изменения с сохранением фокуса.                  |
| -                 | `value`           | объект       | `{ x, y, width, height, angle }`, чтение и запись.         |

`disabled` и `readonly` включаются присутствием атрибута и не блокируют вложенные поля. У каждой ручки есть собственный `disabled`, а также `aria-label`, классы, стили и содержимое. Программное присваивание не вызывает события и сбрасывает локальную историю. Задавайте трансформацию через API, а не перезаписывая CSS `transform` контейнера.

## События и клавиатура

`input` возникает в процессе изменения, `change` фиксирует результат. Оба события всплывают и проходят границы Shadow DOM. Данные `TransformBoxDetail`: `{ x, y, width, height, angle, action }`, где `action` равен `move`, `resize` или `rotate`. События вложенных полей также всплывают, поэтому проверяйте источник.

```ts
const box = document.querySelector('dsk-transform-box')!;
box.addEventListener('change', (event) => {
  if (event.target !== box) return;
  console.log(box.value);
});
box.value = { x: 20, y: 30, width: 240, height: 160, angle: 15 };
```

Сфокусируйте контейнер/заголовок для перемещения стрелками, ручку для вращения или ресайза. Shift увеличивает шаг перемещения/размера и включает привязку угла. Escape отменяет текущий жест. Ctrl/Cmd+Z и Ctrl/Cmd+Shift+Z отменяют и повторяют изменение; один жест занимает одну запись. Добавьте видимый стиль фокуса ручкам, как в CSS выше.

## Стилизация

Стилизуйте контейнеры и дочерние элементы напрямую. `::part(content)` обращается к внутренней flex-обёртке. `--dsk-transform-color` и `--dsk-transform-handle-background` задают стандартные цвета ручек. Внутренние переменные положения обновляются компонентом: значения задавайте через `x`, `y`, `width`, `height`, `angle`. Переполнение и адаптивность содержимого контролирует приложение.

<ClientOnly><EditorExample kind="transform" variant="handles" styled /></ClientOnly>

## Подключение во фреймворках

Сохраните CSS из примеров выше в `src/editor.css`. Достаточно импорта и разметки; обработчики нужны только для связи с приложением.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<dsk-transform-box class="object" width="200" height="130">
  <dsk-transform-header>Переместить</dsk-transform-header>
  <dsk-transform-content>DSK</dsk-transform-content>
  <dsk-transform-box-handle-rotate
    aria-label="Повернуть"
  ></dsk-transform-box-handle-rotate>
  <dsk-transform-box-handle-resize
    direction="br"
    aria-label="Изменить размер"
  ></dsk-transform-box-handle-resize>
</dsk-transform-box>
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
    <dsk-transform-box className="object" width="200" height="130">
      <dsk-transform-header>Переместить</dsk-transform-header>
      <dsk-transform-content>DSK</dsk-transform-content>
      <dsk-transform-box-handle-rotate aria-label="Повернуть"></dsk-transform-box-handle-rotate>
      <dsk-transform-box-handle-resize
        direction="br"
        aria-label="Изменить размер"
      ></dsk-transform-box-handle-resize>
    </dsk-transform-box>
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
  <dsk-transform-box class="object" width="200" height="130">
    <dsk-transform-header>Переместить</dsk-transform-header>
    <dsk-transform-content>DSK</dsk-transform-content>
    <dsk-transform-box-handle-rotate
      aria-label="Повернуть"
    ></dsk-transform-box-handle-rotate>
    <dsk-transform-box-handle-resize
      direction="br"
      aria-label="Изменить размер"
    ></dsk-transform-box-handle-resize>
  </dsk-transform-box>
</template>
```

```svelte [Svelte]
<script lang="ts">
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
</script>
<dsk-transform-box class="object" width="200" height="130">
  <dsk-transform-header>Переместить</dsk-transform-header>
  <dsk-transform-content>DSK</dsk-transform-content>
  <dsk-transform-box-handle-rotate aria-label="Повернуть"></dsk-transform-box-handle-rotate>
  <dsk-transform-box-handle-resize direction="br" aria-label="Изменить размер"></dsk-transform-box-handle-resize>
</dsk-transform-box>
```

```ts [Angular]
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<dsk-transform-box class="object" width="200" height="130">
    <dsk-transform-header>Переместить</dsk-transform-header>
    <dsk-transform-content>DSK</dsk-transform-content>
    <dsk-transform-box-handle-rotate
      aria-label="Повернуть"
    ></dsk-transform-box-handle-rotate>
    <dsk-transform-box-handle-resize
      direction="br"
      aria-label="Изменить размер"
    ></dsk-transform-box-handle-resize>
  </dsk-transform-box>`,
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
