import { evaluateExpression } from './helpers/expression.ts';
import { DskInputBase } from './input-base.ts';
import { parseNumber } from './helpers/numbers.ts';
import type { NumericValue } from './helpers/numbers.ts';

export type { InputPositioning, InputTagPosition } from './input-base.ts';

/** Decimal input with the shared focus, drag, keyboard, and history behavior. */
export class DskInput extends DskInputBase {
  protected override parseValue(value: NumericValue): number {
    return parseNumber(value);
  }

  protected override formatValue(value: number): string {
    return String(value);
  }

  protected override evaluateValue(text: string): number {
    return evaluateExpression(text);
  }

  protected override get valueInputMode(): string {
    return 'decimal';
  }

  protected override get accessibleLabel(): string {
    return 'Numeric value';
  }

  protected override get invalidMessage(): string {
    return 'Enter a valid number or arithmetic expression.';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-input': DskInput;
  }
}
