# Layer tree

Build a layer panel from nested HTML elements. Expansion, search, renaming and reordering are built in. Your application connects rows to editor objects and persists changes.

```sh
npm i @flowscape-ui/dsk
```

::: tip HTML first
After importing the package, the tree works without an initialization function. Unlike standalone controls, nested tags define its structure. Every tag, including empty rows and search, needs a closing tag. These examples target client-rendered apps; see [installation](/guide/installation#server-rendered-applications) for SSR.
:::

## Add a tree

<ClientOnly><LayerExample kind="basic" /></ClientOnly>

<div class="dsk-framework-code">

::: code-group

```html [Vanilla]
<!-- index.html -->
<dsk-layer-tree aria-label="Document layers">
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
    <dsk-layer-tree aria-label="Document layers">
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
  <dsk-layer-tree aria-label="Document layers">
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
<dsk-layer-tree aria-label="Document layers">
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
    <dsk-layer-tree aria-label="Document layers">
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

For React and Vue, apply the [one-time setup](#framework-setup). The following HTML fragments work in all five environments: replace the tree in the corresponding tab. Use className instead of class in React.

::: info Focus and object selection
The built-in control manages focus and hierarchy. It has no selected property, multiselection or select event. Canvas selection in this demo is application code using focusin. Collapsing branches and searching do not hide document objects.
:::

## Structure and row behavior

Importing the package registers `dsk-layer-tree`, `dsk-list-value`, `dsk-list-header`, and `dsk-list-footer`, and exports their `DskLayerTree`, `DskListValue`, `DskListHeader`, and `DskListFooter` classes. The structure is declarative, like a nested HTML list; no initialization script is needed.

```html
<dsk-layer-tree aria-label="Document layers">
  <dsk-list-value open>
    <dsk-list-header>Frame</dsk-list-header>
    <dsk-list-value label="Title"></dsk-list-value>
    <dsk-list-value label="Artwork">
      <dsk-list-value label="Image"></dsk-list-value>
      <dsk-list-value label="Caption"></dsk-list-value>
    </dsk-list-value>
    <dsk-list-footer>End of frame</dsk-list-footer>
  </dsk-list-value>
</dsk-layer-tree>
```

Place child `dsk-list-value` elements directly inside their parent value. A direct `dsk-list-header` supplies the row content; otherwise the `label` attribute supplies plain text. A direct `dsk-list-footer` appears beneath the children while the branch is open. At the tree root, a header and footer remain visible outside the branches. These header/footer elements receive their slots automatically. Keep interactive controls in the footer or mark custom row actions with `data-dsk-tree-action`; native buttons, links, inputs, selects, and textareas are already excluded from row toggling.

Click a row to focus it and toggle its branch. `open` and `disabled` are boolean presence attributes/properties (remove them to turn them off). Branches start collapsed. Leaves have no visible disclosure icon. Disabled branches still support expansion and collapse by mouse or keyboard, so their descendants can be inspected. The disabled row itself cannot move. Its descendants are dimmed uniformly and can move or change nesting only within the same nearest disabled group; they cannot leave it, and outside layers cannot enter. A descendant with its own disabled attribute forms a separate boundary. Set `--dsk-tree-disabled-opacity` (default `0.45`) to customize the dimming. Disabled leaves are skipped by keyboard navigation. Standard attributes, inline styles, classes, and custom CSS work on every component.

The tree provides a single tab stop among rows. Up/Down navigate visible enabled rows, Right opens a branch or enters its first child, Left closes it or moves to its parent, Home/End move to the first/last visible row, and Enter/Space toggle. Closing a branch that contains keyboard focus returns focus to its row. Collapsed contents become inert immediately while their height animates. The animation respects `prefers-reduced-motion`.

### Layer API and events

- `tree.items`: all descendant values belonging to this tree.
- `tree.visibleItems`: navigable visible rows, including disabled branches that can be expanded.
- `item.items`: direct child values.
- `item.label`, `item.open`, `item.disabled`: reflected properties.
- `item.expandable`: whether the item contains child values or a footer.
- `item.toggle()` / `item.toggle(true | false)`: toggle, open, or close a branch, including disabled branches.
- `toggle`: a bubbling, composed `CustomEvent<ListToggleDetail>` with `detail.open`, emitted by user interaction and `toggle()`. Direct assignments to `.open` are silent. `event.target` identifies the branch.

### Tree styling and icons

<ClientOnly><LayerExample kind="custom" /></ClientOnly>

Use ordinary CSS on your headers, footers, and slot contents. Style internal structure with `dsk-list-value::part(row)`, `::part(toggle)`, `::part(icon)`, `::part(label)`, `::part(children)`, or `::part(branch)`. The tree exposes `header`, `list`, and `footer` parts. No global CSS reset is applied.

```html
<dsk-list-value label="Artwork">
  <span slot="expand-icon">+</span>
  <span slot="collapse-icon">−</span>
  <img slot="icon" src="/icons/artwork.svg" width="16" height="16" alt="" />
  <dsk-list-value label="Image"></dsk-list-value>
</dsk-list-value>
```

Custom disclosure icons are shown as supplied, without automatic rotation. The defaults are directional chevrons. Supply both `expand-icon` and `collapse-icon` for distinct states, and `icon` to replace the layer symbol. Decorative icon slots are hidden from accessibility APIs; the row name comes from its header or `label`, and can be overridden with `aria-label`.

```css
dsk-layer-tree {
  --dsk-tree-indent: 24px;
  --dsk-tree-row-height: 36px;
  --dsk-tree-hover-background: #251923;
  --dsk-tree-focus-color: #ff0073;
  --dsk-tree-duration: 200ms;
  --dsk-tree-radius: 0px;
  --dsk-tree-search-border: #39393f;
  --dsk-tree-editor-background: #111111;
}
dsk-list-value::part(row) {
  border-radius: 0;
  border-bottom: 1px solid #39393f;
}
dsk-list-header {
  font-weight: 600;
}
```

| Variable                      | Default        |
| ----------------------------- | -------------- |
| `--dsk-tree-color`            | `inherit`      |
| `--dsk-tree-background`       | `transparent`  |
| `--dsk-tree-indent`           | `20px`         |
| `--dsk-tree-row-height`       | `34px`         |
| `--dsk-tree-row-padding`      | `0 10px`       |
| `--dsk-tree-gap`              | `8px`          |
| `--dsk-tree-radius`           | `6px`          |
| `--dsk-tree-icon-size`        | `16px`         |
| `--dsk-tree-icon-color`       | `currentColor` |
| `--dsk-tree-hover-background` | `#eef1f7`      |
| `--dsk-tree-focus-color`      | `#557be8`      |
| `--dsk-tree-duration`         | `180ms`        |
| `--dsk-tree-easing`           | `ease`         |
| `--dsk-tree-footer-padding`   | `8px 12px`     |
| `--dsk-tree-muted-color`      | `#737b8c`      |

### Reordering layers

<ClientOnly><LayerExample kind="disabled" /></ClientOnly>

Try moving Local A and Local B within the protected group. Moving them outside it is rejected. Native drag support depends on the browser and input device; keyboard reordering is also available.

Reordering is enabled by default. Drag near the top or bottom edge of a row to insert before or after it; a blue line with a ring marks the destination. Drag onto the middle of a row to move inside it; a blue outline and translucent fill highlight the destination group. Any row can become a group by receiving children. The destination opens after a successful drop. Moving left across indentation targets an ancestor level; dropping before/after a root row or onto empty tree space moves the layer out to the root. The source stays in place until drop, with a translucent browser drag image under the cursor. Branches move with all descendants. Cyclic moves and moves across a disabled-group boundary are rejected; descendants may move within their own disabled group. Escape or dropping outside the tree cancels the move.

Alt+Up / Alt+Down moves the focused row one sibling position. Alt+Right nests it inside the preceding sibling, and Alt+Left moves it out, immediately after its parent. Focus remains on the moved row. Disabled rows cannot be dragged. Set `draggable="false"` on a particular `dsk-list-value` to keep it from being moved, or `reorderable="false"` / `tree.reorderable = false` to disable all reordering. Buttons and other interactive row actions keep their usual behavior.

A successful move changes the light DOM and emits bubbling, composed `reorder` with `LayerReorderDetail`: `item`, `oldParent`, `parent` (destination), `position` (`before`, `after`, or `inside`), `oldIndex`, and `newIndex`. Indices count values within their respective parents, excluding headers and footers. Listen to this event to update the editor's own document model. The preceding `beforereorder` event has the same detail and is cancelable with `preventDefault()`; no event is emitted for a drop that leaves the order unchanged. `--dsk-tree-drop-background` customizes the translucent inside-group highlight.

```ts
import type { LayerReorderDetail } from '@flowscape-ui/dsk';

const tree = document.querySelector('dsk-layer-tree')!;
tree.addEventListener('reorder', (event) => {
  const { item, oldIndex, newIndex } = (
    event as CustomEvent<LayerReorderDetail>
  ).detail;
  console.log(item.id, oldIndex, newIndex);
});
```

Style the insertion marker through `dsk-layer-tree::part(drop-indicator)` and its `::before` circle, or use these inherited CSS variables:

| Variable                         | Default   |
| -------------------------------- | --------- |
| `--dsk-tree-drop-color`          | `#0d99ff` |
| `--dsk-tree-drop-line-width`     | `2px`     |
| `--dsk-tree-drop-dot-size`       | `6px`     |
| `--dsk-tree-drop-dot-background` | `#fff`    |

The marker uses a manual popover so container overflow does not clip it. The browser owns the native drag preview and its translucency; it uses the actual row, including custom icons and header styling.

### Optional search

<ClientOnly><LayerExample kind="search" /></ClientOnly>

Add a direct `dsk-tree-search` child to enable search without application JavaScript. Omit the element to omit search. It has no content of its own, but, like all HTML custom elements, still requires a closing tag.

```html
<dsk-layer-tree aria-label="Layers">
  <dsk-tree-search placeholder="Find a layer"></dsk-tree-search>
  <dsk-list-value label="Page">
    <dsk-list-value label="Title"></dsk-list-value>
  </dsk-list-value>
</dsk-layer-tree>
```

The search field is automatically placed above the tree header. It matches substrings of displayed names, ignoring case and surrounding query whitespace. Matching rows and their ancestors remain visible; ancestors expand to reveal the results. A matching group keeps its descendants available, even when their names do not match. Its expansion and the expansion of its descendants remain user-controlled during search. Clearing or removing the search restores the previous hidden/open states, and application-hidden rows remain hidden throughout. Label edits and inserted rows update results automatically. Use one search field per tree.

`DskTreeSearch` is exported. Its `.value` property reflects `value` and supports programmatic filtering. `placeholder`, `aria-label`, and `disabled` configure the native search input. User edits emit native bubbling `input` and forwarded `change`; programmatic value changes are silent. Style the field using `dsk-tree-search::part(input)`, `--dsk-tree-search-padding`, `--dsk-tree-search-background`, `--dsk-tree-search-border` (a color, not a complete border shorthand), and existing tree radius/focus variables.

### Renaming a layer

Double-click a row or press F2 to edit its name in place. `item.startRename()` also starts editing. Enter or blur commits; Escape cancels. Empty names are rejected, and whitespace at the edges is trimmed. A row with its own `disabled` attribute cannot be renamed. The row is not draggable while editing.

A successful edit updates `label` and the displayed header text, then emits bubbling, composed `rename` with `ListRenameDetail` (`oldLabel`, `label`). The event target is the edited `dsk-list-value`. Listen to it to update the application's document model. `item.displayName` reads the name used for editing and search.

For a decorated header, wrap the editable name in `data-dsk-name`. Only that element's text changes; adjacent icons, buttons, metadata, and header markup remain in place. Without this marker, the first nonempty text node in the header is the editable name. Without a header, the `label` attribute is used.

```html
<dsk-list-value>
  <dsk-list-header>
    <strong data-dsk-name>Cover</strong><span> Frame</span>
  </dsk-list-header>
</dsk-list-value>
```

Style the inline input with `dsk-list-value::part(editor)`, `--dsk-tree-editor-background`, and `--dsk-tree-focus-color`.

## Attribute and property reference

| Element         | Attribute / property                | Default          | Purpose                                                                  |
| --------------- | ----------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| dsk-layer-tree  | reorderable / .reorderable          | true             | Set attribute to the string false or property to false to prevent moves. |
| dsk-layer-tree  | .items / .visibleItems              | Readonly arrays  | All owned rows / visible navigable rows.                                 |
| dsk-list-value  | label / .label                      | Empty text       | Plain name when no decorated header supplies it.                         |
| dsk-list-value  | open / .open                        | false            | Presence attribute; direct assignment is silent.                         |
| dsk-list-value  | disabled / .disabled                | false            | Protects the row and establishes a movement boundary.                    |
| dsk-list-value  | draggable                           | Absent (movable) | Native HTML attribute; false prevents moving that row.                   |
| dsk-list-value  | .items / .expandable / .displayName | Readonly         | Direct children / branch state / displayed name.                         |
| dsk-tree-search | value / .value                      | Empty string     | Search query; assignment filters without emitting input.                 |
| dsk-tree-search | placeholder                         | Search layers    | Text displayed in the empty search field.                                |
| dsk-tree-search | disabled                            | Absent           | Disables the field; does not clear the query.                            |
| All             | aria-label, class, style, hidden    | Native HTML      | Accessibility and presentation.                                          |

Header and footer have no additional value API. The tree does not submit a form value or provide a selected property. Methods on a row: toggle(force?), startRename(), and inherited focus()/blur().

Additional CSS variables: --dsk-tree-disabled-opacity (0.45), --dsk-tree-editor-background (transparent), --dsk-tree-drop-background (12% blue mixed with transparent), --dsk-tree-search-padding (8px), --dsk-tree-search-background (transparent), --dsk-tree-search-border (#ccd3df, color only). Preserve focus visibility and row geometry when styling.

## Connect the tree to a canvas

<ClientOnly><LayerExample kind="scene" /></ClientOnly>

This small adapter powers the live examples. It connects data-layer to a preview object, reads its display name and updates paint order after reorder. Later rows paint above earlier rows. This is a demo policy, not a required DSK stacking order. Search and collapse do not change object visibility.

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

In a framework, pass DOM refs to bindLayerPreview after mounting and call the returned dispose function on unmount. In a real editor, update its own objects instead of creating divs. This example does not serialize documents or implement group transforms.

## Framework setup {#framework-setup}

Import the package once. Configure Vue isCustomElement in your existing configuration as shown in [installation](/guide/installation). Angular includes the schema in the example above. For React with TypeScript, add these declarations:

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

::: warning Model synchronization
Reordering mutates the light DOM. If your framework renders a list from an array, update that array in reorder using stable IDs, including hierarchy and order. Otherwise the next render may restore the old structure. Synchronize names in rename. Use stable key/track values; indices are not permanent identities.
:::
