import Konva from 'konva';
import { createExampleShell } from '../shared/example-shell.ts';

/** Keep Konva in charge of drawing and transforms; DSK only edits its model. */
export function mountExample(root: HTMLElement, ru = false): () => void {
  const shell = createExampleShell(root, ru);
  const surface = shell.surface;
  if (!(surface instanceof HTMLDivElement))
    throw new Error('Expected a div for the Konva surface');
  surface.tabIndex = 0;
  surface.setAttribute('aria-label', ru ? 'Холст Konva' : 'Konva canvas');
  const stage = new Konva.Stage({
    container: surface,
    width: surface.clientWidth,
    height: surface.clientHeight,
    draggable: true,
  });
  const layer = new Konva.Layer();
  stage.add(layer);
  // Explicit offsets make X/Y the center and keep rotations centered.
  const rectangle = new Konva.Rect({
    x: 180,
    y: 145,
    width: 180,
    height: 130,
    offsetX: 90,
    offsetY: 65,
    fill: '#ff0073',
    cornerRadius: 12,
    draggable: true,
  });
  const ellipse = new Konva.Ellipse({
    x: 390,
    y: 235,
    radiusX: 58,
    radiusY: 48,
    fill: '#8b5cf6',
    draggable: true,
  });
  const transformer = new Konva.Transformer({
    nodes: [rectangle],
    borderStroke: '#ffffff',
    anchorStroke: '#ff0073',
    anchorFill: '#18181b',
    anchorSize: 9,
    rotateAnchorOffset: 28,
    flipEnabled: false,
    boundBoxFunc: (previous, next) =>
      Math.abs(next.width) < 24 || Math.abs(next.height) < 24 ? previous : next,
  });
  layer.add(rectangle, ellipse, transformer);
  let selected: Konva.Shape | null = rectangle;
  const listeners = new AbortController();

  const sync = () => {
    shell.setCamera({ panX: stage.x(), panY: stage.y(), zoom: stage.scaleX() });
    shell.setSelection(
      selected
        ? {
            x: selected.x(),
            y: selected.y(),
            rotation: selected.rotation(),
            name: selected === rectangle ? 'Rectangle' : 'Ellipse',
          }
        : null,
    );
    // relativeTo removes the stage camera: the marker expects world coordinates.
    const bounds = rectangle.getClientRect({ relativeTo: stage });
    shell.setMarker(bounds.x + bounds.width, bounds.y + bounds.height);
  };
  const select = (shape: Konva.Shape | null) => {
    selected = shape;
    transformer.nodes(shape ? [shape] : []);
    sync();
  };
  const fit = () => {
    const bounds = [rectangle, ellipse].map((shape) =>
      shape.getClientRect({ relativeTo: stage }),
    );
    const left = Math.min(...bounds.map((box) => box.x));
    const top = Math.min(...bounds.map((box) => box.y));
    const right = Math.max(...bounds.map((box) => box.x + box.width));
    const bottom = Math.max(...bounds.map((box) => box.y + box.height));
    const zoom = Math.max(
      0.15,
      Math.min(
        1.3,
        (stage.width() - 88) / (right - left),
        (stage.height() - 100) / (bottom - top),
      ),
    );
    stage.scale({ x: zoom, y: zoom });
    stage.position({
      x: stage.width() / 2 - ((left + right) / 2) * zoom,
      y: stage.height() / 2 - ((top + bottom) / 2) * zoom,
    });
    sync();
  };
  stage.on('click.dsk tap.dsk', (event) => {
    if (event.target === stage) select(null);
    else if (event.target === rectangle || event.target === ellipse)
      select(event.target);
  });
  const shapes: Konva.Shape[] = [rectangle, ellipse];
  for (const shape of shapes) {
    shape.on('dragstart.dsk', () => select(shape));
    shape.on('dragmove.dsk transform.dsk', sync);
  }
  stage.on('dragmove.dsk', sync);
  stage.on('wheel.dsk', (event) => {
    if (!surface.contains(document.activeElement)) return;
    event.evt.preventDefault();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const previous = stage.scaleX();
    const zoom = Math.max(
      0.15,
      Math.min(4, previous * Math.exp(-event.evt.deltaY * 0.002)),
    );
    const world = {
      x: (pointer.x - stage.x()) / previous,
      y: (pointer.y - stage.y()) / previous,
    };
    stage.scale({ x: zoom, y: zoom });
    stage.position({
      x: pointer.x - world.x * zoom,
      y: pointer.y - world.y * zoom,
    });
    sync();
  });
  surface.addEventListener(
    'pointerdown',
    () => surface.focus({ preventScroll: true }),
    {
      signal: listeners.signal,
    },
  );
  surface.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        select(null);
        surface.blur();
      }
    },
    { signal: listeners.signal },
  );
  shell.onTransform((field, value) => {
    if (!selected) return;
    if (field === 'rotation') selected.rotation(value);
    else if (field === 'x') selected.x(value);
    else selected.y(value);
    sync();
  });
  shell.onAction((action) => {
    if (action === 'select') select(rectangle);
    if (action === 'fit') fit();
    if (action === 'reset') {
      rectangle.setAttrs({ x: 180, y: 145, rotation: 0, scaleX: 1, scaleY: 1 });
      ellipse.setAttrs({ x: 390, y: 235, rotation: 0, scaleX: 1, scaleY: 1 });
      select(rectangle);
      fit();
    }
  });
  const resize = new ResizeObserver(() => {
    stage.size({ width: surface.clientWidth, height: surface.clientHeight });
    fit();
  });
  resize.observe(surface);
  fit();
  root.dataset.ready = 'true';
  return () => {
    resize.disconnect();
    listeners.abort();
    stage.destroy();
    shell.destroy();
    delete root.dataset.ready;
  };
}
