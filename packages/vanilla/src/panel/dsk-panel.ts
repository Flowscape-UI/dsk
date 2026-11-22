import { DskControlHistory } from '../helpers/history.ts';

export type PanelDragEnd = 'left' | 'right' | 'top' | 'bottom';

/** Computed CSS dimensions, in local CSS pixels, after a user edit. */
export interface PanelResizeDetail {
  width: number;
  height: number;
  dragEnd: PanelDragEnd;
}

interface PanelSizeStyle {
  width: string;
  height: string;
  left: string;
  top: string;
  widthPriority: string;
  heightPriority: string;
}

interface PanelDrag {
  id: number;
  coordinate: number;
  size: number;
  scale: number;
  horizontal: boolean;
  sign: number;
  original: PanelSizeStyle;
}

/** A normal content container with a keyboard-accessible resize edge. */
export class DskPanel extends HTMLElement {
  static readonly observedAttributes = [
    'drag-end',
    'disabled',
    'readonly',
    'step',
    'min-size',
    'max-size',
    'offset',
    'inset',
    'handle-label',
    'style',
    'class',
  ];
  private readonly _handle: HTMLDivElement;
  private _listeners: AbortController | undefined;
  private _observer: ResizeObserver | undefined;
  private _drag: PanelDrag | undefined;
  private _writing = false;
  private readonly _history = new DskControlHistory<PanelSizeStyle>(
    () => this._snapshot(),
    (a, b) =>
      a.width === b.width &&
      a.height === b.height &&
      a.left === b.left &&
      a.top === b.top &&
      a.widthPriority === b.widthPriority &&
      a.heightPriority === b.heightPriority,
  );

  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display:block; position:relative; box-sizing:border-box; }
      :host([hidden]) { display:none!important; }
      [part=handle] { position:absolute; box-sizing:border-box!important; z-index:var(--dsk-panel-handle-z-index,1); background:var(--dsk-panel-handle-background,transparent); touch-action:none; user-select:none; }
      [data-side=left],[data-side=right] { top:0; height:100%!important; width:var(--dsk-panel-handle-size,6px); cursor:var(--dsk-panel-handle-cursor,ew-resize); }
      [data-side=left] { left:var(--dsk-panel-edge-position,0px); }
      [data-side=right] { right:var(--dsk-panel-edge-position,0px); }
      [data-side=top],[data-side=bottom] { left:0; width:100%!important; height:var(--dsk-panel-handle-size,6px); cursor:var(--dsk-panel-handle-cursor,ns-resize); }
      [data-side=top] { top:var(--dsk-panel-edge-position,0px); }
      [data-side=bottom] { bottom:var(--dsk-panel-edge-position,0px); }
      [part=handle]:focus-visible { outline:2px solid var(--dsk-panel-focus-color,#557be8); outline-offset:-2px; }
      :host([disabled]) [part=handle],:host([readonly]) [part=handle] { cursor:default; }
    </style><slot></slot><div part="handle" role="separator"></div>`;
    this._handle = this.shadowRoot!.querySelector('div')!;
  }

  connectedCallback(): void {
    for (const name of [
      'dragEnd',
      'disabled',
      'readOnly',
      'step',
      'minSize',
      'maxSize',
      'offset',
      'inset',
      'handleLabel',
    ]) {
      if (!Object.hasOwn(this, name)) continue;
      const value: unknown = Reflect.get(this, name);
      Reflect.deleteProperty(this, name);
      Reflect.set(this, name, value);
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._handle.addEventListener('pointerdown', this._down, options);
    this._handle.addEventListener('pointermove', this._move, options);
    this._handle.addEventListener('pointerup', this._up, options);
    this._handle.addEventListener('pointercancel', this._cancel, options);
    this._handle.addEventListener('lostpointercapture', this._cancel, options);
    this._handle.addEventListener('blur', this._cancel, options);
    this._handle.addEventListener('keydown', this._key, options);
    this.ownerDocument.defaultView?.addEventListener(
      'blur',
      this._cancel,
      options,
    );
    this._observer?.disconnect();
    this._observer = new ResizeObserver(() => this._sync());
    this._observer.observe(this);
    this._sync();
  }

  disconnectedCallback(): void {
    this._cancel();
    this._listeners?.abort();
    this._listeners = undefined;
    this._observer?.disconnect();
    this._observer = undefined;
  }

  attributeChangedCallback(name: string): void {
    if (this._writing) return;
    if (name === 'style' || name === 'class') {
      // An external size assignment supersedes an in-progress gesture.
      this._release();
      this._history.reset();
    } else if (
      name === 'drag-end' ||
      name === 'disabled' ||
      name === 'readonly' ||
      name === 'offset' ||
      name === 'inset'
    ) {
      this._cancel();
    }
    if (this.isConnected) this._sync();
  }

  get dragEnd(): PanelDragEnd {
    const value = this.getAttribute('drag-end');
    return value === 'left' || value === 'top' || value === 'bottom'
      ? value
      : 'right';
  }
  set dragEnd(value: PanelDragEnd) {
    this.setAttribute('drag-end', value);
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
  get readOnly(): boolean {
    return this.hasAttribute('readonly');
  }
  set readOnly(value: boolean) {
    this.toggleAttribute('readonly', value);
  }
  get step(): number {
    const value = Number(this.getAttribute('step'));
    return Number.isFinite(value) && value > 0 ? value : 1;
  }
  set step(value: number) {
    this.setAttribute('step', String(value));
  }
  /** Moves the resize edge outward in CSS pixels. */
  get offset(): number {
    return this._limit('offset', 0, true);
  }
  set offset(value: number) {
    this.setAttribute('offset', String(value));
  }
  /** Moves the resize edge inward in CSS pixels. */
  get inset(): number {
    return this._limit('inset', 0, true);
  }
  set inset(value: number) {
    this.setAttribute('inset', String(value));
  }
  get minSize(): number {
    return this._limit('min-size', 0);
  }
  set minSize(value: number) {
    this.setAttribute('min-size', String(value));
  }
  get maxSize(): number {
    return Math.max(this.minSize, this._limit('max-size', Infinity));
  }
  set maxSize(value: number) {
    this.setAttribute('max-size', String(value));
  }
  private _limit(name: string, fallback: number, signed = false): number {
    const raw = this.getAttribute(name);
    if (!raw?.trim()) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && (signed || value >= 0) ? value : fallback;
  }
  get handleLabel(): string {
    return this.getAttribute('handle-label') || 'Resize panel';
  }
  set handleLabel(value: string) {
    this.setAttribute('handle-label', value);
  }

  private get _horizontal(): boolean {
    return this.dragEnd === 'left' || this.dragEnd === 'right';
  }
  private get _editable(): boolean {
    return !this.disabled && !this.readOnly;
  }
  private get _sign(): number {
    return this.dragEnd === 'left' || this.dragEnd === 'top' ? -1 : 1;
  }
  private _size(horizontal = this._horizontal): number {
    const value = parseFloat(
      getComputedStyle(this)[horizontal ? 'width' : 'height'],
    );
    return Number.isFinite(value) ? value : 0;
  }
  private _snapshot(): PanelSizeStyle {
    return {
      width: this.style.width,
      height: this.style.height,
      left: this.style.left,
      top: this.style.top,
      widthPriority: this.style.getPropertyPriority('width'),
      heightPriority: this.style.getPropertyPriority('height'),
    };
  }
  private _restore(value: PanelSizeStyle): void {
    this._writing = true;
    try {
      this.style.left = value.left;
      this.style.top = value.top;
      this.style.setProperty('width', value.width, value.widthPriority);
      this.style.setProperty('height', value.height, value.heightPriority);
    } finally {
      this._writing = false;
    }
    this._sync();
  }
  private _resize(size: number, horizontal = this._horizontal): boolean {
    if (!Number.isFinite(size)) return false;
    const before = this._size(horizontal);
    const property = horizontal ? 'width' : 'height';
    const original = this._snapshot();
    const box = this.getBoundingClientRect();
    const extent = horizontal ? this.offsetWidth : this.offsetHeight;
    const scale = extent ? (horizontal ? box.width : box.height) / extent : 1;
    this._writing = true;
    try {
      this.style.setProperty(
        property,
        `${Math.min(this.maxSize, Math.max(this.minSize, size))}px`,
        this.style.getPropertyPriority(property),
      );
      // Let the layout engine resolve CSS min/max, percentages and box-sizing.
      const actual = this._size(horizontal);
      this.style.setProperty(
        property,
        `${actual}px`,
        this.style.getPropertyPriority(property),
      );
    } finally {
      this._writing = false;
    }
    if (Math.abs(this._size(horizontal) - before) < 0.01) {
      this._restore(original);
      return false;
    }
    {
      const after = this.getBoundingClientRect();
      const delta = horizontal
        ? this.dragEnd === 'left'
          ? box.right - after.right
          : box.left - after.left
        : this.dragEnd === 'top'
          ? box.bottom - after.bottom
          : box.top - after.top;
      if (Math.abs(delta) > 0.01 && scale) {
        const offset = horizontal ? 'left' : 'top';
        const current = parseFloat(getComputedStyle(this)[offset]) || 0;
        this._writing = true;
        try {
          this.style[offset] = `${current + delta / scale}px`;
        } finally {
          this._writing = false;
        }
      }
    }
    this._sync();
    this._emit('input');
    return true;
  }
  private _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(
      new CustomEvent<PanelResizeDetail>(type, {
        bubbles: true,
        composed: true,
        detail: {
          width: this._size(true),
          height: this._size(false),
          dragEnd: this.dragEnd,
        },
      }),
    );
  }
  private _sync(): void {
    this._handle.dataset.side = this.dragEnd;
    this._handle.style.setProperty(
      '--dsk-panel-edge-position',
      `${this.inset - this.offset}px`,
    );
    this._handle.tabIndex = this.disabled ? -1 : 0;
    this._handle.setAttribute('aria-label', this.handleLabel);
    this._handle.setAttribute(
      'aria-orientation',
      this._horizontal ? 'vertical' : 'horizontal',
    );
    this._handle.setAttribute('aria-disabled', String(!this._editable));
    this._handle.setAttribute(
      'aria-valuenow',
      String(Math.round(this._size())),
    );
    this._handle.setAttribute(
      'aria-valuetext',
      `${Math.round(this._size())}px`,
    );
    const style = getComputedStyle(this);
    const min = this._horizontal ? style.minWidth : style.minHeight;
    const max = this._horizontal ? style.maxWidth : style.maxHeight;
    this._handle.setAttribute(
      'aria-valuemin',
      min.endsWith('px')
        ? String(Math.max(this.minSize, parseFloat(min)))
        : String(this.minSize),
    );
    const maximum = Math.min(
      this.maxSize,
      max.endsWith('px') ? parseFloat(max) : Infinity,
    );
    if (Number.isFinite(maximum))
      this._handle.setAttribute('aria-valuemax', String(maximum));
    else this._handle.removeAttribute('aria-valuemax');
  }
  private _release(): PanelDrag | undefined {
    const drag = this._drag;
    this._drag = undefined;
    this._handle.removeAttribute('data-dragging');
    if (drag && this._handle.hasPointerCapture(drag.id))
      this._handle.releasePointerCapture(drag.id);
    return drag;
  }
  private readonly _cancel = (): void => {
    const drag = this._release();
    if (!drag) return;
    const before = this._size(drag.horizontal);
    this._restore(drag.original);
    if (this.isConnected && before !== this._size(drag.horizontal))
      this._emit('input');
  };
  private readonly _down = (event: PointerEvent): void => {
    if (!this._editable || this._drag || event.button !== 0 || !event.isPrimary)
      return;
    event.preventDefault();
    event.stopPropagation();
    this._handle.focus({ preventScroll: true });
    const horizontal = this._horizontal;
    const box = this.getBoundingClientRect();
    const extent = horizontal ? this.offsetWidth : this.offsetHeight;
    const scale = extent ? (horizontal ? box.width : box.height) / extent : 1;
    this._history.begin();
    this._drag = {
      id: event.pointerId,
      coordinate: horizontal ? event.clientX : event.clientY,
      size: this._size(),
      scale: scale || 1,
      horizontal,
      sign: this._sign,
      original: this._snapshot(),
    };
    this._handle.setAttribute('data-dragging', '');
    this._handle.setPointerCapture(event.pointerId);
  };
  private readonly _move = (event: PointerEvent): void => {
    const drag = this._drag;
    if (!drag || event.pointerId !== drag.id) return;
    const coordinate = drag.horizontal ? event.clientX : event.clientY;
    this._resize(
      drag.size + ((coordinate - drag.coordinate) / drag.scale) * drag.sign,
      drag.horizontal,
    );
  };
  private readonly _up = (event: PointerEvent): void => {
    if (event.pointerId !== this._drag?.id) return;
    this._move(event);
    const drag = this._release()!;
    if (Math.abs(this._size(drag.horizontal) - drag.size) < 0.01) {
      this._restore(drag.original);
      return;
    }
    this._history.commit();
    this._emit('change');
  };
  private readonly _key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this._drag) {
      event.preventDefault();
      event.stopPropagation();
      this._cancel();
      return;
    }
    if (this._drag) return;
    if (
      this._history.handle(event, this._editable, (value) => {
        this._restore(value);
        this._emit('input');
        this._emit('change');
      })
    )
      return;
    if (!this._editable || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const backward = this._horizontal ? 'ArrowLeft' : 'ArrowUp';
    const forward = this._horizontal ? 'ArrowRight' : 'ArrowDown';
    const direction =
      event.key === backward ? -1 : event.key === forward ? 1 : 0;
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    this._history.begin();
    if (
      this._resize(
        this._size() +
          direction * this._sign * this.step * (event.shiftKey ? 10 : 1),
      )
    ) {
      this._history.commit();
      this._emit('change');
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-panel': DskPanel;
  }
}
