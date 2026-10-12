import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dragSteps,
  getOptions,
  normalizeValue,
  parseNumber,
  stepValue,
} from '../../../src/input/helpers/numbers.ts';

test('accepts finite decimal numbers and rejects blank or incomplete drafts', () => {
  assert.equal(parseNumber(' -.25 '), -0.25);
  assert.equal(parseNumber('1e-3'), 0.001);
  for (const value of ['', ' ', '-', '1e', 'Infinity', '0xff', '1.2.3']) {
    assert.ok(Number.isNaN(parseNumber(value)), value);
  }
});

test('normalizes bounds without snapping manually entered values to step', () => {
  const options = getOptions({ min: -2, max: 10, step: 2 });
  assert.equal(normalizeValue('-5', options), '-2');
  assert.equal(normalizeValue('12', options), '10');
  assert.equal(normalizeValue('1.25', options), '1.25');
  assert.equal(normalizeValue('', options), '');
});

test('invalid options have predictable defaults and reversed bounds use min', () => {
  assert.deepEqual(getOptions({ step: 0, progression: 'unknown' }), {
    loopAfterMin: false,
    loopAfterMax: false,
    min: -Infinity,
    max: Infinity,
    step: 1,
    progression: 'linear',
  });
  const options = getOptions({ min: 10, max: -10, step: -2 });
  assert.equal(normalizeValue('0', options), '10');
  assert.equal(options.step, 1);
});

test('drag curves are symmetric and accelerate or decelerate from zero', () => {
  assert.equal(dragSteps(0), 0);
  assert.equal(dragSteps(1), 0);
  assert.equal(dragSteps(4), 1);
  assert.equal(dragSteps(80), 20);
  assert.equal(dragSteps(80, 'exponential'), 34);
  assert.equal(dragSteps(80, 'logarithmic'), 14);
  for (const progression of ['linear', 'exponential', 'logarithmic'] as const) {
    assert.equal(dragSteps(-80, progression), -dragSteps(80, progression));
    assert.ok(stepValue(0, dragSteps(-80, progression), getOptions()) < 0);
  }
});

test('decimal stepping avoids binary rounding noise and respects bounds', () => {
  assert.equal(stepValue(0.1, 2, getOptions({ step: 0.1 })), 0.3);
  assert.equal(stepValue(-3, -10, getOptions({ min: -5 })), -5);
  assert.equal(stepValue(9, 10, getOptions({ max: 10 })), 10);
  assert.equal(stepValue(0.001, 2, getOptions({ step: 0.0001 })), 0.0012);
});

test('integer stepping preserves all safe digits before and after wrapping', () => {
  const maximum = Number.MAX_SAFE_INTEGER;
  assert.equal(stepValue(maximum - 1, 1, getOptions()), maximum);
  assert.equal(stepValue(-maximum + 1, -1, getOptions()), -maximum);
  const byteRange = getOptions({
    min: 0,
    max: 255,
    step: maximum,
    loopAfter: true,
  });
  assert.equal(stepValue(0, 1, byteRange), 31);
  assert.equal(stepValue(0, -1, byteRange), 224);
  assert.equal(stepValue(255, -1, byteRange), 224);

  const offset = 1000000000000000;
  const offsetRange = getOptions({
    min: offset,
    max: offset + 255,
    step: 2,
    loopAfter: true,
  });
  assert.equal(stepValue(offset + 255, 1, offsetRange), offset + 2);
  assert.equal(stepValue(offset, -1, offsetRange), offset + 253);
});

test('extreme exponential drags remain finite and honor finite limits', () => {
  const count = dragSteps(100000, 'exponential');
  assert.equal(stepValue(0, count, getOptions({ max: 100 })), 100);
  assert.ok(Number.isFinite(stepValue(0, count, getOptions())));
});

test('looping preserves directional overshoot, exact endpoints and multiple turns', () => {
  const shared = getOptions({
    min: 0,
    max: 100,
    step: 2,
    loopAfter: true,
    loopAfterMin: false,
    loopAfterMax: false,
  });
  assert.equal(stepValue(100, 1, shared), 2);
  assert.equal(stepValue(0, -1, shared), 98);
  const options = getOptions({
    min: 0,
    max: 100,
    step: 2,
    loopAfterMin: true,
    loopAfterMax: true,
  });
  for (const [start, count, expected] of [
    [100, 1, 2],
    [0, -1, 98],
    [98, 1, 100],
    [2, -1, 0],
    [99, 1, 1],
    [100, 151, 2],
    [0, -151, 98],
    [100, 50, 100],
    [0, -50, 0],
  ] as const) {
    assert.equal(stepValue(start, count, options), expected);
  }
  assert.equal(stepValue(100, 1, { ...options, loopAfterMax: false }), 100);
  assert.equal(stepValue(0, -1, { ...options, loopAfterMin: false }), 0);
  assert.equal(normalizeValue('102', options), '100');
});

test('looping supports fractional and negative ranges and rejects unusable spans', () => {
  const flags = { loopAfterMin: true, loopAfterMax: true };
  for (const direction of [-1, 1]) {
    const options = getOptions({
      ...flags,
      min: direction < 0 ? 1e308 : -1.7e308,
      max: direction < 0 ? 1.7e308 : -1e308,
    });
    const result = stepValue(0, direction * Infinity, options);
    assert.ok(Number.isFinite(result));
    assert.ok(result >= options.min && result <= options.max);
  }
  assert.equal(
    stepValue(1, 1, getOptions({ ...flags, min: 0, max: 1, step: 0.1 })),
    0.1,
  );
  assert.equal(
    stepValue(0, -1, getOptions({ ...flags, min: 0, max: 1, step: 0.1 })),
    0.9,
  );
  assert.equal(
    stepValue(10, 1, getOptions({ ...flags, min: -10, max: 10, step: 3 })),
    -7,
  );
  assert.equal(stepValue(10, 1, getOptions({ ...flags, max: 10 })), 10);
  assert.equal(stepValue(0, -1, getOptions({ ...flags, min: 0 })), 0);
  assert.equal(stepValue(5, 1, getOptions({ ...flags, min: 5, max: 5 })), 5);
  assert.equal(stepValue(5, 1, getOptions({ ...flags, min: 5, max: 1 })), 5);
  assert.ok(
    Number.isFinite(
      stepValue(0, Infinity, getOptions({ ...flags, min: 0, max: 100 })),
    ),
  );
});
