import { evaluateExpression } from './expression.ts';
import { parseHex, type HexFormat } from './hex.ts';

/** Evaluates decimal arithmetic with explicit #HEX or 0xHEX channel literals. */
export function evaluateHexExpression(
  source: string,
  format: HexFormat,
): number {
  if (source.length > 4096) return NaN;
  const literal = parseHex(source, format);
  if (!Number.isNaN(literal)) return literal;
  // An oversized HEX value must not silently become a decimal scalar.
  if (/^#?[\da-f]+$/i.test(source.trim())) return NaN;

  let invalid = false;
  const expression = source.replace(
    /(?:0x|#)[\da-f]+/gi,
    (token: string, offset: number): string => {
      const before = source.slice(0, offset).trimEnd().at(-1);
      const after = source.slice(offset + token.length).trimStart()[0];
      const value = parseHex(token.replace(/^0x/i, ''), format);
      if (
        Number.isNaN(value) ||
        (before !== undefined && !/[+\-*/(]/.test(before)) ||
        (after !== undefined && !/[+\-*/)]/.test(after))
      ) {
        invalid = true;
      }
      return String(value);
    },
  );
  if (invalid) return NaN;
  const value = evaluateExpression(expression);
  return Number.isInteger(value) ? value : NaN;
}
