const decimalPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

export type Progression = 'linear' | 'exponential' | 'logarithmic';

export type NumericValue = string | number | null | undefined;

export interface NumericOptionsInput {
  loopAfter?: boolean;
  min?: NumericValue;
  max?: NumericValue;
  step?: NumericValue;
  progression?: string | null;
  loopAfterMin?: boolean;
  loopAfterMax?: boolean;
}

export interface NumericBounds {
  min?: number;
  max?: number;
}

export interface NumericOptions {
  loopAfterMin?: boolean;
  loopAfterMax?: boolean;
  min: number;
  max: number;
  step: number;
  progression: Progression;
}

export function parseNumber(value: NumericValue): number {
  const text = String(value ?? '').trim();
  if (!decimalPattern.test(text)) return NaN;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

export function getOptions({
  min,
  max,
  step,
  progression,
  loopAfter = false,
  loopAfterMin = false,
  loopAfterMax = false,
}: NumericOptionsInput = {}): NumericOptions {
  const parsedMin = parseNumber(min);
  const parsedMax = parseNumber(max);
  const parsedStep = parseNumber(step);
  const lower = Number.isNaN(parsedMin) ? -Infinity : parsedMin;
  return {
    loopAfterMin: loopAfter || loopAfterMin,
    loopAfterMax: loopAfter || loopAfterMax,
    min: lower,
    max: Number.isNaN(parsedMax) ? Infinity : Math.max(lower, parsedMax),
    step: parsedStep > 0 ? parsedStep : 1,
    progression:
      progression === 'exponential' || progression === 'logarithmic'
        ? progression
        : 'linear',
  };
}

export function clampNumber(
  value: number,
  { min = -Infinity, max = Infinity }: NumericBounds = {},
): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeValue(
  value: NumericValue,
  options: NumericBounds,
): string {
  const number = parseNumber(value);
  return Number.isNaN(number) ? '' : String(clampNumber(number, options));
}

export function dragSteps(
  distance: number,
  progression: Progression = 'linear',
): number {
  const steps = Math.abs(distance) / 4;
  let mapped = steps;
  if (progression === 'exponential') mapped = 20 * Math.expm1(steps / 20);
  if (progression === 'logarithmic') mapped = 20 * Math.log1p(steps / 20);
  return Math.sign(distance) * Math.round(mapped);
}

export function stepValue(
  start: number,
  count: number,
  options: NumericOptions,
): number {
  const next = start + count * options.step;
  const finite = Number.isFinite(next)
    ? next
    : Math.sign(next) * Number.MAX_VALUE;
  // Remove decimal noise without rounding away exact integer steps.
  const rounded = Number.isInteger(finite)
    ? finite
    : Number(finite.toPrecision(15));
  let result = Number.isFinite(rounded) ? rounded : finite;
  const span = options.max - options.min;
  if (Number.isFinite(span) && span > 0) {
    if (result > options.max && options.loopAfterMax) {
      const overshoot = result - options.max;
      const rawRemainder = Number.isFinite(overshoot)
        ? overshoot % span
        : ((result % span) - (options.max % span)) % span;
      const remainder = rawRemainder < 0 ? rawRemainder + span : rawRemainder;
      result = remainder === 0 ? options.max : options.min + remainder;
    } else if (result < options.min && options.loopAfterMin) {
      const overshoot = options.min - result;
      const rawRemainder = Number.isFinite(overshoot)
        ? overshoot % span
        : ((options.min % span) - (result % span)) % span;
      const remainder = rawRemainder < 0 ? rawRemainder + span : rawRemainder;
      result = remainder === 0 ? options.min : options.max - remainder;
    }
  }
  const wrapped = Number.isInteger(result)
    ? result
    : Number(result.toPrecision(15));
  return clampNumber(Number.isFinite(wrapped) ? wrapped : result, options);
}
