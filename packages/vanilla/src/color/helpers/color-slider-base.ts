import {
  type ColorNumber,
  finiteNumber,
  positiveNumber,
} from './color-model.ts';

interface SliderDrag {
  pointerId: number;
  start: number;
}

/** Internal interaction and rendering shared only by the color sliders. */
export abstract class DskColorSliderBase extends HTMLElement {
  static readonly observedAttributes = [
    'step',
    'width',
    'height',
    'disabled',
    'readonly',
  ];

  protected abstract get channelAttribute(): 'hue' | 'alpha';
  protected abstract get channelMaximum(): number;
  protected abstract get channelDefault(): number;
  protected abstract get channelLabel(): string;
  protected abstract get markerColor(): string;
  protected abstract renderTrack(track: HTMLDivElement): void;

  private readonly _track: HTMLDivElement;
  private readonly _marker: HTMLDivElement;
  private readonly _input: HTMLInputElement;
  private readonly _sizeStyle: HTMLStyleElement;
  private readonly _internals: ElementInternals;
  private _listeners: AbortController | undefined;
  private _observer: ResizeObserver | undefined;
  private _drag: SliderDrag | undefined;
  private _nativeStart: number | undefined;
  private _updating = false;

  constructor() {
    super();
    this._internals = this.attachInternals();
    this._internals.role = 'group';
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host {
          display: inline-block; position: relative; vertical-align: middle;
          box-sizing: border-box; padding: 0; border: 0;
          border-radius: var(--dsk-color-slider-radius, 999px);
        }
        :host([hidden]) { display: none !important; }
        [part="track"] {
          position: absolute; inset: 0; border-radius: inherit;
          touch-action: none; user-select: none; cursor: pointer;
        }
        :host(:focus-within) [part="track"] {
          outline: 2px solid var(--dsk-color-slider-focus-color, #557be8);
          outline-offset: 3px;
        }
        :host([disabled]) [part="track"] { cursor: not-allowed; }
        :host([readonly]) [part="track"] { cursor: default; }
        [part="marker"] {
          position: absolute; left: 0; top: 0;
          width: var(--dsk-color-slider-marker-size, 14px);
          height: var(--dsk-color-slider-marker-size, 14px);
          box-sizing: border-box; border: 2px solid white; border-radius: 50%;
          box-shadow: 0 0 0 1px #0009;
          transform: translate(-50%, -50%); will-change: transform;
          pointer-events: none;
        }
        [part="input"] {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
        }
      </style>
      <style id="size"></style>
      <div part="track"><div part="marker" aria-hidden="true"></div></div>
      <input part="input" type="range" min="0" step="any">
    `;
    this._track = this._element('[part="track"]', HTMLDivElement);
    this._marker = this._element('[part="marker"]', HTMLDivElement);
    this._input = this._element('[part="input"]', HTMLInputElement);
    this._sizeStyle = this._element('#size', HTMLStyleElement);
    this._renderSize();
    this._render();
  }

  private _element<T extends Element>(selector: string, type: new () => T): T {
    const element = this.shadowRoot?.querySelector(selector);
    if (!(element instanceof type))
      throw new Error(`Missing color slider element: ${selector}`);
    return element;
  }

  connectedCallback(): void {
    for (const property of [
      this.channelAttribute,
      'color',
      'step',
      'width',
      'height',
      'disabled',
      'readOnly',
    ]) {
      if (Object.hasOwn(this, property)) {
        const value: unknown = Reflect.get(this, property);
        Reflect.deleteProperty(this, property);
        Reflect.set(this, property, value);
      }
    }
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._track.addEventListener('pointerdown', this._onPointerDown, options);
    this._track.addEventListener('pointermove', this._onPointerMove, options);
    this._track.addEventListener('pointerup', this._onPointerUp, options);
    this._track.addEventListener(
      'pointercancel',
      this._onPointerCancel,
      options,
    );
    this._track.addEventListener(
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
    this._observer.observe(this._track);
    this._observer.observe(this._marker);
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
    if (name === 'width' || name === 'height') {
      this._renderSize();
      return;
    }
    if ((name === 'disabled' || name === 'readonly') && !this._editable)
      this._cancelDrag(false);
    else this._releaseDrag();
    this._nativeStart = undefined;
    this._render();
  }

  protected get channelValue(): number {
    return Math.min(
      this.channelMaximum,
      Math.max(
        0,
        finiteNumber(
          this.getAttribute(this.channelAttribute),
          this.channelDefault,
        ),
      ),
    );
  }
  protected setNumericAttribute(name: string, value: ColorNumber): void {
    if (value == null) this.removeAttribute(name);
    else this.setAttribute(name, String(value));
  }
  get step(): number {
    return positiveNumber(this.getAttribute('step'), 1);
  }
  set step(value: ColorNumber) {
    this.setNumericAttribute('step', value);
  }
  get width(): number {
    return positiveNumber(this.getAttribute('width'), 208);
  }
  set width(value: ColorNumber) {
    this.setNumericAttribute('width', value);
  }
  get height(): number {
    return positiveNumber(this.getAttribute('height'), 16);
  }
  set height(value: ColorNumber) {
    this.setNumericAttribute('height', value);
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
  override focus(options?: FocusOptions): void {
    this._input.focus(options);
  }
  override blur(): void {
    this._input.blur();
    super.blur();
  }
  private get _editable(): boolean {
    return !this.disabled && !this.readOnly;
  }

  private _renderSize(): void {
    this._sizeStyle.textContent = `:host {
      width: var(--dsk-color-slider-width, ${this.width}px);
      height: var(--dsk-color-slider-height, ${this.height}px);
    }`;
  }
  private _render(): void {
    this._internals.ariaLabel = this.channelLabel;
    this._input.max = String(this.channelMaximum);
    this._input.setAttribute('aria-label', this.channelLabel);
    this.renderTrack(this._track);
    this.renderMarker(this._marker);
    this._input.value = String(this.channelValue);
    this._input.disabled = this.disabled;
    this._input.setAttribute('aria-readonly', String(this.readOnly));
    this._input.setAttribute(
      'aria-valuetext',
      `${this.channelValue}${this.channelAttribute === 'hue' ? ' degrees' : '%'}`,
    );
    this._internals.ariaDisabled = String(this.disabled);
    this._positionMarker();
  }

  protected renderMarker(marker: HTMLDivElement): void {
    marker.style.backgroundColor = this.markerColor;
  }

  private readonly _positionMarker = (): void => {
    const rect = this._track.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const style = getComputedStyle(this._track);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);
    if (!(width > 0 && height > 0)) return;
    const scaleX = rect.width / width;
    const inset = Math.min(
      parseFloat(getComputedStyle(this._marker).width) / 2,
      width / 2,
    );
    const ratio = window.devicePixelRatio || 1;
    const center =
      inset + ((width - inset * 2) * this.channelValue) / this.channelMaximum;
    const x =
      (Math.round((rect.left + center * scaleX) * ratio) / ratio - rect.left) /
      scaleX;
    // Only the moving axis needs pixel alignment. Keep the stationary axis
    // exactly centered so the ring cannot protrude above or below the track.
    const y = height / 2;
    this._marker.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  };

  private _setUserValue(value: number): boolean {
    const previous = this.channelValue;
    this._updating = true;
    this.setAttribute(
      this.channelAttribute,
      String(Math.min(this.channelMaximum, Math.max(0, value))),
    );
    this._updating = false;
    this._render();
    return previous !== this.channelValue;
  }
  private _emit(type: 'input' | 'change'): void {
    this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }
  private _selectPointer(event: PointerEvent): void {
    const rect = this._track.getBoundingClientRect();
    const diameter = this._marker.getBoundingClientRect().width;
    const travel = rect.width - diameter;
    if (travel <= 0) return;
    const value =
      ((event.clientX - rect.left - diameter / 2) / travel) *
      this.channelMaximum;
    if (this._setUserValue(Math.round(value * 10000) / 10000))
      this._emit('input');
  }
  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (!this._editable || this._drag || event.button !== 0 || !event.isPrimary)
      return;
    event.preventDefault();
    this.focus({ preventScroll: true });
    this._nativeStart = undefined;
    this._drag = { pointerId: event.pointerId, start: this.channelValue };
    this._track.setPointerCapture(event.pointerId);
    this._selectPointer(event);
  };
  private readonly _onPointerMove = (event: PointerEvent): void => {
    if (this._drag?.pointerId === event.pointerId) this._selectPointer(event);
  };
  private readonly _onPointerUp = (event: PointerEvent): void => {
    if (this._drag?.pointerId !== event.pointerId) return;
    this._selectPointer(event);
    const drag = this._releaseDrag();
    if (drag && drag.start !== this.channelValue) this._emit('change');
  };
  private readonly _onPointerCancel = (event: PointerEvent): void => {
    if (this._drag?.pointerId === event.pointerId) this._cancelDrag(true);
  };
  private _releaseDrag(): SliderDrag | undefined {
    const drag = this._drag;
    this._drag = undefined;
    if (drag && this._track.hasPointerCapture(drag.pointerId))
      this._track.releasePointerCapture(drag.pointerId);
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
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'PageUp',
        'PageDown',
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
    const step =
      this.step * (event.shiftKey || event.key.startsWith('Page') ? 10 : 1);
    let value = this.channelValue;
    switch (event.key) {
      case 'Home':
        value = 0;
        break;
      case 'End':
        value = this.channelMaximum;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
      case 'PageDown':
        value -= step;
        break;
      default:
        value += step;
    }
    this._nativeStart = undefined;
    if (this._setUserValue(Number(value.toFixed(10)))) {
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
    this._nativeStart ??= this.channelValue;
    if (this._setUserValue(Number(this._input.value))) this._emit('input');
  };
  private readonly _onNativeChange = (event: Event): void => {
    event.stopPropagation();
    const start = this._nativeStart;
    this._nativeStart = undefined;
    if (this._editable && start !== undefined && start !== this.channelValue)
      this._emit('change');
    this._render();
  };
}
