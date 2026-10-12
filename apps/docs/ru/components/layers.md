# Дерево слоёв

Соберите панель слоёв из вложенных HTML-элементов. Раскрытие, поиск, переименование и перестановка уже встроены. Ваше приложение связывает строки с объектами редактора и сохраняет изменения.

```sh
npm i @flowscape-ui/dsk
```

::: tip Сначала HTML
Дерево работает после импорта пакета без отдельной инициализации. В отличие от одиночных контролов, здесь вложенность тегов задаёт структуру. Всем тегам, в том числе пустым строкам и поиску, нужны закрывающие теги. Примеры ниже для клиентского приложения. Для SSR смотрите [установку](/ru/guide/installation#server-rendered-applications).
:::

## Добавьте дерево

<ClientOnly><LayerExample kind="basic" /></ClientOnly>

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-layer-tree aria-label="Слои документа">
  <dsk-list-value label="Frame" open="">
    <dsk-list-value label="Cover"></dsk-list-value>
    <dsk-list-value label="Sticker"></dsk-list-value>
  </dsk-list-value>
</dsk-layer-tree>
<script type="module">
  import '@flowscape-ui/dsk';
</script>
```

```tsx [React]
// src/App.tsx
import '@flowscape-ui/dsk';
export default function App() {
  return (
    <dsk-layer-tree aria-label="Слои документа">
      <dsk-list-value label="Frame" open={true}>
        <dsk-list-value label="Cover"></dsk-list-value>
        <dsk-list-value label="Sticker"></dsk-list-value>
      </dsk-list-value>
    </dsk-layer-tree>
  );
}
```

```vue [Vue]
<!-- src/App.vue -->
<script setup lang="ts">
import '@flowscape-ui/dsk';
</script>
<template>
  <dsk-layer-tree aria-label="Слои документа">
    <dsk-list-value label="Frame" open="">
      <dsk-list-value label="Cover"></dsk-list-value>
      <dsk-list-value label="Sticker"></dsk-list-value>
    </dsk-list-value>
  </dsk-layer-tree>
</template>
```

```svelte [Svelte]
<!-- src/App.svelte -->
<script lang="ts">
  import '@flowscape-ui/dsk';
</script>
<dsk-layer-tree aria-label="Слои документа">
  <dsk-list-value label="Frame" open="">
    <dsk-list-value label="Cover"></dsk-list-value>
    <dsk-list-value label="Sticker"></dsk-list-value>
  </dsk-list-value>
</dsk-layer-tree>
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
    <dsk-layer-tree aria-label="Слои документа">
      <dsk-list-value label="Frame" open="">
        <dsk-list-value label="Cover"></dsk-list-value>
        <dsk-list-value label="Sticker"></dsk-list-value>
      </dsk-list-value>
    </dsk-layer-tree>
  `,
})
export class App {}
```

:::

</div>

Для React и Vue выполните [однократную настройку](#framework-setup). Следующие HTML-фрагменты одинаковы для этих пяти сред; вставляйте их вместо дерева в соответствующей вкладке. В React используйте className вместо class.

::: info Фокус и выбор объекта
Встроенный контрол управляет фокусом и иерархией. У него нет selected, мультивыбора или события select. Выделение объекта на холсте в демо - код приложения на основе focusin. Сворачивание ветки и поиск не скрывают объекты документа.
:::

## Структура и поведение строк

`dsk-layer-tree` содержит строки `dsk-list-value`. Дочерние строки должны быть прямыми детьми родительской строки. Импорт также регистрирует `dsk-list-header`, `dsk-list-footer` и `dsk-tree-search` и экспортирует классы DskLayerTree, DskListValue, DskListHeader, DskListFooter и DskTreeSearch.

```html
<dsk-layer-tree aria-label="Слои документа">
  <dsk-list-header>Документ</dsk-list-header>
  <dsk-list-value open>
    <dsk-list-header>Монтажная область</dsk-list-header>
    <dsk-list-value label="Заголовок"></dsk-list-value>
    <dsk-list-value label="Иллюстрация">
      <dsk-list-value label="Изображение"></dsk-list-value>
      <dsk-list-value label="Подпись"></dsk-list-value>
    </dsk-list-value>
    <dsk-list-footer>Конец группы</dsk-list-footer>
  </dsk-list-value>
  <dsk-list-footer>Документ сохранён</dsk-list-footer>
</dsk-layer-tree>
```

Прямой header задаёт содержимое строки; без него используется label. Footer внутри строки появляется под детьми при раскрытии. Header/footer в корне дерева видны независимо от веток. Слоты назначаются автоматически. Клик по строке переводит фокус и раскрывает или закрывает ветку. По умолчанию ветки закрыты; у листа нет видимого значка раскрытия. Даже строка только с footer считается раскрываемой.

Кнопки, ссылки, поля ввода, select и textarea внутри заголовка не переключают ветку. Для других интерактивных действий добавьте `data-dsk-tree-action`. Декоративные значки лучше помещать в slot="icon", а действия - в footer или явно обозначенную кнопку.

### Атрибуты, свойства и методы

| Элемент         | Атрибут / свойство               | По умолчанию                     | Назначение                                                                     |
| --------------- | -------------------------------- | -------------------------------- | ------------------------------------------------------------------------------ |
| dsk-layer-tree  | reorderable / .reorderable       | true                             | Строка `reorderable="false"` или свойство false отключают все перемещения.     |
| dsk-layer-tree  | .items                           | Только чтение                    | Все строки, принадлежащие этому дереву.                                        |
| dsk-layer-tree  | .visibleItems                    | Только чтение                    | Видимые строки клавиатурной навигации, включая отключённые раскрываемые ветки. |
| dsk-list-value  | label / .label                   | Пустая строка                    | Простое имя при отсутствии своего заголовка.                                   |
| dsk-list-value  | open / .open                     | false                            | Наличие атрибута раскрывает ветку. Прямое присваивание не отправляет toggle.   |
| dsk-list-value  | disabled / .disabled             | false                            | Защищает строку от перемещения и переименования, создаёт границу группы.       |
| dsk-list-value  | draggable                        | Не задан (перемещение разрешено) | Нативный HTML-атрибут; false запрещает перемещение конкретной строки.          |
| dsk-list-value  | .items                           | Только чтение                    | Прямые дочерние строки.                                                        |
| dsk-list-value  | .expandable                      | Только чтение                    | Наличие детей или footer.                                                      |
| dsk-list-value  | .displayName                     | Только чтение                    | Имя для отображения, поиска и переименования.                                  |
| dsk-tree-search | value / .value                   | Пустая строка                    | Запрос; программное присваивание фильтрует без события input.                  |
| dsk-tree-search | placeholder                      | Search layers                    | Подсказка пустого поля.                                                        |
| dsk-tree-search | disabled                         | Отсутствует                      | Отключает поле, но не очищает запрос.                                          |
| Все             | aria-label, class, style, hidden | Нативный HTML                    | Доступное имя и оформление.                                                    |

`item.toggle()` переключает ветку, `item.toggle(true/false)` открывает или закрывает её, включая disabled-ветку. `item.startRename()` начинает правку имени. Нативные `.focus()` / `.blur()` управляют фокусом. Header/footer не имеют отдельного API значения. Дерево не отправляет значение с HTML-формой автоматически.

open и disabled - булевы атрибуты по наличию: `disabled="false"` всё ещё отключает строку. Для выключения удалите атрибут. У reorderable и draggable значение false, напротив, задаётся строкой.

### Клавиатура

У строк дерева одна позиция Tab. Стрелки вверх/вниз переходят по видимым доступным строкам; вправо раскрывает ветку или входит в первого ребёнка, влево закрывает или переходит к родителю. Home/End выбирают первую/последнюю строку; Enter/Space переключают ветку. Если внутри закрываемой ветки был фокус, он возвращается на её строку. Закрытые дети сразу становятся inert, пока высота плавно уменьшается. Анимация учитывает reduced motion. Отключённые листья пропускаются, а отключённые группы остаются доступны для раскрытия.

## Поиск

<ClientOnly><LayerExample kind="search" /></ClientOnly>

```html
<dsk-layer-tree aria-label="Слои">
  <dsk-tree-search placeholder="Найти слой"></dsk-tree-search>
  <dsk-list-value label="Страница">
    <dsk-list-value label="Заголовок"></dsk-list-value>
    <dsk-list-value label="Обложка"></dsk-list-value>
  </dsk-list-value>
</dsk-layer-tree>
```

Добавьте один прямой dsk-tree-search на дерево. JavaScript для поиска не нужен. Поле автоматически располагается над корневым header. Поиск подстроки игнорирует регистр и пробелы по краям запроса. Совпавшие строки и их предки остаются видимыми, предки раскрываются. Если совпала группа, её дети остаются доступными независимо от имён; пользователь сам управляет раскрытием такой группы и её потомков.

Очистка или удаление поиска возвращает прежние open/hidden. Строки, скрытые приложением, остаются скрытыми. Переименование и добавление строк автоматически обновляют результаты. Атрибуты placeholder, aria-label и disabled настраивают нативное поле. Ввод отправляет всплывающий input и перенаправленный change; присваивание `.value` событий не отправляет.

## Переименование

Двойной клик или F2 включает редактор. Кнопка в демо вызывает `.startRename()`, поэтому попробовать правку можно и на телефоне. Enter или потеря фокуса подтверждают, Escape отменяет. Пробелы по краям удаляются; пустые имена отклоняются. Собственный disabled запрещает переименование. Во время правки строка не перетаскивается.

```html
<dsk-list-value>
  <dsk-list-header>
    <strong data-dsk-name>Обложка</strong><span> Frame</span>
  </dsk-list-header>
</dsk-list-value>
```

Метка data-dsk-name ограничивает редактируемый текст, сохраняя соседние значки, кнопки и метаданные. Без неё используется первый непустой текстовый узел header; без header - label. Успешная правка обновляет label и отображаемое имя, затем отправляет rename. Прямое изменение label не является пользовательским переименованием и не отправляет rename.

## Перестановка и защищённые группы

<ClientOnly><LayerExample kind="disabled" /></ClientOnly>

Потяните строку к верхнему/нижнему краю другой строки для вставки до/после неё. Линия с кружком показывает место вставки. Средняя часть строки позволяет вложить слой внутрь неё; рамка и заливка обозначают группу назначения. Любая строка может стать группой. После успешного переноса группа назначения раскрывается. Сдвиг влево по отступам выбирает уровень предка; перенос к корневой строке или в пустую область дерева выводит слой в корень.

Источник остаётся на месте до отпускания, а браузер показывает полупрозрачную копию строки со значками и оформлением. Ветка переносится вместе с потомками. Циклы отклоняются. Escape и отпускание вне дерева отменяют перенос. Нативное перетаскивание зависит от браузера и устройства ввода; также доступна клавиатура.

Alt+Up / Alt+Down меняют позицию среди соседей. Alt+Right вкладывает строку в предыдущего соседа; Alt+Left выносит после родителя. Фокус остаётся на перемещённой строке. `draggable="false"` запрещает перемещение одной строки, `reorderable="false"` на дереве - всех строк.

Отключённая группа раскрывается, но сама не перемещается. Её потомки затемняются равномерно и могут двигаться только внутри той же ближайшей disabled-группы. Снаружи нельзя перенести слой внутрь неё. Собственный disabled у потомка создаёт отдельную границу. В демо попробуйте переставить Внутренний A/B и вынести один из них наружу. Отдельного атрибута locked нет.

### События и сохранение модели

| Событие       | detail                                                      | Когда                                                                     |
| ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| toggle        | `{ open }`                                                  | Действие пользователя или toggle(); target - строка. Прямое .open молчит. |
| rename        | `{ oldLabel, label }`                                       | Подтверждение изменённого имени; target - строка.                         |
| beforereorder | `{ item, oldParent, parent, position, oldIndex, newIndex }` | Перед перемещением; preventDefault() отменяет его.                        |
| reorder       | Те же поля                                                  | После изменения DOM. Не отправляется при неизменном порядке.              |

События дерева всплывают и пересекают Shadow DOM. position равен before, after или inside. parent - новый контейнер, oldParent - прежний. Индексы считают только строки, исключая header/footer. Экспортируемые типы: ListToggleDetail, ListRenameDetail и LayerReorderDetail.

```ts
import type { LayerReorderDetail, ListRenameDetail } from '@flowscape-ui/dsk';
const tree = document.querySelector('dsk-layer-tree');
tree?.addEventListener('reorder', (event) => {
  const { item, parent, newIndex } = (event as CustomEvent<LayerReorderDetail>)
    .detail;
  console.log(item.id, parent.id, newIndex);
});
tree?.addEventListener('rename', (event) => {
  const { oldLabel, label } = (event as CustomEvent<ListRenameDetail>).detail;
  console.log(oldLabel, label);
});
tree?.addEventListener('beforereorder', (event) => {
  const { parent } = (event as CustomEvent<LayerReorderDetail>).detail;
  if (parent.id === 'read-only-folder') event.preventDefault();
});
```

## Свой дизайн и значки

<ClientOnly><LayerExample kind="custom" /></ClientOnly>

```html
<dsk-layer-tree>
  <dsk-list-value open>
    <span slot="expand-icon">+</span>
    <span slot="collapse-icon">−</span>
    <span slot="icon">▦</span>
    <dsk-list-header
      ><strong data-dsk-name>Обложка</strong
      ><small> Frame</small></dsk-list-header
    >
    <dsk-list-value label="Изображение"></dsk-list-value>
    <dsk-list-footer>Конец группы</dsk-list-footer>
  </dsk-list-value>
</dsk-layer-tree>
```

Свои значки не вращаются автоматически; задайте оба состояния раскрытия. Иконки декоративные и скрыты от accessibility API; имя берётся из header/label или aria-label. Header, footer и содержимое слотов оформляются обычным CSS. CSS одинаков для всех фреймворков; в Vue используйте unscoped style. При необходимости ограничьте стили классом.

```css
dsk-layer-tree {
  --dsk-tree-indent: 24px;
  --dsk-tree-row-height: 40px;
  --dsk-tree-radius: 0px;
  --dsk-tree-hover-background: #251923;
  --dsk-tree-focus-color: #ff0073;
  --dsk-tree-icon-color: #ff0073;
  --dsk-tree-editor-background: #111111;
  --dsk-tree-search-border: #39393f;
}
dsk-list-value::part(row) {
  border-bottom: 1px solid #39393f;
}
dsk-list-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
```

| CSS-переменная                                            | По умолчанию                                  |
| --------------------------------------------------------- | --------------------------------------------- |
| --dsk-tree-color / --dsk-tree-background                  | inherit / transparent                         |
| --dsk-tree-indent / --dsk-tree-row-height                 | 20px / 34px                                   |
| --dsk-tree-row-padding / --dsk-tree-gap                   | 0 10px / 8px                                  |
| --dsk-tree-radius                                         | 6px                                           |
| --dsk-tree-icon-size / --dsk-tree-icon-color              | 16px / currentColor                           |
| --dsk-tree-hover-background / --dsk-tree-focus-color      | #eef1f7 / #557be8                             |
| --dsk-tree-duration / --dsk-tree-easing                   | 180ms / ease                                  |
| --dsk-tree-footer-padding / --dsk-tree-muted-color        | 8px 12px / #737b8c                            |
| --dsk-tree-disabled-opacity                               | 0.45                                          |
| --dsk-tree-editor-background                              | transparent                                   |
| --dsk-tree-drop-color / --dsk-tree-drop-line-width        | #0d99ff / 2px                                 |
| --dsk-tree-drop-dot-size / --dsk-tree-drop-dot-background | 6px / #fff                                    |
| --dsk-tree-drop-background                                | #0d99ff с 12% непрозрачности                  |
| --dsk-tree-search-padding / --dsk-tree-search-background  | 8px / transparent                             |
| --dsk-tree-search-border                                  | #ccd3df; только цвет, не полная запись border |

Parts строки: row, toggle, icon, label, editor, children, branch. Parts дерева: header, list, footer, drop-indicator, reorder-status. Поле поиска открывает input. Маркер переноса использует manual popover, поэтому не обрезается overflow контейнера. Сохраняйте видимость фокуса и геометрию строки. Глобального CSS reset нет.

## Связь с холстом

<ClientOnly><LayerExample kind="scene" /></ClientOnly>

Этот небольшой адаптер используется в живых примерах. Он связывает data-layer со слоем предпросмотра, читает отображаемое имя и обновляет порядок после reorder. Более поздняя строка рисуется выше предыдущей. Это правило демо, а не обязательный порядок DSK. Поиск и сворачивание не меняют видимость объектов.

<<< @/snippets/layer-preview.ts

```html
<dsk-layer-tree id="layers" aria-label="Document layers">
  <dsk-tree-search placeholder="Find a layer"></dsk-tree-search>
  <dsk-list-value label="Frame" open>
    <dsk-list-value data-layer="pink" label="Cover"></dsk-list-value>
    <dsk-list-value data-layer="violet" label="Sticker"></dsk-list-value>
  </dsk-list-value>
</dsk-layer-tree>
<dsk-pan-zoom style="display:block;height:280px">
  <div id="preview"></div>
</dsk-pan-zoom>
```

```css
#preview {
  position: relative;
  width: 220px;
  height: 200px;
  transform: translate(-50%, -50%);
}
.layer-shape {
  position: absolute;
  width: 140px;
  height: 130px;
  display: grid;
  place-items: center;
  color: white;
}
.layer-shape[data-layer='pink'] {
  top: 15px;
  left: 0;
  background: #ff0073;
}
.layer-shape[data-layer='violet'] {
  bottom: 0;
  right: 0;
  background: #7755ff;
}
.layer-shape.is-selected {
  outline: 2px solid white;
  outline-offset: 4px;
}
```

```ts
// src/main.ts; save the helper above as src/layer-preview.ts
import '@flowscape-ui/dsk';
import { bindLayerPreview } from './layer-preview';
const tree = document.querySelector('dsk-layer-tree#layers');
const preview = document.querySelector<HTMLElement>('#preview');
if (!tree || !preview) throw new Error('Missing layer preview');
const dispose = bindLayerPreview(tree, preview);
// Call dispose() before removing the view.
```

Во фреймворке передайте DOM-ссылки в bindLayerPreview после монтирования и вызовите возвращённый dispose при размонтировании. Для модели реального редактора вместо создания div обновляйте его собственные объекты. Этот пример не сериализует документ и не реализует групповые трансформации.

## Настройка фреймворка {#framework-setup}

Импортируйте пакет один раз. В Vue добавьте isCustomElement в существующую конфигурацию, как в [установке](/ru/guide/installation). В Angular схема уже указана в примере. Для React с TypeScript добавьте декларации:

```ts
// src/dsk-layers.d.ts
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  DskLayerTree,
  DskListValue,
  DskListHeader,
  DskListFooter,
  DskTreeSearch,
} from '@flowscape-ui/dsk';
type Props<T> = DetailedHTMLProps<HTMLAttributes<T>, T>;
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'dsk-layer-tree': Props<DskLayerTree> & {
        reorderable?: 'true' | 'false';
      };
      'dsk-list-value': Props<DskListValue> & {
        label?: string;
        open?: boolean;
        disabled?: boolean;
      };
      'dsk-list-header': Props<DskListHeader>;
      'dsk-list-footer': Props<DskListFooter>;
      'dsk-tree-search': Props<DskTreeSearch> & {
        value?: string;
        placeholder?: string;
        disabled?: boolean;
      };
    }
  }
}
```

::: warning Синхронизация модели
Перетаскивание изменяет light DOM. Если фреймворк рисует список из массива, обновляйте этот массив в reorder по стабильным id, включая вложенность и порядок. Иначе следующий рендер может вернуть старую структуру. Синхронизируйте имя в rename. Используйте стабильные key/track и не считайте индексы постоянными идентификаторами.
:::

## История изменений

Сфокусируйте строку дерева для Ctrl/Cmd+Z и Ctrl/Cmd+Shift+Z: отмены и повтора переименований и перестановок. Восстановление сохраняет DOM-узлы и отправляет всплывающее change; прочитайте дерево для синхронизации приложения. Активное поле переименования сохраняет нативное редактирование. Навигация, выделение и поиск не добавляют записи.
