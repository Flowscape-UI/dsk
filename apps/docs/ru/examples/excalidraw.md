# Excalidraw + DSK

<script setup>
import { data as project } from '../../.vitepress/data/excalidraw-project.data.ts';
</script>

Сохраняем рисованный холст Excalidraw и добавляем вокруг него нативные компоненты DSK. Excalidraw отвечает за сцену, выделение, перемещение, поворот и навигацию. DSK предоставляет внешнюю панель трансформаций, две линейки с направляющими и комментарий, который следует за прямоугольником.

<ClientOnly><EngineExample engine="excalidraw" /></ClientOnly>

Редактор загружается автоматически вместе со страницей. Перетащите или поверните любую фигуру, затем измените **X**, **Y** или **Поворот** в полях DSK. **Выбрать прямоугольник** возвращает исходное выделение, **Уместить** показывает всю сцену, а **Сбросить** восстанавливает две начальные фигуры. Вытяните направляющую из линейки и нажмите Delete на направляющей в фокусе, чтобы удалить её. Для перемещения камеры и масштабирования используйте обычную навигацию Excalidraw.

Сцена хранится в памяти. При уходе со страницы редактор уничтожается, при возвращении создаётся новый пример. Комментарий и направляющие принадлежат слою DSK. Они не становятся элементами Excalidraw и не меняют его привязки.

## 1. Установите зависимости

Начните с приложения Vite на TypeScript:

```sh
npm i @flowscape-ui/dsk @excalidraw/excalidraw@0.18.1 react@18.3.1 react-dom@18.3.1
npm i -D @types/react@18 @types/react-dom@18
```

React нужен Excalidraw. Сам DSK остаётся набором нативных custom elements. В примере используется `createElement`, поэтому ниже обычные файлы `.ts`, для которых не нужна настройка JSX.

```text
index.html
src/
  main.ts
  shared/
    engine-error-boundary.ts
    example-shell.ts
    example-shell.css
  excalidraw/
    mount-example.ts
    scene.ts
    bind-dsk.ts
    style.css
```

Excalidraw распространяется по лицензии MIT. См. [официальную документацию пакета](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation). Сохраняйте уведомления о лицензиях при распространении зависимостей.

## 2. Подготовьте контейнер и элементы DSK

Добавьте контейнер в `index.html`:

```html
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

Общая оболочка создаёт поля, линейки и комментарий. Её `surface` предназначена для движка. Линейки и комментарий используют начало координат внутреннего viewport, а слой комментария не перехватывает жесты на холсте.

Сохраните эти два файла в `src/shared`. В остальных примерах движков они используются без изменений:

<<< @/snippets/shared/example-shell.ts

<<< @/snippets/shared/example-shell.css

Основные публичные API здесь: `ruler.target = viewport`, `.camera` у каждой линейки и маркера, а также `input.value` и события `input` у полей. Оболочка не перезаписывает активное поле во время перетаскивания, поэтому обновление сцены не прерывает редактирование.

## 3. Создайте сцену Excalidraw

Сохраните файл `src/excalidraw/scene.ts`. `convertToExcalidrawElements` добавляет необходимые движку метаданные элементов. Постоянные ID позволяют комментарию оставаться привязанным к прямоугольнику при смене выделения.

<<< @/snippets/excalidraw/scene.ts

Функция создаёт новые элементы и для кнопки **Сбросить**. Геометрией и отрисовкой управляет Excalidraw; DSK не подменяет его фигуры собственной отрисовкой.

## 4. Подключите редактор

Сохраните файл `src/excalidraw/mount-example.ts`:

<<< @/snippets/excalidraw/mount-example.ts

Сохраните небольшую React error boundary в `src/shared/engine-error-boundary.ts`. Она сообщает контейнеру об ошибках отрисовки, чтобы документация могла заменить индикатор загрузки кнопкой повторной попытки:

<<< @/snippets/shared/engine-error-boundary.ts

`excalidrawAPI` передаёт публичный API редактора. `initialData` создаёт две фигуры и выделяет прямоугольник. `autoFocus: false` не позволяет загрузке страницы перехватить фокус клавиатуры, а `handleKeyboardGlobally: false` ограничивает горячие клавиши Excalidraw его редактором, чтобы они не мешали внешним полям DSK.

Режим zen оставляет сцену свободной и сохраняет инструменты редактирования Excalidraw. Когда сцена готова, контейнер получает `data-ready="true"`, и обёртка документации убирает индикатор загрузки.

## 5. Свяжите выделение, трансформации и камеру

Сохраните файл `src/excalidraw/bind-dsk.ts`:

<<< @/snippets/excalidraw/bind-dsk.ts

Адаптер работает в двух направлениях:

1. `api.onChange` читает выделение и геометрию, затем обновляет панель и слой DSK.
2. Событие `input` от DSK создаёт копию выбранного элемента через `newElementWith` и передаёт сцену в `api.updateScene`. Публичная функция обновляет версию элемента и сбрасывает кеш его геометрии.

### Преобразование координат

Excalidraw хранит смещение сцены до применения масштаба. DSK ожидает смещение в пикселях viewport:

```ts
const { scrollX, scrollY, zoom } = api.getAppState();
shell.setCamera({
  panX: scrollX * zoom.value,
  panY: scrollY * zoom.value,
  zoom: zoom.value,
});
```

После преобразования обе системы описываются формулой `screen = world * zoom + pan`. Не добавляйте прокрутку страницы или положение контейнера в документе. DSK уже работает относительно целевого viewport. `getCommonBounds` возвращает границы повёрнутого прямоугольника в сцене, поэтому комментарий следует за его правым нижним углом.

### Выделение и поворот

Эта панель редактирует один незаблокированный прямоугольник или эллипс вне группы и frame. При пустом или множественном выделении, а также для других типов элементов поля отключены. X/Y задают начало неповёрнутого элемента; Excalidraw применяет угол вокруг его центра. DSK использует градусы, а Excalidraw - радианы, поэтому адаптер преобразует единицы.

Обычное выделение, изменение размера и поворот Excalidraw продолжают работать. Изменения полей DSK используют `CaptureUpdateAction.IMMEDIATELY` и попадают в историю Excalidraw. Этот небольшой адаптер не объединяет перетаскивание инпута в один шаг отмены. При интеграции в продукт группируйте изменения в соответствии со своим сценарием редактирования.

Подробнее об обновлении сцены, подписках и камере - в [официальном imperative API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api).

## 6. Добавьте стили, запустите и настройте очистку

Сохраните стили в `src/excalidraw/style.css`. Основную таблицу стилей движка импортирует модуль подключения; эти локальные правила меняют только акцентные цвета.

<<< @/snippets/excalidraw/style.css

Запустите пример из `src/main.ts`:

```ts
import { mountExample } from './excalidraw/mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// Also call dispose() when your application removes this page.
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

Очистка отменяет подписку на сцену, размонтирует React и удаляет слушатели DSK и слои направляющих. В SSR-приложении динамически импортируйте модуль из клиентского mount-хука фреймворка после появления контейнера, а при unmount вызывайте возвращённую функцию очистки:

```ts
// Inside a client mount hook, never during server rendering.
const { mountExample } = await import('./excalidraw/mount-example.ts');
const dispose = mountExample(root);
// Register dispose with your framework's unmount hook.
```

## 7. Изучите и скачайте проект

Ниже собраны все файлы для запуска примера, включая общую оболочку и эти же исходники редактора. Выберите файл, чтобы изучить или скопировать его содержимое.

Скачайте и распакуйте ZIP. Откройте терминал в `dsk-excalidraw-example`, выполните `npm install` и `npm run dev`. Нужны Node.js 22.12+ и интернет для установки зависимостей. Архив содержит собранный DSK в `vendor`, поэтому этот [монорепозиторий](https://github.com/Flowscape-UI/dsk) не нужен. Команда `npm run build` проверяет типы и создаёт production-сборку.

<ExampleProjectViewer :project="project" />
