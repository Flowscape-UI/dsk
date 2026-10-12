export type HexFormat = 1 | 2 | 3 | 6 | 8;

const hexPattern = /^[\da-f]+$/i;

export function getHexFormat(value: string | null): HexFormat {
  switch (value?.trim().toLowerCase().replace(/^hex/, '')) {
    case '1':
      return 1;
    case '2':
      return 2;
    case '3':
      return 3;
    case '8':
      return 8;
    default:
      return 6;
  }
}

function channelWidth(format: HexFormat): 1 | 2 {
  return format === 1 || format === 3 ? 1 : 2;
}

function channelCount(format: HexFormat): number {
  return format / channelWidth(format);
}

export function hexMax(format: HexFormat): number {
  return 16 ** format - 1;
}

/** Reads channels in display order: one channel, RGB, or RGBA. */
export function decodeHex(text: string, format: HexFormat): number[] | null {
  const value = text.trim().replace(/^#/, '');
  if (!hexPattern.test(value) || value.length > format) return null;
  const padded = value.padStart(format, '0');
  const width = channelWidth(format);
  const channels: number[] = [];
  for (let index = 0; index < format; index += width) {
    channels.push(Number.parseInt(padded.slice(index, index + width), 16));
  }
  return channels;
}

/** Writes an exact-width uppercase value without a leading hash. */
export function encodeHex(
  channels: readonly number[],
  format: HexFormat,
): string {
  const width = channelWidth(format);
  const maximum = 16 ** width - 1;
  if (
    channels.length !== channelCount(format) ||
    channels.some(
      (channel) =>
        !Number.isInteger(channel) || channel < 0 || channel > maximum,
    )
  ) {
    return '';
  }
  return channels
    .map((channel) => channel.toString(16).padStart(width, '0'))
    .join('')
    .toUpperCase();
}

/** Uses red as the least significant channel, followed by green, blue, alpha. */
export function parseHex(text: string, format: HexFormat): number {
  const channels = decodeHex(text, format);
  if (!channels) return NaN;
  const radix = 16 ** channelWidth(format);
  return channels.reduce(
    (rank, channel, index) => rank + channel * radix ** index,
    0,
  );
}

export function formatHex(rank: number, format: HexFormat): string {
  if (!Number.isInteger(rank) || rank < 0 || rank > hexMax(format)) return '';
  const radix = 16 ** channelWidth(format);
  const channels: number[] = [];
  let remainder = rank;
  for (let index = 0; index < channelCount(format); index += 1) {
    channels.push(remainder % radix);
    remainder = Math.floor(remainder / radix);
  }
  return encodeHex(channels, format);
}

/** Converts channels without silently quantizing values to shorter formats. */
export function convertHex(
  text: string,
  from: HexFormat,
  to: HexFormat,
): string {
  const channels = decodeHex(text, from);
  if (!channels) return '';
  const bytes = channels.map((channel) =>
    channelWidth(from) === 1 ? channel * 17 : channel,
  );
  const [red = 0, green = 0, blue = 0, alpha = 255] = bytes;
  let output = to <= 2 ? [red] : [red, green, blue];
  if (to === 8) output.push(alpha);
  if (channelWidth(to) === 1) {
    if (output.some((channel) => channel % 17 !== 0)) return '';
    output = output.map((channel) => channel / 17);
  }
  return encodeHex(output, to);
}
