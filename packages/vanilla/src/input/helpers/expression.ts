// A small arithmetic grammar; user input is never executed as JavaScript.
export function evaluateExpression(source: string): number {
  if (source.length > 4096 || !source.trim()) return NaN;
  if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(source.trim())) {
    const literal = Number(source);
    return Number.isFinite(literal) ? literal : NaN;
  }
  let offset = 0;
  let depth = 0;
  const whitespace = (): void => {
    while (/\s/.test(source[offset] ?? '') && offset < source.length) offset++;
  };
  const primary = (): number => {
    whitespace();
    if (++depth > 64) throw new Error('Expression is too deeply nested');
    let value: number;
    const token = source[offset];
    if (token === '+' || token === '-') {
      offset++;
      value = primary() * (token === '-' ? -1 : 1);
    } else if (token === '(') {
      offset++;
      value = sum();
      whitespace();
      if (source[offset++] !== ')')
        throw new Error('Missing closing parenthesis');
    } else {
      const number = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(
        source.slice(offset),
      );
      if (!number) throw new Error('Expected a number');
      offset += number[0].length;
      value = Number(number[0]);
    }
    depth--;
    if (!Number.isFinite(value)) throw new Error('Non-finite result');
    return value;
  };
  const product = (): number => {
    let value = primary();
    whitespace();
    while (source[offset] === '*' || source[offset] === '/') {
      const operator = source[offset++];
      const right = primary();
      value = operator === '*' ? value * right : value / right;
      if (!Number.isFinite(value)) throw new Error('Non-finite result');
      whitespace();
    }
    return value;
  };
  const sum = (): number => {
    let value = product();
    whitespace();
    while (source[offset] === '+' || source[offset] === '-') {
      const operator = source[offset++];
      const right = product();
      value = operator === '+' ? value + right : value - right;
      if (!Number.isFinite(value)) throw new Error('Non-finite result');
      whitespace();
    }
    return value;
  };
  try {
    const result = sum();
    if (offset !== source.length) return NaN;
    const rounded = Number(result.toPrecision(15));
    return Number.isFinite(rounded) ? rounded : result;
  } catch {
    return NaN;
  }
}
