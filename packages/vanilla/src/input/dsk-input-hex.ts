import inputHexHandleSvg from '../../assets/icons/input-hex-handle.svg?raw';
import { evaluateHexExpression } from './helpers/hex-expression.ts';
import { stepHexValue } from './helpers/hex-stepping.ts';
import {
  convertHex,
  formatHex,
  getHexFormat,
  hexMax,
  parseHex,
} from './helpers/hex.ts';
import type { HexFormat } from './helpers/hex.ts';
import { DskInputBase } from './input-base.ts';
import { getOptions, parseNumber } from './helpers/numbers.ts';
import type { NumericOptions, NumericValue } from './helpers/numbers.ts';

/** HEX input that fills channels red-first and drains them in reverse order. */
export class DskInputHex extends DskInputBase {
  static override readonly observedAttributes = [
    ...DskInputBase.observedAttributes,
    'hex',
  ];

  private _valueFormat: HexFormat = 6;
  private _initialFormat: HexFormat | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this._initialFormat ??= this.hex;
  }

  override formResetCallback(): void {
    this.value = convertHex(
      this.initialValue,
      this._initialFormat ?? this.hex,
      this.hex,
    );
  }

  get hex(): HexFormat {
    return this.resolveFormat(this.getAttribute(this.formatAttribute));
  }

  set hex(value: HexFormat | `${HexFormat}` | null | undefined) {
    if (value === null || value === undefined)
      this.removeAttribute(this.formatAttribute);
    else this.setAttribute(this.formatAttribute, String(value));
  }

  protected get formatAttribute(): string {
    return 'hex';
  }

  protected resolveFormat(value: string | null): HexFormat {
    return getHexFormat(value);
  }

  protected override parseValue(value: NumericValue): number {
    if (typeof value === 'number') return Number.isInteger(value) ? value : NaN;
    return parseHex(value ?? '', this.hex);
  }

  protected override formatValue(value: number): string {
    return formatHex(value, this.hex);
  }

  protected override evaluateValue(text: string): number {
    return evaluateHexExpression(text, this.hex);
  }

  protected override adjustValue(
    start: number,
    count: number,
    options: NumericOptions,
  ): number {
    return stepHexValue(start, count, options, this.hex);
  }

  protected override normalizeValue(value: NumericValue): string {
    this._valueFormat = this.hex;
    return super.normalizeValue(value);
  }

  protected override getValueOptions(): NumericOptions {
    const min = this.parseValue(this.min);
    const max = this.parseValue(this.max);
    const options = getOptions({
      min: Number.isFinite(min) ? min : 0,
      max: Number.isFinite(max) ? max : hexMax(this.hex),
      step: this.getKeyboardStep(this.step, 1),
      progression: this.progression,
      loopAfter: this.loopAfter,
      loopAfterMin: this.loopAfterMin,
      loopAfterMax: this.loopAfterMax,
    });
    return options;
  }

  protected override getKeyboardStep(
    value: NumericValue,
    fallback: number,
  ): number {
    const step = parseNumber(value);
    return Number.isSafeInteger(step) && step > 0 ? step : fallback;
  }

  protected override get defaultHandleSvg(): string {
    return inputHexHandleSvg;
  }

  protected override get accessibleLabel(): string {
    return 'Hexadecimal value';
  }

  protected override get invalidMessage(): string {
    return `Enter up to ${this.hex} hexadecimal digits or an integer arithmetic expression.`;
  }

  protected override get upgradeProperties(): readonly string[] {
    return ['hex', ...super.upgradeProperties];
  }

  protected override onConfigurationChanged(name: string): void {
    if (name === this.formatAttribute) {
      // During HTML upgrade, the value attribute may still await its callback.
      if (this.value === '' && this.getAttribute('value')) {
        this.refreshValue(this.getAttribute('value'));
        return;
      }
      this.refreshValue(convertHex(this.value, this._valueFormat, this.hex));
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-input-hex': DskInputHex;
  }
}
