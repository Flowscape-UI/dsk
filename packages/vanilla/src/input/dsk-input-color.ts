import checkerboardSvg from '../../assets/patterns/checkerboard.svg?raw';
import colorHandleSvg from '../../assets/icons/input-color-handle.svg?raw';
import { DskInputHex } from './dsk-input-hex.ts';
import { formatHex, parseHex } from './helpers/hex.ts';
import type { HexFormat } from './helpers/hex.ts';
import { DskInput } from './dsk-input.ts';
import { evaluateHexExpression } from './helpers/hex-expression.ts';
import { stepHexValue } from './helpers/hex-stepping.ts';
import {
  clampNumber,
  type NumericOptions,
  type NumericValue,
} from './helpers/numbers.ts';
import alphaHandleSvg from '../../assets/icons/input-alpha-handle.svg?raw';

export type ColorFormat = 6 | 8;
export type AlphaMode = 'hex' | 'percent';

const handleSvg = colorHandleSvg.replace(
  '__DSK_CHECKERBOARD__',
  'data:image/svg+xml,' + encodeURIComponent(checkerboardSvg),
);

/** RGB/RGBA input with a live swatch over an SVG transparency checkerboard. */
export class DskInputColor extends DskInputHex {
  static override readonly observedAttributes = [
    ...DskInputHex.observedAttributes.filter((name) => name !== 'hex'),
    'format',
    'alpha-mode',
  ];

  private readonly _alpha: DskInput;
  private _alphaListeners: AbortController | undefined;
  private _alphaByte = 'FF';
  private _rgbDraft: { text: string; value: string } | undefined;
  private _editingAlpha = false;

  constructor() {
    super();
    this._alpha = new DskInput();
    this._alpha.part.add('alpha');
    this._alpha.setAttribute(
      'exportparts',
      'input:alpha-input,handle:alpha-handle',
    );
    this._alpha.setAttribute('aria-label', 'Opacity percentage');
    this._alpha.min = 0;
    this._alpha.max = 100;
    this._alpha.step = 1;
    const style = document.createElement('style');
    style.textContent = `
      [part~="swatch"] {
        width: var(--dsk-input-swatch-size, 16px);
        height: var(--dsk-input-swatch-size, 16px);
        border-radius: 2px;
        overflow: hidden;
      }
      [part~="swatch"] > svg { width: 100%; height: 100%; flex: none; }
      dsk-input[part="alpha"] {
        flex: 0 0 var(--dsk-input-alpha-width, 76px); width: var(--dsk-input-alpha-width, 76px);
        height: 100%; min-width: 0; border-left: var(--dsk-input-border, 1px solid #a6afbf);
        --dsk-input-handle-width: 24px;
      }
      dsk-input[part="alpha"]::part(container) { border: 0; border-radius: 0; flex-direction: row-reverse; box-shadow: none; }
      dsk-input[part="alpha"]::part(handle) { color: inherit; }
      dsk-input[part="alpha"]::part(input) { padding: 0 2px; text-align: right; }
    `;
    this.shadowRoot!.append(style);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._alphaListeners?.abort();
    this._alphaListeners = new AbortController();
    const options = { signal: this._alphaListeners.signal };
    this._alpha.addEventListener('input', this._onAlphaInput, options);
    this._alpha.addEventListener('change', this._onAlphaChange, options);
    this._alpha.addEventListener('keydown', this._onAlphaKeyDown, {
      ...options,
      capture: true,
    });
    this._alpha.addEventListener('beforeinput', this._onAlphaHistory, {
      ...options,
      capture: true,
    });
  }

  override disconnectedCallback(): void {
    this._alphaListeners?.abort();
    if (this._alphaDragging) this.cancelUserValue();
    super.disconnectedCallback();
  }

  private get _alphaDragging(): boolean {
    return Boolean(this._alpha?.shadowRoot?.querySelector('[data-dragging]'));
  }

  private _stopAlphaDrag(): void {
    const current = this._alpha.value;
    const readOnly = this._alpha.readOnly;
    // Equal value assignments preserve controlled drags. End the child's gesture
    // explicitly before establishing its new baseline, without emitting an edit.
    this._alpha.readOnly = true;
    this._alpha.value = current;
    this._alpha.readOnly = readOnly;
  }

  override blur(): void {
    this._alpha.blur();
    super.blur();
  }

  protected override parseValue(value: NumericValue): number {
    if (
      this._splitAlpha &&
      typeof value === 'string' &&
      this._rgbDraft?.value === value &&
      !Number.isFinite(parseHex(this._rgbDraft.text, 6))
    )
      return NaN;
    return super.parseValue(value);
  }

  get alphaMode(): AlphaMode {
    return this.getAttribute('alpha-mode') === 'percent' ? 'percent' : 'hex';
  }
  set alphaMode(value: AlphaMode | null | undefined) {
    if (value == null) this.removeAttribute('alpha-mode');
    else this.setAttribute('alpha-mode', value);
  }

  private get _splitAlpha(): boolean {
    return this.format === 8 && this.alphaMode === 'percent';
  }

  protected override normalizeValue(value: NumericValue): string {
    this._rgbDraft = undefined;
    if (this._alphaDragging) this._stopAlphaDrag();
    return super.normalizeValue(value);
  }

  protected override editorText(value: string): string {
    if (!this._splitAlpha) return value;
    if (this._rgbDraft?.value === value) return this._rgbDraft.text;
    return /^[\da-f]{8}$/i.test(value) ? value.slice(0, 6) : value;
  }

  protected override editorValue(text: string): string {
    if (!this._splitAlpha) return text;
    const rgb = formatHex(parseHex(text, 6), 6);
    const value = rgb ? rgb + this._alphaByte : text;
    this._rgbDraft = { text, value };
    return value;
  }

  protected override evaluateValue(text: string): number {
    if (this._splitAlpha && this._rgbDraft?.value === text) {
      const rank = evaluateHexExpression(this._rgbDraft.text, 6);
      return Number.isFinite(rank)
        ? parseHex(
            formatHex(clampNumber(rank, { min: 0, max: 0xffffff }), 6) +
              this._alphaByte,
            8,
          )
        : NaN;
    }
    return super.evaluateValue(text);
  }

  protected override getAdjustmentOptions(): NumericOptions {
    const options = super.getAdjustmentOptions();
    if (!this._splitAlpha) return options;
    const candidate = clampNumber(
      Number.parseInt(this._alphaByte, 16) * 0x1000000,
      options,
    );
    const offset = Math.floor(candidate / 0x1000000) * 0x1000000;
    return {
      ...options,
      min: Math.max(options.min, offset),
      max: Math.min(options.max, offset + 0xffffff),
    };
  }

  protected override adjustValue(
    start: number,
    count: number,
    options: NumericOptions,
  ): number {
    if (!this._splitAlpha) return super.adjustValue(start, count, options);
    const offset = Math.floor(options.min / 0x1000000) * 0x1000000;
    return (
      offset +
      stepHexValue(
        start - offset,
        count,
        { ...options, min: options.min - offset, max: options.max - offset },
        6,
      )
    );
  }

  protected override onConfigurationChanged(name: string): void {
    if (name === 'alpha-mode') this.refreshValue(this.value);
    else super.onConfigurationChanged(name);
  }

  get format(): ColorFormat {
    return this.resolveFormat(this.getAttribute('format'));
  }

  set format(value: ColorFormat | `${ColorFormat}` | null | undefined) {
    super.hex = value;
  }

  override get hex(): ColorFormat {
    return this.format;
  }

  override set hex(value: HexFormat | `${HexFormat}` | null | undefined) {
    super.hex = value;
  }

  protected override get formatAttribute(): string {
    return 'format';
  }

  protected override resolveFormat(value: string | null): ColorFormat {
    return value?.trim() === '8' ? 8 : 6;
  }

  protected override get defaultHandleSvg(): string {
    return handleSvg;
  }

  protected override renderDefaultHandle(element: HTMLElement): void {
    element.part.add('swatch');
    const color = element.querySelector<SVGRectElement>('[part="color"]');
    if (!color) return;
    const value = formatHex(this.parseValue(this.value), this.format);
    color.setAttribute('fill', value ? '#' + value : 'transparent');
    if (value && this.format === 8) this._alphaByte = value.slice(6);
    if (!this._alpha) return;
    if (!this._splitAlpha) {
      this._alpha.remove();
      return;
    }
    const container = this.shadowRoot!.querySelector('[part="container"]')!;
    if (this._alpha.parentNode !== container) {
      container.append(this._alpha);
      // Use the percent glyph as the right-hand drag handle, with inherited text color.
      const icon = this._alpha.shadowRoot!.querySelector(
        '.dsk-input-icon-wrapper',
      )!;
      icon.innerHTML = alphaHandleSvg;
    }
    const editor =
      this.shadowRoot!.querySelector<HTMLInputElement>('[part="input"]')!;
    if (this._alphaDragging && (editor.disabled || this.readOnly)) {
      this._stopAlphaDrag();
      this.cancelUserValue();
      return;
    }
    this._alpha.disabled = editor.disabled;
    this._alpha.readOnly = this.readOnly;
    this._alpha.selectOnFocus = this.selectOnFocus;
    if (
      !this._editingAlpha &&
      Math.round((this._alpha.valueAsNumber * 255) / 100) !==
        Number.parseInt(this._alphaByte, 16)
    ) {
      this._alpha.value = Number(
        ((Number.parseInt(this._alphaByte, 16) * 100) / 255).toFixed(2),
      );
    }
  }

  private readonly _onAlphaInput = (event: Event): void => {
    event.stopPropagation();
    if (!this._splitAlpha || this._alpha.disabled || this.readOnly) return;
    const percent = this._alpha.valueAsNumber;
    if (!Number.isFinite(percent)) return;
    const rgb = /^[\da-f]{8}$/i.test(this.value)
      ? this.value.slice(0, 6)
      : '000000';
    const bounds = this.getValueOptions();
    const rgbRank = parseHex(rgb, 6);
    const min = Math.max(0, Math.ceil((bounds.min - rgbRank) / 0x1000000));
    const max = Math.min(255, Math.floor((bounds.max - rgbRank) / 0x1000000));
    if (min > max) return;
    const alpha = clampNumber(
      Math.round((clampNumber(percent, { min: 0, max: 100 }) * 255) / 100),
      { min, max },
    )
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
    const next = super.normalizeValue(rgb + alpha);
    this._editingAlpha = true;
    try {
      if (next !== this.value) this.updateUserValue(next);
    } finally {
      this._editingAlpha = false;
    }
  };

  private readonly _onAlphaChange = (event: Event): void => {
    event.stopPropagation();
    this._onAlphaInput(event);
    this.commitUserValue();
  };

  private readonly _onAlphaKeyDown = (event: KeyboardEvent): void => {
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.isComposing &&
      (event.code === 'KeyZ' ||
        ((!event.code || event.code === 'Unidentified') &&
          event.key.toLowerCase() === 'z'))
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (!this._alphaDragging) this.restoreUserHistory(event.shiftKey);
    }
  };

  private readonly _onAlphaHistory = (event: InputEvent): void => {
    if (
      event.inputType === 'historyUndo' ||
      event.inputType === 'historyRedo'
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (!this._alphaDragging)
        this.restoreUserHistory(event.inputType === 'historyRedo');
    }
  };

  protected override get accessibleLabel(): string {
    return 'Color value';
  }

  protected override get upgradeProperties(): readonly string[] {
    // Upgrade the HEX alias first, then let the canonical format take precedence.
    return [
      'hex',
      'format',
      'alphaMode',
      ...super.upgradeProperties.filter((name) => name !== 'hex'),
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-input-color': DskInputColor;
  }
}
