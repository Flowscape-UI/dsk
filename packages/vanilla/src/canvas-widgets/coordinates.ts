export interface CanvasCamera {
  panX: number;
  panY: number;
  zoom: number;
}
export interface CanvasPoint {
  x: number;
  y: number;
}
export interface CanvasTracking {
  followPan?: boolean;
  followZoom?: boolean;
}
export interface CanvasWidgetOptions extends CanvasTracking {
  camera?: CanvasCamera;
  position?: CanvasPoint;
  scaleWithZoom?: boolean;
}
export interface CanvasWidgetBinding {
  update(options: CanvasWidgetOptions): void;
  dispose(): void;
}

export function resolveCanvasCamera(
  camera: CanvasCamera,
  tracking: CanvasTracking = {},
): CanvasCamera {
  if (
    ![camera.panX, camera.panY, camera.zoom].every(Number.isFinite) ||
    camera.zoom <= 0
  )
    throw new RangeError(
      'Camera coordinates must be finite and zoom must be positive.',
    );
  return {
    panX: tracking.followPan === false ? 0 : camera.panX,
    panY: tracking.followPan === false ? 0 : camera.panY,
    zoom: tracking.followZoom === false ? 1 : camera.zoom,
  };
}
export function projectCanvasPoint(
  point: CanvasPoint,
  camera: CanvasCamera,
  tracking: CanvasTracking = {},
): CanvasPoint {
  const { panX, panY, zoom } = resolveCanvasCamera(camera, tracking);
  return { x: point.x * zoom + panX, y: point.y * zoom + panY };
}
export function unprojectCanvasPoint(
  point: CanvasPoint,
  camera: CanvasCamera,
  tracking: CanvasTracking = {},
): CanvasPoint {
  const { panX, panY, zoom } = resolveCanvasCamera(camera, tracking);
  return { x: (point.x - panX) / zoom, y: (point.y - panY) / zoom };
}

/** Bind any HTML element inside an untransformed, positioned viewport overlay. */
export function bindCanvasWidget(
  element: HTMLElement,
  options: CanvasWidgetOptions = {},
): CanvasWidgetBinding {
  const properties = [
    'position',
    'left',
    'top',
    'translate',
    'scale',
    'transform-origin',
  ] as const;
  const original = properties.map((name) => ({
    name,
    value: element.style.getPropertyValue(name),
    priority: element.style.getPropertyPriority(name),
  }));
  let disposed = false;
  let state: CanvasWidgetOptions = {};
  const binding: CanvasWidgetBinding = {
    update(update) {
      if (disposed) return;
      const next = { ...state, ...update };
      const camera = { ...(next.camera ?? { panX: 0, panY: 0, zoom: 1 }) };
      const position = { ...(next.position ?? { x: 0, y: 0 }) };
      if (!Number.isFinite(position.x) || !Number.isFinite(position.y))
        throw new RangeError('Widget coordinates must be finite.');
      const projected = projectCanvasPoint(position, camera, next);
      const resolved = resolveCanvasCamera(camera, next);
      state = { ...next, camera, position };
      Object.assign(element.style, {
        position: 'absolute',
        left: '0px',
        top: '0px',
        translate: `${projected.x}px ${projected.y}px`,
        scale: String(next.scaleWithZoom ? resolved.zoom : 1),
        transformOrigin: '0 0',
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { name, value, priority } of original) {
        if (value) element.style.setProperty(name, value, priority);
        else element.style.removeProperty(name);
      }
    },
  };
  try {
    binding.update(options);
  } catch (error) {
    binding.dispose();
    throw error;
  }
  return binding;
}
