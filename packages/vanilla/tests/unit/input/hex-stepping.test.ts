import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatHex,
  hexMax,
  parseHex,
  type HexFormat,
} from '../../../src/input/helpers/hex.ts';
import { stepHexValue } from '../../../src/input/helpers/hex-stepping.ts';
import type { NumericOptions } from '../../../src/input/helpers/numbers.ts';

function step(
  value: string,
  count: number,
  format: HexFormat = 6,
  extra: Partial<NumericOptions> = {},
): string {
  return formatHex(
    stepHexValue(
      parseHex(value, format),
      count,
      {
        min: 0,
        max: hexMax(format),
        step: 1,
        progression: 'linear',
        ...extra,
      },
      format,
    ),
    format,
  );
}

test('fills channels sequentially without clearing completed channels', () => {
  for (const [from, count, expected] of [
    ['FE0000', 1, 'FF0000'],
    ['FE0000', 2, 'FF0100'],
    ['FF0000', 2, 'FF0200'],
    ['FFFE00', 2, 'FFFF01'],
    ['000000', 510, 'FFFF00'],
    ['000000', 765, 'FFFFFF'],
    ['FE7B80', 3, 'FF7D80'],
  ] as const)
    assert.equal(step(from, count), expected);
  assert.equal(step('F00', 2, 3), 'F20');
  assert.equal(step('FFFFFF00', 2, 8), 'FFFFFF02');
  assert.equal(step('0F', 1, 2), '10');
});

test('drains channels in reverse order and clamps at the full range', () => {
  assert.equal(step('FF0200', -1), 'FF0100');
  assert.equal(step('FF0100', -2), 'FE0000');
  assert.equal(step('FFFFFF01', -2, 8), 'FFFFFE00');
  assert.equal(step('000000', -1), '000000');
  assert.equal(step('FFFFFE', 5), 'FFFFFF');
});

test('bounds and loops apply to the whole value with channel-step overshoot', () => {
  assert.equal(step('FE0000', 4, 6, { max: parseHex('FF0200', 6) }), 'FF0200');
  assert.equal(
    step('FF0200', 2, 6, { max: parseHex('FF0200', 6), loopAfterMax: true }),
    '020000',
  );
  assert.equal(step('FFFFFF', 2, 6, { loopAfterMax: true }), '020000');
  assert.equal(step('000000', -2, 6, { loopAfterMin: true }), 'FFFFFD');
  assert.equal(
    step('000000', 765 * 1000 + 2, 6, { loopAfterMax: true }),
    '020000',
  );
  assert.equal(step('000000', 765 * 1000, 6, { loopAfterMax: true }), 'FFFFFF');
  assert.equal(step('FE0000', 1, 6, { step: 3 }), 'FF0200');
});
