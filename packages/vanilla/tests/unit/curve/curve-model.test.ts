import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CURVE_PRESETS,
  DEFAULT_CURVE,
  cleanCoordinate,
  curveNumber,
  curvePreset,
  formatCurve,
  parseCurve,
  sampleCurve,
  snapCoordinate,
  type CurvePoints,
  type CurvePreset,
  parseCurvePath,
  normalizeCurvePath,
  formatCurvePath,
  curvePointAt,
  closestCurvePoint,
  splitCurvePath,
  moveCurvePoint,
  removeCurvePoint,
  sampleCurvePath,
  curvePathCss,
} from '../../../src/curve/helpers/curve-model.ts';

function near(actual: number, expected: number, tolerance = 1e-10): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test('presets parse into independent coordinate tuples with canonical formatting', () => {
  for (const name of Object.keys(CURVE_PRESETS) as CurvePreset[]) {
    const points = parseCurve(name);
    assert.deepEqual(points, CURVE_PRESETS[name]);
    assert.notEqual(points, CURVE_PRESETS[name]);
    assert.equal(curvePreset(points), name);
    assert.deepEqual(parseCurve(formatCurve(points)), points);
  }
  assert.deepEqual(parseCurve(' EASE-IN-OUT '), [0.42, 0, 0.58, 1]);
  assert.equal(formatCurve(DEFAULT_CURVE), 'cubic-bezier(0.42, 0, 0.58, 1)');
  assert.equal(curvePreset([0.3, 0, 0.7, 1]), 'custom');
});

test('splitting a curve inserts an anchor without changing its shape', () => {
  for (const value of ['ease-in-out', 'cubic-bezier(1, 0, 0, 1)']) {
    const path = parseCurvePath(value);
    const split = splitCurvePath(path, 0, 0.37);
    assert.equal(split.length, 2);
    assert.deepEqual(parseCurvePath(formatCurvePath(split)), split);
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const original = curvePointAt(path, 0, t);
      const divided =
        t < 0.37
          ? curvePointAt(split, 0, t / 0.37)
          : curvePointAt(split, 1, (t - 0.37) / 0.63);
      near(original.x, divided.x, 0.000002);
      near(original.y, divided.y, 0.000002);
    }
    assert.equal(path.length, 1);
    assert.equal(splitCurvePath(path, 0, 0).length, 1);
    assert.equal(splitCurvePath(path, 0, 1).length, 1);
  }
});

test('nodes move in both axes but cannot cross neighbors or leave the graph', () => {
  const split = splitCurvePath(parseCurvePath('ease-in-out'), 0, 0.5);
  const moved = moveCurvePoint(split, 2, 0.7, 0.2);
  assert.deepEqual(moved[0]?.slice(4), [0.7, 0.2]);
  near(sampleCurvePath(moved, 0.7), 0.2, 1e-6);
  assert.deepEqual(normalizeCurvePath(moved), moved);
  assert.deepEqual(split[0]?.slice(4), [0.5, 0.5]);
  const clamped = moveCurvePoint(moved, 2, 2, -1);
  assert.deepEqual(clamped[0]?.slice(4), [0.99999, 0]);
  assert.deepEqual(normalizeCurvePath(clamped), clamped);
  assert.equal(removeCurvePoint(moved, 2).length, 1);
  assert.deepEqual(removeCurvePoint(moved, 0), moved);
});

test('path parsing rejects broken serialization and loops and returns fresh arrays', () => {
  const split = splitCurvePath(parseCurvePath('ease'), 0, 0.5);
  const serialized = formatCurvePath(split);
  assert.deepEqual(parseCurvePath(serialized), split);
  assert.notEqual(parseCurvePath(serialized)[0], split[0]);
  for (const value of [
    'curve([])',
    'curve([[0,0,1,1,0,1]])',
    'curve([[0,0,1,1,1,1]])extra',
    'curve([[0,0,1,1,1,1]]X',
    'curve(null)',
  ]) {
    assert.deepEqual(parseCurvePath(value), parseCurvePath(null));
  }
  assert.deepEqual(
    normalizeCurvePath([
      [1, 0, 1, 0, 0.2, 0.3],
      [0, 0, 0, 1, 1, 1],
    ]),
    parseCurvePath(null),
  );
});

test('hit testing, segmented preview and CSS export follow added nodes', () => {
  const path = parseCurvePath('ease-in-out');
  const hit = closestCurvePoint(path, 0.5, 0.5);
  near(hit.time, 0.5, 1e-6);
  near(hit.distance, 0, 1e-6);
  const split = moveCurvePoint(splitCurvePath(path, 0, 0.5), 2, 0.5, 0.8);
  near(sampleCurvePath(split, 0.5), 0.8, 1e-6);
  assert.equal(sampleCurvePath(split, 0), 0);
  assert.equal(sampleCurvePath(split, 1), 1);
  assert.equal(curvePathCss(path), 'cubic-bezier(0.42, 0, 0.58, 1)');
  assert.match(curvePathCss(split), /^linear\(0 0%, /);
  assert.ok(curvePathCss(split).includes('0.8 50%'));
});

test('coordinate lists accept decimals, whitespace, commas, and exponents', () => {
  for (const value of [
    '.42, 0, .58, 1',
    ' 0.42 0 0.58 1 ',
    '+4.2e-1, 0, 5.8E-1, 1.',
    'CUBIC-BEZIER( .42, 0, .58, 1 )',
    '0.42, 0 0.58, 1',
  ]) {
    assert.deepEqual(parseCurve(value), DEFAULT_CURVE);
  }
  assert.deepEqual(
    parseCurve('0.125, .75, 0.875, .25'),
    [0.125, 0.75, 0.875, 0.25],
  );
});

test('invalid or nonfinite input falls back without interpreting expressions', () => {
  for (const value of [
    '',
    'custom',
    'constructor',
    '__proto__',
    '0, 0, 1',
    '0, 0, 1, 1, 2',
    '0,,0,1,1',
    ',0,0,1,1',
    '0,0,1,1,',
    'NaN, 0, 1, 1',
    'Infinity, 0, 1, 1',
    '1e309, 0, 1, 1',
    '0x1, 0, 1, 1',
    '0, 0, 100%, 1',
    'cubic-bezier(0, 0, 1, 1); alert(1)',
    'cubic-bezier(0, 0, calc(1), 1)',
    '(()=>[0,0,1,1])()',
    'cubic-bezier(0, 0, 1, 1',
  ]) {
    assert.deepEqual(parseCurve(value), DEFAULT_CURVE, value);
  }
  assert.deepEqual(parseCurve([0, 0, Number.NaN, 1]), DEFAULT_CURVE);
  assert.deepEqual(
    parseCurve([0, 0, 1, Number.POSITIVE_INFINITY]),
    DEFAULT_CURVE,
  );
});

test('tuples and fallback values are copied while coordinates are clamped and rounded', () => {
  const source = [0.123456789, -2, 2, 0.987654321] as const;
  const result = parseCurve(source);
  assert.deepEqual(result, [0.123457, 0, 1, 0.987654]);
  result[0] = 1;
  assert.equal(source[0], 0.123456789);
  const fallback = parseCurve(null);
  fallback[0] = 1;
  assert.deepEqual(parseCurve(undefined), [0.42, 0, 0.58, 1]);
  assert.deepEqual(
    parseCurve('-.5, .5, 1.5, .123456789'),
    [0, 0.5, 1, 0.123457],
  );
  assert.equal(cleanCoordinate(-0), 0);
  assert.equal(cleanCoordinate(Number.NaN), 0);
});

test('numeric attributes require a complete finite value and preserve explicit zero', () => {
  assert.equal(curveNumber(' 0 ', 9), 0);
  assert.equal(curveNumber('1e-3', 9), 0.001);
  for (const value of [null, undefined, '', ' ', '1px', 'NaN', Infinity, NaN]) {
    assert.equal(curveNumber(value, 9), 9);
  }
});

test('coordinate snapping uses zero as its origin and leaves endpoints reachable', () => {
  assert.equal(snapCoordinate(0.44, 0.1), 0.4);
  assert.equal(snapCoordinate(0.46, 0.1), 0.5);
  assert.equal(snapCoordinate(0.91, 0.3), 0.9);
  assert.equal(snapCoordinate(1, 0.3), 1);
  assert.equal(snapCoordinate(2, 0.3), 1);
  assert.equal(snapCoordinate(-0.1, 0.3), 0);
  assert.equal(snapCoordinate(0.29999999, 0.1), 0.3);
  assert.equal(snapCoordinate(0.123456789, 0), 0.123457);
  assert.equal(snapCoordinate(0.25, Number.NaN), 0.25);
  assert.equal(snapCoordinate(Number.NaN, 0.1), 0);
});

test('sampling inverts horizontal time instead of treating progress as the curve parameter', () => {
  const points: CurvePoints = [0.1, 0.8, 0.9, 0.2];
  // At parameter 0.25 the curve has x = 0.184375 and y = 0.38125.
  near(sampleCurve(points, 0.184375), 0.38125);
  near(sampleCurve(points, 0.815625), 0.61875);
  assert.ok(Math.abs(sampleCurve(points, 0.25) - 0.38125) > 0.02);
});

test('sampling remains stable with flat horizontal handles and at the midpoint', () => {
  near(sampleCurve([0, 1 / 3, 0, 2 / 3], 0.125), 0.5);
  near(sampleCurve([1, 1 / 3, 1, 2 / 3], 0.875), 0.5);
  near(sampleCurve([0, 1 / 3, 0, 2 / 3], 1e-12), 1e-4);
  near(sampleCurve([1, 0, 0, 1], 0.5), 0.5, 1e-5);
  near(sampleCurve(DEFAULT_CURVE, 0.5), 0.5);
});

test('presets preserve time endpoints and produce monotonic bounded progress', () => {
  for (const points of Object.values(CURVE_PRESETS)) {
    assert.equal(sampleCurve(points, 0), 0);
    assert.equal(sampleCurve(points, 1), 1);
    assert.equal(sampleCurve(points, -1), 0);
    assert.equal(sampleCurve(points, 2), 1);
    assert.equal(sampleCurve(points, Number.NaN), 0);
    let previous = 0;
    for (let index = 1; index <= 100; index += 1) {
      const result = sampleCurve(points, index / 100);
      assert.ok(result >= previous && result <= 1);
      previous = result;
    }
  }
  near(sampleCurve(CURVE_PRESETS.linear, 0.123), 0.123);
  assert.ok(sampleCurve(CURVE_PRESETS['ease-in'], 0.25) < 0.25);
  assert.ok(sampleCurve(CURVE_PRESETS['ease-out'], 0.25) > 0.25);
});

test('movable endpoints retain geometry, serialization and constant tails', () => {
  let path = moveCurvePoint(parseCurvePath('ease-in-out'), 2, 0.15, 0.3);
  path = moveCurvePoint(path, 3, 0.85, 0.7);
  assert.deepEqual(path.start, [0.15, 0.3]);
  assert.deepEqual(path.at(-1)?.slice(4), [0.85, 0.7]);
  assert.deepEqual(parseCurvePath(formatCurvePath(path)), path);
  assert.deepEqual(normalizeCurvePath(path), path);
  assert.equal(sampleCurvePath(path, 0), 0.3);
  assert.equal(sampleCurvePath(path, 1), 0.7);
  assert.match(curvePathCss(path), /^linear\(0.3 0%, 0.3 15%,/);
  assert.ok(curvePathCss(path).endsWith('0.7 100%)'));
  const split = splitCurvePath(path, 0, 0.5);
  for (let i = 0; i <= 100; i++)
    near(
      sampleCurvePath(path, i / 100),
      sampleCurvePath(split, i / 100),
      0.00001,
    );
  assert.deepEqual(removeCurvePoint(split, 2).start, path.start);
  const clampedStart = moveCurvePoint(split, 5, 1, -1);
  near(clampedStart.start![0], split[0]![4] - 0.00001);
  assert.equal(clampedStart.start![1], 0);
  assert.deepEqual(normalizeCurvePath(clampedStart), clampedStart);
  const clampedEnd = moveCurvePoint(split, 6, 0, 2);
  near(clampedEnd.at(-1)![4], split[0]![4] + 0.00001);
  assert.equal(clampedEnd.at(-1)![5], 1);
  assert.deepEqual(normalizeCurvePath(clampedEnd), clampedEnd);
  assert.deepEqual(path.start, [0.15, 0.3]);
});
