# Временная шкала

`dsk-timeline` редактирует дорожки, клипы и ключевые кадры и предоставляет часы воспроизведения. Как значения влияют на объекты, решает приложение. Движок не требуется: примеры ниже анимируют обычный HTML-объект.

## Добавьте временную шкалу

```ts
import '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
```

```html
<dsk-timeline duration="4" aria-label="Анимация"></dsk-timeline>
```

Пустая шкала уже поддерживает воспроизведение и перемещение курсора. Данные передаются через свойство `tracks`, а не JSON-атрибут HTML:

```ts
const timeline = document.querySelector('dsk-timeline')!;
timeline.tracks = [
  {
    id: 'x',
    label: 'Позиция X',
    keyframes: [
      { id: 'start', time: 0, value: -60 },
      { id: 'end', time: 4, value: 60 },
    ],
  },
];
```

<ClientOnly><EditorExample kind="timeline" /></ClientOnly>

Пример объединяет три независимых свойства. Позиция и прозрачность используют ключи непосредственно на дорожке, вращение использует клип. Переместите курсор или нажмите Play, чтобы увидеть результат.

## Данные и время

| Тип                 | Поля                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| `TimelineTrack`     | `id`, `label`, необязательные `clips`, `keyframes`, `locked`, `muted`, `part`. |
| `TimelineClip`      | `id`, `label`, `start`, `duration`, необязательные `keyframes`, `part`.        |
| `TimelineKeyframe`  | `id`, `time`, необязательные числовое `value`, `easing`, `label`, `part`.      |
| `TimelineSelection` | `trackId`, `clipId: string \| null`, `keyframeId: string \| null`.             |

Время задаётся в секундах. Ключи дорожки используют абсолютное время шкалы, ключи клипа отсчитываются от начала клипа. Клипы необязательны и могут сосуществовать с прямыми ключами. ID дорожек уникальны на шкале, клипов внутри дорожки, ключей внутри владельца. Присваивание проверяет и копирует данные; getter возвращает независимые копии с обязательным массивом `clips`. Изменение полученной копии не обновляет компонент.

`tracks = ...` заменяет данные без события изменения, очищает выделение и локальную историю. Для отменяемых изменений используйте команды ниже. Геометрия клипов ограничивается длительностью шкалы. Ключи за пределами видимого времени сохраняются, но скрываются: обрезка не стирает анимационные данные.

## Подключение к объекту

Создайте два файла ниже. Интерактивные примеры используют эту же реализацию. Импортируйте подключение только на клиенте. `evaluateTimelineTrack()` возвращает `{ clipId, value }[]`: прямые ключи имеют `clipId: null`, клипы дают значения только в активном интервале. Отключённые через muted дорожки не возвращают значения, locked не мешает вычислению. При перекрытии клипов приложение выбирает способ смешивания. Здесь используется первый результат для каждого свойства.

`src/timeline-data.ts`:

<<< ../../snippets/timeline-data.ts

`src/connect-timeline.ts`:

<<< ../../snippets/connect-timeline.ts

Функция подписывается на время и редактирование и возвращает очистку. Вызывайте её после монтирования и очищайте подписки при уходе со страницы. Примеры фреймворков ниже используют эти файлы. Названия дорожек в данных можно перевести; ID остаются стабильными.

## Ключи, выделение, блокировка и отключение

<ClientOnly><EditorExample kind="timeline" variant="advanced" /></ClientOnly>

Выберите заголовок дорожки для прямых ключей или клип для локальных ключей. Поле значения используется при добавлении ключа. Выберите существующий ключ, чтобы настроить исходящую интерполяцию. Вариант «Своя кривая Bezier» позволяет задать X1, Y1, X2 и Y2. Lock запрещает пользовательское редактирование и команды изменения ключей дорожки. Mute отключает участие дорожки в вычислении, но не останавливает часы.

```ts
timeline.addKeyframe('x', null, { id: 'middle', time: 2, value: 0 });
timeline.updateKeyframe('x', null, 'middle', {
  value: 30,
  easing: 'ease-in-out',
});
timeline.removeKeyframe('x', null, 'middle');
timeline.setTrackState('x', { locked: true, muted: false });
timeline.select([{ trackId: 'x', clipId: null, keyframeId: 'start' }]);
timeline.deleteSelection();
```

Для ключей клипа передавайте его ID вместо null. Команды редактирования возвращают факт изменения; неверные цели/данные могут вызвать ошибку. Disabled/readonly блокируют команды редактирования. `setTrackState()` позволяет снять блокировку. `selection` содержит основное выделение или null, `selections` содержит все выбранные элементы. `select(items)` меняет выделение и отправляет события выделения, не создавая запись истории данных.

## Интерполяция

`easing` относится к участку после ключа. По умолчанию `linear`; пресеты: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, а также `step` и кубическая кривая Безье `[x1, y1, x2, y2]`. Все четыре координаты должны быть конечными числами от 0 до 1. `step` удерживает левое значение до следующего ключа. Вычисление сохраняет крайние значения за пределами ключей; при одинаковом времени используется последний переданный ключ; ключи без числового значения игнорируются.

```ts
import { evaluateTimelineKeyframes } from '@flowscape-ui/dsk';
const value = evaluateTimelineKeyframes(
  [
    { id: 'a', time: 0, value: 0, easing: [0.42, 0, 1, 1] },
    { id: 'b', time: 1, value: 100 },
  ],
  0.5,
);
```

Результат: `number | undefined`. Функция только вычисляет значение, не меняет DOM и не запускает цикл анимации.

## Атрибуты и свойства

| Атрибут          | Свойство        | По умолчанию | Назначение                                                        |
| ---------------- | --------------- | ------------ | ----------------------------------------------------------------- |
| `duration`       | `duration`      | `12`         | Длительность, минимум 0.01 секунды.                               |
| `current-time`   | `currentTime`   | `0`          | Курсор в пределах duration. Присваивание не вызывает событие.     |
| `zoom`           | `zoom`          | `1`          | Горизонтальный масштаб, минимум 0.1.                              |
| `step`           | `step`          | `0.25`       | Шаг сетки/клавиатуры, минимум 0.001 секунды.                      |
| `snap`           | `snap`          | `true`       | `snap="false"` отключает привязки.                                |
| `snap-elements`  | `snapElements`  | `true`       | `false` отключает привязку к элементам, сохраняя сетку.           |
| `snap-threshold` | `snapThreshold` | `8`          | Неотрицательное расстояние привязки в пикселях.                   |
| `range-start`    | `rangeStart`    | `0`          | Начало воспроизведения.                                           |
| `range-end`      | `rangeEnd`      | duration     | Конец, минимум на 0.001 позже начала.                             |
| `loop`           | `loop`          | `false`      | Повтор диапазона; включается присутствием атрибута.               |
| `disabled`       | `disabled`      | `false`      | Блокировать взаимодействие и воспроизведение.                     |
| `readonly`       | `readOnly`      | `false`      | Блокировать редактирование, сохраняя перемотку и воспроизведение. |

`play()`, `pause()`, `togglePlayback()` управляют часами; `playing` доступно для чтения. Если курсор вне диапазона, воспроизведение начинается с начала диапазона. Изменение границ ставит воспроизведение на паузу. Ручки диапазона поддерживают стрелки. Диапазон является состоянием просмотра и не попадает в историю дорожек. Удаление компонента останавливает воспроизведение.

## События

| Событие                  | Данные                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| `input`, `change`        | `{ tracks, action }`, `TimelineEditDetail`: процесс и фиксация изменения. |
| `timeupdate`             | `{ time }` при пользовательской перемотке/воспроизведении.                |
| `selectionchange`        | Основное `TimelineSelection` или null.                                    |
| `selectionschange`       | Массив выделений.                                                         |
| `rangechange`            | `{ start, end }` при работе с ручками диапазона.                          |
| `play`, `pause`, `ended` | Жизненный цикл воспроизведения.                                           |

События всплывают и проходят границы Shadow DOM. Действия: `move`, `resize`, `reorder`, `history`, `keyframe`, `delete`, `track-state`. Программное присваивание отличается от ввода пользователя: после него обновляйте приложение явно. Используйте `input` для живого результата, `change` для сохранения.

## Клавиатура, выделение и привязки

- Space переключает воспроизведение при фокусе на шкале. Перетаскивание линейки меняет время.
- Перетаскивайте заголовок для перестановки дорожки; Alt+вверх/вниз делает то же с клавиатуры.
- Перетаскивайте клипы и ключи; стрелки перемещают выбранный элемент, Shift увеличивает шаг. Alt+стрелки меняет конец клипа.
- Shift+клик переключает выделение; жест по пустой области дорожки рисует рамку. Shift+Enter переключает выделение элемента в фокусе. Группа движется с сохранением интервалов и ограничивается границами целиком.
- Delete/Backspace или `deleteSelection()` удаляет доступное выделение одной записью истории. Заблокированные дорожки сохраняются.
- Ctrl/Cmd+Z и Ctrl/Cmd+Shift+Z отменяют и повторяют правки дорожек. Escape отменяет жест.
- Привязки учитывают курсор, края клипов, ключи, границы диапазона и шкалы. Alt временно отключает привязку указателя, направляющая показывает цель.

## Оформление

<ClientOnly><EditorExample kind="timeline" styled /></ClientOnly>

```css
dsk-timeline {
  --dsk-timeline-accent: #ff007a;
  --dsk-timeline-radius: 0px;
  --dsk-timeline-row-height: 48px;
  --dsk-timeline-keyframe-angle: 0deg;
}
dsk-timeline::part(clip) {
  background: #28403d;
}
dsk-timeline::part(selected-keyframe) {
  filter: brightness(1.3);
}
```

Части: `toolbar`, `play-button`, `time`, `viewport`, `board`, `ruler-row`, `ruler-label`, `ruler`, `tick`, `track`, `track-header`, `lane`, `clip`, `keyframe`, `keyframe-marker`, `resize-start`, `resize-end`, `playhead`, `playhead-marker`, `playback-range`, `range-start`, `range-end`, `selection-box`, `snap-guide`. Состояния: `selected-track`, `selected-track-header`, `selected-lane`, `selected-clip`, `selected-keyframe`, `locked-track`, `muted-track`. Поле данных `part` добавляет собственные CSS-идентификаторы через пробел. Именованный слот `toolbar` принимает ваши элементы управления.

Префикс переменных: `--dsk-timeline-`. Цветовые суффиксы: `background`, `text`, `border`, `muted`, `accent`, `accent-text`, `header-background`, `selected-track-background`, `selected-header-background`, `clip-background`, `clip-border`, `clip-text`, `keyframe-color`, `handle-background`, `snap-color`. Геометрия и шрифты: `font-size`, `line-height`, `font-family`, `mono-font-family`, `time-font-size`, `tick-font-size`, `label-width`, `row-height`, `ruler-height`, `max-height`, `radius`, `clip-inset`, `keyframe-size`, `keyframe-angle`, `handle-width`, `touch-handle-width`, `playhead-width`, `selection-shadow`, `muted-opacity`.

## Подключение во фреймворках

Создайте два файла из раздела выше. `object` - обычный HTML-элемент, которому нужно задать размер и фон. Контейнер `.stage` оставляет место для движения.

```css
/* src/editor.css */
.stage {
  height: 180px;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.object {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  background: #ff007a;
  color: white;
}
```

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<div class="stage"><div id="object" class="object">DSK</div></div>
<dsk-timeline duration="4"></dsk-timeline>
<script type="module">
  import '@flowscape-ui/dsk/styles.css';
  import './editor.css';
  import { connectTimeline } from './connect-timeline.ts';
  const dispose = connectTimeline(
    document.querySelector('dsk-timeline'),
    document.querySelector('#object'),
  );
  // In an SPA, call dispose() when unmounting this view.
</script>
```

```tsx [React]
import { useEffect, useRef } from 'react';
import type { DskTimeline } from '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
import { connectTimeline } from './connect-timeline';
export default function App() {
  const timeline = useRef<DskTimeline>(null);
  const object = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (timeline.current && object.current)
      return connectTimeline(timeline.current, object.current);
  }, []);
  return (
    <>
      <div className="stage">
        <div ref={object} className="object">
          DSK
        </div>
      </div>
      <dsk-timeline ref={timeline} duration="4"></dsk-timeline>
    </>
  );
}
```

```vue [Vue]
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { DskTimeline } from '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';
import './editor.css';
import { connectTimeline } from './connect-timeline';
const timeline = ref<DskTimeline>();
const object = ref<HTMLDivElement>();
let dispose: (() => void) | undefined;
onMounted(() => {
  if (timeline.value && object.value)
    dispose = connectTimeline(timeline.value, object.value);
});
onBeforeUnmount(() => dispose?.());
</script>
<template>
  <div class="stage"><div ref="object" class="object">DSK</div></div>
  <dsk-timeline ref="timeline" duration="4"></dsk-timeline>
</template>
```

```svelte [Svelte]
<script lang="ts">
  import { onMount } from 'svelte';
  import type { DskTimeline } from '@flowscape-ui/dsk';
  import '@flowscape-ui/dsk/styles.css';
  import './editor.css';
  import { connectTimeline } from './connect-timeline';
  let timeline: DskTimeline;
  let object: HTMLDivElement;
  onMount(() => connectTimeline(timeline, object));
</script>
<div class="stage"><div bind:this={object} class="object">DSK</div></div>
<dsk-timeline bind:this={timeline} duration="4"></dsk-timeline>
```

```ts [Angular]
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  type AfterViewInit,
  type OnDestroy,
} from '@angular/core';
import type { DskTimeline } from '@flowscape-ui/dsk';
import { connectTimeline } from './connect-timeline';
@Component({
  selector: 'app-root',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<div class="stage"><div #object class="object">DSK</div></div>
    <dsk-timeline #timeline duration="4"></dsk-timeline>`,
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('timeline') timeline!: ElementRef<DskTimeline>;
  @ViewChild('object') object!: ElementRef<HTMLDivElement>;
  private dispose?: () => void;
  ngAfterViewInit() {
    this.dispose = connectTimeline(
      this.timeline.nativeElement,
      this.object.nativeElement,
    );
  }
  ngOnDestroy() {
    this.dispose?.();
  }
}
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
