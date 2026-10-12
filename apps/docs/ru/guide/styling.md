# Стили и темы

Внутренняя разметка DSK находится в Shadow DOM. Обычный CSS управляет расположением самого тега, CSS-переменные – поддерживаемыми параметрами дизайна, а `::part(...)` – открытыми внутренними частями. Не опирайтесь на приватную разметку внутри shadow root: это не публичный API.

## Общая тема панели

```css
.editor-panel {
  --dsk-input-background: #f7f8fc;
  --dsk-input-color: #202735;
  --dsk-input-border: 1px solid #d9dfeb;
  --dsk-input-border-radius: 6px;
  --dsk-input-focus-color: #557be8;
  --dsk-ruler-background: #f7f8fc;
  --dsk-ruler-color: #657085;
}

[data-theme='dark'] .editor-panel {
  --dsk-input-background: #222733;
  --dsk-input-color: #e5e9f3;
  --dsk-input-border: 1px solid #424b60;
  --dsk-ruler-background: #222733;
  --dsk-ruler-color: #aab5ca;
}

.editor-panel dsk-input {
  --dsk-input-width: 120px;
}
.editor-panel dsk-ruler::part(label) {
  font-family: monospace;
}
```

Приложение само переключает атрибут или класс темы. В этом примере `data-theme` находится на родителе `.editor-panel`, поскольку CSS использует селектор потомка. Переменные наследуются компонентами внутри панели. Например:

```html
<div data-theme="dark">
  <section class="editor-panel">
    <dsk-input value="160" aria-label="Width"></dsk-input>
    <dsk-ruler aria-label="Horizontal ruler"></dsk-ruler>
  </section>
</div>
```

Поменяйте `data-theme` на `light`, чтобы применить базовые светлые цвета. Сайт документации использует только тёмную тему; оформление вашего приложения от неё не зависит.

## Слоты и части

Строки дерева поддерживают своё содержимое заголовка и подвала, а также иконки раскрытия. В метку холста можно вложить обычный HTML, включая кнопку. Кастомная пипетка позволяет настроить оформление лупы или заменить её содержимое через слот. Точные имена доступны в разделах соответствующих компонентов.

## Сохраняйте понятное взаимодействие

Не убирайте видимый фокус, обеспечьте контраст и удобный размер области нажатия. `disabled` и `readonly` влияют на поведение по-разному; одна лишь прозрачность их не заменяет. Для элементов, следующих за указателем, лучше немедленное обновление позиции, чем анимация с задержкой.
