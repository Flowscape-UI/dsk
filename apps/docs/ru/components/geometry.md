# Угол и кривые

Настройте поворот объекта и характер анимации независимыми контролами. Начните с HTML; подключайте события только для связи с вашим интерфейсом.

## Подключение

```sh
npm i @flowscape-ui/dsk
```

::: tip Сначала HTML
Оба компонента работают после импорта пакета без функции инициализации. Это самостоятельные элементы без дочерней разметки, но в HTML им нужны закрывающие теги. JavaScript нужен только для связи с вашим объектом или анимацией. Примеры рассчитаны на клиентское приложение; для SSR смотрите [установку](/ru/guide/installation#server-rendered-applications).
:::

## dsk-angle

Ноль находится сверху, угол растёт по часовой стрелке. Потяните указатель или используйте клавиатуру. Переключение единиц в примере сохраняет физический поворот объекта.

<ClientOnly><GeometryExample kind="angle" /></ClientOnly>

### Добавьте компонент

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-angle value="45" aria-label="Поворот"></dsk-angle>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return <dsk-angle value="45" aria-label="Поворот"></dsk-angle>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <dsk-angle value="45" aria-label="Поворот"></dsk-angle>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<dsk-angle value="45" aria-label="Поворот"></dsk-angle>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<dsk-angle value="45" aria-label="Поворот"></dsk-angle>',
})
export class App {}
```

:::

</div>

Смотрите [настройку фреймворка](#framework-setup) для React и Vue.

### Свяжите угол с объектом

```html
<dsk-angle id="rotation" value="45"></dsk-angle>
<div id="shape">DSK</div>
```

```ts
import '@flowscape-ui/dsk';
const angle = document.querySelector('dsk-angle#rotation');
const shape = document.querySelector<HTMLElement>('#shape');
function update() {
  if (angle && shape) shape.style.transform = `rotate(${angle.degrees}deg)`;
}
angle?.addEventListener('input', update);
update();
// On unmount: angle?.removeEventListener('input', update);
```

### Атрибуты и свойства угла

| Атрибут / свойство          | По умолчанию           | Назначение                                                                                            |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `unit`                      | `deg`                  | `deg`, `rad`, `pi`, `turn`, `grad`; `PI` и `π` также означают `pi`.                                   |
| `value`                     | Эффективный min        | Значение в выбранных единицах, ограниченное диапазоном.                                               |
| `min`, `max`                | 0, полный оборот       | Наличие любого из атрибутов включает ограниченный диапазон.                                           |
| `step`                      | Один физический градус | Положительный шаг в выбранных единицах.                                                               |
| `snap-angle` / `.snapAngle` | 5                      | Шаг перетаскивания с Shift, всегда в градусах. Неверное или неположительное значение заменяется на 5. |
| `segments`                  | 24                     | Число штрихов, целое от 4 до 180. Не влияет на шаг.                                                   |
| `size`                      | 208                    | Положительная длина стороны в пикселях.                                                               |
| `color`                     | `#557be8`              | CSS-цвет сектора, стрелки и маркера; неверное значение заменяется стандартным.                        |
| `disabled` / `.disabled`    | false                  | Запрещает взаимодействие и убирает из клавиатурной навигации.                                         |
| `readonly` / `.readOnly`    | false                  | Запрещает правки, сохраняя фокус.                                                                     |
| `.degrees`                  | Только чтение          | Физический угол в градусах независимо от unit.                                                        |
| `.formattedValue`           | Только чтение          | Текст центральной подписи с единицами.                                                                |
| `aria-label`                | Angle                  | Доступное имя; также можно использовать aria-labelledby.                                              |

Все числовые атрибуты используют выбранную единицу. Порядок атрибутов не важен. После подключения смена unit пересчитывает явные value, min, max и step с сохранением физического угла. Неуказанные max и step по-прежнему означают полный оборот и один физический градус.

| Единица | Полный оборот | Четверть оборота |
| ------- | ------------- | ---------------- |
| deg     | 360           | 90               |
| rad     | 2 × Math.PI   | Math.PI / 2      |
| pi      | 2             | 0.5              |
| turn    | 1             | 0.25             |
| grad    | 400           | 100              |

В режиме pi значение является коэффициентом при π: `value="0.5"` означает π/2. Строки математических выражений не поддерживаются.

Без min и max перетаскивание и стрелки проходят через границу полного оборота. Явное `min="0" max="360"` включает ограниченный режим. Удалите оба атрибута, чтобы снова разрешить переход через ноль. Программное присваивание всегда ограничивается диапазоном. Допустимые физические границы - 0-360°. Если max меньше min, диапазон схлопывается до min. Значения 0 и 360 имеют одинаковое положение указателя, но остаются разными значениями.

```html
<dsk-angle min="45" max="270" step="5" value="135"></dsk-angle>
<dsk-angle unit="pi" value="0.5"></dsk-angle>
```

### Клавиатура и события

Удерживайте Shift при перетаскивании угла для шага 5°. Атрибут `snap-angle="15"` задаёт шаг 15°, независимо от `unit`. Стрелки используют `step`, Shift со стрелками увеличивает его в десять раз.

Tab или `.focus()` переводят фокус на контрол. Стрелки вправо/вверх увеличивают значение, влево/вниз уменьшают. Shift умножает шаг на 10. Page Up/Page Down также используют десять шагов, Home/End выбирают границы. Escape, отмена жеста и потеря фокуса отменяют активное перетаскивание и восстанавливают исходное значение.

`input` передаёт изменения во время редактирования; `change` завершает правку, если значение изменилось. События всплывают и пересекают Shadow DOM. Клавиатурная правка фиксируется сразу. Программные изменения не отправляют события. Булевы атрибуты действуют по наличию: `disabled="false"` всё равно отключает контрол. Для включения удалите атрибут. Автоматической отправки значения с формой нет.

### CSS и другой внешний вид

Один CSS подходит для всех фреймворков. Добавьте класс для ограничения области стилей (`className` в React); в Vue используйте глобальный или unscoped style.

```css
dsk-angle {
  --dsk-angle-size: 240px;
  --dsk-angle-color: #ff0073;
  --dsk-angle-track-color: #39393f;
  --dsk-angle-sector-opacity: 0.25;
  --dsk-angle-focus-color: #ff0073;
  --dsk-angle-text-color: #ffffff;
  --dsk-angle-label-color: #a0a0aa;
}
dsk-angle::part(needle) {
  stroke-width: 4;
}
```

<ClientOnly><GeometryExample kind="angle" styled /></ClientOnly>

Также доступен `--dsk-angle-active-color`, переопределяющий цвет активных элементов. Parts: `container`, `dial`, `track` (кольцо и штрихи), `fill` (сектор), `needle`, `scale-label`, `marker`, `value`, скрытый нативный `input`. Сохраняйте геометрию маркера и шкалы, чтобы положение указателя совпадало с выбранным углом. Центральная область прозрачна.

## dsk-curve

Редактор кривой Безье с несколькими сегментами, координатными полями, пресетами и встроенным предпросмотром. Клик по линии добавляет узел без изменения формы. Круглые маркеры управляют изгибом; квадратные обозначают узлы и концы кривой.

<ClientOnly><GeometryExample kind="curve" /></ClientOnly>

### Добавьте компонент

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-curve
  value="ease-in-out"
  duration="1600"
  aria-label="Плавность анимации"
></dsk-curve>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <dsk-curve
      value="ease-in-out"
      duration="1600"
      aria-label="Плавность анимации"
    ></dsk-curve>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <dsk-curve
    value="ease-in-out"
    duration="1600"
    aria-label="Плавность анимации"
  ></dsk-curve>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<dsk-curve value="ease-in-out" duration="1600" aria-label="Плавность анимации"></dsk-curve>
```

```ts [Angular]
// src/app/app.ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@flowscape-ui/dsk';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-curve value="ease-in-out" duration="1600" aria-label="Плавность анимации"></dsk-curve>',
})
export class App {}
```

:::

</div>

Смотрите [настройку фреймворка](#framework-setup) для React и Vue.

### Превратите кривую в анимацию

Ось X - прошедшее время, ось Y - прогресс выбранного действия. Крутой участок означает быстрое изменение, пологий - медленное. Кривая не является траекторией объекта в пространстве. В примере цветной объект использует вашу кривую, серый - linear с той же длительностью. Переключайте движение, появление и поворот; затем редактируйте кривую и нажимайте «Повторить».

Это код анимации из примера. Сохраните его в `src/curve-motion.ts`. Он работает с одним сегментом и с добавленными узлами через `.cssValue` и учитывает reduced motion.

<<< @/snippets/curve-motion.ts

Добавьте объект и кнопку рядом с редактором:

```html
<dsk-curve id="easing" value="ease-in-out" duration="1600"></dsk-curve>
<div id="card" style="width:100px;height:100px;background:#ff0073">DSK</div>
<button id="replay" type="button">Replay</button>
```

```ts
// src/main.ts
import '@flowscape-ui/dsk';
import { animateWithCurve } from './curve-motion';
const curve = document.querySelector('dsk-curve#easing');
const card = document.querySelector<HTMLElement>('#card');
const replay = document.querySelector<HTMLButtonElement>('#replay');
let animation: Animation | undefined;
const listeners = new AbortController();
replay?.addEventListener(
  'click',
  () => {
    if (!curve || !card) return;
    animation?.cancel();
    animation = animateWithCurve(curve, card, 'reveal');
  },
  { signal: listeners.signal },
);
// On unmount: listeners.abort(); animation?.cancel();
```

Во фреймворке передайте DOM-ссылки на редактор и объект в ту же функцию из обработчика кнопки. Отмените Animation при размонтировании. Примеры подключения тега для всех сред находятся выше; для стандартного редактора этот код не нужен.

### Та же анимация во фреймворках

Используйте `src/curve-motion.ts`, показанный выше. Каждый пример содержит разметку, DOM-ссылки, запуск и очистку анимации. Vanilla-вариант приведён перед вкладками. Для SSR перенесите регистрацию DSK в клиентский lifecycle из раздела установки.

<div class="dsk-framework-code">

::: code-group

```tsx [React]
// src/App.tsx
import { useEffect, useRef } from 'react';
import '@flowscape-ui/dsk';
import type { DskCurve } from '@flowscape-ui/dsk';
import { animateWithCurve } from './curve-motion';
export default function App() {
  const curve = useRef<DskCurve>(null);
  const card = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  useEffect(() => () => animation.current?.cancel(), []);
  function replay() {
    if (!curve.current || !card.current) return;
    animation.current?.cancel();
    animation.current = animateWithCurve(curve.current, card.current, 'reveal');
  }
  return (
    <>
      <dsk-curve ref={curve} value="ease-in-out" duration="1600"></dsk-curve>
      <div
        ref={card}
        style={{ width: 100, height: 100, background: '#ff0073' }}
      >
        DSK
      </div>
      <button onClick={replay}>Replay</button>
    </>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import '@flowscape-ui/dsk';
import type { DskCurve } from '@flowscape-ui/dsk';
import { animateWithCurve } from './curve-motion';
const curve = ref<DskCurve>();
const card = ref<HTMLElement>();
let animation: Animation | undefined;
function replay() {
  if (!curve.value || !card.value) return;
  animation?.cancel();
  animation = animateWithCurve(curve.value, card.value, 'reveal');
}
onBeforeUnmount(() => animation?.cancel());
</script>
<template>
  <dsk-curve ref="curve" value="ease-in-out" duration="1600"></dsk-curve>
  <div ref="card" style="width:100px;height:100px;background:#ff0073">DSK</div>
  <button @click="replay">Replay</button>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import '@flowscape-ui/dsk';
  import type { DskCurve } from '@flowscape-ui/dsk';
  import { animateWithCurve } from './curve-motion';
  let curve: DskCurve;
  let card: HTMLDivElement;
  let animation: Animation | undefined;
  function replay() {
    animation?.cancel();
    animation = animateWithCurve(curve, card, 'reveal');
  }
  onDestroy(() => animation?.cancel());
</script>
<dsk-curve bind:this={curve} value="ease-in-out" duration="1600"></dsk-curve>
<div bind:this={card} style="width:100px;height:100px;background:#ff0073">DSK</div>
<button onclick={replay}>Replay</button>
```

```ts [Angular]
// src/app/app.ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  DestroyRef,
  inject,
} from '@angular/core';
import '@flowscape-ui/dsk';
import type { DskCurve } from '@flowscape-ui/dsk';
import { animateWithCurve } from '../curve-motion';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-curve #curve value="ease-in-out" duration="1600"></dsk-curve>
    <div #card style="width:100px;height:100px;background:#ff0073">DSK</div>
    <button (click)="replay()">Replay</button>
  `,
})
export class App {
  @ViewChild('curve') curve?: ElementRef<DskCurve>;
  @ViewChild('card') card?: ElementRef<HTMLElement>;
  private animation?: Animation;
  constructor() {
    inject(DestroyRef).onDestroy(() => this.animation?.cancel());
  }
  replay() {
    if (!this.curve || !this.card) return;
    this.animation?.cancel();
    this.animation = animateWithCurve(
      this.curve.nativeElement,
      this.card.nativeElement,
      'reveal',
    );
  }
}
```

:::

</div>

### Идеи для вашего интерфейса

| Идея                     | Начните с   | Что менять           |
| ------------------------ | ----------- | -------------------- |
| Панель свойств           | ease-out    | translateY + opacity |
| Перелёт камеры к объекту | ease-in-out | pan + zoom           |
| Поворот карточки         | ease        | rotate               |
| Шкала прогресса          | linear      | scaleX               |

Это идеи применения, а не готовые подсистемы DSK. Направление, расстояние и свойства определяет приложение; кривая определяет изменение во времени. Значения Y ограничены 0-1, поэтому overshoot за эти пределы здесь не предусмотрен. Повторное появление демо не запускает бесконечный цикл; есть ручной повтор и сброс.

### Атрибуты и свойства кривой

| Атрибут / свойство       | По умолчанию         | Назначение                                                                                                                        |
| ------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `value` / `.value`       | ease-in-out          | Пресет, четыре числа, `cubic-bezier(...)` или сохранённый `curve(...)`. Свойство также принимает кортеж из четырёх чисел.         |
| `step`                   | 0.01                 | Положительный шаг для перетаскивания и клавиатуры.                                                                                |
| `duration`               | 1200                 | Положительная длительность встроенного предпросмотра в миллисекундах.                                                             |
| `width`                  | 370                  | Положительная ширина редактора; график квадратный.                                                                                |
| `color`                  | `#557be8`            | CSS-цвет линии, направляющих и маркеров.                                                                                          |
| `grid` / `.grid`         | true                 | Уберите сетку через `grid="false"`; удаление атрибута возвращает сетку.                                                           |
| `disabled` / `.disabled` | false                | Отключает правки, предпросмотр и клавиатурную навигацию.                                                                          |
| `readonly` / `.readOnly` | false                | Запрещает правки, но сохраняет фокус и предпросмотр.                                                                              |
| `.points`                | `[0.42, 0, 0.58, 1]` | Копия четырёх координат первого и последнего управляющих маркеров. Присваивание заменяет путь одним сегментом и сбрасывает концы. |
| `.cssValue`              | Только чтение        | CSS easing: cubic-bezier для одного сегмента со стандартными концами, иначе linear с выборкой точек.                              |
| `.preset`                | ease-in-out          | Только чтение: имя пресета или custom. Отдельного атрибута preset нет.                                                            |
| `.segments`              | Один сегмент         | Глубокая копия CurvePath; принимает массив кортежей CurveSegment.                                                                 |
| `.start`, `.end`         | `[0, 0]`, `[1, 1]`   | Координаты начала и конца; возвращают копии.                                                                                      |
| `.nodes`                 | `[]`                 | Только чтение: внутренние узлы с x, y и kind: node.                                                                               |
| `.activePoint`           | 0                    | Индекс выбранной точки; изменение выбора не отправляет событий.                                                                   |
| `aria-label`             | Motion curve         | Доступное имя; можно использовать aria-labelledby.                                                                                |

`.play()` запускает встроенный предпросмотр один раз, `.stop()` останавливает его и возвращает маркер в начало. Методы `.focus()` и `.blur()` управляют фокусом. При reduced motion предпросмотр сразу показывает конечное положение. Изменение кривой, размера, потеря фокуса окна и удаление компонента сбрасывают встроенную анимацию. Она не изменяет value и не отправляет событий значения.

| Пресет      | Координаты         |
| ----------- | ------------------ |
| linear      | 0, 0, 1, 1         |
| ease        | 0.25, 0.1, 0.25, 1 |
| ease-in     | 0.42, 0, 1, 1      |
| ease-out    | 0, 0, 0.58, 1      |
| ease-in-out | 0.42, 0, 0.58, 1   |

Все координаты ограничены 0-1 и округляются до шести знаков. Узлы упорядочены по X и не пересекаются; Y допускает подъёмы и спады. При перетаскивании координаты привязываются к step; ввод чисел и программные присваивания нормализуются без привязки. Неверное value возвращает стандартную кривую. Пресет задаётся через value.

### Точки, клавиатура и события

Клик по кривой добавляет узел, Add point вставляет его в самый широкий сегмент. Выберите внутренний узел и нажмите Delete/Backspace или Remove point, чтобы удалить его. Удаление может изменить форму. Начало и конец нельзя удалить, но можно двигать. Перемещение конца переносит соседний управляющий маркер; выбор пресета сбрасывает концы. Для n сегментов индексы концов равны `3 * n - 1` и `3 * n`. В остальных индексах чередуются два управляющих маркера и узел.

Tab проходит по маркерам, полям, пресетам и кнопке предпросмотра. Стрелки меняют X/Y выбранного маркера на step, Shift увеличивает шаг в десять раз. Home/End устанавливают границы X, Shift+Home/End - границы Y. Escape отменяет жест или незавершённый ввод. Поля фиксируются по Enter или потере фокуса; неверный или пустой ввод восстанавливает исходное значение.

`input` сообщает живое значение, `change` - завершённую правку. События всплывают и пересекают Shadow DOM; обработчики oninput/onchange также подходят. Отмена изменённого значения отправляет восстанавливающий input без change. Клавиатура и выбор пресета фиксируются сразу. Программные присваивания и выбор активной точки не отправляют событий. disabled/readonly действуют по наличию; grid отдельно поддерживает строку false. Компонент не отправляет значение с HTML-формой автоматически.

### Сохранение и CSS-экспорт

```ts
const curve = document.querySelector('dsk-curve');
if (!curve) throw new Error('Missing curve editor');
const saved = curve.value;
curve.value = saved;
const path = curve.segments;
curve.segments = path;
console.log(curve.cssValue);
```

Сохраняйте `.value` для восстановления без потерь. Один сегмент со стандартными концами возвращает cubic-bezier. Несколько сегментов используют формат DSK `curve([[c1x,c1y,c2x,c2y,endX,endY], ...])`. Если начало смещено, формат имеет вид `curve({"start":[x,y],"segments":[...]})`. Это не CSS. `.segments` также может содержать свойство start, которое нужно сохранять при копировании. Максимум - 512 сегментов; неверный путь, петли времени и не возрастающие X концов сбрасывают кривую.

Для CSS используйте `.cssValue`: несколько сегментов и смещённые концы преобразуются в `linear(...)` с 64 выборками на сегмент. Встроенный предпросмотр вычисляет сами кубические сегменты. До начала X и после конца X прогресс удерживается на соответствующем Y. Для CSS linear нужен браузер с его поддержкой. Экспортируемые типы: CurvePath, CurveSegment, CurvePoint, CurvePoints, CurveValue, CurvePreset и CurveNumber.

### CSS и другой внешний вид

```css
dsk-curve {
  --dsk-curve-width: 370px;
  --dsk-curve-color: #ff0073;
  --dsk-curve-background: #111111;
  --dsk-curve-text-color: #ffffff;
  --dsk-curve-muted-color: #a0a0aa;
  --dsk-curve-border-color: #39393f;
  --dsk-curve-grid-color: transparent;
}
dsk-curve::part(container) {
  border-radius: 0;
}
dsk-curve::part(curve) {
  stroke-width: 4;
}
```

<ClientOnly><GeometryExample kind="curve" styled /></ClientOnly>

В этом варианте скрыта сетка и утолщена кривая. CSS одинаков для всех фреймворков. Parts: `container`, `heading`, `graph-container`, `graph`, `grid`, `diagonal`, `curve`, `guide`, `endpoint`, `axis`, `handle`, `handle-one`, `handle-two`, `coordinate`, `presets`, `preset`, `preview`, `play`, `motion-dot`, `value`, `add`, `remove`. Сохраняйте совпадение геометрии графика и маркеров при настройке стилей.

## Настройка фреймворка {#framework-setup}

Импортируйте пакет один раз. В Vue включите `isCustomElement: tag => tag.startsWith("dsk-")` в конфигурации компилятора шаблонов, как в [примере установки](/ru/guide/installation). Angular использует CUSTOM_ELEMENTS_SCHEMA из примеров выше. Для React с TypeScript добавьте файл деклараций:

```ts
// src/dsk-geometry.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type { DskAngle, DskCurve } from '@flowscape-ui/dsk';
type GeometryProps<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  value?: string | number;
  step?: string | number;
  color?: string;
  disabled?: boolean;
  readonly?: boolean;
};
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-angle': GeometryProps<DskAngle> & {
        'snap-angle'?: string | number;
        unit?: string;
        min?: string | number;
        max?: string | number;
        size?: string | number;
        segments?: string | number;
      };
      'dsk-curve': GeometryProps<DskCurve> & {
        width?: string | number;
        duration?: string | number;
        grid?: string;
      };
    }
  }
}
```

## История изменений

Угол и кривая поддерживают Ctrl/Cmd+Z и Ctrl/Cmd+Shift+Z при фокусе. Одно перетаскивание - одна запись; Escape отменяет его без записи. Для отмены всей кривой сфокусируйте маркер; поля координат сохраняют редактирование черновика. Внешнее присваивание значения сбрасывает историю. disabled и readonly запрещают восстановление.
