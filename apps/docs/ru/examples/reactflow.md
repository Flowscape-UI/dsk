# React Flow + DSK

<script setup>
import { data as project } from '../../.vitepress/data/reactflow-project.data.ts';
</script>

Используем ту же панель DSK, линейки и комментарий в редакторе узлов. React Flow отвечает за выделение и перемещение узлов, связи и навигацию камеры. Нативные поля DSK меняют позицию выбранного узла и поворот его собственного визуального содержимого.

<ClientOnly><EngineExample engine="reactflow" /></ClientOnly>

Редактор загружается автоматически. Перетащите любой узел, выделите его и измените **X**, **Y** или **Поворот**. Перетаскивайте пустую область для перемещения камеры, используйте колесо или трекпад для масштаба и нажмите **Уместить**, чтобы увидеть оба узла. **Выбрать прямоугольник** возвращает исходное выделение, **Сбросить** восстанавливает начальное расположение. Вытяните направляющую из линейки. Комментарий остаётся привязан к прямоугольнику, в том числе после поворота.

Связь между узлами - настоящее ребро React Flow. В этом небольшом примере его концы фиксированы, а удаление узлов отключено. Изменения хранятся в памяти и сбрасываются при уходе со страницы. Направляющие DSK служат визуальными ориентирами и не добавляют привязки узлам React Flow.

## 1. Установите зависимости

В приложении Vite на TypeScript:

```sh
npm i @flowscape-ui/dsk @xyflow/react@12.12.0 react@18.3.1 react-dom@18.3.1
npm i -D @types/react@18 @types/react-dom@18
```

React Flow использует React. Элементы DSK остаются нативными custom elements вне его React root. `createElement` позволяет использовать обычный TypeScript без настройки JSX.

```text
index.html
src/
  main.ts
  shared/
    engine-error-boundary.ts
    example-shell.ts
    example-shell.css
  reactflow/
    mount-example.ts
    shape-node.ts
    style.css
```

React Flow распространяется по лицензии MIT. Пример сохраняет встроенную подпись проекта. См. [официальное руководство по началу работы](https://reactflow.dev/learn).

## 2. Создайте контейнер и общую панель

Добавьте контейнер в `index.html`:

```html
<div id="example"></div>
<script type="module" src="/src/main.ts"></script>
```

Сохраните общую оболочку в `src/shared`. Она создаёт три поля DSK, две линейки и слой комментария без CSS-трансформации. Только `shell.surface` принадлежит React Flow. У всех дополнительных слоёв одно начало координат viewport.

<<< @/snippets/shared/example-shell.ts

<<< @/snippets/shared/example-shell.css

Оболочка обрабатывает нативные события `input` и вызывает адаптер движка. Программное изменение значения DSK не создаёт новое событие `input`, а активное поле не перезаписывается во время перетаскивания.

## 3. Определите собственный узел

Сохраните файл `src/reactflow/shape-node.ts`:

<<< @/snippets/reactflow/shape-node.ts

Модель узла хранит `position` для React Flow и `data.rotation` для нашего визуального содержимого. `nodeTypes` находится вне React-компонента, поэтому его ссылка не меняется при редактировании. Каждый узел содержит настоящие `Handle` из React Flow для соединяющего ребра.

### Что здесь означает поворот

Стандартная позиция узла и рамка выделения React Flow остаются параллельны осям. В этом примере поворот применяется через CSS к внутреннему визуальному содержимому узла. Точки соединения остаются на внешнем узле, поэтому связь не вращается вокруг фигуры при изменении угла. Это выбранное устройство нашего custom node, а не встроенное свойство поворота React Flow.

Чтобы вращать и точки соединения, поместите их внутрь поворачиваемого содержимого и обновляйте их геометрию через `useUpdateNodeInternals` после каждого поворота. См. [собственные узлы](https://reactflow.dev/learn/customization/custom-nodes) и [пример поворачиваемого узла](https://reactflow.dev/examples/nodes/rotatable-node).

## 4. Подключите React Flow и DSK

Сохраните файл `src/reactflow/mount-example.ts`:

<<< @/snippets/reactflow/mount-example.ts

Сохраните общую React error boundary в `src/shared/engine-error-boundary.ts`. Она сообщает контейнеру об ошибках отрисовки, чтобы индикатор загрузки не оставался активным бесконечно:

<<< @/snippets/shared/engine-error-boundary.ts

`useNodesState` управляет массивом узлов. Изменения с холста приходят через `onNodesChange`; нативные изменения DSK вызывают `setNodes` с новым узлом и новым объектом `position` или `data`. Ref открывает нативным слушателям актуальные узлы, чтобы старое замыкание React не изменяло предыдущее выделение.

Редактируется только один выделенный узел. Пустое или множественное выделение отключает панель. React effects обновляют значения полей после изменений узлов. Комментарий использует постоянный ID прямоугольника, поэтому смена выделения не переносит его на эллипс.

## 5. Синхронизируйте камеру и комментарий

React Flow и DSK используют одинаковую формулу камеры:

```ts
// React Flow viewport: screen = world * zoom + { x, y }
onMove(_event, { x, y, zoom }) {
  shell.setCamera({ panX: x, panY: y, zoom });
}
```

В отличие от примеров Excalidraw и tldraw, дополнительное умножение не нужно. X/Y viewport в React Flow уже измеряются в экранных пикселях. Адаптер также читает `getViewport()` в `onInit`, поэтому линейки получают камеру до первого жеста.

Размер прямоугольника - 180 × 120 пикселей. Его комментарий привязан к правому нижнему углу границ повёрнутого содержимого:

```ts
const radians = (rotation * Math.PI) / 180;
const halfWidth =
  90 * Math.abs(Math.cos(radians)) + 60 * Math.abs(Math.sin(radians));
const halfHeight =
  90 * Math.abs(Math.sin(radians)) + 60 * Math.abs(Math.cos(radians));
shell.setMarker(x + 90 + halfWidth, y + 60 + halfHeight);
```

Маркер получает мировые координаты. Его `.camera` самостоятельно переводит их в экранные, поэтому не добавляйте слою ещё одну CSS-трансформацию камеры.

## 6. Добавьте стили, запустите и настройте очистку

Сохраните файл `src/reactflow/style.css`. Все правила ограничены этим примером. Обязательная базовая таблица стилей React Flow импортируется отдельно в модуле подключения.

<<< @/snippets/reactflow/style.css

Запустите из `src/main.ts`:

```ts
import { mountExample } from './reactflow/mount-example.ts';

const root = document.querySelector<HTMLElement>('#example');
if (!root) throw new Error('Missing example root');
const dispose = mountExample(root);

// Also call dispose() when your application removes this page.
if (import.meta.hot) import.meta.hot.dispose(dispose);
```

Размонтирование React освобождает движок и его эффекты. Уничтожение оболочки удаляет слушатели DSK, цели линеек и дополнительные слои. В SSR-приложении импортируйте и запускайте модуль из клиентского lifecycle после появления контейнера:

```ts
// Inside a client mount hook, never during server rendering.
const { mountExample } = await import('./reactflow/mount-example.ts');
const dispose = mountExample(root);
// Register dispose with your framework's unmount hook.
```

Документация следует тому же правилу: импорт запускается автоматически при открытии страницы, а во время инициализации движка показывается индикатор загрузки.

## 7. Изучите и скачайте проект

Ниже можно просмотреть исходники работающего примера и его настройки. ZIP содержит общую оболочку и собранный DSK в `vendor`.

Распакуйте архив, откройте терминал в `dsk-reactflow-example` и выполните `npm install`, затем `npm run dev`. Нужны Node.js 22.12+ и интернет для установки зависимостей. `npm run build` проверяет типы и создаёт самостоятельное приложение. [Монорепозиторий](https://github.com/Flowscape-UI/dsk) и дополнительный сервер не нужны.

<ExampleProjectViewer :project="project" />
