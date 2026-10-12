import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hsvToHex,
  normalizeHue,
  percentage,
  positiveNumber,
  normalizeRgbHex,
} from '../../../src/color/helpers/color-model.ts';

test('alpha base colors normalize RGB without accepting an embedded alpha channel', () => {
  assert.equal(normalizeRgbHex('#0af'), '#00AAFF');
  assert.equal(normalizeRgbHex(' aAbBcC '), '#AABBCC');
  assert.equal(normalizeRgbHex('#12345678'), '#FF0000');
  assert.equal(normalizeRgbHex('invalid'), '#FF0000');
  assert.equal(normalizeRgbHex(null), '#FF0000');
});

test('HSV converts primary, secondary and partially saturated colors to HEX', () => {
  for (const [hue, expected] of [
    [0, '#FF0000'],
    [60, '#FFFF00'],
    [120, '#00FF00'],
    [180, '#00FFFF'],
    [240, '#0000FF'],
    [300, '#FF00FF'],
  ] as const) {
    assert.equal(hsvToHex(hue, 100, 100), expected);
  }
  assert.equal(hsvToHex(60, 50, 80), '#CCCC66');
  assert.equal(hsvToHex(214, 0, 100), '#FFFFFF');
  assert.equal(hsvToHex(214, 0, 50), '#808080');
  assert.equal(hsvToHex(214, 83, 0), '#000000');
});

test('hue wraps while channels clamp and invalid attributes use defaults', () => {
  assert.equal(normalizeHue(-60), 300);
  assert.equal(normalizeHue(780), 60);
  assert.equal(normalizeHue(''), 0);
  assert.equal(normalizeHue(Infinity), 0);
  assert.equal(percentage(-1), 0);
  assert.equal(percentage(101), 100);
  assert.equal(percentage('invalid'), 100);
  assert.equal(percentage(''), 100);
  assert.equal(percentage(0), 0);
  assert.equal(positiveNumber(0, 1), 1);
  assert.equal(positiveNumber('0.25', 1), 0.25);
  assert.equal(hsvToHex(-60, 100, 100), '#FF00FF');
});
