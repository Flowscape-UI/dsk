import type { DskLayerTree, DskListValue } from '@flowscape-ui/dsk';

/** Application-owned selection and drawing; the tree itself manages hierarchy. */
export function bindLayerPreview(
  tree: DskLayerTree,
  preview: HTMLElement,
): () => void {
  const listeners = new AbortController();
  let selected: DskListValue | undefined;
  const render = () => {
    preview.replaceChildren();
    // Later rows paint above earlier rows in this example's document model.
    for (const item of tree.items) {
      if (!item.dataset.layer) continue;
      const shape = document.createElement('div');
      shape.className = 'layer-shape';
      shape.dataset.layer = item.dataset.layer;
      shape.textContent = item.displayName;
      shape.classList.toggle('is-selected', item === selected);
      preview.append(shape);
    }
  };
  const focus = (event: Event) => {
    const item = event
      .composedPath()
      .find(
        (node): node is DskListValue =>
          node instanceof HTMLElement && node.localName === 'dsk-list-value',
      );
    if (!item || item.closest('dsk-layer-tree') !== tree) return;
    selected = item;
    render();
  };
  tree.addEventListener('focusin', focus, { signal: listeners.signal });
  tree.addEventListener('rename', render, { signal: listeners.signal });
  tree.addEventListener('reorder', render, { signal: listeners.signal });
  render();
  return () => {
    listeners.abort();
    preview.replaceChildren();
  };
}
