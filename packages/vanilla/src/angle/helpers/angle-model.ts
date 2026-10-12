export type AngleUnit = 'deg' | 'rad' | 'pi' | 'turn' | 'grad';
export type AngleNumber = number | string | null | undefined;

const degreesPerUnit: Record<AngleUnit, number> = {
  deg: 1,
  rad: 180 / Math.PI,
  pi: 180,
  turn: 360,
  grad: 0.9,
};

export function angleUnit(value: string | null | undefined): AngleUnit {
  const unit = value?.trim().toLowerCase();
  if (unit === 'π') return 'pi';
  return unit && Object.hasOwn(degreesPerUnit, unit)
    ? (unit as AngleUnit)
    : 'deg';
}

export function angleNumber(value: AngleNumber, fallback: number): number {
  if (value == null || String(value).trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toDegrees(value: number, unit: AngleUnit): number {
  return value * degreesPerUnit[unit];
}
export function fromDegrees(value: number, unit: AngleUnit): number {
  return value / degreesPerUnit[unit];
}
export function clampAngle(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
export function cleanAngle(value: number): number {
  return Number(value.toPrecision(15));
}
/** Keep exact endpoints while allowing further motion across either seam. */
export function wrapAngle(value: number, revolution: number): number {
  if (value >= 0 && value <= revolution) return value;
  return ((value % revolution) + revolution) % revolution;
}

export function snapAngle(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  if (value <= min) return min;
  if (value >= max) return max;
  return clampAngle(
    cleanAngle(min + Math.round((value - min) / step) * step),
    min,
    max,
  );
}

/** Pointer geometry wraps, while stored values retain distinct 0/360 endpoints. */
export function pointerDegrees(x: number, y: number): number {
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
}
export function angleDelta(previous: number, current: number): number {
  return ((current - previous + 540) % 360) - 180;
}

export function formatAngle(value: number, unit: AngleUnit): string {
  const decimal = Number(value.toFixed(3));
  if (unit === 'deg') return `${decimal}°`;
  if (unit !== 'pi') return `${decimal} ${unit}`;
  if (value === 0) return '0';
  for (const denominator of [1, 2, 3, 4, 6, 8, 12]) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value * denominator - numerator) > 1e-9) continue;
    const prefix = numerator === 1 ? '' : String(numerator);
    return denominator === 1 ? `${prefix}π` : `${prefix}π/${denominator}`;
  }
  return `${decimal}π`;
}

export function anglePoint(angle: number, radius: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [120 + radius * Math.sin(radians), 120 - radius * Math.cos(radians)];
}

/** An annular sector leaves the readout transparent on any host background. */
export function sectorPath(start: number, end: number): string {
  const span = end - start;
  if (span <= 0) return '';
  const point = (angle: number, radius: number): string =>
    anglePoint(angle, radius).join(' ');
  if (span >= 360 - 1e-9) {
    const circle = (radius: number): string =>
      `M ${point(start, radius)} A ${radius} ${radius} 0 1 1 ${point(start + 180, radius)} A ${radius} ${radius} 0 1 1 ${point(start, radius)} Z`;
    return `${circle(76)} ${circle(44)}`;
  }
  const largeArc = span > 180 ? 1 : 0;
  return `M ${point(start, 76)} A 76 76 0 ${largeArc} 1 ${point(end, 76)} L ${point(end, 44)} A 44 44 0 ${largeArc} 0 ${point(start, 44)} Z`;
}
