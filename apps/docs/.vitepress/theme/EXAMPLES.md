# Documentation example panels

`ExamplePanel` is globally registered in the documentation theme. Use it for new live examples instead of adding another card background, radius, or border. It inherits the documentation colors and provides square edges, consistent form controls, focus outlines, and a responsive split layout.

For an existing demo that owns its layout, use the default slot:

```vue
<ExamplePanel title="Component preview">
  <ClientOnly><MyExample /></ClientOnly>
</ExamplePanel>
```

For a new demo, place controls and the preview in the named slots:

```vue
<ExamplePanel title="Component preview">
  <template #controls>
    <ClientOnly><MyControls /></ClientOnly>
  </template>
  <template #preview>
    <ClientOnly><MyCanvas /></ClientOnly>
  </template>
</ExamplePanel>
```

The title is optional. The preview moves below the controls at 648px. Keep component-specific layout in the example itself; use `--dsk-example-surface`, `--dsk-example-divider`, `--dsk-example-text`, `--dsk-example-muted`, and `--dsk-example-accent` for its styling. `SingleInputExample` and `InputLab` already include the panel, so do not wrap them again.
