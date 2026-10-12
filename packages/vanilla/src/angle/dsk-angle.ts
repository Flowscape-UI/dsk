import {
  type AngleNumber,
  type AngleUnit,
  angleUnit,
  angleNumber,
  toDegrees,
  fromDegrees,
  clampAngle,
  cleanAngle,
  wrapAngle,
  snapAngle,
  pointerDegrees,
  angleDelta,
  formatAngle,
  anglePoint,
  sectorPath,
} from './helpers/angle-model.ts';

interface AngleDrag {
  pointerId: number;
  start: number;
  accumulated: number;
  previous: number | undefined;
}

/** A compass angle control with a soft sector and a clear central readout. */
export class DskAngle extends HTMLElement {
  static readonly observedAttributes = [
    'value',
    'min',
    'max',
    'step',
    'unit',
    'segments',
    'size',
    'color',
    'disabled',
    'readonly',
    'aria-label',
  ];
  private readonly _container: HTMLDivElement;
  private readonly _dial: SVGSVGElement;
  private readonly _tracks: SVGGElement;
  private readonly _fill: SVGPathElement;
  private readonly _needle: SVGLineElement;
  private readonly _labels: SVGTextElement[];
  private readonly _marker: HTMLDivElement;
  private readonly _output: SVGTextElement;
  private readonly _input: HTMLInputElement;
  private readonly _sizeStyle: HTMLStyleElement;
  private readonly _internals: ElementInternals;
  private _trackPaths: SVGPathElement[] = [];
  private _listeners: AbortController | undefined;
  private _observer: ResizeObserver | undefined;
  private _drag: AngleDrag | undefined;
  private _nativeStart: number | undefined;
  private _updating = false;
  private _initialized = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._internals.role = 'group';
    this._internals.ariaLabel = 'Angle';
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: inline-block; position: relative; vertical-align: middle; color: inherit; }
        :host([hidden]) { display: none !important; }
        [part="container"] { position: absolute; inset: 0; touch-action: none; user-select: none; }
        [part="dial"] { display: block; width: 100%; height: 100%; overflow: visible; cursor: pointer; }
        [part="track"] { fill: none; stroke: var(--dsk-angle-track-color, #cbd3e0); stroke-width: 1; }
        [part="fill"] { fill: var(--dsk-angle-active-color, var(--dsk-angle-color, #557be8)); fill-opacity: var(--dsk-angle-sector-opacity, 0.1); fill-rule: evenodd; stroke: none; }
        [part="needle"] { stroke: var(--dsk-angle-active-color, var(--dsk-angle-color, #557be8)); stroke-width: 2; }
        [part="scale-label"] { fill: var(--dsk-angle-label-color, #667386); text-anchor: middle; dominant-baseline: central; font: 11px system-ui, sans-serif; }
        [part="marker"] {
          position: absolute; left: 0; top: 0; width: 10px; height: 10px;
          box-sizing: border-box; border: 2px solid white; border-radius: 50%;
          background: var(--dsk-angle-active-color, var(--dsk-angle-color, #557be8));
          transform: translate(-50%, -50%);
          will-change: transform; pointer-events: none;
        }
        [part="value"] {
          fill: var(--dsk-angle-text-color, currentColor);
          text-anchor: middle; dominant-baseline: central; font: 500 26px system-ui, sans-serif;
          font-variant-numeric: tabular-nums; pointer-events: none;
        }
        [part="input"] {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip-path: inset(50%); border: 0;
        }
        :host(:focus-within) [part="dial"] { outline: 2px solid var(--dsk-angle-focus-color, #557be8); outline-offset: 2px; border-radius: 50%; }
        :host([disabled]) [part="dial"] { cursor: not-allowed; }
        :host([readonly]) [part="dial"] { cursor: default; }
      </style>
      <style id="size"></style>
      <div part="container">
        <svg part="dial" viewBox="0 0 240 240" aria-hidden="true">
          <circle part="track" cx="120" cy="120" r="77"></circle>
          <path part="fill"></path>
          <g id="tracks"></g>
          <g id="labels">
            <text part="scale-label" x="120" y="16"></text>
            <text part="scale-label" x="224" y="120"></text>
            <text part="scale-label" x="120" y="224"></text>
            <text part="scale-label" x="16" y="120"></text>
          </g>
          <line part="needle"></line>
          <text part="value" x="120" y="120"></text>
        </svg>
        <div part="marker" aria-hidden="true"></div>
        <input part="input" type="range" step="any" aria-label="Angle">
      </div>
    `;
    this._container = this._element('[part="container"]', HTMLDivElement);
    this._dial = this._element('[part="dial"]', SVGSVGElement);
    this._tracks = this._element('#tracks', SVGGElement);
    this._fill = this._element('[part="fill"]', SVGPathElement);
    this._needle = this._element('[part="needle"]', SVGLineElement);
    this._labels = Array.from(
      this._element('#labels', SVGGElement).querySelectorAll('text'),
    );
    this._marker = this._element('[part="marker"]', HTMLDivElement);
    this._output = this._element('[part="value"]', SVGTextElement);
    this._input = this._element('[part="input"]', HTMLInputElement);
    this._sizeStyle = this._element('#size', HTMLStyleElement);
    this._renderSize();
    this._render();
  }

  private _element<T extends Element>(selector: string, type: new () => T): T {
    const element = this.shadowRoot?.querySelector(selector);
    if (!(element instanceof type))
      throw new Error(`Missing angle element: ${selector}`);
    return element;
  }

  connectedCallback(): void {
    for (const property of [
      'unit',
      'min',
      'max',
      'step',
      'value',
      'segments',
      'size',
      'color',
      'disabled',
      'readOnly',
    ]) {
      if (Object.hasOwn(this, property)) {
        const value: unknown = Reflect.get(this, property);
        Reflect.deleteProperty(this, property);
        Reflect.set(this, property, value);
      }
    }
    this._initialized = true;
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._container.addEventListener(
      'pointerdown',
      this._onPointerDown,
      options,
    );
    this._container.addEventListener(
      'pointermove',
      this._onPointerMove,
      options,
    );
    this._container.addEventListener('pointerup', this._onPointerUp, options);
    this._container.addEventListener(
      'pointercancel',
      this._onPointerCancel,
      options,
    );
    this._container.addEventListener(
      'lostpointercapture',
      this._onPointerCancel,
      options,
    );
    this.addEventListener('keydown', this._onKeyDown, options);
    this.addEventListener('focusout', this._onFocusOut, options);
    this._input.addEventListener('input', this._onNativeInput, options);
    this._input.addEventListener('change', this._onNativeChange, options);
    window.addEventListener('blur', this._onWindowBlur, options);
    window.addEventListener('resize', this._positionMarker, options);
    this._observer?.disconnect();
    this._observer = new ResizeObserver(this._positionMarker);
    this._observer.observe(this._container);
    this._render();
  }

  disconnectedCallback(): void {
    this._cancelDrag(false);
    this._nativeStart = undefined;
    this._listeners?.abort();
    this._listeners = undefined;
    this._observer?.disconnect();
  }

  attributeChangedCallback(
    name: string,
    previous: string | null,
    current: string | null,
  ): void {
    if (previous === current || this._updating) return;
    if (name === 'unit' && this._initialized) {
      this._releaseDrag();
      const oldUnit = angleUnit(previous);
      const nextUnit = angleUnit(current);
      this._updating = true;
      for (const attribute of ['value', 'min', 'max', 'step']) {
        const raw = this.getAttribute(attribute);
        const value = angleNumber(raw, NaN);
        if (raw !== null && Number.isFinite(value))
          this.setAttribute(
            attribute,
            String(
              cleanAngle(fromDegrees(toDegrees(value, oldUnit), nextUnit)),
            ),
          );
      }
      this._updating = false;
    } else if (
      (name === 'disabled' || name === 'readonly') &&
      !this._editable
    ) {
      this._cancelDrag(false);
    } else if (name !== 'size' && name !== 'color' && name !== 'segments')
      this._releaseDrag();
    this._nativeStart = undefined;
    if (name === 'size') this._renderSize();
    this._render();
  }

  get unit(): AngleUnit {
    return angleUnit(this.getAttribute('unit'));
  }
  set unit(value: AngleUnit | 'PI' | 'π' | null | undefined) {
    if (value == null) this.removeAttribute('unit');
    else this.setAttribute('unit', value);
  }
  get min(): number {
    return clampAngle(
      angleNumber(this.getAttribute('min'), 0),
      0,
      fromDegrees(360, this.unit),
    );
  }
  set min(value: AngleNumber) {
    this._setAttribute('min', value);
  }
  get max(): number {
    return clampAngle(
      angleNumber(this.getAttribute('max'), fromDegrees(360, this.unit)),
      this.min,
      fromDegrees(360, this.unit),
    );
  }
  set max(value: AngleNumber) {
    this._setAttribute('max', value);
  }
  get value(): number {
    return clampAngle(
      angleNumber(this.getAttribute('value'), this.min),
      this.min,
      this.max,
    );
  }
  set value(value: AngleNumber) {
    this._setAttribute('value', value);
  }
  get step(): number {
    const step = angleNumber(this.getAttribute('step'), 0);
    return step > 0 ? step : fromDegrees(1, this.unit);
  }
  set step(value: AngleNumber) {
    this._setAttribute('step', value);
  }
  get size(): number {
    const size = angleNumber(this.getAttribute('size'), 208);
    return size > 0 ? size : 208;
  }
  set size(value: AngleNumber) {
    this._setAttribute('size', value);
  }
  get segments(): number {
    return clampAngle(
      Math.round(angleNumber(this.getAttribute('segments'), 24)),
      4,
      180,
    );
  }
  set segments(value: AngleNumber) {
    this._setAttribute('segments', value);
  }
  get color(): string {
    const color = this.getAttribute('color')?.trim();
    return color && CSS.supports('color', color) ? color : '#557be8';
  }
  set color(value: string | null | undefined) {
    if (value == null) this.removeAttribute('color');
    else this.setAttribute('color', value);
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
  get degrees(): number {
    return clampAngle(toDegrees(this.value, this.unit), 0, 360);
  }
  get formattedValue(): string {
    return formatAngle(this.value, this.unit);
  }
  override focus(options?: FocusOptions): void {
    this._input.focus(options);
  }
  override blur(): void {
    this._input.blur();
    super.blur();
  }
  private get _editable(): boolean {
    return !this.disabled && !this.readOnly && this.max > this.min;
  }
  private get _bounded(): boolean {
    return this.hasAttribute('min') || this.hasAttribute('max');
  }
  private get _nativeScale(): number {
    const count = (this.max - this.min) / this.step;
    return Number.isFinite(count) && count > 0 ? this.step : 1;
  }

  private _setAttribute(name: string, value: AngleNumber): void {
    if (value == null) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }
  private _renderSize(): void {
    this._sizeStyle.textContent = `:host { width: var(--dsk-angle-size, ${this.size}px); height: var(--dsk-angle-size, ${this.size}px); }`;
  }
  private _buildSegments(): void {
    this._tracks.replaceChildren();
    this._trackPaths = [];
    for (let index = 0; index < this.segments; index++) {
      const track = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      track.setAttribute('part', 'track');
      this._tracks.append(track);
      this._trackPaths.push(track);
    }
  }
  private _render(): void {
    if (this._trackPaths.length !== this.segments) this._buildSegments();
    const min = toDegrees(this.min, this.unit);
    const max = toDegrees(this.max, this.unit);
    const span = 360 / this.segments;
    for (let index = 0; index < this.segments; index++) {
      const track = this._trackPaths[index];
      if (!track) continue;
      const angle = index * span;
      const major = Math.abs(angle % 90) < 1e-7;
      const start = anglePoint(angle, major ? 74 : 79);
      const end = anglePoint(angle, 85);
      track.setAttribute('d', `M ${start.join(' ')} L ${end.join(' ')}`);
      track.style.strokeWidth = major ? '2' : '1';
      track.style.opacity = angle < min || angle > max ? '0.25' : '1';
    }
    this._fill.setAttribute('d', sectorPath(min, this.degrees));
    this._fill.style.display = this.degrees > min ? '' : 'none';
    const start = anglePoint(this.degrees, 44);
    const end = anglePoint(this.degrees, 77);
    this._needle.setAttribute('x1', String(start[0]));
    this._needle.setAttribute('y1', String(start[1]));
    this._needle.setAttribute('x2', String(end[0]));
    this._needle.setAttribute('y2', String(end[1]));
    for (const [index, label] of this._labels.entries()) {
      const value = fromDegrees(index * 90, this.unit);
      label.textContent =
        this.unit === 'deg' || this.unit === 'pi'
          ? formatAngle(value, this.unit)
          : String(Number(value.toFixed(3)));
    }
    if (this.hasAttribute('color'))
      this._container.style.setProperty('--dsk-angle-active-color', this.color);
    else this._container.style.removeProperty('--dsk-angle-active-color');
    this._output.textContent = this.formattedValue;
    // Native increments use step indices; ARIA exposes the selected angle unit.
    this._input.min = '0';
    this._input.max = String((this.max - this.min) / this._nativeScale);
    this._input.value = String((this.value - this.min) / this._nativeScale);
    this._input.setAttribute('aria-valuemin', String(this.min));
    this._input.setAttribute('aria-valuemax', String(this.max));
    this._input.setAttribute('aria-valuenow', String(this.value));
    this._input.disabled = this.disabled;
    this._input.setAttribute(
      'aria-label',
      this.getAttribute('aria-label') || 'Angle',
    );
    this._input.setAttribute('aria-readonly', String(this.readOnly));
    this._input.setAttribute('aria-valuetext', this.formattedValue);
    this._internals.ariaDisabled = String(this.disabled);
    this._positionMarker();
  }
  private readonly _positionMarker = (): void => {
    const rect = this._container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const style = getComputedStyle(this._container);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    if (!(width > 0 && height > 0)) return;
    this._output.style.removeProperty('font-size');
    const textWidth = Math.max(
      this._output.getComputedTextLength(),
      this._output.getBBox().width,
    );
    if (textWidth > 80) {
      const fontSize = parseFloat(getComputedStyle(this._output).fontSize);
      this._output.style.fontSize = `${(fontSize * 78) / textWidth}px`;
    }
    const radius = (Math.min(width, height) * 77) / 240;
    const radians = (this.degrees * Math.PI) / 180;
    const ratio = window.devicePixelRatio || 1;
    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    const rawX = width / 2 + radius * Math.sin(radians);
    const rawY = height / 2 - radius * Math.cos(radians);
    const x =
      (Math.round((rect.left + rawX * scaleX) * ratio) / ratio - rect.left) /
      scaleX;
    const y =
      (Math.round((rect.top + rawY * scaleY) * ratio) / ratio - rect.top) /
      scaleY;
    this._marker.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  };

  private _point(
    event: PointerEvent,
  ): { angle: number; radius: number } | undefined {
    const matrix = this._dial.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
      matrix.inverse(),
    );
    const x = point.x - 120;
    const y = point.y - 120;
    return { angle: pointerDegrees(x, y), radius: Math.hypot(x, y) };
  }
  private _setUserValue(value: number): boolean {
    const previous = this.value;
    this._updating = true;
    this.setAttribute(
      'value',
      String(clampAngle(cleanAngle(value), this.min, this.max)),
    );
    this._updating = false;
    this._render();
    return previous !== this.value;
  }
  private _setUserDegrees(degrees: number): void {
    const value = snapAngle(
      fromDegrees(degrees, this.unit),
      this.min,
      this.max,
      this.step,
    );
    if (this._setUserValue(value)) this._emit('input');
  }
  private _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }
  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (!this._editable || this._drag || event.button !== 0 || !event.isPrimary)
      return;
    const point = this._point(event);
    if (!point || point.radius < 44) return;
    event.preventDefault();
    this.focus({ preventScroll: true });
    const marker = this._marker.getBoundingClientRect();
    const grabbedMarker =
      Math.hypot(
        event.clientX - marker.left - marker.width / 2,
        event.clientY - marker.top - marker.height / 2,
      ) <=
      Math.max(marker.width, marker.height) / 2 + 4;
    let angle = point.angle;
    if (
      angle < 1e-7 &&
      toDegrees(this.max, this.unit) >= 360 - 1e-7 &&
      (this.min > 0 || this.degrees > 180)
    )
      angle = 360;
    if (grabbedMarker) angle = this.degrees;
    this._drag = {
      pointerId: event.pointerId,
      start: this.value,
      accumulated: clampAngle(
        angle,
        toDegrees(this.min, this.unit),
        toDegrees(this.max, this.unit),
      ),
      previous: point.angle,
    };
    this._nativeStart = undefined;
    this._container.setPointerCapture(event.pointerId);
    if (!grabbedMarker) this._setUserDegrees(this._drag.accumulated);
  };
  private _movePointer(event: PointerEvent): void {
    const drag = this._drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = this._point(event);
    if (!point || point.radius < 44) {
      drag.previous = undefined;
      return;
    }
    if (drag.previous === undefined) {
      drag.previous = point.angle;
      return;
    }
    const next = drag.accumulated + angleDelta(drag.previous, point.angle);
    drag.accumulated = this._bounded
      ? clampAngle(
          next,
          toDegrees(this.min, this.unit),
          toDegrees(this.max, this.unit),
        )
      : wrapAngle(next, 360);
    drag.previous = point.angle;
    this._setUserDegrees(drag.accumulated);
  }
  private readonly _onPointerMove = (event: PointerEvent): void => {
    this._movePointer(event);
  };
  private readonly _onPointerUp = (event: PointerEvent): void => {
    if (this._drag?.pointerId !== event.pointerId) return;
    this._movePointer(event);
    const drag = this._releaseDrag();
    if (drag && drag.start !== this.value) this._emit('change');
  };
  private readonly _onPointerCancel = (event: PointerEvent): void => {
    if (this._drag?.pointerId === event.pointerId) this._cancelDrag(true);
  };
  private _releaseDrag(): AngleDrag | undefined {
    const drag = this._drag;
    this._drag = undefined;
    if (drag && this._container.hasPointerCapture(drag.pointerId))
      this._container.releasePointerCapture(drag.pointerId);
    return drag;
  }
  private _cancelDrag(emit: boolean): void {
    const drag = this._releaseDrag();
    if (drag && this._setUserValue(drag.start) && emit) this._emit('input');
  }
  private readonly _onWindowBlur = (): void => {
    this._cancelDrag(true);
  };
  private readonly _onFocusOut = (): void => {
    queueMicrotask(() => {
      if (this.isConnected && !this.matches(':focus-within'))
        this._cancelDrag(true);
    });
  };
  private readonly _onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (this._drag) {
        event.preventDefault();
        this._cancelDrag(true);
      }
      return;
    }
    if (
      ![
        'ArrowLeft',
        'ArrowDown',
        'ArrowRight',
        'ArrowUp',
        'PageUp',
        'PageDown',
        'Home',
        'End',
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    if (
      !this._editable ||
      this._drag ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    let value = this.value;
    const step =
      this.step * (event.shiftKey || event.key.startsWith('Page') ? 10 : 1);
    switch (event.key) {
      case 'Home':
        value = this.min;
        break;
      case 'End':
        value = this.max;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
      case 'PageDown':
        value -= step;
        break;
      default:
        value += step;
    }
    if (!this._bounded && event.key !== 'Home' && event.key !== 'End')
      value = wrapAngle(cleanAngle(value), this.max);
    if (this._setUserValue(value)) {
      this._emit('input');
      this._emit('change');
    }
  };
  private readonly _onNativeInput = (event: Event): void => {
    event.stopPropagation();
    if (!this._editable) {
      this._render();
      return;
    }
    this._nativeStart ??= this.value;
    if (
      this._setUserValue(
        snapAngle(
          this.min + Number(this._input.value) * this._nativeScale,
          this.min,
          this.max,
          this.step,
        ),
      )
    )
      this._emit('input');
  };
  private readonly _onNativeChange = (event: Event): void => {
    event.stopPropagation();
    const start = this._nativeStart;
    this._nativeStart = undefined;
    if (this._editable && start !== undefined && start !== this.value)
      this._emit('change');
    this._render();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-angle': DskAngle;
  }
}
