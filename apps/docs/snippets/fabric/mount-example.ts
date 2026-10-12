import { Canvas, Ellipse, Point, Rect, type FabricObject } from 'fabric';
import { createExampleShell } from '../shared/example-shell.ts';

/** Fabric owns the canvas and object controls; DSK subscribes to that state. */
export function mountExample(root: HTMLElement, ru = false): () => void {
  const shell = createExampleShell(root, ru);
  const surface = shell.surface;
  surface.tabIndex = 0;
  surface.setAttribute(
    'aria-label',
    ru ? 'Холст Fabric.js' : 'Fabric.js canvas',
  );
  const element = document.createElement('canvas');
  surface.append(element);
  const canvas = new Canvas(element, {
    width: surface.clientWidth,
    height: surface.clientHeight,
    selection: false,
    preserveObjectStacking: true,
  });
  const controls = {
    originX: 'center',
    originY: 'center',
    borderColor: '#ffffff',
    cornerColor: '#18181b',
    cornerStrokeColor: '#ff0073',
    cornerSize: 9,
    transparentCorners: false,
    lockScalingFlip: true,
  } as const;
  const rectangle = new Rect({
    ...controls,
    left: 180,
    top: 145,
    width: 180,
    height: 130,
    rx: 12,
    ry: 12,
    fill: '#ff0073',
  });
  const ellipse = new Ellipse({
    ...controls,
    left: 390,
    top: 235,
    rx: 58,
    ry: 48,
    fill: '#8b5cf6',
  });
  canvas.add(rectangle, ellipse);
  canvas.setActiveObject(rectangle);
  const listeners = new AbortController();
  let pan: { point: Point; x: number; y: number } | null = null;
  let disposed = false;
  const selected = (): FabricObject | undefined => {
    const object = canvas.getActiveObject();
    return object === rectangle || object === ellipse ? object : undefined;
  };
  const sync = () => {
    if (disposed) return;
    const object = selected();
    shell.setSelection(
      object
        ? {
            x: object.left,
            y: object.top,
            rotation: object.angle,
            name: object === rectangle ? 'Rectangle' : 'Ellipse',
          }
        : null,
    );
    const matrix = canvas.viewportTransform;
    shell.setCamera({
      panX: matrix[4],
      panY: matrix[5],
      zoom: canvas.getZoom(),
    });
    // Fabric's bounding rectangle is in the scene, before viewportTransform.
    const bounds = rectangle.getBoundingRect();
    shell.setMarker(bounds.left + bounds.width, bounds.top + bounds.height);
  };
  const fit = () => {
    const bounds = [rectangle, ellipse].map((object) =>
      object.getBoundingRect(),
    );
    const left = Math.min(...bounds.map((box) => box.left));
    const top = Math.min(...bounds.map((box) => box.top));
    const right = Math.max(...bounds.map((box) => box.left + box.width));
    const bottom = Math.max(...bounds.map((box) => box.top + box.height));
    const zoom = Math.max(
      0.15,
      Math.min(
        1.3,
        (canvas.getWidth() - 88) / (right - left),
        (canvas.getHeight() - 100) / (bottom - top),
      ),
    );
    canvas.setViewportTransform([
      zoom,
      0,
      0,
      zoom,
      canvas.getWidth() / 2 - ((left + right) / 2) * zoom,
      canvas.getHeight() / 2 - ((top + bottom) / 2) * zoom,
    ]);
    sync();
  };
  canvas.on('after:render', sync);
  canvas.on('mouse:down', (event) => {
    // Drag empty space to pan. Dragging an object remains Fabric's own gesture.
    if (!event.target) {
      const matrix = canvas.viewportTransform;
      pan = { point: event.viewportPoint, x: matrix[4], y: matrix[5] };
      canvas.defaultCursor = 'grabbing';
    }
  });
  canvas.on('mouse:move', (event) => {
    if (!pan) return;
    const matrix = canvas.viewportTransform;
    canvas.setViewportTransform([
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      pan.x + event.viewportPoint.x - pan.point.x,
      pan.y + event.viewportPoint.y - pan.point.y,
    ]);
    sync();
  });
  const finishPan = () => {
    pan = null;
    canvas.defaultCursor = 'default';
  };
  canvas.on('mouse:up', finishPan);
  canvas.on('mouse:wheel', ({ e }) => {
    if (!surface.contains(document.activeElement)) return;
    e.preventDefault();
    const bounds = canvas.upperCanvasEl.getBoundingClientRect();
    const pointer = new Point(e.clientX - bounds.left, e.clientY - bounds.top);
    const zoom = Math.max(
      0.15,
      Math.min(4, canvas.getZoom() * Math.exp(-e.deltaY * 0.002)),
    );
    canvas.zoomToPoint(pointer, zoom);
    sync();
  });
  surface.addEventListener(
    'pointerdown',
    () => surface.focus({ preventScroll: true }),
    {
      signal: listeners.signal,
    },
  );
  surface.addEventListener('pointercancel', finishPan, {
    signal: listeners.signal,
  });
  surface.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        finishPan();
        surface.blur();
      }
    },
    { signal: listeners.signal },
  );
  shell.onTransform((field, value) => {
    const object = selected();
    if (!object) return;
    if (field === 'rotation') object.rotate(value);
    else object.set(field === 'x' ? 'left' : 'top', value);
    // Refresh hit testing and handles after changes made outside Fabric's gestures.
    object.setCoords();
    canvas.requestRenderAll();
    sync();
  });
  shell.onAction((action) => {
    if (action === 'select') {
      canvas.setActiveObject(rectangle);
      canvas.requestRenderAll();
      sync();
    }
    if (action === 'fit') fit();
    if (action === 'reset') {
      for (const object of [rectangle, ellipse]) {
        object.set({
          left: object === rectangle ? 180 : 390,
          top: object === rectangle ? 145 : 235,
          angle: 0,
          scaleX: 1,
          scaleY: 1,
        });
        object.setCoords();
      }
      canvas.setActiveObject(rectangle);
      fit();
    }
  });
  const resize = new ResizeObserver(() => {
    canvas.setDimensions({
      width: surface.clientWidth,
      height: surface.clientHeight,
    });
    fit();
  });
  resize.observe(surface);
  fit();
  root.dataset.ready = 'true';
  return () => {
    disposed = true;
    resize.disconnect();
    listeners.abort();
    canvas.off();
    // Fabric finishes a pending render before releasing its DOM and resources.
    void canvas.dispose();
    shell.destroy();
    delete root.dataset.ready;
  };
}
