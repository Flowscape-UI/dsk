# Styling & themes

DSK components encapsulate internal markup in Shadow DOM. Use normal CSS on the host for layout, custom properties for supported design tokens, and `::part(...)` for exposed internals. Avoid querying private shadow elements: their structure is not a public API.

## A shared surface

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

Your application controls its theme attribute or class. In this example, `data-theme` belongs on an ancestor of `.editor-panel`, because the CSS uses a descendant selector. Variables inherit into the components inside the panel. For example:

```html
<div data-theme="dark">
  <section class="editor-panel">
    <dsk-input value="160" aria-label="Width"></dsk-input>
    <dsk-ruler aria-label="Horizontal ruler"></dsk-ruler>
  </section>
</div>
```

Set `data-theme` to `light` to use the base light colors. The documentation website uses a dark theme only; your application styling is independent of it.

## Slots and parts

Layer rows support custom header/footer content and disclosure icons. Canvas markers accept ordinary slotted HTML, including buttons. The custom eyedropper exposes magnifier styling and a slot for replacing its presentation. Each family reference lists its supported extension points.

## Keep interaction visible

Retain focus rings, adequate contrast and usable pointer targets. `disabled` and `readonly` have different interaction semantics; styling alone must not substitute for those attributes. Prefer immediate feedback while dragging rather than transitions on pointer-controlled positions.
