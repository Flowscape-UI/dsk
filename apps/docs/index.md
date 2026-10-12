---
layout: home
aside: false
title: Build the tools you imagine
---

<script setup>
import { withBase } from 'vitepress';
</script>

<ClientOnly><EditorPreview /></ClientOnly>

<div class="dsk-docs-home">

## From a property panel to an entire workspace.

Use a single input or compose a complete editing experience. DSK provides the controls; your application owns its document, renderer and history.

<div class="dsk-docs-cards">
<a :href="withBase('/components/inputs')"><strong>Precision, built in ↗</strong><span>Drag values, evaluate expressions and link fields. Make repetitive adjustments feel effortless.</span></a>
<a :href="withBase('/components/color')"><strong>A language for color ↗</strong><span>Compose hue, saturation, opacity and eyedropper controls into a picker that fits your product.</span></a>
<a :href="withBase('/components/canvas')"><strong>At home on your canvas ↗</strong><span>Connect rulers and HTML annotations to your coordinates. Choose what follows pan and zoom.</span></a>
</div>

## Familiar HTML. Your design.

Register the components once, then use ordinary tags, attributes and native events. Start small:

```ts
import '@flowscape-ui/dsk';
```

```html
<dsk-input aria-label="Width" value="160" min="0" step="1"></dsk-input>
<dsk-angle aria-label="Rotation" value="32" unit="deg"></dsk-angle>
```

Style hosts with CSS, customize exposed shadow parts, and connect events to your engine. No runtime framework is required by the component library.

[Learn the integration model →](/guide/introduction)

## DSK in your editor.

Rulers, a comment and inputs connected to a real canvas SDK.

[Explore the tldraw SDK example →](/examples/tldraw)

</div>
