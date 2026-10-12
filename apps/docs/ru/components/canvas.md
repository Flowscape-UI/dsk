# Виджеты холста

HTML/CSS-виджеты для координатной сетки вашего редактора: небольшой pan/zoom viewport, метки, линейки и направляющие. Их можно использовать вместе или привязать к собственному движку.

```sh
npm i @flowscape-ui/dsk
```

::: tip Сначала HTML
Примеры тегов работают после импорта пакета без отдельного конструктора. Все custom elements требуют закрывающих тегов. В viewport и метку можно вложить свой HTML. Для связи нескольких виджетов с общей камерой нужен небольшой обработчик события. Примеры ниже клиентские; для SSR смотрите [установку](/ru/guide/installation#server-rendered-applications).
:::

## dsk-pan-zoom

<ClientOnly><CanvasExample kind="pan" /></ClientOnly>

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
  <div
    style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white"
  >
    DSK
  </div>
</dsk-pan-zoom>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <dsk-pan-zoom aria-label="Interactive canvas" style={{ height: '320px' }}>
      <div
        style={{
          position: 'absolute',
          left: '-60px',
          top: '-60px',
          width: '120px',
          height: '120px',
          background: '#ff0073',
          color: 'white',
        }}
      >
        DSK
      </div>
    </dsk-pan-zoom>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
    <div
      style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white"
    >
      DSK
    </div>
  </dsk-pan-zoom>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
  <div style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white">DSK</div>
</dsk-pan-zoom>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-pan-zoom aria-label="Interactive canvas" style="height:320px">
      <div
        style="position:absolute;left:-60px;top:-60px;width:120px;height:120px;background:#ff0073;color:white"
      >
        DSK
      </div>
    </dsk-pan-zoom>
  `,
})
export class App {}
```

:::

</div>

Смотрите [настройку фреймворка](#framework-setup) для React и Vue. Задайте высоту viewport и размеры объекта. Начало мира (0,0) изначально по центру.

### Управление и API viewport

`dsk-pan-zoom` - небольшой viewport для обычного HTML. Он не реализует модель документа, выбор объектов, изменение размера, историю, инерцию или движок рендеринга. Обычное содержимое попадает в мировой слой; `slot="overlay"` размещает интерфейс в неподвижном экранном слое.

| Свойство / метод  | Назначение                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.camera`         | Копия `{ panX, panY, zoom }`. Присваивание проверяет конечные числа и положительный zoom, ограничивает масштаб 0.25-4 и отменяет активный жест. События не отправляет. |
| `.zoomBy(factor)` | Положительный конечный множитель масштаба относительно центра viewport.                                                                                                |
| `.reset()`        | Возвращает начало мира в центр, масштаб к 100%.                                                                                                                        |
| `viewportchange`  | Всплывающий CustomEvent с камерой в detail; взаимодействие, reset, zoomBy и изменение размера.                                                                         |
| `aria-label`      | Доступное имя поверхности.                                                                                                                                             |

Камера задаётся свойством, а не атрибутом camera или zoom. Начало координат изначально центрируется; изменение размера сохраняет мировую точку в центре. Значения pan измеряются в CSS-пикселях.

- Перетаскивание основной или средней кнопкой мыши и одним пальцем перемещает камеру.
- Колесо и прокрутка двумя пальцами выполняют pan; Ctrl/Meta + колесо и pinch трекпада - zoom вокруг указателя. Shift переводит вертикальную прокрутку в горизонтальную.
- Два касания масштабируют и перемещают камеру вокруг середины между пальцами. После отпускания одного пальца pan продолжается без скачка.
- В фокусе стрелки выполняют pan, Shift увеличивает шаг, `+`/`-` меняют zoom, `0` или Home сбрасывают камеру.

Поверхность использует touch-action: none и захватывает жесты внутри своих границ. Страницу можно прокручивать снаружи демо. Кнопки, ссылки, инпуты, DSK-контролы и содержимое overlay сохраняют собственное поведение. Для других интерактивных элементов используйте data-pan-zoom-ignore. При отмене жестов и отключении компонента ресурсы освобождаются.

```css
dsk-pan-zoom {
  height: 320px;
  --dsk-pan-zoom-background: #111111;
  --dsk-pan-zoom-grid-color: #45454d;
  --dsk-pan-zoom-focus-color: #ff0073;
}
dsk-pan-zoom::part(viewport) {
  border: 1px solid #39393f;
}
```

Parts: viewport, world, overlay, grid. Точки находятся в мировом слое и масштабируются вместе с ним. Сетка ограничена видимой областью с запасом. Она затухает от 70% до 55%, при 55% удаляется из DOM, при приближении возвращается. CSS-переменные по умолчанию: background - transparent, grid-color - #cbd3e0, focus-color - #557be8. Особенности аппаратных жестов зависят от браузера и устройства.

## Общая камера

Исходники находятся в `src/canvas-widgets/`: публичные компоненты и адаптеры координат расположены в корне, внутренние расчёты линейки - в `helpers/`, а `index.ts` определяет экспорты группы. Все публичные импорты остаются доступны из `@flowscape-ui/dsk`.

```ts
import type { CanvasCamera } from '@flowscape-ui/dsk';

const camera: CanvasCamera = { panX: 100, panY: -40, zoom: 2 };
document.querySelectorAll('dsk-ruler').forEach((ruler) => {
  ruler.camera = camera;
});
document.querySelectorAll('dsk-canvas-marker').forEach((marker) => {
  marker.camera = camera;
});
```

Формула: `screen = world * zoom + pan`. Смещение измеряется в CSS-пикселях viewport, а не в физических пикселях буфера canvas. Обновляйте `.camera` при изменении камеры движка; компонент не подписывается на её события автоматически.

| Настройка                            | По умолчанию | Действие                                |
| ------------------------------------ | ------------ | --------------------------------------- |
| `follow-pan` / `.followPan`          | true         | Учитывать смещение камеры               |
| `follow-zoom` / `.followZoom`        | true         | Учитывать zoom при вычислении позиции   |
| `scale-with-zoom` / `.scaleWithZoom` | false        | Масштабировать саму метку вместе с zoom |

Чтобы отключить реакцию, передайте `follow-pan="false"` или `follow-zoom="false"`. У линейки эти настройки меняют координатную шкалу, а не физическое расположение HTML-тега. Изменение размера через `scale-with-zoom` относится к метке.

## dsk-canvas-marker

<ClientOnly><CanvasExample kind="marker" /></ClientOnly>

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<div style="position:relative;height:240px;overflow:hidden">
  <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
</div>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
      <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
    </div>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <div style="position:relative;height:240px;overflow:hidden">
    <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
  </div>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<div style="position:relative;height:240px;overflow:hidden">
  <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
</div>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div style="position:relative;height:240px;overflow:hidden">
      <dsk-canvas-marker x="120" y="80" label="Comment"></dsk-canvas-marker>
    </div>
  `,
})
export class App {}
```

:::

</div>

```html
<div id="viewport" style="position:relative;height:300px;overflow:hidden">
  <dsk-canvas-marker x="120" y="80" label="Комментарий"></dsk-canvas-marker>
  <dsk-canvas-marker x="12" y="12" follow-pan="false" follow-zoom="false">
    <button type="button">Панель</button>
  </dsk-canvas-marker>
</div>
```

Мировая метка при камере из примера окажется в точке `(340, 120)`, а экранная останется в `(12, 12)`. По умолчанию текст не увеличивается вместе с zoom, хотя позиция следует за объектом.

Родительский overlay должен быть позиционирован и не иметь повторного camera transform: иначе преобразование применится дважды. В слот метки можно вложить обычный HTML. Оформление доступно через `::part(container)`, `::part(pin)`, `::part(label)` и переменные `--dsk-marker-background`, `--dsk-marker-color`, `--dsk-marker-padding`, `--dsk-marker-radius`, `--dsk-marker-shadow`.

### Свой дизайн метки

```css
dsk-canvas-marker {
  --dsk-marker-background: #171717;
  --dsk-marker-color: #ff70ae;
  --dsk-marker-padding: 10px 12px;
  --dsk-marker-radius: 0px;
  --dsk-marker-shadow: none;
}
dsk-canvas-marker::part(container) {
  border: 1px solid #ff70ae;
}
```

<ClientOnly><CanvasExample kind="marker" styled /></ClientOnly>

### Полный API метки

| Атрибут / свойство               | По умолчанию                    | Назначение                                                                                    |
| -------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| x / .x, y / .y                   | 0, 0                            | Мировая позиция; неверные значения атрибутов заменяются нулём.                                |
| pan-x, pan-y                     | 0, 0                            | Смещение камеры в CSS-пикселях.                                                               |
| zoom                             | 1                               | Масштаб, ограниченный диапазоном 1e-12-1e12.                                                  |
| .camera                          | `{ panX: 0, panY: 0, zoom: 1 }` | Читает/обновляет все три значения камеры. Setter отклоняет не конечные числа и zoom ≤ 0.      |
| label                            | Marker                          | Запасной текст при отсутствии содержимого слота; отдельного свойства label у метки нет.       |
| follow-pan / .followPan          | true                            | Включает смещение в расчёт позиции. Строка false отключает.                                   |
| follow-zoom / .followZoom        | true                            | Включает масштаб в расчёт позиции. Строка false отключает.                                    |
| scale-with-zoom / .scaleWithZoom | false                           | Масштабирует размер метки, если followZoom включён. Наличие включает, строка false отключает. |

В примере метка мира находится в (60,60), экранная - в (12,12). Если отключить оба follow-флага у первой метки, она окажется в экранной точке (60,60). Метка не перетаскивается сама по себе и не отправляет событий значения. Для действий поместите кнопку в её слот. Изменение свойств обновляет положение без событий.

CSS по умолчанию: --dsk-marker-background: #557be8; --dsk-marker-color: #fff; --dsk-marker-padding: 6px 9px; --dsk-marker-radius: 6px; --dsk-marker-shadow: 0 2px 8px #0002; --dsk-marker-z-index: 1. Parts: container, pin, label. CSS одинаков для всех фреймворков; в Vue используйте unscoped style.

## Привязка обычного HTML

<ClientOnly><CanvasExample kind="html" /></ClientOnly>

```ts
import {
  bindCanvasWidget,
  projectCanvasPoint,
  unprojectCanvasPoint,
} from '@flowscape-ui/dsk';

const element = document.createElement('button');
element.textContent = 'Комментарий';
document.querySelector('#viewport')!.append(element);
const camera = { panX: 100, panY: -40, zoom: 2 };
const binding = bindCanvasWidget(element, {
  camera,
  position: { x: 120, y: 80 },
  followPan: true,
  followZoom: true,
  scaleWithZoom: false,
});

binding.update({ camera: { panX: 80, panY: 0, zoom: 1.5 } });
const screen = projectCanvasPoint({ x: 120, y: 80 }, camera);
console.log(unprojectCanvasPoint(screen, camera));

// Restore the original positioning styles during teardown.
binding.dispose();
element.remove();
```

Binding управляет inline-свойствами `position`, `left`, `top`, `translate`, `scale`, `transform-origin` и восстанавливает их при `dispose()`. Обновления объединяются с предыдущими настройками. Для повёрнутой или нелинейной системы используйте проекцию своего движка и передавайте экранные координаты с отключёнными follow-флагами: общий helper поддерживает смещение и равномерный масштаб по осям.

## dsk-ruler

<ClientOnly><CanvasExample kind="ruler" /></ClientOnly>

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<div>
  <dsk-ruler
    target="#ruler-target"
    snap="10"
    aria-label="Horizontal ruler"
  ></dsk-ruler>
  <div
    id="ruler-target"
    style="height:240px;position:relative;background:#171717"
  ></div>
</div>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <div>
      <dsk-ruler
        target="#ruler-target"
        snap="10"
        aria-label="Horizontal ruler"
      ></dsk-ruler>
      <div
        id="ruler-target"
        style={{ height: '240px', position: 'relative', background: '#171717' }}
      ></div>
    </div>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <div>
    <dsk-ruler
      target="#ruler-target"
      snap="10"
      aria-label="Horizontal ruler"
    ></dsk-ruler>
    <div
      id="ruler-target"
      style="height:240px;position:relative;background:#171717"
    ></div>
  </div>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<div>
  <dsk-ruler target="#ruler-target" snap="10" aria-label="Horizontal ruler"></dsk-ruler>
  <div id="ruler-target" style="height:240px;position:relative;background:#171717"></div>
</div>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div>
      <dsk-ruler
        target="#ruler-target"
        snap="10"
        aria-label="Horizontal ruler"
      ></dsk-ruler>
      <div
        id="ruler-target"
        style="height:240px;position:relative;background:#171717"
      ></div>
    </div>
  `,
})
export class App {}
```

:::

</div>

```html
<dsk-ruler
  orientation="horizontal"
  offset="-50"
  zoom="1"
  highlights="[[25,125],[180,220]]"
  guides="[150]"
  snap="1"
  target="#editor"
  aria-label="Горизонтальная линейка"
></dsk-ruler>
<div id="editor" style="height:300px"></div>
```

`orientation` принимает `horizontal`, `horizontal-reversed`, `vertical`, `vertical-reversed`. Перевёрнутые варианты переносят штрихи на другой край, не меняя направление роста чисел. Вертикальной линейке нужна определённая высота контейнера.

Границы диапазона не заданы: можно перемещаться в отрицательные и положительные координаты в пределах точности конечных чисел JavaScript. Генерируются только видимые штрихи, их количество ограничено. `step="0"` выбирает адаптивный интервал; положительное значение задаёт предпочтительный шаг, который может укрупняться при отдалении.

`highlights` – массив пар `[a,b]` в мировых координатах, например для нескольких выделенных объектов. `.formatLabel` принимает функцию форматирования чисел. `.refresh()` пригодится после изменения положения viewport без изменения его размера.

### Атрибуты и свойства линейки

| Атрибут / свойство          | По умолчанию | Назначение                                                                                                                   |
| --------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| orientation / .orientation  | horizontal   | horizontal, horizontal-reversed, vertical, vertical-reversed.                                                                |
| offset / .offset            | 0            | Мировая координата начала шкалы.                                                                                             |
| zoom / .zoom                | 1            | CSS-пиксели на мировую единицу, диапазон 1e-12-1e12.                                                                         |
| step / .step                | 0            | Предпочтительный интервал крупных штрихов; 0 выбирает адаптивный 1/2/5. При отдалении интервал увеличивается для читаемости. |
| snap / .snap                | 0            | Привязка направляющих в мировых единицах; 0 разрешает непрерывное движение.                                                  |
| highlights / .highlights    | []           | JSON-массив пар [a,b], свойство принимает readonly RulerRange[]. Порядок концов не важен.                                    |
| guides / .guides            | []           | JSON-массив координат; свойство принимает readonly number[].                                                                 |
| target / .target            | Нет          | Селектор в document/shadow root; свойство принимает HTMLElement или null для возврата к селектору.                           |
| guide-offset / .guideOffset | offset       | Смещение перпендикулярной оси для направляющих.                                                                              |
| guide-zoom / .guideZoom     | zoom         | Масштаб перпендикулярной оси.                                                                                                |
| .camera                     | null         | Общая камера автоматически распределяет X/Y между шкалой и направляющими.                                                    |
| follow-pan / .followPan     | true         | Учитывать pan камеры; строка false отключает.                                                                                |
| follow-zoom / .followZoom   | true         | Учитывать zoom камеры; строка false отключает.                                                                               |
| disabled                    | Отсутствует  | Запрещает создание, изменение и удаление направляющих. Это атрибут, не отдельное свойство компонента.                        |
| .formatLabel                | null         | Функция `(value: number) => string` или null для стандартного формата.                                                       |

Неверные JSON-массивы заменяются пустыми; неверные элементы и не конечные числа игнорируются. Программные присваивания не отправляют событий. `.refresh()` планирует перерисовку; изменение размера, прокрутка и resize окна уже отслеживаются. Обработчики и внешние overlay удаляются при отключении линейки.

### Прямое управление координатами

Без `.camera` можно использовать `offset` и `zoom`: `pixel = (world - offset) * zoom`. Для движка с `pixel = world * scale + pan` установите `zoom = scale`, `offset = -pan / scale`. `.toPixel()` и `.toValue()` преобразуют координаты в обе стороны.

`guideOffset` и `guideZoom` задают перпендикулярную ось направляющих; без них используются `offset` и `zoom`. Свойство `.camera` автоматически распределяет X/Y между шкалой и направляющими. Присваивание `.camera = null` прекращает обновления от камеры, сохраняя последнее преобразование.

### Направляющие

Потяните от линейки минимум на 4 CSS-пикселя в target – одиночный клик не создаёт линию. Горизонтальная линейка создаёт горизонтальную направляющую, вертикальная – вертикальную. Линии ограничены областью target и не перекрывают исходную линейку.

- Активная линия синяя; неактивная – оранжевая.
- Только активная линия показывает координату основным цветом направляющей.
- Delete / Backspace удаляет линию в фокусе.
- Стрелки двигают её на `snap` или единицу; Shift умножает шаг на десять.
- Escape или отпускание вне target отменяет перенос.
- Enter на линейке создаёт направляющую в середине target.

`guideinput` отправляет предпросмотр, `guidechange` – подтверждённое изменение. В `event.detail` находятся `guides`, `value`, `index`. Во время перетаскивания `.guides` содержит прежние подтверждённые значения; предпросмотр берите из события. При удалении массив уже не содержит линию, а `value` и `index` указывают, что удалено.

### Оформление

<ClientOnly><CanvasExample kind="ruler" styled /></ClientOnly>

В этом варианте --dsk-ruler-guide-color равен #ff70ae, --dsk-ruler-accent - #ffffff, --dsk-ruler-highlight - #ff007330.

```css
dsk-ruler {
  --dsk-ruler-size: 24px;
  --dsk-ruler-background: #292929;
  --dsk-ruler-color: #a1a1a1;
  --dsk-ruler-tick-color: #777;
  --dsk-ruler-highlight: rgba(85, 123, 232, 0.28);
  --dsk-ruler-accent: #0d99ff;
  --dsk-ruler-guide-color: #f2994a;
  --dsk-ruler-guide-width: 1px;
}
```

Доступны parts `scale`, `tick`, `label`, `highlight`, `guide-overlay`, `guide-label`, `guide`. Сама линия рисуется псевдоэлементом `::after` части `guide`.

## Общий холст, метка и две линейки

Шкалы начинаются там же, где viewport, а метка находится в неподвижном overlay. Класс canvas-demo задаёт сетку: 24px под линейку слева и 24px сверху. Идентификаторы в примерах должны быть уникальными на странице.

```html
<div id="canvas-demo" class="canvas-demo">
  <span></span>
  <dsk-ruler class="ruler-x" aria-label="X ruler" snap="10"></dsk-ruler>
  <dsk-ruler
    class="ruler-y"
    orientation="vertical"
    aria-label="Y ruler"
    snap="10"
  ></dsk-ruler>
  <dsk-pan-zoom aria-label="Canvas">
    <div class="canvas-object">DSK</div>
    <dsk-canvas-marker
      slot="overlay"
      x="60"
      y="60"
      label="Comment"
    ></dsk-canvas-marker>
  </dsk-pan-zoom>
</div>
```

```css
.canvas-demo {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  grid-template-rows: 24px 320px;
}
.ruler-x {
  grid-column: 2;
  grid-row: 1;
}
.ruler-y {
  grid-column: 1;
  grid-row: 2;
}
.canvas-demo dsk-pan-zoom {
  grid-column: 2;
  grid-row: 2;
  height: 320px;
}
.canvas-object {
  position: absolute;
  left: -60px;
  top: -60px;
  width: 120px;
  height: 120px;
  background: #ff0073;
  color: white;
}
```

Сохраните общий адаптер в src/connect-canvas-widgets.ts. Именно он используется в демо. Линейки получают target через свойство, поэтому не зависят от глобального селектора.

<<< @/snippets/connect-canvas-widgets.ts

```ts
// src/main.ts
import '@flowscape-ui/dsk';
import { connectCanvasWidgets } from './connect-canvas-widgets';
const root = document.querySelector<HTMLElement>('#canvas-demo');
if (!root) throw new Error('Missing canvas demo');
const dispose = connectCanvasWidgets(root);
// Call dispose() before removing the view.
```

React: вызовите адаптер с ref.current в useEffect и верните dispose. Vue: вызовите в onMounted, очистите в onBeforeUnmount. Svelte: верните dispose из onMount. Angular: вызовите в ngAfterViewInit и очистите через DestroyRef.onDestroy. Во всех случаях передавайте DOM-контейнер, а не объект компонента фреймворка.

Программное присваивание viewport.camera не отправляет viewportchange. После него явно обновите камеры метки и линеек или вызовите вашу функцию синхронизации. Для собственного движка передавайте те же panX, panY, zoom из его события камеры.

## Настройка фреймворка {#framework-setup}

Импортируйте пакет один раз. В Vue включите isCustomElement для префикса dsk- согласно [установке](/ru/guide/installation). Angular использует CUSTOM_ELEMENTS_SCHEMA из примеров. Для React с TypeScript добавьте:

```ts
// src/dsk-canvas.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { DskPanZoom, DskCanvasMarker, DskRuler } from '@flowscape-ui/dsk';
type Props<T> = DetailedHTMLProps<HTMLAttributes<T>, T>;
type Tracking = { 'follow-pan'?: string; 'follow-zoom'?: string };
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-pan-zoom': Props<DskPanZoom>;
      'dsk-canvas-marker': Props<DskCanvasMarker> &
        Tracking & {
          x?: string | number;
          y?: string | number;
          label?: string;
          'pan-x'?: string | number;
          'pan-y'?: string | number;
          zoom?: string | number;
          'scale-with-zoom'?: string;
        };
      'dsk-ruler': Props<DskRuler> &
        Tracking & {
          orientation?: string;
          offset?: string | number;
          zoom?: string | number;
          step?: string | number;
          snap?: string | number;
          target?: string;
          highlights?: string;
          guides?: string;
          disabled?: boolean;
          'guide-offset'?: string | number;
          'guide-zoom'?: string | number;
        };
    }
  }
}
```
