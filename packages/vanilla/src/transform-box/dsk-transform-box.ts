import { hitsSelectableText } from './helpers/text-hit.ts';
import { DskControlHistory } from '../helpers/history.ts';
import {
  equalBox,
  resizeBox,
  resizeDirection,
  type TransformBoxValue,
  type TransformBoxAction,
} from './helpers/geometry.ts';
export interface TransformBoxDetail extends TransformBoxValue {
  action: TransformBoxAction;
}
interface Gesture {
  id: number;
  start: TransformBoxValue;
  x: number;
  y: number;
  inverse: DOMMatrix;
  handle: HTMLElement | null;
  centerX: number;
  centerY: number;
  lastAngle: number;
  rotation: number;
  direction: ReturnType<typeof resizeDirection> | null;
}

/** Borderless HTML container. A header restricts dragging to that header. */
export class DskTransformBox extends HTMLElement {
  static readonly observedAttributes = [
    'x',
    'y',
    'width',
    'height',
    'angle',
    'movable',
    'disabled',
    'readonly',
    'step',
    'snap-angle',
  ];
  private _listeners: AbortController | undefined;
  private _children: MutationObserver | undefined;
  private _gesture: Gesture | undefined;
  private _writing = false;
  private _action: TransformBoxAction = 'move';
  private readonly _history = new DskControlHistory<TransformBoxValue>(
    () => this.value,
    equalBox,
  );
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display:inline-block; position:relative; box-sizing:border-box; width:var(--dsk-transform-width,200px); height:var(--dsk-transform-height,140px); transform:translate(var(--dsk-transform-x,0px),var(--dsk-transform-y,0px)) rotate(var(--dsk-transform-angle,0deg)); transform-origin:center; touch-action:var(--dsk-transform-touch-action,none); }
      :host([hidden]) { display:none!important; }
      :host(:focus-visible) { outline:2px solid var(--dsk-transform-color,#557be8); outline-offset:3px; }
      [part=content] { display:flex; flex-direction:column; width:100%; height:100%; }
      slot { display:contents; }
    </style><div part="content"><slot></slot></div>`;
  }
  connectedCallback(): void {
    for (const name of [
      'value',
      'x',
      'y',
      'width',
      'height',
      'angle',
      'movable',
      'disabled',
      'readOnly',
      'step',
      'snapAngle',
    ]) {
      if (!Object.hasOwn(this, name)) continue;
      const value: unknown = Reflect.get(this, name);
      Reflect.deleteProperty(this, name);
      Reflect.set(this, name, value);
    }
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this.addEventListener('pointerdown', this._down, options);
    this.addEventListener('pointermove', this._move, options);
    this.addEventListener('pointerup', this._up, options);
    this.addEventListener('pointercancel', this._cancel, options);
    this.addEventListener('lostpointercapture', this._cancel, options);
    this.addEventListener('keydown', this._key, options);
    this.addEventListener('focusout', this._focusOut, options);
    this.ownerDocument.defaultView?.addEventListener(
      'blur',
      this._cancel,
      options,
    );
    this._children?.disconnect();
    this._children = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.target === this ||
            (record.target === this._gesture?.handle &&
              record.attributeName === 'direction'),
        ) ||
        (this._gesture?.handle && !this._handleAllowed(this._gesture.handle))
      )
        this._cancel();
      this._render();
    });
    this._children.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'direction'],
    });
    this._render();
  }
  disconnectedCallback(): void {
    this._cancel();
    this._listeners?.abort();
    this._listeners = undefined;
    this._children?.disconnect();
    this._children = undefined;
  }
  attributeChangedCallback(
    name: string,
    before: string | null,
    after: string | null,
  ): void {
    if (this._writing || before === after) return;
    if (['x', 'y', 'width', 'height', 'angle'].includes(name)) {
      this._release();
      this._history.reset();
    } else this._cancel();
    this._render();
  }
  private _number(name: string, fallback: number, minimum = -Infinity): number {
    const raw = this.getAttribute(name);
    const value = raw?.trim() ? Number(raw) : NaN;
    return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
  }
  get x(): number {
    return this._number('x', 0);
  }
  set x(value: number) {
    this.setAttribute('x', String(value));
  }
  get y(): number {
    return this._number('y', 0);
  }
  set y(value: number) {
    this.setAttribute('y', String(value));
  }
  get width(): number {
    return this._number('width', 200, 0);
  }
  set width(value: number) {
    this.setAttribute('width', String(value));
  }
  get height(): number {
    return this._number('height', 140, 0);
  }
  set height(value: number) {
    this.setAttribute('height', String(value));
  }
  get angle(): number {
    return this._number('angle', 0);
  }
  set angle(value: number) {
    this.setAttribute('angle', String(value));
  }
  get movable(): boolean {
    return this.getAttribute('movable') !== 'false';
  }
  set movable(value: boolean) {
    this.setAttribute('movable', String(value));
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
    return this._number('step', 1, 0.001);
  }
  set step(value: number) {
    this.setAttribute('step', String(value));
  }
  get snapAngle(): number {
    return this._number('snap-angle', 15, 0.001);
  }
  set snapAngle(value: number) {
    this.setAttribute('snap-angle', String(value));
  }
  private _ownsHandle(handle: HTMLElement): boolean {
    if (
      !handle.matches(
        'dsk-transform-box-handle-rotate,dsk-transform-box-handle-resize',
      ) ||
      handle.closest('dsk-transform-box') !== this
    )
      return false;
    for (
      let parent = handle.parentElement;
      parent && parent !== this;
      parent = parent.parentElement
    )
      if (parent.localName === 'dsk-transform-content') return false;
    return true;
  }
  private _handleAllowed(handle: HTMLElement): boolean {
    return (
      this._ownsHandle(handle) &&
      !this.disabled &&
      !this.readOnly &&
      !handle.hasAttribute('disabled')
    );
  }
  get value(): TransformBoxValue {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      angle: this.angle,
    };
  }
  set value(value: TransformBoxValue) {
    this._release();
    this._history.reset();
    this._apply(value);
  }
  private get _header(): HTMLElement | null {
    return this.querySelector<HTMLElement>(':scope > dsk-transform-header');
  }
  private get _editable(): boolean {
    return this.movable && !this.disabled && !this.readOnly;
  }
  private _render(): void {
    for (const handle of this.querySelectorAll<HTMLElement>(
      'dsk-transform-box-handle-rotate,dsk-transform-box-handle-resize',
    )) {
      if (!this._ownsHandle(handle)) continue;
      if (handle.localName === 'dsk-transform-box-handle-rotate') {
        handle.setAttribute(
          'aria-valuenow',
          String(((this.angle % 360) + 360) % 360),
        );
        handle.setAttribute(
          'aria-valuetext',
          `${Math.round(this.angle * 100) / 100}°`,
        );
      }
      handle.setAttribute(
        'aria-disabled',
        String(!this._handleAllowed(handle)),
      );
    }
    for (const [key, value] of Object.entries(this.value))
      this.style.setProperty(
        `--dsk-transform-${key}`,
        `${value}${key === 'angle' ? 'deg' : 'px'}`,
      );
    this.style.setProperty(
      '--dsk-transform-touch-action',
      this.querySelector(':scope > dsk-transform-content') || this._header
        ? 'auto'
        : 'none',
    );
  }
  private _apply(value: TransformBoxValue): void {
    this._writing = true;
    try {
      for (const key of ['x', 'y', 'width', 'height', 'angle'] as const)
        if (Number.isFinite(value[key]))
          this.setAttribute(key, String(value[key]));
    } finally {
      this._writing = false;
    }
    this._render();
  }
  private _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(
      new CustomEvent<TransformBoxDetail>(type, {
        bubbles: true,
        composed: true,
        detail: { ...this.value, action: this._action },
      }),
    );
  }
  private _edit(value: TransformBoxValue): void {
    if (equalBox(this.value, value)) return;
    this._apply(value);
    this._emit('input');
  }
  private _release(): Gesture | undefined {
    const gesture = this._gesture;
    this._gesture = undefined;
    if (gesture && this.hasPointerCapture(gesture.id))
      this.releasePointerCapture(gesture.id);
    return gesture;
  }
  private readonly _cancel = (): void => {
    const gesture = this._release();
    if (gesture) this._edit(gesture.start);
  };
  private readonly _focusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (
      !(next instanceof Node) ||
      (!this.contains(next) && !this.shadowRoot!.contains(next))
    )
      this._cancel();
  };
  private _inverse(): DOMMatrix {
    let matrix = new DOMMatrix();
    const ownRoot = this.getRootNode();
    let parent: Element | null =
      this.parentElement ??
      (ownRoot instanceof ShadowRoot ? ownRoot.host : null);
    while (parent) {
      const css = getComputedStyle(parent);
      if (css.transform !== 'none')
        matrix = new DOMMatrix(css.transform).multiply(matrix);
      const root = parent.getRootNode();
      parent =
        parent.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    return new DOMMatrix([
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      0,
      0,
    ]).inverse();
  }
  private readonly _down = (event: PointerEvent): void => {
    if (
      this._gesture ||
      !event.isPrimary ||
      event.button !== 0 ||
      event.defaultPrevented
    )
      return;
    const path = event.composedPath();
    const ancestors = path.slice(0, path.indexOf(this));
    const handle = ancestors.find(
      (target) =>
        target instanceof HTMLElement &&
        target.matches(
          'dsk-transform-box-handle-rotate,dsk-transform-box-handle-resize',
        ),
    ) as HTMLElement | undefined;
    if (handle ? !this._handleAllowed(handle) : !this._editable) return;
    if (
      !handle &&
      ancestors.some(
        (target) =>
          target instanceof Element &&
          (target.matches(
            'dsk-transform-content,dsk-transform-box,input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[data-dsk-no-drag]',
          ) ||
            (target instanceof HTMLElement && target.isContentEditable)),
      )
    )
      return;
    if (!handle && this._header && !path.includes(this._header)) return;
    if (!handle && hitsSelectableText(event)) return;
    const inverse = this._inverse();
    if (![inverse.a, inverse.b, inverse.c, inverse.d].every(Number.isFinite))
      return;
    event.preventDefault();
    event.stopPropagation();
    (handle ?? this._header ?? this).focus({ preventScroll: true });
    this._history.begin();
    this._action = handle
      ? handle.localName === 'dsk-transform-box-handle-resize'
        ? 'resize'
        : 'rotate'
      : 'move';
    const rect = this.getBoundingClientRect();
    const centerX = rect.x + rect.width / 2,
      centerY = rect.y + rect.height / 2;
    const point = new DOMPoint(
      event.clientX - centerX,
      event.clientY - centerY,
    ).matrixTransform(inverse);
    this._gesture = {
      id: event.pointerId,
      start: this.value,
      x: event.clientX,
      y: event.clientY,
      inverse,
      handle: handle ?? null,
      centerX,
      centerY,
      lastAngle: Math.atan2(point.y, point.x),
      rotation: 0,
      direction:
        this._action === 'resize'
          ? resizeDirection(handle!.getAttribute('direction'))
          : null,
    };
    this.setPointerCapture(event.pointerId);
  };
  private readonly _move = (event: PointerEvent): void => {
    const gesture = this._gesture;
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.handle) {
      if (!this._handleAllowed(gesture.handle)) {
        this._cancel();
        return;
      }
      if (gesture.direction) {
        const delta = new DOMPoint(
          event.clientX - gesture.x,
          event.clientY - gesture.y,
        ).matrixTransform(gesture.inverse);
        const angle = (gesture.start.angle * Math.PI) / 180;
        this._edit(
          resizeBox(
            gesture.start,
            gesture.direction,
            delta.x * Math.cos(angle) + delta.y * Math.sin(angle),
            -delta.x * Math.sin(angle) + delta.y * Math.cos(angle),
          ),
        );
        return;
      }
      const point = new DOMPoint(
        event.clientX - gesture.centerX,
        event.clientY - gesture.centerY,
      ).matrixTransform(gesture.inverse);
      const angle = Math.atan2(point.y, point.x);
      gesture.rotation +=
        (Math.atan2(
          Math.sin(angle - gesture.lastAngle),
          Math.cos(angle - gesture.lastAngle),
        ) *
          180) /
        Math.PI;
      gesture.lastAngle = angle;
      const raw = gesture.start.angle + gesture.rotation;
      this._edit({
        ...gesture.start,
        angle: event.shiftKey
          ? Math.round(raw / this.snapAngle) * this.snapAngle
          : raw,
      });
      return;
    }
    const delta = new DOMPoint(
      event.clientX - gesture.x,
      event.clientY - gesture.y,
    ).matrixTransform(gesture.inverse);
    this._edit({
      ...gesture.start,
      x: gesture.start.x + delta.x,
      y: gesture.start.y + delta.y,
    });
  };
  private readonly _up = (event: PointerEvent): void => {
    if (event.pointerId !== this._gesture?.id) return;
    this._move(event);
    const gesture = this._release();
    if (!gesture) return;
    if (!equalBox(gesture.start, this.value)) {
      this._history.commit();
      this._emit('change');
    }
  };
  private readonly _key = (event: KeyboardEvent): void => {
    const origin = event.composedPath()[0];
    const handle =
      origin instanceof HTMLElement &&
      origin.matches(
        'dsk-transform-box-handle-rotate,dsk-transform-box-handle-resize',
      )
        ? origin
        : null;
    if (handle ? !this._ownsHandle(handle) : origin !== (this._header ?? this))
      return;
    const editable = handle ? this._handleAllowed(handle) : this._editable;
    if (event.key === 'Escape' && this._gesture) {
      event.preventDefault();
      event.stopPropagation();
      this._cancel();
      return;
    }
    if (this._gesture) return;
    if (
      this._history.handle(event, editable, (value) => {
        this._action =
          value.width !== this.width || value.height !== this.height
            ? 'resize'
            : value.angle === this.angle
              ? 'move'
              : 'rotate';
        this._apply(value);
        this._emit('input');
        this._emit('change');
      })
    )
      return;
    if (!editable || event.ctrlKey || event.metaKey || event.altKey) return;
    const dx =
      event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const dy = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    event.stopPropagation();
    this._history.begin();
    this._action = handle
      ? handle.localName === 'dsk-transform-box-handle-resize'
        ? 'resize'
        : 'rotate'
      : 'move';
    const step =
      this._action === 'rotate' && event.shiftKey
        ? this.snapAngle
        : this.step * (event.shiftKey ? 10 : 1);
    this._edit(
      this._action === 'resize'
        ? resizeBox(
            this.value,
            resizeDirection(handle!.getAttribute('direction')),
            dx * step,
            dy * step,
          )
        : handle
          ? { ...this.value, angle: this.angle + (dx || dy) * step }
          : { ...this.value, x: this.x + dx * step, y: this.y + dy * step },
    );
    this._history.commit();
    this._emit('change');
  };
}
declare global {
  interface HTMLElementTagNameMap {
    'dsk-transform-box': DskTransformBox;
  }
}
