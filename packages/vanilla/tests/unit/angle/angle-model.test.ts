import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  angleUnit,
  toDegrees,
  fromDegrees,
  angleDelta,
  pointerDegrees,
  snapAngle,
  formatAngle,
  wrapAngle,
} from '../../../src/angle/helpers/angle-model.ts';

test('supported units round-trip physical angles and format pi fractions', () => {
  for (const unit of ['deg', 'rad', 'pi', 'turn', 'grad'] as const) {
    assert.ok(Math.abs(toDegrees(fromDegrees(90, unit), unit) - 90) < 1e-10);
  }
  assert.equal(angleUnit('PI'), 'pi');
  assert.equal(angleUnit('π'), 'pi');
  assert.equal(angleUnit('invalid'), 'deg');
  assert.equal(formatAngle(90, 'deg'), '90°');
  assert.equal(formatAngle(0.5, 'pi'), 'π/2');
  assert.equal(formatAngle(1.5, 'pi'), '3π/2');
  assert.equal(formatAngle(2, 'pi'), '2π');
  assert.equal(formatAngle(Math.PI / 2, 'rad'), '1.571 rad');
});
test('pointer geometry is clockwise from the top and seam deltas stay small', () => {
  assert.equal(pointerDegrees(0, -1), 0);
  assert.equal(pointerDegrees(1, 0), 90);
  assert.equal(pointerDegrees(0, 1), 180);
  assert.equal(pointerDegrees(-1, 0), 270);
  assert.equal(angleDelta(350, 10), 20);
  assert.equal(angleDelta(10, 350), -20);
});
test('snapping is relative to min and endpoints stay reachable', () => {
  assert.equal(snapAngle(41, 15, 100, 20), 35);
  assert.equal(snapAngle(100, 15, 100, 20), 100);
  assert.equal(snapAngle(-10, 15, 100, 20), 15);
  assert.equal(snapAngle(89.999999, 0, 360, 1), 90);
  assert.equal(snapAngle(30, 30, 30, 1), 30);
});

test('unbounded rotation wraps in both directions and preserves exact endpoints', () => {
  assert.equal(wrapAngle(360, 360), 360);
  assert.equal(wrapAngle(361, 360), 1);
  assert.equal(wrapAngle(-1, 360), 359);
  assert.equal(wrapAngle(1085, 360), 5);
  assert.equal(wrapAngle(-721, 360), 359);
  assert.ok(Math.abs(wrapAngle(2.1, 2) - 0.1) < 1e-10);
});
