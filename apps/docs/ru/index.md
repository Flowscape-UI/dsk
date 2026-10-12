---
layout: home
aside: false
title: Создавайте свои инструменты
---

<script setup>
import { withBase } from 'vitepress';
</script>

<ClientOnly><EditorPreview /></ClientOnly>

<div class="dsk-docs-home">

## От панели свойств до целого рабочего пространства.

Используйте один инпут или соберите полноценный интерфейс редактора. DSK отвечает за элементы управления, а ваше приложение — за документ, отрисовку и историю изменений.

<div class="dsk-docs-cards">
<a :href="withBase('/ru/components/inputs')"><strong>Точность в деталях ↗</strong><span>Меняйте значения перетаскиванием, вводите выражения и связывайте поля. Меньше повторяющихся действий.</span></a>
<a :href="withBase('/ru/components/color')"><strong>Всё для работы с цветом ↗</strong><span>Объединяйте тон, насыщенность, прозрачность и пипетку в палитру, подходящую вашему продукту.</span></a>
<a :href="withBase('/ru/components/canvas')"><strong>Часть вашего холста ↗</strong><span>Привязывайте линейки и HTML-метки к координатам движка. Управляйте реакцией на pan и zoom.</span></a>
</div>

## Обычный HTML. Ваш дизайн.

Зарегистрируйте компоненты один раз, затем используйте знакомые теги, атрибуты и события. Начать можно с двух элементов:

```ts
import '@flowscape-ui/dsk';
```

```html
<dsk-input aria-label="Ширина" value="160" min="0" step="1"></dsk-input>
<dsk-angle aria-label="Поворот" value="32" unit="deg"></dsk-angle>
```

Задавайте оформление через CSS и открытые части Shadow DOM, связывайте события со своим движком. Библиотеке компонентов не нужен фреймворк во время выполнения.

[Как устроено подключение →](/ru/guide/introduction)

## DSK в вашем редакторе.

Линейки, комментарий и инпуты поверх настоящего редактора.

[Пример с tldraw SDK →](/ru/examples/tldraw)

</div>
