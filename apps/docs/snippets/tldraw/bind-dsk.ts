import { react, type Editor, type TLShapeId } from 'tldraw';
import type { DskInput } from '@flowscape-ui/dsk';

/** Connect native DSK elements to an existing editor, without a React wrapper. */
export function bindDsk(
  editor: Editor,
  root: HTMLElement,
  commentShape: TLShapeId,
): () => void {
  const viewport = root.querySelector<HTMLElement>('.dsk-tldraw-viewport')!;
  const rulers = Array.from(root.querySelectorAll('dsk-ruler'));
  const marker = root.querySelector('dsk-canvas-marker')!;
  const fields = Array.from(root.querySelectorAll('dsk-input'));
  const status = root.querySelector<HTMLOutputElement>(
    '.dsk-tldraw-selection',
  )!;
  const listeners = new AbortController();
  // tldraw tracks editor focus separately from DOM focus. Release its shortcuts
  // when interacting with an external control, including ruler guide handles.
  const releaseEditorFocus = (event: Event) => {
    if (
      event.target instanceof Element &&
      !event.target.closest('.dsk-tldraw-react')
    )
      editor.blur();
  };
  root.addEventListener('pointerdown', releaseEditorFocus, {
    capture: true,
    signal: listeners.signal,
  });
  root.addEventListener('focusin', releaseEditorFocus, {
    capture: true,
    signal: listeners.signal,
  });
  let editing: DskInput | undefined;
  let editingShape: TLShapeId | undefined;
  for (const ruler of rulers) ruler.target = viewport;

  const selected = () => {
    const shapes = editor.getSelectedShapes();
    const shape = shapes.length === 1 ? shapes[0] : undefined;
    // These fields intentionally expose page-space transforms for root shapes.
    return shape &&
      !shape.isLocked &&
      shape.parentId === editor.getCurrentPageId()
      ? shape
      : undefined;
  };
  const sync = () => {
    const { x, y, z } = editor.getCamera();
    // tldraw: screen = (page + camera) * zoom. DSK: screen = world * zoom + pan.
    const camera = { panX: x * z, panY: y * z, zoom: z };
    for (const ruler of rulers) ruler.camera = camera;
    marker.camera = camera;
    const bounds = editor.getShapePageBounds(commentShape);
    marker.hidden =
      !bounds || !editor.getCurrentPageShapeIds().has(commentShape);
    if (bounds) {
      marker.x = bounds.maxX;
      marker.y = bounds.maxY;
    }
    const shape = selected();
    status.textContent = shape
      ? `${shape.type} · ${shape.id}`
      : (root.dataset.emptySelection ??
        'Select one unlocked, top-level shape.');
    for (const field of fields) {
      field.disabled = !shape;
      if (!shape || (field === editing && shape.id === editingShape)) continue;
      const value =
        field.dataset.field === 'rotation'
          ? (shape.rotation * 180) / Math.PI
          : field.dataset.field === 'x'
            ? shape.x
            : shape.y;
      field.value = Math.round(value * 100) / 100;
    }
  };
  const stop = react('DSK tldraw inspector', sync);
  for (const field of fields) {
    field.addEventListener(
      'input',
      () => {
        const shape = selected();
        if (!shape || !Number.isFinite(field.valueAsNumber)) return;
        if (editing !== field || editingShape !== shape.id) {
          editor.markHistoryStoppingPoint('DSK transform');
          editing = field;
          editingShape = shape.id;
        }
        if (field.dataset.field === 'rotation') {
          // Rotate around the shape's center, preserving tldraw's transform behavior.
          editor.rotateShapesBy(
            [shape.id],
            (field.valueAsNumber * Math.PI) / 180 - shape.rotation,
          );
        } else {
          const axis = field.dataset.field === 'x' ? 'x' : 'y';
          editor.updateShape({
            id: shape.id,
            type: shape.type,
            [axis]: field.valueAsNumber,
          });
        }
      },
      { signal: listeners.signal },
    );
    const finish = () => {
      editing = undefined;
      editingShape = undefined;
      sync();
    };
    field.addEventListener('change', finish, { signal: listeners.signal });
    field.addEventListener('focusout', finish, { signal: listeners.signal });
  }
  const actions: Record<string, () => void> = {
    undo: () => editor.undo(),
    redo: () => editor.redo(),
    fit: () => editor.zoomToFit({ animation: { duration: 0 } }),
    select: () => editor.select(commentShape),
  };
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    '[data-action]',
  )) {
    button.addEventListener(
      'click',
      () => actions[button.dataset.action ?? '']?.(),
      { signal: listeners.signal },
    );
  }
  return () => {
    stop();
    listeners.abort();
    for (const ruler of rulers) ruler.target = null;
  };
}
