import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertHex,
  decodeHex,
  encodeHex,
  formatHex,
  getHexFormat,
  hexMax,
  parseHex,
  type HexFormat,
} from '../../../src/input/helpers/hex.ts';

test('resolves supported HEX widths with a six-digit default', () => {
  for (const format of [1, 2, 3, 6, 8] as const) {
    assert.equal(getHexFormat(String(format)), format);
    assert.equal(getHexFormat(` HEX${format} `), format);
    assert.equal(hexMax(format), 16 ** format - 1);
  }
  for (const value of [null, '', '4', '16', '3.0', 'hex', 'unknown']) {
    assert.equal(getHexFormat(value), 6);
  }
});

test('decodes channel arrays in display order and writes exact-width uppercase', () => {
  assert.deepEqual(decodeHex('a', 1), [10]);
  assert.deepEqual(decodeHex(' a ', 2), [10]);
  assert.deepEqual(decodeHex('#aBc', 3), [10, 11, 12]);
  assert.deepEqual(decodeHex('aaBBcc', 6), [170, 187, 204]);
  assert.deepEqual(decodeHex('#aabbcc80', 8), [170, 187, 204, 128]);
  assert.equal(encodeHex([10], 1), 'A');
  assert.equal(encodeHex([10], 2), '0A');
  assert.equal(encodeHex([10, 11, 12], 3), 'ABC');
  assert.equal(encodeHex([10, 11, 12], 6), '0A0B0C');
  assert.equal(encodeHex([170, 187, 204, 0], 8), 'AABBCC00');
});

test('rejects malformed text, excess digits, invalid ranks and channel arrays', () => {
  for (const value of [
    '',
    ' ',
    '#',
    '##12',
    '0x12',
    '-1',
    '+1',
    '1.5',
    '1 2',
    'GG',
    '123',
  ]) {
    assert.equal(decodeHex(value, 2), null, value);
    assert.ok(Number.isNaN(parseHex(value, 2)), value);
  }
  for (const value of [-1, 1.5, 256, NaN, Infinity, -Infinity]) {
    assert.equal(formatHex(value, 2), '');
  }
  for (const channels of [[], [1, 2], [-1], [16], [1.5], [NaN], [Infinity]]) {
    assert.equal(encodeHex(channels, 1), '');
  }
});

test('pads short input and round-trips ranks across every channel layout', () => {
  for (const [format, text, expected] of [
    [1, 'a', 'A'],
    [2, 'a', '0A'],
    [3, 'a', '00A'],
    [6, 'abc', '000ABC'],
    [8, '#abcd', '0000ABCD'],
  ] as const) {
    assert.equal(formatHex(parseHex(text, format), format), expected);
  }
  for (const format of [1, 2, 3, 6, 8] as const) {
    const max = hexMax(format);
    for (const rank of [0, 1, Math.floor(max / 2), max - 1, max]) {
      assert.equal(parseHex(formatHex(rank, format), format), rank);
    }
  }
});

test('increments red first and carries or borrows through green, blue and alpha', () => {
  for (const [format, start, change, expected] of [
    [1, 'E', 1, 'F'],
    [2, 'FE', 1, 'FF'],
    [3, 'E00', 1, 'F00'],
    [3, 'F00', 1, '010'],
    [3, 'FF0', 1, '001'],
    [6, 'FE0000', 1, 'FF0000'],
    [6, 'FF0000', 1, '000100'],
    [6, 'FFFF00', 1, '000001'],
    [6, '000100', -1, 'FF0000'],
    [8, 'FFFFFF00', 1, '00000001'],
    [8, '00000001', -1, 'FFFFFF00'],
    [8, 'FE000000', 258, '00020000'],
  ] satisfies [HexFormat, string, number, string][]) {
    assert.equal(formatHex(parseHex(start, format) + change, format), expected);
  }
});

test('eight-digit ranks retain the full unsigned range', () => {
  assert.equal(parseHex('FFFFFFFF', 8), 4294967295);
  assert.equal(parseHex('00000080', 8), 2147483648);
  assert.equal(formatHex(4294967295, 8), 'FFFFFFFF');
  assert.equal(formatHex(2147483648, 8), '00000080');
  assert.equal(formatHex(4294967296, 8), '');
});

test('converts RGB and RGBA by channel, including expansion and opaque alpha', () => {
  assert.equal(convertHex('f80', 3, 6), 'FF8800');
  assert.equal(convertHex('F80', 3, 8), 'FF8800FF');
  assert.equal(convertHex('FF8800', 6, 3), 'F80');
  assert.equal(convertHex('FF8800', 6, 8), 'FF8800FF');
  assert.equal(convertHex('FF880080', 8, 6), 'FF8800');
  assert.equal(convertHex('FF880080', 8, 3), 'F80');
  assert.equal(convertHex('FF880080', 8, 8), 'FF880080');
  assert.equal(convertHex('FF8801', 6, 3), '');
});

test('single-channel conversion preserves red and initializes remaining channels', () => {
  assert.equal(convertHex('A', 1, 2), 'AA');
  assert.equal(convertHex('AA', 2, 1), 'A');
  assert.equal(convertHex('AB', 2, 1), '');
  assert.equal(convertHex('A', 1, 3), 'A00');
  assert.equal(convertHex('A', 1, 6), 'AA0000');
  assert.equal(convertHex('A', 1, 8), 'AA0000FF');
  assert.equal(convertHex('80', 2, 8), '800000FF');
  assert.equal(convertHex('FF1234', 6, 1), 'F');
  assert.equal(convertHex('F812', 6, 2), '00');
  assert.equal(convertHex('123', 3, 2), '11');
  assert.equal(convertHex('AB123400', 8, 2), 'AB');
  assert.equal(convertHex('AB123400', 8, 1), '');
});

test('conversion preserves empty values and rejects malformed source text', () => {
  for (const value of ['', ' ', 'wrong', '##123', '1234']) {
    assert.equal(convertHex(value, 3, 8), '');
  }
});
