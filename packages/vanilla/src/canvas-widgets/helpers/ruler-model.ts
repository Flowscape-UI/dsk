export type RulerOrientation =
  'horizontal' | 'horizontal-reversed' | 'vertical' | 'vertical-reversed';
export type RulerRange = readonly [number, number];
export interface RulerGuideDetail {
  guides: readonly number[];
  value: number;
  index: number;
}

export function rulerStep(zoom: number, spacing = 70): number {
  const raw = spacing / zoom;
  const power = 10 ** Math.floor(Math.log10(raw));
  return (
    [1, 2, 5, 10]
      .map((factor) => factor * power)
      .find((value) => value >= raw) ?? raw
  );
}

/** Generate only the visible ticks, with a hard limit independent of coordinates. */
export function rulerTicks(
  offset: number,
  zoom: number,
  length: number,
  step: number,
): { value: number; pixel: number; major: boolean }[] {
  const minor = Math.max(
    step / 5,
    4 / zoom,
    Math.abs(offset) * Number.EPSILON * 2,
  );
  const first = Math.ceil(offset / minor);
  const count = Math.min(2048, Math.ceil(length / (minor * zoom)) + 1);
  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const value = (first + i) * minor;
    const major = Math.abs(value / step - Math.round(value / step)) < 1e-5;
    return { value, pixel: (value - offset) * zoom, major };
  }).filter(
    (tick) =>
      Number.isFinite(tick.pixel) && tick.pixel >= 0 && tick.pixel <= length,
  );
}
