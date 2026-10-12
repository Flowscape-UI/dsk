import { decodeHex, formatHex, type HexFormat } from './hex.ts';
import { clampNumber, type NumericOptions } from './numbers.ts';

interface ChannelMovement {
  value: number;
  consumed: number;
}

/** Fills R → G → B → A and drains A → B → G → R without wrapping channels. */
export function stepHexValue(
  start: number,
  count: number,
  options: NumericOptions,
  format: HexFormat,
): number {
  const initial = clampNumber(start, options);
  if (count === 0) return initial;
  const direction = count > 0 ? 1 : -1;
  const amount = Math.min(Number.MAX_VALUE, Math.abs(count * options.step));
  const radix = format === 1 || format === 3 ? 16 : 256;
  const bound = direction > 0 ? options.max : options.min;

  const move = (value: number, budget: number): ChannelMovement => {
    const channels = decodeHex(formatHex(value, format), format);
    if (!channels) return { value: initial, consumed: 0 };
    let consumed = 0;
    for (let offset = 0; offset < channels.length; offset++) {
      if (value === bound || consumed >= budget) break;
      const index = direction > 0 ? offset : channels.length - 1 - offset;
      const channel = channels[index]!;
      const capacity = direction > 0 ? radix - 1 - channel : channel;
      const weight = radix ** index;
      const distance = Math.ceil(Math.abs(bound - value) / weight);
      const change = Math.min(capacity, budget - consumed, distance);
      value = clampNumber(value + direction * change * weight, options);
      consumed += change;
    }
    return { value, consumed };
  };

  const first = move(initial, amount);
  const remaining = amount - first.consumed;
  const loop = direction > 0 ? options.loopAfterMax : options.loopAfterMin;
  if (!loop || remaining <= 0 || options.max <= options.min) return first.value;

  const origin = direction > 0 ? options.min : options.max;
  const cycle = move(origin, Infinity);
  if (cycle.consumed === 0) return first.value;
  const remainder = remaining % cycle.consumed;
  return remainder === 0 ? bound : move(origin, remainder).value;
}
