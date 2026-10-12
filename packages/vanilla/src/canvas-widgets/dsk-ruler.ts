import { DskControlHistory } from '../helpers/history.ts';
import {
  rulerStep,
  rulerTicks,
  type RulerOrientation,
  type RulerRange,
  type RulerGuideDetail,
} from './helpers/ruler-model.ts';
import { resolveCanvasCamera, type CanvasCamera } from './coordinates.ts';

const ns = 'http://www.w3.org/2000/svg';
interface GuideDrag {
  pointerId: number;
  index: number;
  value: number;
  original: number[];
}
interface PointerGuideDrag extends GuideDrag {
  startX: number;
  startY: number;
  started: boolean;
}

/** Visible-range ruler with an affine world-coordinate mapping and draggable guides. */
export class DskRuler extends HTMLElement {
  private readonly _history = new DskControlHistory(() =>
    JSON.stringify(this.guides),
  );
  private _writingHistory = false;
  private _setUserGuides(guides: readonly number[]): void {
    this._history.begin();
    this._writingHistory = true;
    try {
      this.guides = guides;
    } finally {
      this._writingHistory = false;
    }
    this._history.commit();
  }

  static readonly observedAttributes = [
    'orientation',
    'offset',
    'zoom',
    'step',
    'snap',
    'highlights',
    'guides',
    'target',
    'disabled',
    'guide-offset',
    'guide-zoom',
    'follow-pan',
    'follow-zoom',
  ];
  private readonly _svg: SVGSVGElement;
  private readonly _overlay: HTMLDivElement;
  private readonly _resize: ResizeObserver;
  private _listeners: AbortController | undefined;
  private _frame = 0;
  private _navigationTimer = 0;
  private readonly _navigationPointers = new Set<number>();
  private _target: HTMLElement | null = null;
  private _drag: PointerGuideDrag | undefined;
  private _focusAfterRender: number | undefined;
  private _capture: Element | null = null;
  private _observedTarget: HTMLElement | null = null;
  private _formatter: ((value: number) => string) | null = null;
  private _camera: CanvasCamera | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host{display:block;height:var(--dsk-ruler-size,24px);min-width:0;background:var(--dsk-ruler-background,#292929);color:var(--dsk-ruler-color,#a1a1a1);font:10px sans-serif;user-select:none;touch-action:none}
      :host([orientation^=vertical]){width:var(--dsk-ruler-size,24px);height:100%;min-height:0}
      :host([hidden]){display:none!important}
      :host(:focus-visible){outline:2px solid var(--dsk-ruler-accent,#0d99ff);outline-offset:-2px}
      [part=scale]{display:block;width:100%;height:100%;overflow:hidden;touch-action:none}
      [part=tick]{stroke:var(--dsk-ruler-tick-color,#777);stroke-width:1}
      [part=label]{fill:currentColor;font:inherit;pointer-events:none}
      [part=highlight]{fill:var(--dsk-ruler-highlight,rgba(85,123,232,.28));pointer-events:none}
      [part=guide-overlay]{position:fixed;inset:auto;margin:0;padding:0;border:0;background:transparent;overflow:hidden;pointer-events:none}
      [part=guide]{position:absolute;box-sizing:border-box;padding:0;border:0;background:transparent;pointer-events:auto;touch-action:none;outline:none}
      [part=guide-overlay][data-navigating] [part=guide]{pointer-events:none}
      [part=guide]::after{content:"";position:absolute;background:var(--dsk-ruler-guide-color,#f2994a)}
      [part=guide][data-axis=x]{width:12px;height:100%;top:0;transform:translateX(-50%);cursor:ew-resize}
      [part=guide][data-axis=x]::after{width:var(--dsk-ruler-guide-width,1px);height:100%;left:50%;top:0}
      [part=guide][data-axis=y]{height:12px;width:100%;left:0;transform:translateY(-50%);cursor:ns-resize}
      [part=guide][data-axis=y]::after{height:var(--dsk-ruler-guide-width,1px);width:100%;top:50%;left:0}
      [part=guide][data-active]::after{background:var(--dsk-ruler-accent,#0d99ff)}
      [part=guide-label]{position:absolute;padding:2px 4px;font:11px sans-serif;color:var(--dsk-ruler-guide-color,#f2994a);background:var(--dsk-ruler-background,#292929);pointer-events:none;white-space:nowrap;z-index:1}
      [part=guide][data-axis=y] [part=guide-label]{left:4px;top:8px}
      [part=guide][data-axis=x] [part=guide-label]{left:8px;top:4px}
    </style><svg part="scale" aria-hidden="true"></svg><div part="guide-overlay" popover="manual"></div>`;
    this._svg = this.shadowRoot!.querySelector('svg')!;
    this._overlay = this.shadowRoot!.querySelector('div')!;
    this._resize = new ResizeObserver(() => this.refresh());
  }
  connectedCallback(): void {
    for (const name of [
      'orientation',
      'offset',
      'zoom',
      'step',
      'snap',
      'highlights',
      'guides',
      'target',
      'formatLabel',
      'guideOffset',
      'guideZoom',
      'camera',
      'followPan',
      'followZoom',
    ]) {
      if (!Object.hasOwn(this, name)) continue;
      const value: unknown = Reflect.get(this, name);
      Reflect.deleteProperty(this, name);
      Reflect.set(this, name, value);
    }
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    if (!this.hasAttribute('role')) this.setAttribute('role', 'group');
    if (!this.hasAttribute('aria-label'))
      this.setAttribute('aria-label', 'Ruler');
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._svg.addEventListener('pointerdown', this._down, options);
    this._overlay.addEventListener('pointerdown', this._down, options);
    this._overlay.addEventListener('wheel', this._navigateWheel, {
      ...options,
      passive: false,
    });
    this.ownerDocument.addEventListener('wheel', this._observeWheel, {
      ...options,
      passive: true,
    });
    this.ownerDocument.addEventListener(
      'pointerdown',
      this._navigationDown,
      options,
    );
    this.ownerDocument.addEventListener(
      'pointerup',
      this._navigationUp,
      options,
    );
    this.ownerDocument.addEventListener(
      'pointercancel',
      this._navigationUp,
      options,
    );
    this.ownerDocument.defaultView?.addEventListener(
      'blur',
      this._clearNavigation,
      options,
    );
    this._overlay.addEventListener('focusin', this._schedule, options);
    this._overlay.addEventListener('focusout', this._schedule, options);
    this.ownerDocument.addEventListener(
      'pointerdown',
      (event) => {
        const focused = this.shadowRoot!.activeElement;
        if (
          focused instanceof HTMLButtonElement &&
          !event.composedPath().includes(focused)
        )
          focused.blur();
      },
      options,
    );
    this.ownerDocument.addEventListener('pointermove', this._move, options);
    this.ownerDocument.addEventListener('pointerup', this._up, options);
    this.ownerDocument.addEventListener('pointercancel', this._cancel, options);
    this.addEventListener('keydown', this._key, options);
    this.ownerDocument.addEventListener('keydown', this._escape, options);
    this.ownerDocument.addEventListener('scroll', this._schedule, {
      ...options,
      capture: true,
    });
    this.ownerDocument.defaultView?.addEventListener(
      'resize',
      this._schedule,
      options,
    );
    this._resize.observe(this);
    this.refresh();
  }
  disconnectedCallback(): void {
    this._cancel();
    this._clearNavigation();
    this._listeners?.abort();
    this._resize.disconnect();
    this._observedTarget = null;
    cancelAnimationFrame(this._frame);
    this._frame = 0;
    if (this._overlay.matches(':popover-open')) this._overlay.hidePopover();
  }
  attributeChangedCallback(
    name: string,
    previous: string | null,
    current: string | null,
  ): void {
    if (previous === current) return;
    if (name === 'guides' && !this._writingHistory) this._history.reset();
    if (['orientation', 'follow-pan', 'follow-zoom'].includes(name))
      this._applyCamera();
    if (this.hasAttribute('disabled')) this._cancel();
    this.refresh();
  }
  private _number(name: string, fallback: number): number {
    const raw = this.getAttribute(name);
    const value = raw?.trim() ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : fallback;
  }
  get orientation(): RulerOrientation {
    const value = this.getAttribute('orientation');
    return value === 'vertical' ||
      value === 'vertical-reversed' ||
      value === 'horizontal-reversed'
      ? value
      : 'horizontal';
  }
  set orientation(value: RulerOrientation) {
    this.setAttribute('orientation', value);
  }
  get offset(): number {
    return this._number('offset', 0);
  }
  get camera(): CanvasCamera | null {
    return this._camera ? { ...this._camera } : null;
  }
  set camera(value: CanvasCamera | null) {
    this._camera = value ? resolveCanvasCamera(value) : null;
    this._applyCamera();
  }
  get followPan(): boolean {
    return this.getAttribute('follow-pan') !== 'false';
  }
  set followPan(value: boolean) {
    this.setAttribute('follow-pan', String(value));
  }
  get followZoom(): boolean {
    return this.getAttribute('follow-zoom') !== 'false';
  }
  set followZoom(value: boolean) {
    this.setAttribute('follow-zoom', String(value));
  }
  private _applyCamera(): void {
    if (!this._camera) return;
    const { panX, panY, zoom } = resolveCanvasCamera(this._camera, this);
    this.zoom = zoom;
    this.offset = -(this._vertical ? panY : panX) / this.zoom;
    this.guideZoom = this.zoom;
    this.guideOffset = -(this._vertical ? panX : panY) / this.zoom;
  }
  set offset(value: number) {
    this.setAttribute('offset', String(value));
  }
  get zoom(): number {
    return Math.min(1e12, Math.max(1e-12, this._number('zoom', 1)));
  }
  set zoom(value: number) {
    this.setAttribute('zoom', String(value));
  }
  get step(): number {
    return Math.max(0, this._number('step', 0));
  }
  set step(value: number) {
    this.setAttribute('step', String(value));
  }
  get snap(): number {
    return Math.max(0, this._number('snap', 0));
  }
  get guideOffset(): number {
    return this._number('guide-offset', this.offset);
  }
  set guideOffset(value: number) {
    this.setAttribute('guide-offset', String(value));
  }
  get guideZoom(): number {
    return Math.min(
      1e12,
      Math.max(1e-12, this._number('guide-zoom', this.zoom)),
    );
  }
  set guideZoom(value: number) {
    this.setAttribute('guide-zoom', String(value));
  }
  set snap(value: number) {
    this.setAttribute('snap', String(value));
  }
  private _array(name: string): unknown[] {
    try {
      const value: unknown = JSON.parse(this.getAttribute(name) ?? '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }
  get highlights(): readonly RulerRange[] {
    return this._array('highlights')
      .filter(
        (value): value is [number, number] =>
          Array.isArray(value) &&
          value.length === 2 &&
          value.every(
            (n: unknown) => typeof n === 'number' && Number.isFinite(n),
          ),
      )
      .map(([a, b]) => [a, b]);
  }
  set highlights(value: readonly RulerRange[]) {
    this.setAttribute('highlights', JSON.stringify(value));
  }
  get guides(): readonly number[] {
    return this._array('guides').filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    );
  }
  set guides(value: readonly number[]) {
    this.setAttribute('guides', JSON.stringify(value));
  }
  get target(): HTMLElement | null {
    if (this._target) return this._target;
    try {
      const root = this.getRootNode();
      const selector = this.getAttribute('target');
      const node =
        selector && (root instanceof Document || root instanceof ShadowRoot)
          ? root.querySelector(selector)
          : null;
      return node instanceof HTMLElement ? node : null;
    } catch {
      return null;
    }
  }
  set target(value: HTMLElement | null) {
    this._target = value;
    this.refresh();
  }
  get formatLabel(): ((value: number) => string) | null {
    return this._formatter;
  }
  set formatLabel(value: ((value: number) => string) | null) {
    this._formatter = value;
    this.refresh();
  }
  toPixel(value: number): number {
    return (value - this.offset) * this.zoom;
  }
  toValue(pixel: number): number {
    return this.offset + pixel / this.zoom;
  }
  private get _vertical(): boolean {
    return this.orientation.startsWith('vertical');
  }
  refresh(): void {
    if (this.isConnected && !this._frame)
      this._frame = requestAnimationFrame(() => {
        this._frame = 0;
        this._render();
      });
  }
  private readonly _schedule = (): void => this.refresh();
  private _element(
    tag: string,
    part: string,
    attributes: Record<string, number | string>,
  ): SVGElement {
    const node = document.createElementNS(ns, tag);
    node.setAttribute('part', part);
    for (const [name, value] of Object.entries(attributes))
      node.setAttribute(name, String(value));
    return node;
  }
  private _render(): void {
    const width = this.clientWidth,
      height = this.clientHeight;
    const length = this._vertical ? height : width,
      thickness = this._vertical ? width : height;
    const reversed = this.orientation.endsWith('-reversed');
    const edge = reversed ? 0 : thickness;
    const fragment = document.createDocumentFragment();
    for (const [a, b] of this.highlights) {
      const start = Math.max(0, this.toPixel(Math.min(a, b))),
        end = Math.min(length, this.toPixel(Math.max(a, b)));
      if (end > start)
        fragment.append(
          this._element(
            'rect',
            'highlight',
            this._vertical
              ? { x: 0, y: start, width: thickness, height: end - start }
              : { x: start, y: 0, width: end - start, height: thickness },
          ),
        );
    }
    const automatic = rulerStep(this.zoom);
    const step =
      this.step > 0
        ? this.step * Math.max(1, Math.ceil(automatic / this.step))
        : automatic;
    for (const tick of rulerTicks(this.offset, this.zoom, length, step)) {
      const p = tick.pixel,
        end = edge + (reversed ? 1 : -1) * (tick.major ? 9 : 4);
      fragment.append(
        this._element(
          'line',
          'tick',
          this._vertical
            ? { x1: edge, y1: p, x2: end, y2: p }
            : { x1: p, y1: edge, x2: p, y2: end },
        ),
      );
      if (tick.major) {
        const label = this._element(
          'text',
          'label',
          this._vertical
            ? {
                x: thickness / 2,
                y: p + 3,
                transform: `rotate(-90 ${thickness / 2} ${p + 3})`,
              }
            : { x: p + 3, y: reversed ? thickness - 3 : 10 },
        );
        label.textContent = this._formatter
          ? this._formatter(tick.value)
          : Number(tick.value.toPrecision(10)).toString();
        fragment.append(label);
      }
    }
    const guides = [...this.guides];
    if (this._drag?.started) guides[this._drag.index] = this._drag.value;
    this._svg.replaceChildren(fragment);
    const target = this.target;
    if (!guides.length) this._overlay.replaceChildren();
    if (target !== this._observedTarget) {
      if (this._observedTarget) this._resize.unobserve(this._observedTarget);
      if (target) this._resize.observe(target);
      this._observedTarget = target;
    }
    if (!target?.isConnected || !guides.length || !width || !height) {
      if (this._overlay.matches(':popover-open')) this._overlay.hidePopover();
      return;
    }
    const box = target.getBoundingClientRect(),
      ruler = this.getBoundingClientRect();
    Object.assign(this._overlay.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
    });
    const overlaps =
      ruler.right > box.left &&
      ruler.left < box.right &&
      ruler.bottom > box.top &&
      ruler.top < box.bottom;
    let clip = 'inset(0px)';
    if (overlaps) {
      if (this._vertical)
        clip =
          ruler.left < box.left + box.width / 2
            ? `inset(0 0 0 ${Math.max(0, ruler.right - box.left)}px)`
            : `inset(0 ${Math.max(0, box.right - ruler.left)}px 0 0)`;
      else
        clip =
          ruler.top < box.top + box.height / 2
            ? `inset(${Math.max(0, ruler.bottom - box.top)}px 0 0 0)`
            : `inset(0 0 ${Math.max(0, box.bottom - ruler.top)}px 0)`;
    }
    this._overlay.style.clipPath = clip;
    while (this._overlay.children.length > guides.length)
      this._overlay.lastElementChild!.remove();
    guides.forEach((value, index) => {
      let button = this._overlay.children[index] as
        HTMLButtonElement | undefined;
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('part', 'guide');
        const label = document.createElement('span');
        label.setAttribute('part', 'guide-label');
        button.append(label);
        this._overlay.append(button);
      }
      const p = (value - this.guideOffset) * this.guideZoom;
      button.hidden = p < 0 || p > (this._vertical ? box.width : box.height);
      button.dataset.index = String(index);
      button.dataset.axis = this._vertical ? 'x' : 'y';
      button.style.left = this._vertical ? `${p}px` : '0';
      button.style.top = this._vertical ? '0' : `${p}px`;
      const active =
        (this._drag?.started && this._drag.index === index) ||
        this.shadowRoot!.activeElement === button;
      button.toggleAttribute('data-active', Boolean(active));
      const label = button.querySelector<HTMLElement>('[part=guide-label]')!;
      label.hidden = !active;
      label.textContent = this._formatter
        ? this._formatter(value)
        : Number(value.toPrecision(10)).toString();
      button.setAttribute('aria-label', `Guide ${value}`);
      button.disabled = this.hasAttribute('disabled');
    });
    if (!this._overlay.matches(':popover-open')) this._overlay.showPopover();
    if (this._focusAfterRender !== undefined) {
      (
        this._overlay.children[this._focusAfterRender] as
          HTMLElement | undefined
      )?.focus({ preventScroll: true });
      this._focusAfterRender = undefined;
    }
  }
  private _pointerValue(event: PointerEvent): number {
    const rect = (this.target ?? this).getBoundingClientRect();
    const value =
      this.guideOffset +
      (this._vertical ? event.clientX - rect.left : event.clientY - rect.top) /
        this.guideZoom;
    return this.snap ? Math.round(value / this.snap) * this.snap : value;
  }
  private _updateNavigation(): void {
    this._overlay.toggleAttribute(
      'data-navigating',
      this._navigationTimer !== 0 || this._navigationPointers.size > 0,
    );
  }
  private readonly _clearNavigation = (): void => {
    this.ownerDocument.defaultView?.clearTimeout(this._navigationTimer);
    this._navigationTimer = 0;
    this._navigationPointers.clear();
    this._updateNavigation();
  };
  private readonly _navigationDown = (event: PointerEvent): void => {
    const target = this.target;
    if (!target || !event.composedPath().includes(target)) return;
    this._navigationPointers.add(event.pointerId);
    this._updateNavigation();
  };
  private readonly _navigationUp = (event: PointerEvent): void => {
    this._navigationPointers.delete(event.pointerId);
    this._updateNavigation();
  };
  private _holdNavigation(): void {
    const window = this.ownerDocument.defaultView;
    if (!window) return;
    window.clearTimeout(this._navigationTimer);
    this._navigationTimer = window.setTimeout(() => {
      this._navigationTimer = 0;
      this._updateNavigation();
    }, 180);
    this._updateNavigation();
  }
  private readonly _observeWheel = (event: WheelEvent): void => {
    const target = this.target;
    if (target && event.composedPath().includes(target)) this._holdNavigation();
  };
  private _navigationTarget(event: MouseEvent): Element | null {
    // Hit-test through the top-layer guides, including an open target shadow root.
    this._overlay.setAttribute('data-navigating', '');
    let element = this.ownerDocument.elementFromPoint(
      event.clientX,
      event.clientY,
    );
    while (element?.shadowRoot) {
      const inner = element.shadowRoot.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      if (!inner || inner === element) break;
      element = inner;
    }
    this._updateNavigation();
    return element;
  }
  private readonly _navigateWheel = (event: WheelEvent): void => {
    if (!this.target) return;
    this._holdNavigation();
    const target = this._navigationTarget(event);
    if (!target || target === this || this._overlay.contains(target)) return;
    const forwarded = new WheelEvent('wheel', {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      deltaZ: event.deltaZ,
      deltaMode: event.deltaMode,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
    });
    if (!target.dispatchEvent(forwarded)) event.preventDefault();
    event.stopPropagation();
  };
  private readonly _down = (event: PointerEvent): void => {
    if (
      this.target &&
      event.composedPath().includes(this._overlay) &&
      (event.button === 1 || event.pointerType === 'touch')
    ) {
      this._navigationPointers.add(event.pointerId);
      this._updateNavigation();
      const target = this._navigationTarget(event);
      if (target && target !== this && !this._overlay.contains(target)) {
        const forwarded = new PointerEvent('pointerdown', {
          bubbles: true,
          composed: true,
          cancelable: true,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          clientX: event.clientX,
          clientY: event.clientY,
          button: event.button,
          buttons: event.buttons,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          width: event.width,
          height: event.height,
          pressure: event.pressure,
        });
        if (!target.dispatchEvent(forwarded)) event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (event.button !== 0 || this.hasAttribute('disabled') || this._drag)
      return;
    const button = event
      .composedPath()
      .find(
        (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
      );
    const index = button ? Number(button.dataset.index) : this.guides.length;
    this._drag = {
      pointerId: event.pointerId,
      index,
      value: this._pointerValue(event),
      original: [...this.guides],
      startX: event.clientX,
      startY: event.clientY,
      started: false,
    };
    button?.focus({ preventScroll: true });
    this._capture = button ?? this._svg;
    this._capture.setPointerCapture(event.pointerId);
    event.preventDefault();
    this.refresh();
  };
  private _emit(type: string, drag: GuideDrag): void {
    const guides = [...drag.original];
    guides[drag.index] = drag.value;
    this.dispatchEvent(
      new CustomEvent<RulerGuideDetail>(type, {
        detail: { guides, value: drag.value, index: drag.index },
        bubbles: true,
        composed: true,
      }),
    );
  }
  private readonly _move = (event: PointerEvent): void => {
    if (!this._drag || event.pointerId !== this._drag.pointerId) return;
    if (
      !this._drag.started &&
      Math.hypot(
        event.clientX - this._drag.startX,
        event.clientY - this._drag.startY,
      ) < 4
    )
      return;
    this._drag.started = true;
    this._drag.value = this._pointerValue(event);
    this.refresh();
    this._emit('guideinput', this._drag);
  };
  private readonly _up = (event: PointerEvent): void => {
    const drag = this._drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const target = this.target,
      box = target?.getBoundingClientRect();
    this._releaseCapture();
    this._drag = undefined;
    if (!drag.started) {
      this.refresh();
      return;
    }
    if (
      !box ||
      (event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom)
    ) {
      const guides = [...drag.original];
      guides[drag.index] = drag.value;
      this._setUserGuides(guides);
      this._focusAfterRender = drag.index;
      this._emit('guidechange', drag);
    }
    this.refresh();
  };
  private readonly _cancel = (): void => {
    this._releaseCapture();
    this._drag = undefined;
    this.refresh();
  };
  private _releaseCapture(): void {
    if (this._drag && this._capture?.hasPointerCapture(this._drag.pointerId))
      this._capture.releasePointerCapture(this._drag.pointerId);
    this._capture = null;
  }
  private readonly _escape = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this._drag) {
      event.preventDefault();
      this._cancel();
    }
  };
  private readonly _key = (event: KeyboardEvent): void => {
    if (
      this._history.handle(
        event,
        !this.hasAttribute('disabled') && !this._drag,
        (snapshot) => {
          const guides: number[] = JSON.parse(snapshot);
          this._setUserGuides(guides);
          this.focus();
          this.dispatchEvent(
            new CustomEvent<RulerGuideDetail>('guidechange', {
              detail: { guides, index: -1, value: 0 },
              bubbles: true,
              composed: true,
            }),
          );
        },
      )
    )
      return;

    if (this.hasAttribute('disabled')) return;
    const button = event
      .composedPath()
      .find(
        (node): node is HTMLButtonElement => node instanceof HTMLButtonElement,
      );
    if (!button) {
      if (event.key === 'Enter') {
        event.preventDefault();
        const original = [...this.guides],
          box = (this.target ?? this).getBoundingClientRect(),
          value =
            this.guideOffset +
            (this._vertical ? box.width : box.height) / (2 * this.guideZoom);
        this._setUserGuides([...original, value]);
        this._focusAfterRender = original.length;
        this._emit('guidechange', {
          pointerId: 0,
          index: original.length,
          value,
          original,
        });
      }
      return;
    }
    const index = Number(button.dataset.index),
      original = [...this.guides];
    const value = original[index];
    if (value === undefined) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      original.splice(index, 1);
      this._setUserGuides(original);
      this.dispatchEvent(
        new CustomEvent<RulerGuideDetail>('guidechange', {
          detail: { guides: original, value, index },
          bubbles: true,
          composed: true,
        }),
      );
      this.focus();
    } else if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    ) {
      event.preventDefault();
      const next =
        value +
        (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) *
          (this.snap || 1) *
          (event.shiftKey ? 10 : 1);
      const guides = [...original];
      guides[index] = next;
      this._setUserGuides(guides);
      this._emit('guidechange', { pointerId: 0, index, value: next, original });
    }
  };
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-ruler': DskRuler;
  }
}
