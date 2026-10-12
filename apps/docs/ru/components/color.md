# Цвет и пипетка

Соберите выбор цвета из самостоятельных компонентов: насыщенность/яркость, тон, прозрачность и пипетка. Каждый работает отдельно. Связывайте их событиями, только если приложению нужен общий цвет.

Установите пакет один раз, затем выберите фреймворк в нужном примере:

```sh
npm i @flowscape-ui/dsk
```

::: tip Сначала HTML

После загрузки `@flowscape-ui/dsk` в браузере теги работают без функции инициализации и обработчика событий. В HTML им нужны закрывающие теги. Примеры рассчитаны на клиентское приложение со сборщиком, например Vite. Для SSR используйте [рецепты подключения](/ru/guide/installation#приложения-с-ssr).

:::

## dsk-color-area

Выбирайте насыщенность и яркость, не меняя цветовой тон.

<ClientOnly><ColorExample kind="area" /></ClientOnly>

### Добавление компонента

```html
<dsk-color-area
  hue="333"
  saturation="100"
  brightness="100"
  aria-label="Насыщенность и яркость"
></dsk-color-area>
```

### Подключение к проекту

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-area
  hue="333"
  saturation="100"
  brightness="100"
  aria-label="Насыщенность и яркость"
></dsk-color-area>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return (
    <dsk-color-area
      hue="333"
      saturation="100"
      brightness="100"
      aria-label="Насыщенность и яркость"
    ></dsk-color-area>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-area
    hue="333"
    saturation="100"
    brightness="100"
    aria-label="Насыщенность и яркость"
  ></dsk-color-area>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-area hue="333" saturation="100" brightness="100" aria-label="Насыщенность и яркость"></dsk-color-area>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-color-area hue="333" saturation="100" brightness="100" aria-label="Насыщенность и яркость"></dsk-color-area>',
})
export class App {}
```

:::

</div>

Импортируйте пакет один раз. React TypeScript нужны объявления из [настройки фреймворков](#framework-setup), Vue – однократная настройка `isCustomElement` из того же раздела. Контроллер демо не нужен.

### Необязательно: чтение результата

Добавляйте обработчик, только если нужно обновлять модель или другой элемент:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-area');
control?.addEventListener('change', () => {
  console.log(control.color);
});
```

Для обновлений в процессе используйте `input` вместо `change`. Объект выше демонстрирует такую связь; самому компоненту код превью не нужен.

### CSS и другое оформление

Добавьте тегу `class="custom-color"` (`className` в React), затем поместите этот CSS в файл стилей. В Vue используйте `<style>` без `scoped`. CSS одинаков для всех фреймворков.

```css
dsk-color-area.custom-color {
  --dsk-color-area-radius: 0px;
  --dsk-color-area-marker-size: 20px;
  --dsk-color-area-focus-color: #ff0073;
}
dsk-color-area.custom-color::part(surface) {
  outline: 1px solid #606066;
  outline-offset: 4px;
}
```

<ClientOnly><ColorExample kind="area" styled /></ClientOnly>

### API и поведение

| Атрибут / свойство                   | По умолчанию | Назначение                                                           |
| ------------------------------------ | ------------ | -------------------------------------------------------------------- |
| `hue`                                | `0`          | Градусы, циклически приводятся к [0, 360).                           |
| `saturation`                         | `100`        | Насыщенность, 0–100%.                                                |
| `brightness`                         | `100`        | Яркость HSV, 0–100%.                                                 |
| `step`                               | `1`          | Шаг клавиатуры в процентных пунктах; Shift ×10.                      |
| `width`, `height`                    | `208 × 208`  | Положительный размер в пикселях; большая сторона задаёт обе стороны. |
| `disabled`, `readonly` / `.readOnly` | `false`      | Отключают взаимодействие или запрещают изменения, сохраняя фокус.    |
| `.color`                             | `#FF0000`    | RGB HEX без прозрачности, только чтение.                             |

Числовые свойства принимают числа, числовые строки, `null` и `undefined`; последние два значения удаляют атрибут. Некорректные каналы используют значения по умолчанию, проценты ограничены диапазоном 0–100. Некорректные или неположительные размеры и шаги заменяются стандартными. `disabled` и `readonly` действуют по наличию: даже `disabled="false"` отключает компонент. Глобальные HTML-атрибуты и доступные названия поддерживаются. Значение формы автоматически не отправляется.

`input` сообщает об изменениях в процессе, `change` – о подтверждении. Оба события всплывают и проходят через Shadow DOM; читайте свойства компонента, а не `event.detail`. Программные присваивания обновляют интерфейс без событий. Escape отменяет жест и восстанавливает начальное значение. `.focus()` переводит фокус во внутренний клавиатурный контрол.

Насыщенность растёт слева направо, яркость – снизу вверх. Tab выбирает канал, Left/Right меняют насыщенность, Up/Down – яркость, Home/End задают 0/100. Выбор серого или чёрного сохраняет тон. Захват указателя позволяет продолжать перетаскивание за пределами квадрата.

Палитра остаётся квадратной: `width="240" height="180"` даёт 240 × 240. Inline width/height работают так же. Для размеров из CSS используйте `--dsk-color-area-width` и `--dsk-color-area-height` (по умолчанию 208px); побеждает большая сторона. Радиус по умолчанию – 4px, цвет фокуса – #557be8, размер маркера – 14px. Части: `surface`, `marker`. Не переопределяйте геометрию положения маркера.

## dsk-color-hue

Выбирайте цветовой тон на спектре.

<ClientOnly><ColorExample kind="hue" /></ClientOnly>

### Добавление компонента

```html
<dsk-color-hue hue="333" aria-label="Цветовой тон"></dsk-color-hue>
```

### Подключение к проекту

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-hue hue="333" aria-label="Цветовой тон"></dsk-color-hue>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-color-hue hue="333" aria-label="Цветовой тон"></dsk-color-hue>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-hue hue="333" aria-label="Цветовой тон"></dsk-color-hue>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-hue hue="333" aria-label="Цветовой тон"></dsk-color-hue>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-color-hue hue="333" aria-label="Цветовой тон"></dsk-color-hue>',
})
export class App {}
```

:::

</div>

Импортируйте пакет один раз. React TypeScript нужны объявления из [настройки фреймворков](#framework-setup), Vue – однократная настройка `isCustomElement` из того же раздела. Контроллер демо не нужен.

### Необязательно: чтение результата

Добавляйте обработчик, только если нужно обновлять модель или другой элемент:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-hue');
control?.addEventListener('change', () => {
  console.log(control.color);
});
```

Для обновлений в процессе используйте `input` вместо `change`. Объект выше демонстрирует такую связь; самому компоненту код превью не нужен.

### CSS и другое оформление

Добавьте тегу `class="custom-color"` (`className` в React), затем поместите этот CSS в файл стилей. В Vue используйте `<style>` без `scoped`. CSS одинаков для всех фреймворков.

```css
dsk-color-hue.custom-color {
  --dsk-color-slider-height: 24px;
  --dsk-color-slider-radius: 0px;
  --dsk-color-slider-marker-size: 20px;
  --dsk-color-slider-focus-color: #ff0073;
}
```

<ClientOnly><ColorExample kind="hue" styled /></ClientOnly>

### API и поведение

| Атрибут / свойство                   | По умолчанию | Назначение                                                       |
| ------------------------------------ | ------------ | ---------------------------------------------------------------- |
| `hue`                                | `0`          | Градусы от 0 до 360; 360 сохраняет маркер у правого края.        |
| `.color`                             | `#FF0000`    | RGB HEX полной насыщенности и яркости, только чтение.            |
| `step`                               | `1`          | Положительный шаг клавиатуры.                                    |
| `width`, `height`                    | `208`, `16`  | Положительные размеры в пикселях; поддерживаются размеры из CSS. |
| `disabled`, `readonly` / `.readOnly` | `false`      | Disabled убирает клавиатурный доступ; readonly сохраняет фокус.  |

Числовые свойства принимают числа, числовые строки, `null` и `undefined`; последние два значения удаляют атрибут. Некорректные каналы используют значения по умолчанию, проценты ограничены диапазоном 0–100. Некорректные или неположительные размеры и шаги заменяются стандартными. `disabled` и `readonly` действуют по наличию: даже `disabled="false"` отключает компонент. Глобальные HTML-атрибуты и доступные названия поддерживаются. Значение формы автоматически не отправляется.

`input` сообщает об изменениях в процессе, `change` – о подтверждении. Оба события всплывают и проходят через Shadow DOM; читайте свойства компонента, а не `event.detail`. Программные присваивания обновляют интерфейс без событий. Escape отменяет жест и восстанавливает начальное значение. `.focus()` переводит фокус во внутренний клавиатурный контрол.

Нажмите на полосу или перетаскивайте маркер. Right/Up увеличивают значение, Left/Down уменьшают; Shift и Page Up/Down используют десять шагов. Home/End выбирают крайние значения. Отмена указателя или потеря фокуса отменяют перетаскивание. Каждая клавиатурная регулировка подтверждается отдельно.

CSS-переменные: `--dsk-color-slider-width` (208px), `--dsk-color-slider-height` (16px), `--dsk-color-slider-radius` (999px), `--dsk-color-slider-marker-size` (14px), `--dsk-color-slider-focus-color` (#557be8). Части: `track`, `marker`, `input`. Сохраняйте доступность скрытого нативного range.

## dsk-color-alpha

Меняйте прозрачность, сохраняя базовый цвет.

<ClientOnly><ColorExample kind="alpha" /></ClientOnly>

### Добавление компонента

```html
<dsk-color-alpha
  color="#FF0073"
  alpha="60"
  aria-label="Прозрачность"
></dsk-color-alpha>
```

### Подключение к проекту

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-alpha
  color="#FF0073"
  alpha="60"
  aria-label="Прозрачность"
></dsk-color-alpha>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return (
    <dsk-color-alpha
      color="#FF0073"
      alpha="60"
      aria-label="Прозрачность"
    ></dsk-color-alpha>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-alpha
    color="#FF0073"
    alpha="60"
    aria-label="Прозрачность"
  ></dsk-color-alpha>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-alpha color="#FF0073" alpha="60" aria-label="Прозрачность"></dsk-color-alpha>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-color-alpha color="#FF0073" alpha="60" aria-label="Прозрачность"></dsk-color-alpha>',
})
export class App {}
```

:::

</div>

Импортируйте пакет один раз. React TypeScript нужны объявления из [настройки фреймворков](#framework-setup), Vue – однократная настройка `isCustomElement` из того же раздела. Контроллер демо не нужен.

### Необязательно: чтение результата

Добавляйте обработчик, только если нужно обновлять модель или другой элемент:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-alpha');
control?.addEventListener('change', () => {
  console.log(control.rgba);
});
```

Для обновлений в процессе используйте `input` вместо `change`. Объект выше демонстрирует такую связь; самому компоненту код превью не нужен.

### CSS и другое оформление

Добавьте тегу `class="custom-color"` (`className` в React), затем поместите этот CSS в файл стилей. В Vue используйте `<style>` без `scoped`. CSS одинаков для всех фреймворков.

```css
dsk-color-alpha.custom-color {
  --dsk-color-slider-height: 24px;
  --dsk-color-slider-radius: 0px;
  --dsk-color-slider-marker-size: 20px;
  --dsk-color-slider-focus-color: #ff0073;
}
```

<ClientOnly><ColorExample kind="alpha" styled /></ClientOnly>

### API и поведение

| Атрибут / свойство                   | По умолчанию | Назначение                                                                                    |
| ------------------------------------ | ------------ | --------------------------------------------------------------------------------------------- |
| `color`                              | `#FF0000`    | RGB без прозрачности, 3 или 6 HEX-цифр, # необязателен; некорректный цвет заменяется красным. |
| `alpha`                              | `100`        | Непрозрачность в процентах, 0–100.                                                            |
| `.rgba`                              | `#FF0000FF`  | Только чтение: #RRGGBBAA, альфа округляется до байта.                                         |
| `step`                               | `1`          | Положительный шаг клавиатуры.                                                                 |
| `width`, `height`                    | `208`, `16`  | Положительные размеры в пикселях; поддерживаются размеры из CSS.                              |
| `disabled`, `readonly` / `.readOnly` | `false`      | Disabled убирает клавиатурный доступ; readonly сохраняет фокус.                               |

Числовые свойства принимают числа, числовые строки, `null` и `undefined`; последние два значения удаляют атрибут. Некорректные каналы используют значения по умолчанию, проценты ограничены диапазоном 0–100. Некорректные или неположительные размеры и шаги заменяются стандартными. `disabled` и `readonly` действуют по наличию: даже `disabled="false"` отключает компонент. Глобальные HTML-атрибуты и доступные названия поддерживаются. Значение формы автоматически не отправляется.

`input` сообщает об изменениях в процессе, `change` – о подтверждении. Оба события всплывают и проходят через Shadow DOM; читайте свойства компонента, а не `event.detail`. Программные присваивания обновляют интерфейс без событий. Escape отменяет жест и восстанавливает начальное значение. `.focus()` переводит фокус во внутренний клавиатурный контрол.

Нажмите на полосу или перетаскивайте маркер. Right/Up увеличивают значение, Left/Down уменьшают; Shift и Page Up/Down используют десять шагов. Home/End выбирают крайние значения. Отмена указателя или потеря фокуса отменяют перетаскивание. Каждая клавиатурная регулировка подтверждается отдельно.

CSS-переменные: `--dsk-color-slider-width` (208px), `--dsk-color-slider-height` (16px), `--dsk-color-slider-radius` (999px), `--dsk-color-slider-marker-size` (14px), `--dsk-color-slider-focus-color` (#557be8). Части: `track`, `marker`, `input`. Сохраняйте доступность скрытого нативного range.

Изменение `color` сохраняет `alpha`. Трёхзначный RGB разворачивается в шесть цифр. RGBA, именованные цвета и CSS-функции не принимаются как базовый цвет. Шахматный фон помогает видеть нулевую непрозрачность.

## dsk-color-eyedropper

Берите цвет с canvas, снимка страницы или экрана.

### Попробуйте разные режимы

Выберите режим в списке **Режим**, затем нажмите кнопку пипетки. Попробуйте выбрать один и тот же образец в Canvas и «Свой: оттенки серого»: лупа и результат будут разными. Native можно выбрать и без поддержки браузером – пояснение покажет, почему кнопка недоступна. Смена режима отменяет текущую сессию и сохраняет выбранный цвет.

<ClientOnly><ColorExample kind="eyedropper" /></ClientOnly>

| Режим                | Что меняется                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Canvas               | Читает живые пиксели трёх образцов, показывает лупу DSK.                                                                    |
| Page                 | Делает приблизительный снимок страницы; можно выбирать её содержимое, навигация снимка фиксируется.                         |
| Native               | Открывает системную пипетку браузера; оформление её лупы не меняется CSS DSK.                                               |
| Свой: оттенки серого | Зарегистрированный в демо режим grayscale: преобразует пиксели canvas в серые оттенки до показа лупы и подтверждения цвета. |
| Auto                 | Выбирает Native при поддержке, иначе Page.                                                                                  |

Режим Page по умолчанию снимает видимую область экрана. Невидимые ветки заменяются пустыми блоками с сохранением размеров, поэтому их содержимое, изображения и canvas не нужно отрисовывать. Небольшой запас вокруг экрана сохраняет ближайшие края и тени. Видимые дочерние элементы, включая закреплённые, остаются в снимке. Для длинной страницы не нужен дополнительный фильтр.

**grayscale не встроен в DSK.** Это пример режима приложения. [Ниже показан весь код регистрации](#custom-mode-example).

### Добавление компонента

```html
<dsk-color-eyedropper aria-label="Взять цвет"></dsk-color-eyedropper>
```

Тег выше автоматически выбирает системную пипетку, если она доступна, иначе снимок страницы. Интерактивный пример начинает с `mode="canvas"`; переключатель позволяет сравнить встроенные режимы и режим приложения.

### Подключение к проекту

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-color-eyedropper aria-label="Взять цвет"></dsk-color-eyedropper>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-color-eyedropper aria-label="Взять цвет"></dsk-color-eyedropper>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-color-eyedropper aria-label="Взять цвет"></dsk-color-eyedropper>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-color-eyedropper aria-label="Взять цвет"></dsk-color-eyedropper>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template:
    '<dsk-color-eyedropper aria-label="Взять цвет"></dsk-color-eyedropper>',
})
export class App {}
```

:::

</div>

Импортируйте пакет один раз. React TypeScript нужны объявления из [настройки фреймворков](#framework-setup), Vue – однократная настройка `isCustomElement` из того же раздела. Контроллер демо не нужен.

### Необязательно: чтение результата

Добавляйте обработчик, только если нужно обновлять модель или другой элемент:

```ts
// src/main.ts, loaded by your page as a module
import '@flowscape-ui/dsk';

const control = document.querySelector('dsk-color-eyedropper');
control?.addEventListener('change', () => {
  console.log(control.color);
});
```

Для обновлений в процессе используйте `input` вместо `change`. Объект выше демонстрирует такую связь; самому компоненту код превью не нужен.

### CSS и другое оформление

Добавьте тегу `class="custom-color"` (`className` в React), затем поместите этот CSS в файл стилей. В Vue используйте `<style>` без `scoped`. CSS одинаков для всех фреймворков.

```css
dsk-color-eyedropper.custom-color {
  --dsk-color-eyedropper-size: 40px;
  --dsk-color-eyedropper-background: #1a181a;
  --dsk-color-eyedropper-color: #f5f5f5;
  --dsk-color-eyedropper-border-color: #303033;
  --dsk-color-eyedropper-hover-background: #1b191b;
  --dsk-color-eyedropper-active-color: #ff0073;
  --dsk-color-eyedropper-focus-color: #ff0073;
  --dsk-color-eyedropper-radius: 0px;
  --dsk-color-eyedropper-magnifier-size: 144px;
  --dsk-color-eyedropper-magnifier-radius: 0px;
}
```

<ClientOnly><ColorExample kind="eyedropper" styled /></ClientOnly>

### Попробуйте режим canvas

Пипетке не нужен обработчик события, чтобы выбрать и сохранить цвет. Этот JavaScript только рисует три образца. В редакторе укажите в `source` уже отрисованный canvas. Во фреймворке рисуйте после появления canvas в DOM; разметка пипетки не меняется.

```html
<dsk-color-eyedropper
  mode="canvas"
  source="#editor-canvas"
  aria-label="Pick color"
></dsk-color-eyedropper>
<canvas id="editor-canvas" width="180" height="96"></canvas>
<script type="module" src="/src/canvas-demo.ts"></script>
```

```ts
// src/canvas-demo.ts
import '@flowscape-ui/dsk';
const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas');
const context = canvas?.getContext('2d');
if (context) {
  ['#FF0073', '#7755FF', '#FFC857'].forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(index * 60, 0, 60, 96);
  });
}
```

### Добавьте собственный режим {#custom-mode-example}

1. Возьмите canvas и код рисования из примера выше.
2. Создайте `src/eyedropper-grayscale.ts` с кодом ниже. Это тот же файл, который запускается в интерактивном примере.
3. Зарегистрируйте режим для нужного экземпляра пипетки и выберите его через `.mode`.

<<< @/snippets/eyedropper-grayscale.ts

Добавьте после рисования canvas в `src/canvas-demo.ts`:

```ts
import { registerGrayscaleMode } from './eyedropper-grayscale';

const picker = document.querySelector('dsk-color-eyedropper');
if (picker) {
  const unregister = registerGrayscaleMode(picker);
  picker.mode = 'grayscale';
  // Call unregister() when your view is removed.
}
```

`isSupported` проверяет наличие источника. `createSession` создаёт сессию выбора. Её `sample` читает небольшой участок canvas и заменяет RGB-каналы взвешенным серым значением. Сам canvas остаётся цветным; серыми становятся только пиксели лупы и итоговый цвет. Это демонстрационный фильтр, а не преобразование цветового пространства.

Отдельный режим может читать пиксели вашего рендерера или объединять слои вместо такого фильтра. Верните `dispose`, если сессия создаёт временные ресурсы; в этом примере собственных ресурсов нет. Во фреймворке регистрируйте режим после появления элемента в DOM и вызывайте возвращённый `unregister()` при удалении представления. Для SSR импортируйте этот модуль только в браузере.

Если нужен свой список режимов, его можно построить из `picker.modes` (id, label, supported). Чтобы вернуться к автоматическому режиму, удалите атрибут mode или присвойте `picker.mode = null`.

### API и поведение

| Атрибут            | Свойство          | По умолчанию        | Назначение                                                                                                                           |
| ------------------ | ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `color`            | `color`           | `""`                | Последний RGB HEX. Принимает 3 или 6 цифр с необязательным #; возвращает #RRGGBB. Некорректное значение даёт пустую строку.          |
| –                  | `value`           | `""`                | Читаемый и записываемый псевдоним color. Атрибута value нет.                                                                         |
| `size`             | `size`            | `32`                | Положительный размер квадратной кнопки в пикселях.                                                                                   |
| `mode`             | `mode`            | native или page     | Без атрибута: native при поддержке, иначе page. Явный режим не подменяется другим. custom – прежнее имя canvas.                      |
| `source`           | `source`          | Не задан            | Атрибут – CSS-селектор canvas в корне компонента; свойство – HTMLCanvasElement или null. Без источника canvas ищется под указателем. |
| –                  | `sampler`         | Не задан            | Функция EyeDropperSampler для canvas/custom; имеет приоритет над source.                                                             |
| –                  | `pageOptions`     | Видимая область     | Настройки снимка DOM; не влияют на другие режимы.                                                                                    |
| –                  | `modes`           | Встроенные режимы   | Массив { id, label, supported }, включая зарегистрированные режимы. Только чтение.                                                   |
| `magnifier-pixels` | `magnifierPixels` | `9`                 | Нечётная сторона области чтения: 3–31 пиксель. Чётное число увеличивается до следующего нечётного.                                   |
| `disabled`         | `disabled`        | `false`             | Наличие атрибута запрещает выбор и клавиатурный фокус кнопки.                                                                        |
| –                  | `supported`       | Зависит от режима   | Проверка доступности выбранного режима, только чтение.                                                                               |
| –                  | `nativeSupported` | Зависит от браузера | Проверка нативного API независимо от режима, только чтение.                                                                          |
| –                  | `picking`         | `false`             | Активен ли выбор, только чтение.                                                                                                     |

`size` и `magnifierPixels` принимают числа, числовые строки, null и undefined. Некорректные и неположительные значения используют значения по умолчанию. Для color/value допустимы строки и null/undefined. Null/undefined удаляют атрибут. Удаление или пустое значение mode возвращают автоматический выбор режима. Присваивание `.source = canvas` удаляет атрибут-селектор; `.source = null` убирает явный источник. Глобальные атрибуты `aria-label`, `title`, `tabindex` поддерживаются, `.focus()` фокусирует кнопку. Компонент не отправляет значение формы автоматически и не поддерживает readonly.

### Режимы и ограничения

| Режим                  | Источник                              | Когда использовать                                         |
| ---------------------- | ------------------------------------- | ---------------------------------------------------------- |
| `canvas`               | Актуальные пиксели canvas или sampler | Редактор с живым pan/zoom и точным чтением пикселей.       |
| `page`                 | Приблизительный снимок DOM            | Цвета внутри страницы без собственного рендерера.          |
| `native`               | Системная пипетка браузера            | Выбор цвета с экрана, если API поддерживается.             |
| Зарегистрированное имя | Адаптер приложения                    | Собственный движок, несколько слоёв или источник пикселей. |

Нативный режим требует защищённого контекста и запуска по действию пользователя; поддержка есть не во всех браузерах. Его лупа принадлежит браузеру и не меняется CSS библиотеки. [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API).

В режиме canvas прозрачные пиксели компонуются поверх белого. Поддерживаются обычное растяжение и положительный осевой CSS-масштаб. CSS-фильтры, вращение, HTML-оверлеи и другие эффекты поверх canvas не входят в его пиксельный буфер. Для них передайте окончательную композицию через sampler. Canvas с изображениями без разрешённого CORS недоступен для чтения.

Page создаёт снимок на момент запуска. Закрытые Shadow Root, внешние iframe, защищённые данные, недоступные ресурсы, нативные элементы и некоторые эффекты могут отсутствовать или выглядеть иначе. Это не доступ к окнам ОС или интерфейсу браузера. Для точного живого редактора используйте canvas. Все режимы возвращают непрозрачный RGB HEX без исходного альфа-канала.

### События и методы

| Событие / метод                | Результат                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `input`, затем `change`        | Успешный выбор; читайте `.color` или `.value`. Срабатывают даже при повторном выборе того же цвета. |
| `pickstart`                    | Запрошен запуск выбора.                                                                             |
| `cancel`                       | Отмена пользователем, Escape или `.cancel()`; предыдущий цвет сохранён.                             |
| `pickerror`                    | Ошибка в `detail.error` типа Error.                                                                 |
| `colorpreview`                 | Предпросмотр в ненативных режимах: `detail` содержит цвет, координаты и пиксели.                    |
| `.open()`                      | Promise<string \| null>: выбранный HEX или null при незавершённом выборе.                           |
| `.cancel()`                    | Отмена активной сессии.                                                                             |
| `.registerMode(name, adapter)` | Регистрация адаптера для этого экземпляра.                                                          |
| `.unregisterMode(name)`        | Удаление регистрации; возвращает boolean.                                                           |

Встроенная кнопка сама запускает выбор. Вызывайте `.open()` напрямую из обработчика клика или клавиатуры, чтобы сохранить пользовательскую активацию для native. Программное присваивание цвета не отправляет событий. Изменение color, mode, source, sampler, pageOptions, magnifierPixels, отключение и удаление компонента бесшумно отменяют сессию; запоздавшие результаты не перезаписывают новое состояние.

В canvas наведите указатель и нажмите для выбора; стрелки перемещают точку на 1 CSS-пиксель, Shift – на 10, Enter подтверждает, Escape отменяет. При заданном canvas клавиатурный выбор начинается в его центре. Wheel, средняя кнопка, правая кнопка и Space + drag проходят в редактор. Прокрутка и resize не завершают живой выбор; смена окна или скрытие страницы отменяют его. Page, напротив, фиксирует захваченный вид и отменяется при прокрутке/resize. Одновременно активна только одна ненативная пипетка документа.

```ts
import type {
  EyeDropperErrorDetail,
  EyeDropperPreviewDetail,
} from '@flowscape-ui/dsk';
const picker = document.querySelector('dsk-color-eyedropper');
picker?.addEventListener('pickerror', (event) => {
  console.error((event as CustomEvent<EyeDropperErrorDetail>).detail.error);
});
picker?.addEventListener('colorpreview', (event) => {
  const { color, pixels, x, y } = (
    event as CustomEvent<EyeDropperPreviewDetail>
  ).detail;
  console.log(color, pixels, x, y);
});
```

### Настройки снимка страницы

Все настройки задаются свойством `.pageOptions`, а не HTML-атрибутом. Присваивание заменяет предыдущую конфигурацию; null/undefined восстанавливают значения по умолчанию. Массивы копируются, объект при чтении неизменяемый.

| Параметр          | По умолчанию            | Назначение                                                               |
| ----------------- | ----------------------- | ------------------------------------------------------------------------ |
| `embedFonts`      | true                    | Встраивать доступные шрифты.                                             |
| `inlineImages`    | true                    | Встраивать доступные изображения, включая CSS-изображения.               |
| `preserveScroll`  | true                    | Сохранять внутреннюю прокрутку элементов.                                |
| `pseudoElements`  | Список и поиск в стилях | Массив заменяет набор псевдоэлементов; false или [] отключает их захват. |
| `styleProperties` | Все computed styles     | Массив ограничивает копируемые CSS-свойства; [] исключает все.           |
| `filterStyles`    | Все стили               | Дополнительный фильтр (element, property, pseudo) => boolean.            |
| `filter`          | Содержимое страницы     | Фильтр (node) => boolean; исключение узла исключает и его потомков.      |

```ts
const picker = document.querySelector('dsk-color-eyedropper');
if (picker) {
  picker.pageOptions = {
    embedFonts: true,
    inlineImages: true,
    filter: (node) =>
      !(node instanceof Element && node.matches('[data-debug]')),
  };
}
```

Фильтры работают со снимком, не меняя живую страницу. Ограничение списка CSS-свойств может изменить размеры, типографику и внешний вид снимка. Настройки не дают доступ к пикселям окончательного браузерного композитора.

### Подключение собственного рендерера

`EyeDropperSampler` получает `{ x, y, size, signal }` в координатах viewport CSS и возвращает непрозрачный sRGB ImageData размером size × size с выбранным пикселем в центре, null вне доступной области или Promise одного из этих значений. Учитывайте отмену через signal и читайте небольшую область вместо полного кадра. Устаревшие асинхронные результаты игнорируются. Нажатие запрашивает свежие пиксели именно в выбранной точке.

```ts
import { createCanvasSampler } from '@flowscape-ui/dsk';
const picker = document.querySelector('dsk-color-eyedropper');
const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas');
if (picker && canvas) {
  picker.mode = 'canvas';
  picker.sampler = createCanvasSampler(canvas);
}
```

Для отдельного режима зарегистрируйте адаптер. `isSupported` синхронный и без побочных эффектов; контекст содержит host, document, signal и source. Сессия возвращает sample, необязательный dispose и необязательный canvas surface для режима, фиксирующего изображение. Для живого редактора surface не нужен.

```ts
import { createCanvasSampler } from '@flowscape-ui/dsk';
const picker = document.querySelector('dsk-color-eyedropper');
const canvas = document.querySelector<HTMLCanvasElement>('#editor-canvas');
if (picker && canvas) {
  picker.source = canvas;
  picker.registerMode('editor', {
    label: 'Editor',
    isSupported: ({ source }) => source !== null,
    createSession: ({ source, signal }) => {
      if (!source || signal.aborted)
        throw new DOMException('Canceled', 'AbortError');
      return { sample: createCanvasSampler(source) };
    },
  });
  picker.mode = 'editor';
}
```

Подготовка может возвращать Promise. Освобождайте собственные временные ресурсы, в том числе при отмене до создания сессии. Возвращённый dispose вызывается один раз при завершении, отмене, ошибке или смене режима, даже если подготовка завершилась после отмены. Не бросайте исключения из dispose. Неизвестное имя режима блокирует выбор; удаление активного адаптера завершает сессию. Sampler свойства компонента влияет только на canvas/custom и не подменяет sample адаптера.

### Стили кнопки и лупы

Кнопка открывает части `button`, `icon`, `status`; status должен остаться доступным для скринридеров. Основные CSS-переменные показаны в примере оформления выше. По умолчанию размер кнопки 32px, радиус 7px, фон #fff, цвет #566174, граница #dce2ec, hover #f1f4f9, active/focus #557be8.

Ненативная лупа открывает части `overlay`, `magnifier`, `lens`, `pixels`, `grid`, `crosshair`, `readout`, `swatch`, `value`; режим снимка добавляет `snapshot`. Сохраняйте лупу неинтерактивной, чтобы она не перехватывала навигацию редактора. Текущий цвет доступен через `--dsk-color-eyedropper-selected-color` и `data-color`.

```css
dsk-color-eyedropper {
  --dsk-color-eyedropper-magnifier-size: 144px;
  --dsk-color-eyedropper-magnifier-radius: 0px;
  --dsk-color-eyedropper-magnifier-border: 2px solid #fff;
  --dsk-color-eyedropper-magnifier-shadow: 0 4px 12px #0008;
  --dsk-color-eyedropper-magnifier-background: #111;
  --dsk-color-eyedropper-magnifier-color: #fff;
  --dsk-color-eyedropper-magnifier-offset: 20px;
  --dsk-color-eyedropper-grid-color: #fff;
  --dsk-color-eyedropper-grid-opacity: 1;
  --dsk-color-eyedropper-crosshair-border: 1px solid #fff;
  --dsk-color-eyedropper-crosshair-shadow: 0 0 0 1px #000;
  --dsk-color-eyedropper-readout-radius: 0px;
  --dsk-color-eyedropper-readout-display: flex;
}
dsk-color-eyedropper::part(value) {
  font-family: monospace;
}
```

По умолчанию лупа круглая, 120px, с сеткой 9 × 9. magnifier-pixels меняет число исходных пикселей независимо от размера лупы. Offset задаётся числом или px. Shadow использует filter: drop-shadow(), поэтому inset и spread не поддерживаются. Grid opacity 0 скрывает сетку; readout display none скрывает подпись. У сетки mix-blend-mode: difference; для фиксированного цвета переопределите его на normal через ::part(grid).

Можно полностью заменить лупу через слот magnifier. Позиционирование и управление остаются у компонента; пользовательский canvas заполняется из colorpreview:

```html
<dsk-color-eyedropper mode="canvas" source="#editor-canvas">
  <div slot="magnifier" class="my-loupe">
    <canvas class="my-pixels" aria-hidden="true"></canvas>
    <span class="my-hex"></span>
  </div>
</dsk-color-eyedropper>
```

```ts
import type { EyeDropperPreviewDetail } from '@flowscape-ui/dsk';
const picker = document.querySelector('dsk-color-eyedropper');
const pixels = picker?.querySelector<HTMLCanvasElement>('.my-pixels');
const label = picker?.querySelector<HTMLElement>('.my-hex');
picker?.addEventListener('colorpreview', (event) => {
  const detail = (event as CustomEvent<EyeDropperPreviewDetail>).detail;
  if (!pixels || !label) return;
  pixels.width = detail.pixels.width;
  pixels.height = detail.pixels.height;
  pixels.getContext('2d')?.putImageData(detail.pixels, 0, 0);
  label.textContent = detail.color;
});
```

## Настройка фреймворков {#framework-setup}

Настройка нужна один раз на приложение. Сохраните текущую конфигурацию; создавать обёртку для каждого цветового компонента не требуется.

<details>
<summary>React + TypeScript</summary>

Добавьте файл объявлений рядом с объявлениями инпутов. Он описывает используемые выше атрибуты и не добавляет исполняемый код.

```ts
// src/dsk-color.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DskColorArea,
  DskColorHue,
  DskColorAlpha,
  DskColorEyedropper,
} from '@flowscape-ui/dsk';

type ColorProps<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  hue?: string | number;
  saturation?: string | number;
  brightness?: string | number;
  color?: string;
  alpha?: string | number;
  width?: string | number;
  height?: string | number;
  step?: string | number;
  disabled?: boolean;
  readonly?: boolean;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-color-area': ColorProps<DskColorArea>;
      'dsk-color-hue': ColorProps<DskColorHue>;
      'dsk-color-alpha': ColorProps<DskColorAlpha>;
      'dsk-color-eyedropper': DetailedHTMLProps<
        HTMLAttributes<DskColorEyedropper>,
        DskColorEyedropper
      > & {
        color?: string;
        size?: string | number;
        mode?: string;
        source?: string;
        'magnifier-pixels'?: string | number;
        disabled?: boolean;
      };
    }
  }
}
```

</details>

<details>
<summary>Vue + Vite</summary>

Если `isCustomElement` для `dsk-*` уже настроен, больше ничего не нужно. Иначе добавьте этот параметр в плагин Vue:

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

</details>

## Объединение компонентов

Тон меняет палитру, палитра задаёт базовый цвет альфа-слайдера, а альфа даёт итоговый RGBA. Компоненты не связаны автоматически: эту связь задаёт небольшой обработчик.

<ClientOnly><ColorExample kind="combined" /></ClientOnly>

Выберите фреймворк. Минимальный пример записывает результат в output; превью выше применяет тот же RGBA к объекту на холсте.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<section class="color-picker">
  <dsk-color-area
    hue="333"
    saturation="100"
    brightness="100"
    width="180"
  ></dsk-color-area>
  <dsk-color-hue hue="333" width="180"></dsk-color-hue>
  <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
  <output>#FF007399</output>
</section>

<script type="module">
  import '@flowscape-ui/dsk';
  import { updateColor } from '/src/color-picker.ts';
  document
    .querySelector('.color-picker')
    .addEventListener('input', updateColor);
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
import { updateColor } from './color-picker';

export default function App() {
  return (
    <section className="color-picker" onInput={updateColor}>
      <dsk-color-area
        hue="333"
        saturation="100"
        brightness="100"
        width="180"
      ></dsk-color-area>
      <dsk-color-hue hue="333" width="180"></dsk-color-hue>
      <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
      <output>#FF007399</output>
    </section>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
import { updateColor } from './color-picker';
</script>

<template>
  <section class="color-picker" @input="updateColor">
    <dsk-color-area
      hue="333"
      saturation="100"
      brightness="100"
      width="180"
    ></dsk-color-area>
    <dsk-color-hue hue="333" width="180"></dsk-color-hue>
    <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
    <output>#FF007399</output>
  </section>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
import { updateColor } from './color-picker';
</script>

<section class="color-picker" oninput={updateColor}>
  <dsk-color-area hue="333" saturation="100" brightness="100" width="180"></dsk-color-area>
  <dsk-color-hue hue="333" width="180"></dsk-color-hue>
  <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
  <output>#FF007399</output>
</section>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { updateColor } from '../color-picker';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="color-picker" (input)="updateColor($event)">
      <dsk-color-area
        hue="333"
        saturation="100"
        brightness="100"
        width="180"
      ></dsk-color-area>
      <dsk-color-hue hue="333" width="180"></dsk-color-hue>
      <dsk-color-alpha color="#FF0073" alpha="60" width="180"></dsk-color-alpha>
      <output>#FF007399</output>
    </section>
  `,
})
export class App {
  readonly updateColor = updateColor;
}
```

:::

</div>

Создайте общий файл обработчика. Инициализация не нужна: в разметке уже указаны согласованные начальные значения.

```ts
// src/color-picker.ts
export function updateColor(event: {
  currentTarget: EventTarget | null;
}): void {
  const root = event.currentTarget;
  if (!(root instanceof HTMLElement)) return;
  const area = root.querySelector('dsk-color-area');
  const hue = root.querySelector('dsk-color-hue');
  const alpha = root.querySelector('dsk-color-alpha');
  const output = root.querySelector('output');
  if (!area || !hue || !alpha || !output) return;
  area.hue = hue.hue;
  alpha.color = area.color;
  output.value = alpha.rgba;
  output.style.backgroundColor = alpha.rgba;
}
```

Добавьте CSS в глобальные стили или блок Vue style без scoped. В React используйте className, как показано во вкладке.

```css
.color-picker {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
}
.color-picker output {
  padding: 12px;
  background: #ff007399;
  color: white;
}
```

## История изменений

Область цвета, оттенок, прозрачность и пипетка поддерживают Ctrl/Cmd+Z и Ctrl/Cmd+Shift+Z при фокусе. Завершённое перетаскивание или выбор пипеткой - одна запись. Отмена действия не добавляет запись. История локальна; внешнее присваивание редактируемого канала сбрасывает её. Восстановление отправляет input и change.
