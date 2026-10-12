import {
  type ColorNumber,
  hsvToHex,
  normalizeHue,
  percentage,
  positiveNumber,
} from './helpers/color-model.ts';

interface Selection {
  saturation: number;
  brightness: number;
}

interface Drag extends Selection {
  pointerId: number;
}

/** A standalone, square HSV saturation/brightness selection surface. */
export class DskColorArea extends HTMLElement {
  static readonly observedAttributes = [
    'hue',
    'saturation',
    'brightness',
    'step',
    'width',
    'height',
    'disabled',
    'readonly',
  ];

  private readonly _surface: HTMLDivElement;
  private readonly _marker: HTMLDivElement;
  private readonly _saturation: HTMLInputElement;
  private readonly _brightness: HTMLInputElement;
  private readonly _requestedSize: HTMLStyleElement;
  private readonly _squareSize: HTMLStyleElement;
  private readonly _internals: ElementInternals;
  private _listeners: AbortController | undefined;
  private _resizeObserver: ResizeObserver | undefined;
  private _mutationObserver: MutationObserver | undefined;
  private _frame: number | undefined;
  private _side = 0;
  private _updating = false;
  private _drag: Drag | undefined;
  private _rangeStart: Selection | undefined;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._internals.role = 'group';
    this._internals.ariaLabel = 'Color area';
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
          box-sizing: border-box !important;
          vertical-align: middle;
          aspect-ratio: 1;
          padding: 0;
          border: 0;
          border-radius: var(--dsk-color-area-radius, 4px);
        }
        :host([hidden]) { display: none !important; }
        [part="surface"] {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          touch-action: none;
          user-select: none;
          cursor: crosshair;
          background-image: linear-gradient(to top, #000, transparent),
            linear-gradient(to right, #fff, transparent);
        }
        :host(:focus-within) [part="surface"] {
          outline: 2px solid var(--dsk-color-area-focus-color, #557be8);
          outline-offset: 3px;
        }
        :host([disabled]) [part="surface"] { cursor: not-allowed; }
        :host([readonly]) [part="surface"] { cursor: default; }
        [part="marker"] {
          position: absolute;
          left: 0;
          top: 0;
          width: var(--dsk-color-area-marker-size, 14px);
          height: var(--dsk-color-area-marker-size, 14px);
          box-sizing: border-box;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 1px #0009;
          transform: translate(-50%, -50%);
          will-change: transform;
          pointer-events: none;
        }
        .dsk-visually-hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
          border: 0;
        }
      </style>
      <style id="requested-size"></style>
      <style id="square-size"></style>
      <div part="surface"><div part="marker" aria-hidden="true"></div></div>
      <span id="instructions" class="dsk-visually-hidden">Left and right adjust saturation. Up and down adjust brightness. Hold Shift for larger steps. Escape cancels a drag.</span>
      <input class="dsk-visually-hidden" part="saturation" type="range"
        min="0" max="100" step="any" aria-label="Saturation" aria-describedby="instructions">
      <input class="dsk-visually-hidden" part="brightness" type="range"
        min="0" max="100" step="any" aria-label="Brightness" aria-describedby="instructions">
    `;
    this._surface = this._element('[part="surface"]', HTMLDivElement);
    this._marker = this._element('[part="marker"]', HTMLDivElement);
    this._saturation = this._element('[part="saturation"]', HTMLInputElement);
    this._brightness = this._element('[part="brightness"]', HTMLInputElement);
    this._requestedSize = this._element('#requested-size', HTMLStyleElement);
    this._squareSize = this._element('#square-size', HTMLStyleElement);
    this._render();
    this._renderRequestedSize();
  }

  private _element<T extends Element>(selector: string, type: new () => T): T {
    const element = this.shadowRoot?.querySelector(selector);
    if (!(element instanceof type))
      throw new Error(`Missing color area element: ${selector}`);
    return element;
  }

  connectedCallback(): void {
    for (const property of [
      'hue',
      'saturation',
      'brightness',
      'step',
      'width',
      'height',
      'disabled',
      'readOnly',
    ] as const) {
      if (Object.hasOwn(this, property)) {
        const value: unknown = this[property];
        Reflect.deleteProperty(this, property);
        Reflect.set(this, property, value);
      }
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._surface.addEventListener('pointerdown', this._onPointerDown, options);
    this._surface.addEventListener('pointermove', this._onPointerMove, options);
    this._surface.addEventListener('pointerup', this._onPointerUp, options);
    this._surface.addEventListener(
      'pointercancel',
      this._onPointerCancel,
      options,
    );
    this._surface.addEventListener(
      'lostpointercapture',
      this._onPointerCancel,
      options,
    );
    this.addEventListener('keydown', this._onKeyDown, options);
    this.addEventListener('focusout', this._onFocusOut, options);
    for (const input of [this._saturation, this._brightness]) {
      input.addEventListener('input', this._onRangeInput, options);
      input.addEventListener('change', this._onRangeChange, options);
    }
    window.addEventListener('blur', this._onWindowBlur, options);
    window.addEventListener('resize', this._scheduleSize, options);
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver((entries) => {
      if (
        entries.some(
          (entry) =>
            entry.target !== this ||
            Math.abs(this.offsetWidth - this._side) > 1 ||
            Math.abs(this.offsetHeight - this._side) > 1,
        )
      )
        this._scheduleSize();
    });
    this._resizeObserver.observe(this);
    if (this.parentElement) this._resizeObserver.observe(this.parentElement);
    this._mutationObserver?.disconnect();
    this._mutationObserver = new MutationObserver(this._scheduleSize);
    this._mutationObserver.observe(this, {
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden'],
    });
    for (
      let ancestor: Element | null = this.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      this._mutationObserver.observe(ancestor, {
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden'],
      });
    }
    this._render();
    this._measureSquare();
  }

  disconnectedCallback(): void {
    this._cancelDrag(false);
    this._rangeStart = undefined;
    this._listeners?.abort();
    this._listeners = undefined;
    this._resizeObserver?.disconnect();
    this._mutationObserver?.disconnect();
    if (this._frame !== undefined) cancelAnimationFrame(this._frame);
    this._frame = undefined;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue || this._updating) return;
    if (name === 'width' || name === 'height') {
      this._renderRequestedSize();
      this._scheduleSize();
      return;
    }
    if ((name === 'disabled' || name === 'readonly') && !this._editable) {
      this._cancelDrag(false);
    } else {
      this._releaseDrag();
    }
    this._rangeStart = undefined;
    this._render();
  }

  get hue(): number {
    return normalizeHue(this.getAttribute('hue'));
  }
  set hue(value: ColorNumber) {
    this._setAttribute('hue', value);
  }
  get saturation(): number {
    return percentage(this.getAttribute('saturation'));
  }
  set saturation(value: ColorNumber) {
    this._setAttribute('saturation', value);
  }
  get brightness(): number {
    return percentage(this.getAttribute('brightness'));
  }
  set brightness(value: ColorNumber) {
    this._setAttribute('brightness', value);
  }
  get step(): number {
    return positiveNumber(this.getAttribute('step'), 1);
  }
  set step(value: ColorNumber) {
    this._setAttribute('step', value);
  }
  get width(): number {
    return positiveNumber(
      this.getAttribute('width'),
      positiveNumber(this.getAttribute('height'), 208),
    );
  }
  set width(value: ColorNumber) {
    this._setAttribute('width', value);
  }
  get height(): number {
    return positiveNumber(
      this.getAttribute('height'),
      positiveNumber(this.getAttribute('width'), 208),
    );
  }
  set height(value: ColorNumber) {
    this._setAttribute('height', value);
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
  get color(): string {
    return hsvToHex(this.hue, this.saturation, this.brightness);
  }

  override focus(options?: FocusOptions): void {
    this._saturation.focus(options);
  }
  override blur(): void {
    this._saturation.blur();
    this._brightness.blur();
    super.blur();
  }

  private get _editable(): boolean {
    return !this.disabled && !this.readOnly;
  }

  private _setAttribute(name: string, value: ColorNumber): void {
    if (value == null) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }

  private _render(): void {
    this._surface.style.backgroundColor = `hsl(${this.hue} 100% 50%)`;
    this._marker.style.backgroundColor = this.color;
    this._positionMarker();
    this._saturation.value = String(this.saturation);
    this._brightness.value = String(this.brightness);
    this._internals.ariaDisabled = String(this.disabled);
    for (const input of [this._saturation, this._brightness]) {
      input.disabled = this.disabled;
      input.setAttribute('aria-readonly', String(this.readOnly));
      input.setAttribute('aria-valuetext', `${input.value}%, ${this.color}`);
    }
  }

  private _positionMarker(): void {
    const rect = this._surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const style = getComputedStyle(this._surface);
    const scaleX = rect.width / parseFloat(style.width);
    const scaleY = rect.height / parseFloat(style.height);
    const ratio = window.devicePixelRatio || 1;
    // Keep the ring at the same device-pixel phase as it moves. Only its
    // display position is snapped; the selected HSV channels keep their precision.
    const x =
      (Math.round((rect.left + (this.saturation / 100) * rect.width) * ratio) /
        ratio -
        rect.left) /
      scaleX;
    const y =
      (Math.round(
        (rect.top + (1 - this.brightness / 100) * rect.height) * ratio,
      ) /
        ratio -
        rect.top) /
      scaleY;
    this._marker.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }

  private _renderRequestedSize(): void {
    this._requestedSize.textContent = `:host {
      width: var(--dsk-color-area-width, ${this.width}px);
      height: var(--dsk-color-area-height, ${this.hasAttribute('height') ? `${this.height}px` : 'auto'});
    }`;
  }

  private readonly _scheduleSize = (): void => {
    if (!this.isConnected || this._frame !== undefined) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = undefined;
      this._measureSquare();
    });
  };

  private _measureSquare(): void {
    if (!this.isConnected) return;
    // Measure the author's requested box, never the previously enforced square.
    this._squareSize.textContent = '';
    const computed = getComputedStyle(this);
    if (computed.display === 'none' || !this.getClientRects().length) return;
    // Layout dimensions exclude transforms, preventing resize feedback under scale().
    const side = Math.max(
      parseFloat(computed.width) || 0,
      parseFloat(computed.height) || 0,
    );
    if (!(side > 0)) return;
    this._side = side;
    this._squareSize.textContent = `:host {
      width: ${side}px !important; height: ${side}px !important;
      min-width: ${side}px !important; min-height: ${side}px !important;
      max-width: ${side}px !important; max-height: ${side}px !important;
    }`;
    this._positionMarker();
  }

  private _selection(): Selection {
    return { saturation: this.saturation, brightness: this.brightness };
  }

  private _differs(selection: Selection): boolean {
    return (
      selection.saturation !== this.saturation ||
      selection.brightness !== this.brightness
    );
  }

  private _setSelection(saturation: number, brightness: number): boolean {
    const before = this._selection();
    this._updating = true;
    this.setAttribute('saturation', String(percentage(saturation)));
    this.setAttribute('brightness', String(percentage(brightness)));
    this._updating = false;
    this._render();
    return this._differs(before);
  }

  private _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }

  private _selectPointer(event: PointerEvent): void {
    const rect = this._surface.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const saturation =
      Math.round(
        percentage(((event.clientX - rect.left) / rect.width) * 100) * 10000,
      ) / 10000;
    const brightness =
      Math.round(
        percentage(100 - ((event.clientY - rect.top) / rect.height) * 100) *
          10000,
      ) / 10000;
    if (this._setSelection(saturation, brightness)) this._emit('input');
  }

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (!this._editable || this._drag || event.button !== 0 || !event.isPrimary)
      return;
    event.preventDefault();
    this.focus({ preventScroll: true });
    this._rangeStart = undefined;
    this._drag = { pointerId: event.pointerId, ...this._selection() };
    this._surface.setPointerCapture(event.pointerId);
    this._selectPointer(event);
  };

  private readonly _onPointerMove = (event: PointerEvent): void => {
    if (this._drag?.pointerId === event.pointerId) this._selectPointer(event);
  };

  private readonly _onPointerUp = (event: PointerEvent): void => {
    if (this._drag?.pointerId !== event.pointerId) return;
    this._selectPointer(event);
    const start = this._releaseDrag();
    if (start && this._differs(start)) this._emit('change');
  };

  private readonly _onPointerCancel = (event: PointerEvent): void => {
    if (this._drag?.pointerId === event.pointerId) this._cancelDrag(true);
  };

  private _releaseDrag(): Drag | undefined {
    const drag = this._drag;
    this._drag = undefined;
    if (drag && this._surface.hasPointerCapture(drag.pointerId)) {
      this._surface.releasePointerCapture(drag.pointerId);
    }
    return drag;
  }

  private _cancelDrag(emit: boolean): void {
    const start = this._releaseDrag();
    if (start && this._setSelection(start.saturation, start.brightness) && emit)
      this._emit('input');
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
      !this._editable ||
      this._drag ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    let saturation = this.saturation;
    let brightness = this.brightness;
    const step = this.step * (event.shiftKey ? 10 : 1);
    let target: HTMLInputElement;
    switch (event.key) {
      case 'ArrowLeft':
        saturation -= step;
        target = this._saturation;
        break;
      case 'ArrowRight':
        saturation += step;
        target = this._saturation;
        break;
      case 'ArrowDown':
        brightness -= step;
        target = this._brightness;
        break;
      case 'ArrowUp':
        brightness += step;
        target = this._brightness;
        break;
      case 'Home':
      case 'End':
        target =
          this.shadowRoot?.activeElement === this._brightness
            ? this._brightness
            : this._saturation;
        if (target === this._saturation)
          saturation = event.key === 'Home' ? 0 : 100;
        else brightness = event.key === 'Home' ? 0 : 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    target.focus({ preventScroll: true });
    this._rangeStart = undefined;
    if (this._setSelection(saturation, brightness)) {
      this._emit('input');
      this._emit('change');
    }
  };

  private readonly _onRangeInput = (event: Event): void => {
    event.stopPropagation();
    if (!this._editable) {
      this._render();
      return;
    }
    this._rangeStart ??= this._selection();
    const saturation = Number(this._saturation.value);
    const brightness = Number(this._brightness.value);
    if (this._setSelection(saturation, brightness)) this._emit('input');
  };

  private readonly _onRangeChange = (event: Event): void => {
    event.stopPropagation();
    const start = this._rangeStart;
    this._rangeStart = undefined;
    if (this._editable && start && this._differs(start)) this._emit('change');
    this._render();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-color-area': DskColorArea;
  }
}
