import {
  resolveCanvasCamera,
  type CanvasCamera,
  type CanvasPoint,
} from './coordinates.ts';

/** A small HTML viewport, without selection, rendering or document state. */
export class DskPanZoom extends HTMLElement {
  static readonly observedAttributes = ['aria-label'];
  private readonly _surface: HTMLDivElement;
  private readonly _world: HTMLDivElement;
  private readonly _grid: HTMLDivElement;
  private _camera: CanvasCamera = { panX: 0, panY: 0, zoom: 1 };
  private _size: CanvasPoint = { x: 0, y: 0 };
  private _initialized = false;
  private _listeners: AbortController | undefined;
  private _observer: ResizeObserver | undefined;
  private readonly _pointers = new Map<number, CanvasPoint>();

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host { display:block; height:300px; min-width:0; }
      :host([hidden]) { display:none; }
      [part=viewport] { position:relative; width:100%; height:100%; overflow:hidden; touch-action:none; user-select:none; cursor:grab; background:var(--dsk-pan-zoom-background,transparent); }
      [part=viewport]:focus-visible { outline:2px solid var(--dsk-pan-zoom-focus-color,#557be8); outline-offset:-2px; }
      [part=viewport][data-dragging] { cursor:grabbing; }
      [part=world] { position:absolute; left:0; top:0; width:0; height:0; transform-origin:0 0; }
      [part=grid] { position:absolute; pointer-events:none; background-image:radial-gradient(circle at 9px 9px,var(--dsk-pan-zoom-grid-color,#cbd3e0) 1px,transparent 1px); background-size:18px 18px; }
      [part=overlay] { position:absolute; inset:0; pointer-events:none; }
      ::slotted([slot=overlay]) { pointer-events:auto; }
    </style><div part="viewport" tabindex="0" role="group"><div part="world"><div part="grid" aria-hidden="true"></div><slot></slot></div><div part="overlay"><slot name="overlay"></slot></div></div>`;
    this._surface = root.querySelector<HTMLDivElement>('[part=viewport]')!;
    this._world = root.querySelector<HTMLDivElement>('[part=world]')!;
    this._grid = root.querySelector<HTMLDivElement>('[part=grid]')!;
  }

  connectedCallback(): void {
    if (Object.hasOwn(this, 'camera')) {
      const camera = this.camera;
      Reflect.deleteProperty(this, 'camera');
      this.camera = camera;
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._surface.addEventListener('pointerdown', this._down, options);
    this._surface.addEventListener('pointermove', this._move, options);
    for (const event of [
      'pointerup',
      'pointercancel',
      'lostpointercapture',
    ] as const)
      this._surface.addEventListener(event, this._up, options);
    this._surface.addEventListener('wheel', this._wheel, {
      ...options,
      passive: false,
    });
    this._surface.addEventListener('keydown', this._key, options);
    this._surface.addEventListener(
      'dragstart',
      (event) => {
        if (!this._interactive(event)) event.preventDefault();
      },
      options,
    );
    this.ownerDocument.defaultView?.addEventListener(
      'blur',
      this._clear,
      options,
    );
    this._observer?.disconnect();
    this._observer = new ResizeObserver(() => {
      const size = {
        x: this._surface.clientWidth,
        y: this._surface.clientHeight,
      };
      if (!size.x || !size.y) return;
      if (!this._initialized) {
        this._camera = { panX: size.x / 2, panY: size.y / 2, zoom: 1 };
        this._initialized = true;
      } else if (this._size.x && this._size.y) {
        this._camera.panX += (size.x - this._size.x) / 2;
        this._camera.panY += (size.y - this._size.y) / 2;
      }
      this._size = size;
      this._render(true);
    });
    this._observer.observe(this._surface);
    this._render(false);
  }

  attributeChangedCallback(): void {
    this._surface.setAttribute(
      'aria-label',
      this.getAttribute('aria-label') ?? 'Pan and zoom viewport',
    );
  }

  disconnectedCallback(): void {
    this._clear();
    this._listeners?.abort();
    this._observer?.disconnect();
  }

  get camera(): CanvasCamera {
    return { ...this._camera };
  }
  set camera(value: CanvasCamera) {
    const camera = resolveCanvasCamera(value);
    this._clear();
    this._initialized = true;
    this._camera = { ...camera, zoom: this._clamp(camera.zoom) };
    this._render(false);
  }
  reset(): void {
    this._clear();
    this._initialized = true;
    this._camera = {
      panX: this._surface.clientWidth / 2,
      panY: this._surface.clientHeight / 2,
      zoom: 1,
    };
    this._render(true);
  }
  zoomBy(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0)
      throw new RangeError('Zoom factor must be positive and finite.');
    const center = {
      x: this._surface.clientWidth / 2,
      y: this._surface.clientHeight / 2,
    };
    this._zoomAt(factor, center, center);
  }
  private _clamp(zoom: number): number {
    return Math.min(4, Math.max(0.25, zoom));
  }
  private _render(emit: boolean): void {
    const { panX, panY, zoom } = this._camera;
    this._world.style.transform = `translate(${panX}px,${panY}px) scale(${zoom})`;
    if (zoom <= 0.55) {
      this._grid.remove();
    } else {
      if (this._grid.parentElement !== this._world)
        this._world.prepend(this._grid);
      this._grid.style.opacity = String(Math.min(1, (zoom - 0.55) / 0.15));
      // Tile only a bounded region around the visible world. Whole-cell offsets
      // keep dots anchored to world coordinates, even at very large pan values.
      const padding =
        Math.hypot(this._surface.clientWidth, this._surface.clientHeight) /
        zoom;
      const left = Math.floor((-panX / zoom - padding) / 18) * 18;
      const top = Math.floor((-panY / zoom - padding) / 18) * 18;
      Object.assign(this._grid.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${Math.ceil((this._surface.clientWidth / zoom + 2 * padding) / 18 + 1) * 18}px`,
        height: `${Math.ceil((this._surface.clientHeight / zoom + 2 * padding) / 18 + 1) * 18}px`,
      });
    }
    if (emit)
      this.dispatchEvent(
        new CustomEvent<CanvasCamera>('viewportchange', {
          detail: this.camera,
          bubbles: true,
          composed: true,
        }),
      );
  }
  private _point(event: { clientX: number; clientY: number }): CanvasPoint {
    const rect = this._surface.getBoundingClientRect();
    return {
      x:
        ((event.clientX - rect.left) * this._surface.clientWidth) /
        (rect.width || 1),
      y:
        ((event.clientY - rect.top) * this._surface.clientHeight) /
        (rect.height || 1),
    };
  }
  private _interactive(event: Event): boolean {
    return event
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement &&
          node !== this._surface &&
          (node.matches(
            'button,input,textarea,select,a,[contenteditable]:not([contenteditable="false"]),[slot="overlay"],[data-pan-zoom-ignore]',
          ) ||
            (node.tagName.startsWith('DSK-') && node !== this)),
      );
  }
  private _zoomAt(
    factor: number,
    before: CanvasPoint,
    after: CanvasPoint,
  ): void {
    const zoom = this._clamp(this._camera.zoom * factor);
    const ratio = zoom / this._camera.zoom;
    this._camera = {
      panX: after.x - (before.x - this._camera.panX) * ratio,
      panY: after.y - (before.y - this._camera.panY) * ratio,
      zoom,
    };
    this._render(true);
  }
  private readonly _down = (event: PointerEvent): void => {
    if (
      this._interactive(event) ||
      (event.button !== 0 && event.button !== 1) ||
      this._pointers.size >= 2
    )
      return;
    event.preventDefault();
    this._surface.focus({ preventScroll: true });
    this._pointers.set(event.pointerId, this._point(event));
    this._surface.setPointerCapture(event.pointerId);
    this._surface.toggleAttribute('data-dragging', true);
  };
  private readonly _move = (event: PointerEvent): void => {
    const previous = this._pointers.get(event.pointerId);
    if (!previous) return;
    const next = this._point(event);
    const other = [...this._pointers.entries()].find(
      ([id]) => id !== event.pointerId,
    )?.[1];
    this._pointers.set(event.pointerId, next);
    if (other) {
      const before = {
        x: (previous.x + other.x) / 2,
        y: (previous.y + other.y) / 2,
      };
      const after = { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 };
      const distance = Math.hypot(previous.x - other.x, previous.y - other.y);
      this._zoomAt(
        distance > 1
          ? Math.hypot(next.x - other.x, next.y - other.y) / distance
          : 1,
        before,
        after,
      );
    } else {
      this._camera.panX += next.x - previous.x;
      this._camera.panY += next.y - previous.y;
      this._render(true);
    }
  };
  private readonly _up = (event: PointerEvent): void => {
    this._pointers.delete(event.pointerId);
    if (this._surface.hasPointerCapture(event.pointerId))
      this._surface.releasePointerCapture(event.pointerId);
    this._surface.toggleAttribute('data-dragging', this._pointers.size > 0);
  };
  private readonly _clear = (): void => {
    const ids = [...this._pointers.keys()];
    this._pointers.clear();
    for (const id of ids)
      if (this._surface.hasPointerCapture(id))
        this._surface.releasePointerCapture(id);
    this._surface.removeAttribute('data-dragging');
  };
  private readonly _wheel = (event: WheelEvent): void => {
    if (this._interactive(event)) return;
    event.preventDefault();
    const unit =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? this._surface.clientHeight
          : 1;
    if (event.ctrlKey || event.metaKey) {
      const point = this._point(event);
      this._zoomAt(
        Math.exp(-Math.max(-200, Math.min(200, event.deltaY * unit)) * 0.01),
        point,
        point,
      );
    } else {
      this._camera.panX -=
        (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit;
      this._camera.panY -=
        (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit;
      this._render(true);
    }
  };
  private readonly _key = (event: KeyboardEvent): void => {
    if (
      this._interactive(event) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const step = event.shiftKey ? 80 : 20;
    if (event.key === '+' || event.key === '=') this.zoomBy(1.2);
    else if (event.key === '-') this.zoomBy(1 / 1.2);
    else if (event.key === '0' || event.key === 'Home') this.reset();
    else if (event.key.startsWith('Arrow')) {
      this._camera.panX +=
        event.key === 'ArrowLeft'
          ? step
          : event.key === 'ArrowRight'
            ? -step
            : 0;
      this._camera.panY +=
        event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0;
      this._render(true);
    } else return;
    event.preventDefault();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-pan-zoom': DskPanZoom;
  }
}
