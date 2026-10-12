# Поля ввода и группы

Изучайте компоненты по очереди: сначала обычное поле, затем HEX, цвет, группы и файлы. В каждом разделе есть свой пример, подключение для всех пяти сред, API и вариант оформления. В конце они объединены в общий инспектор объекта.

Все поля подключаются через `npm i @flowscape-ui/dsk` и браузерный импорт `import '@flowscape-ui/dsk'`. Для SSR используйте [рецепты подключения](/ru/guide/installation#приложения-с-ssr).

::: tip Самостоятельные поля и группы

`dsk-input`, `dsk-input-hex`, `dsk-input-color` и `dsk-input-upload` используются без вложенного содержимого. `dsk-input-group` – контейнер: внутрь него помещают поля.

В обычном **HTML пользовательским элементам обязателен закрывающий тег**, даже если они пустые: `<dsk-input></dsk-input>`. Они не являются void-элементами, как нативный `<input>`. Запись `<dsk-input />` не закрывает элемент в HTML и может привести к неправильной вложенности следующей разметки.

В **React JSX** и **Vue SFC** компилятор поддерживает самозакрывающуюся запись `<dsk-input />`. Примеры здесь используют парную запись, которая подходит и для обычного HTML.

:::

## dsk-input

Ширина объекта меняется числом: вводите выражения, перетаскивайте хендлер, меняйте шаг или включайте readonly.

<ClientOnly><SingleInputExample kind="dsk-input" /></ClientOnly>

### Добавление поля

После подключения DSK достаточно этой разметки:

```html
<dsk-input value="120" aria-label="Width"></dsk-input>
```

Можно сразу вводить число, перетаскивать хендлер и пользоваться стрелками клавиатуры. Функция инициализации, состояние и обработчик событий не нужны. Стили уже включены в компонент.

Чтобы ограничить значение и показать единицу измерения, добавьте атрибуты:

```html
<dsk-input
  value="120"
  min="40"
  max="200"
  step="1"
  tag="px"
  aria-label="Width"
></dsk-input>
```

Начальное значение – **120**, диапазон – **от 40 до 200**, шаг перетаскивания и стрелок – **1**. Рядом со значением отображается **px**.

### Подключение к проекту

Установите пакет один раз:

```sh
npm i @flowscape-ui/dsk
```

Выберите свою среду ниже. Примеры рассчитаны на существующее **клиентское приложение** со сборщиком, например Vite. Библиотеке DSK нужен JavaScript для регистрации пользовательских элементов, но писать собственный JavaScript для работы поля не требуется. Импортируйте пакет один раз, а затем используйте тег там, где он нужен.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input value="120" aria-label="Width"></dsk-input>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input value="120" aria-label="Width"></dsk-input>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input value="120" aria-label="Width"></dsk-input>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input value="120" aria-label="Width"></dsk-input>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<dsk-input value="120" aria-label="Width"></dsk-input>',
})
export class App {}
```

:::

</div>

**Для React с TypeScript и Vue нужна однократная настройка**, показанная ниже. Для Vanilla, Svelte и примера Angular выше дополнительных настроек пользовательских элементов не требуется.

<details>
<summary>React + TypeScript: разрешаем теги полей DSK в JSX</summary>

Создайте `src/dsk.d.ts`. Файл только сообщает TypeScript о тегах и не добавляет исполняемый код. Объявление ниже описывает атрибуты из примеров на этой странице. Добавьте его один раз, даже если используете несколько разных полей.

```ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DskInput,
  DskInputHex,
  DskInputColor,
  DskInputGroup,
  DskInputUpload,
} from '@flowscape-ui/dsk';

type FieldProps<T> = DetailedHTMLProps<HTMLAttributes<T>, T> & {
  value?: string | number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  tag?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-input': FieldProps<DskInput>;
      'dsk-input-hex': FieldProps<DskInputHex> & { hex?: string | number };
      'dsk-input-color': FieldProps<DskInputColor> & {
        format?: string | number;
        'alpha-mode'?: 'hex' | 'percent';
      };
      'dsk-input-group': DetailedHTMLProps<
        HTMLAttributes<DskInputGroup>,
        DskInputGroup
      > & {
        linked?: string;
        'has-mixed-values'?: string;
        'mixed-label'?: string;
      };
      'dsk-input-upload': DetailedHTMLProps<
        HTMLAttributes<DskInputUpload>,
        DskInputUpload
      > & {
        accept?: string;
        placeholder?: string;
        disabled?: boolean;
      };
    }
  }
}
```

</details>

<details>
<summary>Vue + Vite: распознаём dsk-* как пользовательские элементы</summary>

В существующем `vite.config.ts` добавьте `isCustomElement` в настройки плагина Vue. Остальные настройки проекта сохраните.

```ts
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

Для Next.js, Nuxt, SvelteKit и других приложений с серверным рендерингом используйте [примеры подключения с SSR](/ru/guide/installation#приложения-с-ssr), чтобы загрузить DSK в браузере. Разметка поля остаётся той же.

### Необязательно: чтение значения

Добавляйте обработчик события, только если приложению нужно реагировать на изменение. Например, возьмите то же поле:

```html
<dsk-input value="120" aria-label="Width"></dsk-input>
```

Затем подпишитесь на подтверждённое изменение в браузерном входном файле:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input');
field?.addEventListener('change', () => {
  console.log(field.value); // The current value, e.g. "140".
});
```

`change` срабатывает при подтверждении изменения. Для обновлений во время ввода или перетаскивания используйте `input`. Холст выше демонстрирует реакцию на эти события. Его код и файлы демо не нужны для использования самого поля.

### API и поведение

Таблица относится к `dsk-input`, `dsk-input-hex` и `dsk-input-color`. Группа и загрузка файлов имеют отдельный API ниже. Обычные атрибуты HTML (`id`, `class`, `style`, `title`) также доступны.

| Атрибут               | Свойство            | По умолчанию                                      | Поведение                                                                                  |
| --------------------- | ------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `value`               | `value`             | `""`                                              | Текущее значение; пустое поле показывает подсказку.                                        |
| `min / max`           | `min / max`         | `""`                                              | Необязательные границы; для чисел отсутствующие границы не ограничивают диапазон.          |
| `step`                | `step`              | `"" → 1`                                          | Положительный шаг перетаскивания и резервный шаг клавиатуры.                               |
| `key-horizontal-step` | `keyHorizontalStep` | `"" → step`                                       | Шаг Left / Right.                                                                          |
| `key-vertical-step`   | `keyVerticalStep`   | `"" → step`                                       | Шаг Down / Up.                                                                             |
| `placeholder`         | `placeholder`       | `""`                                              | Подсказка пустого поля.                                                                    |
| `src`                 | `src`               | `""`                                              | URL картинки хендлера; ошибка загрузки возвращает штатную иконку.                          |
| `progression`         | `progression`       | `linear`                                          | Отклик перетаскивания: linear, exponential, logarithmic.                                   |
| `positioning`         | `positioning`       | `center`                                          | Выравнивание значения и подсказки: left, center, right.                                    |
| `tag`                 | `tag`               | `""`                                              | Декоративная подпись; не входит в значение.                                                |
| `tag-position`        | `tagPosition`       | `right`                                           | Расположение подписи: left или right.                                                      |
| `tag-gap`             | `tagGap`            | `4px`                                             | CSS-отступ между подписью и значением; неотрицательное число без единицы означает пиксели. |
| `select-on-focus`     | `selectOnFocus`     | `false`                                           | Выделять всё при получении фокуса.                                                         |
| `loopafter`           | `loopAfter`         | `false`                                           | Зацикливать обе границы при перетаскивании и изменении клавишами.                          |
| `loopafter-min`       | `loopAfterMin`      | `false`                                           | Переходить от нижней границы к верхней.                                                    |
| `loopafter-max`       | `loopAfterMax`      | `false`                                           | Переходить от верхней границы к нижней.                                                    |
| `disabled`            | `disabled`          | `false`                                           | Запретить взаимодействие и отправку поля формой.                                           |
| `readonly`            | `readOnly`          | `false`                                           | Сохранить фокус и чтение, запретить изменения.                                             |
| `name`                | `name`              | `""`                                              | Имя поля при отправке формы.                                                               |
| `aria-label`          | `ariaLabel`         | `Numeric value / Hexadecimal value / Color value` | Доступное имя, передаваемое внутреннему полю.                                              |

`disabled` и `readonly` – атрибуты присутствия: даже `disabled="false"` отключает поле. `select-on-focus` и три `loopafter*` поддерживают строку `"false"`; отсутствие атрибута тоже выключает режим. Зацикливание требует двух конечных границ с `max > min`, сохраняет остаток перемещения и не применяется к ручному вводу или присваиванию `.value`. Включённый `loopafter` включает оба направления независимо от отдельных флагов.

Подпись `tag` не меняет значение и отправляемые данные. Неверный `positioning` использует `center`, `tag-position` – `right`, неверный CSS-отступ – `4px`. Для числовых свойств `value`, границ и шагов допустимы число, строка, `null` или `undefined`; пустое значение очищает поле, а `null`/`undefined` удаляют соответствующий атрибут границ или шага.

`value` читается как строка. `valueAsNumber` возвращает число или `NaN` для пустого/незавершённого ввода; допускает запись числа. Методы `focus(options?)`, `blur()` и `select()` управляют внутренним полем. Не используйте `parseInt` без проверки для незавершённых выражений.

```html
<dsk-input
  value="160"
  min="0"
  max="360"
  step="1"
  key-horizontal-step="1"
  key-vertical-step="10"
  tag="px"
  tag-position="right"
  tag-gap="6px"
  positioning="right"
  select-on-focus
  loopafter
  aria-label="Width"
></dsk-input>
```

`dsk-input` хранит строку, а `valueAsNumber` возвращает десятичное число. Присваивания через API не отправляют события, ограничиваются `min`/`max`, а некорректные значения очищают поле. Неверные границы игнорируются; если `max < min`, используется `min`. Шаг должен быть положительным и конечным; иначе эффективный шаг равен `1`. Каждый неверный шаг клавиатуры независимо возвращается к `step`.

```ts
import '@flowscape-ui/dsk';
const field = document.querySelector('dsk-input')!;
field.value = 160;
field.min = 0;
field.max = 320;
field.step = 0.5;
field.keyHorizontalStep = 1;
field.keyVerticalStep = 10;
field.addEventListener('input', () => {
  if (Number.isFinite(field.valueAsNumber)) {
    console.log('Preview', field.valueAsNumber);
  }
});
field.addEventListener('change', () => console.log('Commit', field.value));
```

### Перетаскивание и клавиатура

Тяните левый хендлер вправо для увеличения, влево для уменьшения. В линейном режиме каждые четыре пикселя дают один шаг. `exponential` ускоряет большие перемещения, `logarithmic` замедляет их. Все режимы поддерживают ноль и отрицательные значения.

Для мыши используется Pointer Lock с виртуальным курсором, переходящим через края экрана. Неподвижная мышь не меняет значение. Если браузер запрещает Pointer Lock, остаётся обычное перетаскивание в пределах экрана; касание и перо тоже используют обычное перетаскивание. Отпускание подтверждает изменение; Escape, потеря фокуса или прерывание отменяют его. Браузер не позволяет переместить системный курсор вслед за виртуальным.

На границе диапазона лишнее движение отбрасывается: обратное движение сразу начинает отсчитывать шаги от границы. Escape по-прежнему возвращает исходное значение жеста.

| Клавиша             | Результат                                             |
| ------------------- | ----------------------------------------------------- |
| Right / Left        | Увеличение / уменьшение на горизонтальный шаг         |
| Up / Down           | Увеличение / уменьшение на вертикальный шаг           |
| Page Up / Page Down | Изменение на десять обычных шагов                     |
| Enter               | Подтверждение ввода                                   |
| Escape              | Отмена незавершённого ввода или жеста и снятие фокуса |
| Ctrl/Cmd+Z          | Отмена                                                |
| Ctrl/Cmd+Shift+Z    | Повтор                                                |

Стрелки работают только при фокусе внутреннего поля. С Shift, Alt, Ctrl или Meta они сохраняют обычное текстовое поведение; Home и End тоже работают как в текстовом поле. Успешный клавиатурный шаг отправляет `input`, затем `change`. Неизменившееся значение не создаёт события изменения.

### Выражения и история

Вручную можно вводить `+`, `-`, `*`, `/`, скобки, унарные знаки, десятичные числа и научную запись. Например, `(20 + 5) * 2` превращается в `50` по Enter или потере фокуса. Деление на ноль и неверное выражение возвращают последнее подтверждённое значение. JavaScript не исполняется. Пока выражение не подтверждено, `.value` содержит черновик, а `.valueAsNumber` может быть `NaN`. Присваивание `.value` не вычисляет выражения; стрелка сначала вычисляет корректный черновик, затем применяет шаг. Ручной ввод ограничивается границами, но не округляется до сетки шага.

Каждое поле хранит до 100 подтверждённых состояний. Законченный жест, подтверждённый ввод или клавиатурный шаг – одна запись. Отмена черновика возвращает подтверждённое значение, повтор восстанавливает черновик. Восстановление подтверждённого состояния отправляет `input` и `change`, черновика – только `input`. Новая правка после отмены очищает ветку повтора. Сочетания используют физическую клавишу `KeyZ`, независимо от раскладки. Программные присваивания, сброс формы и изменения min/max/step начинают новую историю.

Повторное присваивание текущего нормализованного значения во время перетаскивания сохраняет жест, что удобно для управляемого состояния фреймворка. Присваивание другого значения отменяет жест и применяет внешнее обновление.

### События и формы

Числовое, HEX и цветовое поля отправляют всплывающие и composed события `input` и `change` без специального `detail`. Во время `input` значение может быть незавершённым черновиком. Для истории документа используйте подтверждённое `change`, а для предварительного просмотра проверяйте значение. Группа пропускает события дочерних полей; загрузка дополнительно отправляет `dsk-upload-reject`.

Три редактируемых типа участвуют в нативной форме через ElementInternals в поддерживающих браузерах. `name` задаёт ключ, `disabled` исключает значение, `form.reset()` восстанавливает исходное значение. Пустое значение отправляется пустой строкой. Группа не отправляет собственное значение, upload требует ручного добавления файла. Общие атрибуты `required`, `pattern`, `type` и `multiple` не добавляют этим компонентам нативную валидацию инпута.

```html
<form id="inspector-form">
  <dsk-input name="width" value="160" min="0" aria-label="Width"></dsk-input>
  <dsk-input-color
    name="fill"
    value="FF007A"
    aria-label="Fill"
  ></dsk-input-color>
  <button type="reset">Reset</button>
</form>
```

```ts
const form = document.querySelector<HTMLFormElement>('#inspector-form')!;
console.log(new FormData(form).get('width')); // "160"
```

### CSS и другое оформление

```css
/* Add class="custom-input" to the field. */
dsk-input.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input.custom-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Добавьте тегу `class="custom-input"`, а CSS выше поместите в файл стилей. В React используйте `className="custom-input"`. CSS одинаков для всех фреймворков; в Vue для этого примера используйте обычный блок `<style>` без `scoped`.

```html
<dsk-input class="custom-input" value="120" aria-label="Width"></dsk-input>
```

<ClientOnly><SingleInputExample kind="dsk-input" styled /></ClientOnly>

| CSS variable                | По умолчанию        |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-handle-width`  | `30px`              |

`::part(...)`: `container`, `handle`, `input`, `tag`.

Шрифт наследуется от хоста через `font`. Переменная `--dsk-input-font-size` предназначена только для upload. Иконку хендлера меняйте через `src`; произвольного слота для неё нет. Сохраняйте видимый фокус.

## dsk-input-hex

Меняйте формат HEX и наблюдайте заливку. Один канал показывает оттенок серого; RGB/RGBA – цвет. При сужении формата значение может очиститься по правилам точного преобразования.

<ClientOnly><SingleInputExample kind="dsk-input-hex" /></ClientOnly>

### Добавление компонента

После подключения DSK достаточно этой разметки:

```html
<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
```

Можно сразу вводить HEX-значения, перетаскивать хендлер и пользоваться стрелками клавиатуры. Функция инициализации, состояние и обработчик событий не нужны. Стили уже включены в компонент.

Чтобы выбрать количество HEX-цифр, добавьте `hex`:

```html
<dsk-input-hex hex="8" value="557BE880" aria-label="HEX value"></dsk-input-hex>
```

Здесь используются **8 HEX-цифр** для красного, зелёного, синего каналов и прозрачности. Значение записывается без начального `#`.

### Подключение к проекту

Установите пакет один раз:

```sh
npm i @flowscape-ui/dsk
```

Выберите свою среду ниже. Примеры рассчитаны на существующее **клиентское приложение** со сборщиком, например Vite. Библиотеке DSK нужен JavaScript для регистрации пользовательских элементов, но писать собственный JavaScript для работы поля не требуется. Импортируйте пакет один раз, а затем используйте тег там, где он нужен.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
  `,
})
export class App {}
```

:::

</div>

Используйте однократную [настройку React TypeScript и Vue](#подключение-к-проекту) из первого примера. Повторять её для каждого поля не нужно.

Для Next.js, Nuxt, SvelteKit и других приложений с серверным рендерингом используйте [примеры подключения с SSR](/ru/guide/installation#приложения-с-ssr), чтобы загрузить DSK в браузере. Разметка поля остаётся той же.

### Необязательно: чтение значения

Добавляйте обработчик события, только если приложению нужно реагировать на изменение. Например, возьмите то же поле:

```html
<dsk-input-hex value="557BE8" aria-label="HEX value"></dsk-input-hex>
```

Затем подпишитесь на подтверждённое изменение в браузерном входном файле:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-hex');
field?.addEventListener('change', () => {
  console.log(field.value);
});
```

`change` срабатывает при подтверждении изменения. Для обновлений во время ввода или перетаскивания используйте `input`. Холст выше демонстрирует реакцию на эти события. Его код и файлы демо не нужны для использования самого поля.

### API и поведение

Наследует [общие атрибуты, свойства и методы dsk-input](#dsk-input). Отличия перечислены ниже.

`dsk-input-hex` наследует весь общий API, взаимодействие, формы, историю и оформление. Его дополнительный атрибут и свойство `hex` выбирают формат; по умолчанию и при неподдерживаемом значении используется `6`. Сеттер принимает допустимое число, его строковую запись, `null` или `undefined`.

| `hex` | Каналы                 | Диапазон              |
| ----- | ---------------------- | --------------------- |
| `1`   | Один канал, одна цифра | `0`–`F`               |
| `2`   | Один канал, две цифры  | `00`–`FF`             |
| `3`   | RGB по одной цифре     | `000`–`FFF`           |
| `6`   | RGB по две цифры       | `000000`–`FFFFFF`     |
| `8`   | RGBA по две цифры      | `00000000`–`FFFFFFFF` |

```html
<dsk-input-hex
  hex="2"
  value="18"
  min="00"
  max="50"
  step="1"
  aria-label="Corner radius"
></dsk-input-hex>
```

Начальный `#` необязателен. Значение приводится к верхнему регистру, слева добавляются нули до выбранной длины. `#ab` в формате 6 даёт `0000AB`; слишком длинное значение неверно. Литерал `1e3` – HEX `0001E3`, а не научная запись. `.value` и данные формы не содержат `#`. Пустое значение остаётся пустым.

### Каналы, границы и арифметика

Перетаскивание и стрелки последовательно заполняют красный, зелёный, синий и альфа-канал. Заполненные каналы сохраняются; уменьшение опустошает их в обратном порядке:

```text
FE0000 + 1 → FF0000
FF0000 + 1 → FF0100
FF0100 - 1 → FF0000
FFFFFF00 + 1 → FFFFFF01
```

`valueAsNumber` использует другой механизм: позиционный ранг, где красный – младший канал. В формате 6 ранг `FF0000` равен 255, а `000100` – 256. Числовое присваивание `.value` тоже интерпретируется как ранг. `min` и `max` – HEX-строки, сравниваемые по этому рангу; отсутствующие границы дают полный диапазон формата. Шаги должны быть положительными безопасными десятичными целыми. Неверный `step` возвращается к `1`, шаги клавиатуры – к эффективному `step`.

Выражения используют десятичные операнды, кроме явно помеченных `0x` или `#`; результат должен быть целым рангом. Поэтому `0xFF0000 + 1`, `#FF0000 + 1` и `255 + 1` дают `000100`. Чистый HEX-литерал распознаётся раньше выражения. Арифметика работает с рангом, а не с последовательным заполнением каналов. Выражения вычисляются при пользовательском вводе, а не программном присваивании строки.

### Смена формата

- 3 → 6: `F80` превращается в `FF8800`.
- 6 → 8: добавляется непрозрачная альфа, `FF8800FF`.
- 8 → 6: альфа удаляется.
- Сужение байтов в одну цифру допустимо только при кратности каждого сохраняемого байта 17; иначе поле очищается без скрытого округления.
- Один канал становится красным; остальные цветовые каналы равны нулю, альфа непрозрачна. При обратном переходе сохраняется красный.

Сброс формы переводит исходное значение из исходного формата в текущий по тем же правилам.

### CSS и другое оформление

```css
/* Add class="custom-input" to the field. */
dsk-input-hex.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-hex.custom-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Добавьте тегу `class="custom-input"`, а CSS выше поместите в файл стилей. В React используйте `className="custom-input"`. CSS одинаков для всех фреймворков; в Vue для этого примера используйте обычный блок `<style>` без `scoped`.

```html
<dsk-input-hex
  class="custom-input"
  value="557BE8"
  aria-label="HEX value"
></dsk-input-hex>
```

<ClientOnly><SingleInputExample kind="dsk-input-hex" styled /></ClientOnly>

| CSS variable                | По умолчанию        |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-handle-width`  | `30px`              |

`::part(...)`: `container`, `handle`, `input`, `tag`.

Шрифт наследуется от хоста через `font`. Переменная `--dsk-input-font-size` предназначена только для upload. Иконку хендлера меняйте через `src`; произвольного слота для неё нет. Сохраняйте видимый фокус.

## dsk-input-color

RGBA меняет заливку объекта. Сравните единое поле с режимом процентов и переключите RGB/RGBA.

<ClientOnly><SingleInputExample kind="dsk-input-color" /></ClientOnly>

### Добавление компонента

После подключения DSK достаточно этой разметки:

```html
<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
```

Можно сразу редактировать HEX-цвет, перетаскивать цветовую плашку и менять прозрачность. Функция инициализации, состояние и обработчик событий не нужны. Стили уже включены в компонент.

Чтобы редактировать прозрачность в процентах, добавьте `format` и `alpha-mode`:

```html
<dsk-input-color
  value="FF007A80"
  format="8"
  alpha-mode="percent"
  aria-label="Fill"
></dsk-input-color>
```

Поле показывает **образец цвета**, HEX-цвет и отдельное **значение прозрачности в процентах**. `80` – байт альфа-канала, примерно 50% непрозрачности.

### Подключение к проекту

Установите пакет один раз:

```sh
npm i @flowscape-ui/dsk
```

Выберите свою среду ниже. Примеры рассчитаны на существующее **клиентское приложение** со сборщиком, например Vite. Библиотеке DSK нужен JavaScript для регистрации пользовательских элементов, но писать собственный JavaScript для работы поля не требуется. Импортируйте пакет один раз, а затем используйте тег там, где он нужен.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
  `,
})
export class App {}
```

:::

</div>

Используйте однократную [настройку React TypeScript и Vue](#подключение-к-проекту) из первого примера. Повторять её для каждого поля не нужно.

Для Next.js, Nuxt, SvelteKit и других приложений с серверным рендерингом используйте [примеры подключения с SSR](/ru/guide/installation#приложения-с-ssr), чтобы загрузить DSK в браузере. Разметка поля остаётся той же.

### Необязательно: чтение значения

Добавляйте обработчик события, только если приложению нужно реагировать на изменение. Например, возьмите то же поле:

```html
<dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
```

Затем подпишитесь на подтверждённое изменение в браузерном входном файле:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-color');
field?.addEventListener('change', () => {
  console.log(field.value);
});
```

`change` срабатывает при подтверждении изменения. Для обновлений во время ввода или перетаскивания используйте `input`. Холст выше демонстрирует реакцию на эти события. Его код и файлы демо не нужны для использования самого поля.

### API и поведение

Наследует [общие атрибуты, свойства и методы dsk-input](#dsk-input). Отличия перечислены ниже.

`dsk-input-color` наследует HEX-поведение и добавляет живой образец цвета. Общие атрибуты продолжают действовать; вместо `hex` в HTML используется `format`.

| Атрибут      | Свойство    | По умолчанию | Назначение                                                        |
| ------------ | ----------- | ------------ | ----------------------------------------------------------------- |
| `format`     | `format`    | `6`          | `6` для RGB, `8` для RGBA                                         |
| `alpha-mode` | `alphaMode` | `hex`        | `hex` для одного поля, `percent` для отдельного поля прозрачности |

```html
<dsk-input-color
  format="8"
  alpha-mode="percent"
  value="557BE880"
  aria-label="Fill"
></dsk-input-color>
```

Неверный формат возвращается к 6; форматы 1, 2 и 3 здесь не поддерживаются. Сеттер `format` принимает 6/8, их строковые записи, `null`/`undefined`; `alphaMode` – `hex`, `percent`, `null`/`undefined`. Неверный режим возвращается к `hex`. Унаследованное JS-свойство `.hex` отображается в тот же `format`, но HTML-атрибут `hex` игнорируется.

Смена 6 → 8 добавляет `FF`, 8 → 6 удаляет альфу. В режиме `percent` RGB редактируется отдельно от 0–100% прозрачности с шагом 1%. Изменения цвета сохраняют альфу, изменения прозрачности сохраняют RGB. Обе части делят историю и отправляют события от цветового хоста. `.value`, `.valueAsNumber` и данные формы остаются в RGBA-представлении; переключение режима сохраняет точный альфа-байт. Формат 6 всегда показывает одно поле.

50% округляются до байта `80`; исходный `80` отображается как 50.2%. Шахматный фон показывает прозрачность. Пустой или неверный черновик, включая выражение до подтверждения, показывает только шахматный фон, без устаревшего цвета. `src` заменяет образец картинкой; удаление `src` возвращает образец. Для визуального выбора рядом можно добавить [контролы цвета](/ru/components/color).

### CSS и другое оформление

```css
/* Add class="custom-input" to the field. */
dsk-input-color.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-color.custom-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Добавьте тегу `class="custom-input"`, а CSS выше поместите в файл стилей. В React используйте `className="custom-input"`. CSS одинаков для всех фреймворков; в Vue для этого примера используйте обычный блок `<style>` без `scoped`.

```html
<dsk-input-color
  class="custom-input"
  value="FF007A"
  aria-label="Fill"
></dsk-input-color>
```

<ClientOnly><SingleInputExample kind="dsk-input-color" styled /></ClientOnly>

| CSS variable                | По умолчанию        |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-handle-width`  | `30px`              |
| `--dsk-input-swatch-size`   | `16px`              |
| `--dsk-input-alpha-width`   | `76px`              |

`::part(...)`: `container`, `handle`, `input`, `tag`, `swatch`, `color`, `alpha`, `alpha-input`, `alpha-handle`.

`color` – SVG-прямоугольник: изменение `fill` заменяет живой образец. `alpha-input` и `alpha-handle` уже экспортированы из вложенного поля.

Шрифт наследуется от хоста через `font`. Переменная `--dsk-input-font-size` предназначена только для upload. Иконку хендлера меняйте через `src`; произвольного слота для неё нет. Сохраняйте видимый фокус.

## dsk-input-group

Два поля управляют шириной и высотой. linked копирует изменения, has-mixed-values показывает различие значений без потери реального размера.

<ClientOnly><SingleInputExample kind="dsk-input-group" /></ClientOnly>

### Добавление компонента

После подключения DSK достаточно этой разметки:

```html
<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

Поместите поля внутрь группы. Они будут расположены вместе и сразу доступны для редактирования. Функция инициализации, состояние и обработчик событий не нужны. Стили уже включены в компонент.

Чтобы при редактировании одного поля остальные получали то же значение, добавьте `linked`:

```html
<dsk-input-group linked="true">
  <dsk-input-group>
    <dsk-input value="120" aria-label="Width"></dsk-input>
    <dsk-input value="80" aria-label="Height"></dsk-input>
  </dsk-input-group>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

Без `linked` поля независимы. При **linked="true"** редактирование копирует значение в остальные поля. Соотношение сторон при этом не сохраняется.

### Подключение к проекту

Установите пакет один раз:

```sh
npm i @flowscape-ui/dsk
```

Выберите свою среду ниже. Примеры рассчитаны на существующее **клиентское приложение** со сборщиком, например Vite. Библиотеке DSK нужен JavaScript для регистрации пользовательских элементов, но писать собственный JavaScript для работы поля не требуется. Импортируйте пакет один раз, а затем используйте тег там, где он нужен.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return (
    <dsk-input-group>
      <dsk-input value="120" aria-label="Width"></dsk-input>
      <dsk-input value="80" aria-label="Height"></dsk-input>
    </dsk-input-group>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-group>
    <dsk-input value="120" aria-label="Width"></dsk-input>
    <dsk-input value="80" aria-label="Height"></dsk-input>
  </dsk-input-group>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <dsk-input-group>
      <dsk-input value="120" aria-label="Width"></dsk-input>
      <dsk-input value="80" aria-label="Height"></dsk-input>
    </dsk-input-group>
  `,
})
export class App {}
```

:::

</div>

Используйте однократную [настройку React TypeScript и Vue](#подключение-к-проекту) из первого примера. Повторять её для каждого поля не нужно.

Для Next.js, Nuxt, SvelteKit и других приложений с серверным рендерингом используйте [примеры подключения с SSR](/ru/guide/installation#приложения-с-ssr), чтобы загрузить DSK в браузере. Разметка поля остаётся той же.

### Необязательно: чтение значения

Добавляйте обработчик события, только если приложению нужно реагировать на изменение. Например, возьмите то же поле:

```html
<dsk-input-group>
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

Затем подпишитесь на подтверждённое изменение в браузерном входном файле:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-group');
field?.addEventListener('change', () => {
  console.log(field.values);
});
```

`change` срабатывает при подтверждении изменения. Для обновлений во время ввода или перетаскивания используйте `input`. Холст выше демонстрирует реакцию на эти события. Его код и файлы демо не нужны для использования самого поля.

### API и поведение

| `dsk-input-group` attribute | Property                  | Default |
| --------------------------- | ------------------------- | ------- |
| `linked`                    | `linked: boolean`         | `false` |
| `has-mixed-values`          | `hasMixedValues: boolean` | `false` |
| `mixed-label`               | `mixedLabel: string`      | `Mixed` |

`linked` – атрибут присутствия, а `has-mixed-values="false"` выключает автоматическое сравнение. Дайте группе `aria-label`; подписи нужны и её отдельным полям.

| Свойство / метод                | Назначение                                   |
| ------------------------------- | -------------------------------------------- |
| `inputs`                        | Поля в порядке DOM, массив только для чтения |
| `values`                        | Строки или `null` для mixed                  |
| `storedValues`                  | Реальные строки независимо от mixed          |
| `setMixed(field, mixed = true)` | Ручное отображение разных значений           |
| `isMixed(field)`                | Проверка состояния mixed                     |
| `registerInput(field, adapter)` | Подключение адаптера                         |
| `unregisterInput(field)`        | Удаление адаптера; возвращает boolean        |

`dsk-input-group` объединяет DSK, нативные HTML-поля и совместимые пользовательские элементы. Он не добавляет собственную кнопку связи и не меняет поведение клавиатуры, фокуса и формы дочерних полей.

```html
<dsk-input-group linked mixed-label="Mixed" aria-label="Dimensions">
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <input type="number" value="80" aria-label="Height" />
</dsk-input-group>
```

Связь копирует последующие пользовательские изменения во все редактируемые поля, а не сохраняет пропорции. Само включение `linked` не меняет значения. Поля `disabled` и `readonly` пропускаются, вложенные группы независимы, ограничения каждого поля продолжают действовать. Программные присваивания не запускают синхронизацию.

В режиме `has-mixed-values` разные значения неактивных полей скрываются за `mixed-label`. Фокус восстанавливает реальное значение только активного поля; равные значения остаются видимыми. `values` возвращает `null` для скрытых значений, `storedValues` – реальные строки. Поле HTML визуально содержит пустую строку, не строку `"null"`. При отправке формы скрытое поле отправляет пустое значение. Ручной `setMixed` работает отдельно от автоматического сравнения; обычно выбирайте один из этих подходов.

По умолчанию группа распознаёт элементы с записываемым `.value` и всплывающими `input`/`change`. Для mixed также нужны `.placeholder` и поддержка пустого значения. Внутренние поля распознанного компонента отдельно не учитываются. Зарегистрированный элемент должен быть потомком группы.

```ts
import type { InputGroupAdapter } from '@flowscape-ui/dsk';
const group = document.querySelector('dsk-input-group')!;
const custom = document.querySelector<HTMLElement>('#custom-field')!;
const adapter: InputGroupAdapter = {
  getValue: (field) => field.dataset.amount ?? '',
  setValue: (field, value) => {
    field.dataset.amount = value;
  },
  setMixed(field, mixed, label) {
    field.textContent = mixed ? label : this.getValue(field);
  },
};
group.registerInput(custom, adapter);
group.setMixed(custom);
// Later: group.unregisterInput(custom);
```

Адаптер записывает значения без событий. Пользовательские изменения контрола должны отправлять всплывающие `input`/`change`, а из Shadow DOM – ещё и `composed: true`. Необязательный `setMixed` сам сохраняет значение и управляет отображением; без него применяется стандартный пустой value/placeholder. Группа пропускает исходное событие, но не создаёт копии для связанных полей.

### CSS и другое оформление

```css
/* Add class="custom-input" to the group. */
dsk-input-group.custom-input {
  --dsk-input-group-gap: 12px;
  --dsk-input-group-wrap: wrap;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-height: 38px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-group.custom-input::part(container) {
  align-items: center;
}
dsk-input-group.custom-input dsk-input::part(input) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Добавьте тегу `class="custom-input"`, а CSS выше поместите в файл стилей. В React используйте `className="custom-input"`. CSS одинаков для всех фреймворков; в Vue для этого примера используйте обычный блок `<style>` без `scoped`.

```html
<dsk-input-group class="custom-input">
  <dsk-input value="120" aria-label="Width"></dsk-input>
  <dsk-input value="80" aria-label="Height"></dsk-input>
</dsk-input-group>
```

<ClientOnly><SingleInputExample kind="dsk-input-group" styled /></ClientOnly>

| CSS variable             | По умолчанию |
| ------------------------ | ------------ |
| `--dsk-input-group-gap`  | `8px`        |
| `--dsk-input-group-wrap` | `nowrap`     |

`::part(...)`: `container`.

## dsk-input-upload

Выберите изображение для объекта или PDF/TXT для подписи. Меняйте accept, попробуйте отклоняемый файл и очистку.

<ClientOnly><SingleInputExample kind="dsk-input-upload" /></ClientOnly>

### Добавление компонента

После подключения DSK достаточно этой разметки:

```html
<dsk-input-upload aria-label="File"></dsk-input-upload>
```

Нажмите на поле, чтобы выбрать файл, или перетащите файл на него. Название и превью обновятся автоматически. Функция инициализации, состояние и обработчик событий не нужны. Стили уже включены в компонент.

Чтобы ограничить типы файлов, добавьте `accept`:

```html
<dsk-input-upload
  accept="image/*,.pdf,.doc,.docx"
  placeholder="Choose a file"
  aria-label="File"
></dsk-input-upload>
```

Здесь разрешены **изображения, PDF, DOC и DOCX**. Компонент показывает миниатюру изображения или иконку документа и имя файла. Выбор файла **не отправляет** его на сервер.

### Подключение к проекту

Установите пакет один раз:

```sh
npm i @flowscape-ui/dsk
```

Выберите свою среду ниже. Примеры рассчитаны на существующее **клиентское приложение** со сборщиком, например Vite. Библиотеке DSK нужен JavaScript для регистрации пользовательских элементов, но писать собственный JavaScript для работы поля не требуется. Импортируйте пакет один раз, а затем используйте тег там, где он нужен.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html in a Vite project -->
<dsk-input-upload aria-label="File"></dsk-input-upload>

<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';

export default function App() {
  return <dsk-input-upload aria-label="File"></dsk-input-upload>;
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>

<template>
  <dsk-input-upload aria-label="File"></dsk-input-upload>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>

<dsk-input-upload aria-label="File"></dsk-input-upload>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: ` <dsk-input-upload aria-label="File"></dsk-input-upload> `,
})
export class App {}
```

:::

</div>

Используйте однократную [настройку React TypeScript и Vue](#подключение-к-проекту) из первого примера. Повторять её для каждого поля не нужно.

Для Next.js, Nuxt, SvelteKit и других приложений с серверным рендерингом используйте [примеры подключения с SSR](/ru/guide/installation#приложения-с-ssr), чтобы загрузить DSK в браузере. Разметка поля остаётся той же.

### Необязательно: чтение значения

Добавляйте обработчик события, только если приложению нужно реагировать на изменение. Например, возьмите то же поле:

```html
<dsk-input-upload aria-label="File"></dsk-input-upload>
```

Затем подпишитесь на подтверждённое изменение в браузерном входном файле:

```ts
// src/main.ts, loaded by <script type="module" src="/src/main.ts"></script>
import '@flowscape-ui/dsk';

const field = document.querySelector('dsk-input-upload');
field?.addEventListener('change', () => {
  console.log(field.file);
});
```

`change` срабатывает при выборе или очистке файла. `field.file` содержит `File` или `null`; отправляйте файл на сервер, только если это требуется приложению. Холст выше демонстрирует реакцию на эти события. Его код и файлы демо не нужны для использования самого поля.

### API и поведение

| `dsk-input-upload` attribute | Property                 | Default         |
| ---------------------------- | ------------------------ | --------------- |
| `accept`                     | `accept: string`         | `""`            |
| `placeholder`                | `placeholder: string`    | `Choose a file` |
| `disabled`                   | `disabled: boolean`      | `false`         |
| `aria-label`                 | `ariaLabel`              | `Choose file`   |
| –                            | `file: File              | null`           | `null` |
| –                            | `files: readonly File[]` | `[]`            |
| –                            | `clear(): void`          | –               |

Группа и upload не наследуют числовой API. Например, `min`, `step`, `tag` и `readonly` не настраивают upload. `files` читается, для записи используйте `file`.

`dsk-input-upload` выбирает один локальный файл и не отправляет его на сервер. Клик или Enter/Space открывает системный диалог; также можно перетащить файл на поле. Крестик удаляет выбор и возвращает фокус кнопке.

```html
<dsk-input-upload
  accept="image/*,.pdf,.doc,.docx"
  placeholder="Choose a file"
  aria-label="Attachment"
></dsk-input-upload>
```

`accept` содержит расширения с точкой, MIME-типы или `image/*`, `audio/*`, `video/*`, через запятую. Сравнение без учёта регистра; пустой фильтр принимает все типы. Проверяется выбор из диалога, перетаскивание и присваивание `.file`. MIME берётся из `File.type`: у некоторых файлов он пуст, поэтому добавляйте расширения. Новый `accept` применяется к последующим выборам, не удаляя текущий файл.

Изображения показывают миниатюру, документы – цветную иконку расширения. Неподдерживаемые или повреждённые изображения возвращаются к иконке. Браузер не предоставляет системную иконку файла. Объектные URL освобождаются при замене, очистке и отключении компонента.

Ошибочный тип или несколько файлов оставляют текущий выбор и отправляют `dsk-upload-reject` с `{ files, accept, reason }`, где `reason` равен `type` или `multiple`. Пользовательский выбор и удаление отправляют `input` и `change`; `.file = ...` и `clear()` не отправляют эти события. Повторный выбор того же файла возможен.

```ts
const upload = document.querySelector('dsk-input-upload')!;
upload.addEventListener('change', () => {
  if (!upload.file) return;
  const body = new FormData();
  body.append('attachment', upload.file);
  // Send body to your application's upload endpoint.
});
upload.addEventListener('dsk-upload-reject', () => {
  console.log('Choose a supported file');
});
```

У компонента нет автоматической привязки к форме, атрибутов `value`, `name`, `multiple` или `readonly`. Передавайте `.file` в `FormData` сами. Проверка на клиенте управляет выбором, но сервер должен проверять принимаемые файлы независимо.

### CSS и другое оформление

```css
/* Add class="custom-input" to the field. */
dsk-input-upload.custom-input {
  --dsk-input-width: 100%;
  --dsk-input-height: 38px;
  --dsk-input-background: #1a181a;
  --dsk-input-color: #f5f5f5;
  --dsk-input-border: 1px solid #606066;
  --dsk-input-border-radius: 0px;
  --dsk-input-focus-color: #ff0073;
}
dsk-input-upload.custom-input::part(filename) {
  font-family: ui-monospace, monospace;
  font-weight: 700;
}
```

Добавьте тегу `class="custom-input"`, а CSS выше поместите в файл стилей. В React используйте `className="custom-input"`. CSS одинаков для всех фреймворков; в Vue для этого примера используйте обычный блок `<style>` без `scoped`.

```html
<dsk-input-upload class="custom-input" aria-label="File"></dsk-input-upload>
```

<ClientOnly><SingleInputExample kind="dsk-input-upload" styled /></ClientOnly>

| CSS variable                | По умолчанию        |
| --------------------------- | ------------------- |
| `--dsk-input-width`         | `214px`             |
| `--dsk-input-height`        | `30px`              |
| `--dsk-input-background`    | `#f5f6f8`           |
| `--dsk-input-color`         | `#151922`           |
| `--dsk-input-border`        | `1px solid #a6afbf` |
| `--dsk-input-border-radius` | `8px`               |
| `--dsk-input-focus-color`   | `#557be8`           |
| `--dsk-input-font-size`     | `14px`              |

`::part(...)`: `container`, `button`, `icon`, `filename`, `clear`, `status`.

## Исходники отдельных примеров {#single-input-source}

Эти дополнительные файлы реализуют холсты документации и вспомогательные настройки. **Для использования полей они не нужны** – достаточно разметки выше. Если вы копируете полное демо, возвращаемая функция очистки удаляет обработчики и освобождает URL изображений. При SSR загружайте модули демо только в браузере.

<details>
<summary>single-input.ts</summary>

<<< @/snippets/single-input.ts

</details>

<details>
<summary>single-input.css</summary>

<<< @/snippets/single-input.css

</details>

## Общий инспектор объекта

Здесь все пять компонентов работают вместе. X/Y меняют позицию, группа – размеры, HEX – скругление, RGBA – заливку и прозрачность, upload – изображение или подпись. Состояние модели отображается под холстом; сброс восстанавливает поля и камеру.

<ClientOnly><InputLab /></ClientOnly>

### Начните с небольшой комбинации

Полный инспектор выше объединяет все пять компонентов. Чтобы разобраться в связи полей с объектом, начните с **ширины, высоты и заливки**. Поля работают самостоятельно; обработчик события нужен только для обновления объекта в превью.

**1. Добавьте разметку.** Выберите вкладку своего фреймворка. Это клиентские примеры; используйте настройки React TypeScript / Vue и рекомендации по SSR из первого примера.

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html; load src/main.ts from the next step -->
<section class="input-preview">
  <dsk-input-group>
    <dsk-input
      data-size="width"
      value="120"
      min="40"
      max="200"
      aria-label="Width"
    ></dsk-input>
    <dsk-input
      data-size="height"
      value="80"
      min="40"
      max="200"
      aria-label="Height"
    ></dsk-input>
  </dsk-input-group>
  <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
  <div class="preview-object">dsk</div>
</section>

<script type="module" src="/src/main.ts"></script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
import './input-preview.css';
import { updatePreview } from './input-preview';

export default function App() {
  return (
    <section onInput={updatePreview} className="input-preview">
      <dsk-input-group>
        <dsk-input
          data-size="width"
          value="120"
          min="40"
          max="200"
          aria-label="Width"
        ></dsk-input>
        <dsk-input
          data-size="height"
          value="80"
          min="40"
          max="200"
          aria-label="Height"
        ></dsk-input>
      </dsk-input-group>
      <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
      <div className="preview-object">dsk</div>
    </section>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
import './input-preview.css';
import { updatePreview } from './input-preview';
</script>

<template>
  <section @input="updatePreview" class="input-preview">
    <dsk-input-group>
      <dsk-input
        data-size="width"
        value="120"
        min="40"
        max="200"
        aria-label="Width"
      ></dsk-input>
      <dsk-input
        data-size="height"
        value="80"
        min="40"
        max="200"
        aria-label="Height"
      ></dsk-input>
    </dsk-input-group>
    <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
    <div class="preview-object">dsk</div>
  </section>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
  import './input-preview.css';
  import { updatePreview } from './input-preview';
</script>

<section oninput={updatePreview} class="input-preview">
  <dsk-input-group>
    <dsk-input data-size="width" value="120" min="40" max="200" aria-label="Width"></dsk-input>
    <dsk-input data-size="height" value="80" min="40" max="200" aria-label="Height"></dsk-input>
  </dsk-input-group>
  <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
  <div class="preview-object">dsk</div>
</section>
```

```ts [Angular]
// src/app/app.ts
import '@flowscape-ui/dsk';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { updatePreview } from '../input-preview';

@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrl: '../input-preview.css',
  template: `
    <section (input)="updatePreview($event)" class="input-preview">
      <dsk-input-group>
        <dsk-input
          data-size="width"
          value="120"
          min="40"
          max="200"
          aria-label="Width"
        ></dsk-input>
        <dsk-input
          data-size="height"
          value="80"
          min="40"
          max="200"
          aria-label="Height"
        ></dsk-input>
      </dsk-input-group>
      <dsk-input-color value="FF007A" aria-label="Fill"></dsk-input-color>
      <div class="preview-object">dsk</div>
    </section>
  `,
})
export class App {
  readonly updatePreview = updatePreview;
}
```

:::

</div>

**2. Добавьте небольшой обработчик события.** Создайте `src/input-preview.ts`. Он читает поля и обновляет CSS объекта. Незавершённое число или цвет оставляют последнее корректное состояние превью. Все фреймворки выше используют одну и ту же функцию.

```ts
// src/input-preview.ts
import type { DskInput } from '@flowscape-ui/dsk';

export function updatePreview(event: {
  currentTarget: EventTarget | null;
}): void {
  const root = event.currentTarget;
  if (!(root instanceof HTMLElement)) return;
  const object = root.querySelector<HTMLElement>('.preview-object');
  if (!object) return;

  for (const size of ['width', 'height'] as const) {
    const field = root.querySelector<DskInput>(
      `dsk-input[data-size="${size}"]`,
    );
    if (field && Number.isFinite(field.valueAsNumber)) {
      object.style[size] = `${field.valueAsNumber}px`;
    }
  }
  const fill = root.querySelector('dsk-input-color');
  if (fill && /^[0-9A-F]{6}$/.test(fill.value)) {
    object.style.backgroundColor = `#${fill.value}`;
  }
}
```

**3. Добавьте стили.** Создайте `src/input-preview.css`:

```css
/* src/input-preview.css */
.input-preview {
  display: grid;
  gap: 16px;
  --dsk-input-group-wrap: wrap;
}
.preview-object {
  display: grid;
  place-items: center;
  width: 120px;
  height: 80px;
  border-radius: 16px;
  background: #ff007a;
  color: white;
}
```

**Только Vanilla:** подключите обработчик в `src/main.ts`. Во вкладках фреймворков он уже подключён в шаблоне.

```ts
// src/main.ts (Vanilla only)
import '@flowscape-ui/dsk';
import './input-preview.css';
import { updatePreview } from './input-preview';

document
  .querySelector('.input-preview')
  ?.addEventListener('input', updatePreview);
```

### Необязательно: исходники полного инспектора

Файлы ниже реализуют полный инспектор этой страницы, включая pan/zoom, файлы, сброс и вывод состояния. Для небольшого примера выше они не нужны. Если вы копируете полное демо, вызовите `mountInputLab(host, 'ru')` в браузере после появления контейнера, а при его удалении вызовите возвращённую функцию очистки. Храните оба файла рядом. Для английских подписей используйте `mountInputLab(host)`.

<details>
<summary>input-lab.ts</summary>

<<< @/snippets/input-lab.ts

</details>

<details>
<summary>input-lab.css</summary>

<<< @/snippets/input-lab.css

</details>
