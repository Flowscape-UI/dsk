/** Attribute/property input shared by the standalone color controls. */
export type ColorNumber = number | string | null | undefined;

export function finiteNumber(value: ColorNumber, fallback: number): number {
  if (value == null || String(value).trim() === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function normalizeHue(value: ColorNumber): number {
  const hue = finiteNumber(value, 0);
  return ((hue % 360) + 360) % 360;
}

export function percentage(value: ColorNumber, fallback = 100): number {
  return Math.min(100, Math.max(0, finiteNumber(value, fallback)));
}

export function positiveNumber(value: ColorNumber, fallback: number): number {
  const number = finiteNumber(value, fallback);
  return number > 0 ? number : fallback;
}

/** Opaque RGB input for the alpha control; opacity has its own channel. */
export function normalizeRgbHex(value: string | null | undefined): string {
  const hex = (value ?? '').trim().replace(/^#/, '');
  if (/^[\da-f]{6}$/i.test(hex)) return '#' + hex.toUpperCase();
  if (/^[\da-f]{3}$/i.test(hex))
    return (
      '#' +
      [...hex]
        .map((digit) => digit + digit)
        .join('')
        .toUpperCase()
    );
  return '#FF0000';
}

/** Convert HSV to display HEX without rounding the stored HSV channels. */
export function hsvToHex(
  hue: number,
  saturation: number,
  brightness: number,
): string {
  const h = normalizeHue(hue) / 60;
  const s = percentage(saturation) / 100;
  const v = percentage(brightness) / 100;
  const chroma = v * s;
  const secondary = chroma * (1 - Math.abs((h % 2) - 1));
  const offset = v - chroma;
  const channels =
    h < 1
      ? [chroma, secondary, 0]
      : h < 2
        ? [secondary, chroma, 0]
        : h < 3
          ? [0, chroma, secondary]
          : h < 4
            ? [0, secondary, chroma]
            : h < 5
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  return (
    '#' +
    channels
      .map((channel) =>
        Math.round((channel + offset) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}
