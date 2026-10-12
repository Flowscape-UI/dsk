import assert from 'node:assert/strict';
import test from 'node:test';
import {
  projectCanvasPoint,
  unprojectCanvasPoint,
  resolveCanvasCamera,
} from '../../../src/canvas-widgets/coordinates.ts';

test('camera tracking independently applies pan and zoom and remains invertible', () => {
  const point = { x: 20, y: -10 },
    camera = { panX: 100, panY: 50, zoom: 2 };
  for (const [followPan, followZoom, expected] of [
    [true, true, { x: 140, y: 30 }],
    [false, true, { x: 40, y: -20 }],
    [true, false, { x: 120, y: 40 }],
    [false, false, { x: 20, y: -10 }],
  ] as const) {
    const tracking = { followPan, followZoom };
    const screen = projectCanvasPoint(point, camera, tracking);
    assert.deepEqual(screen, expected);
    assert.deepEqual(unprojectCanvasPoint(screen, camera, tracking), point);
  }
});
test('invalid cameras are rejected rather than producing corrupt CSS coordinates', () => {
  for (const zoom of [0, -1, Infinity, NaN])
    assert.throws(
      () => resolveCanvasCamera({ panX: 0, panY: 0, zoom }),
      RangeError,
    );
  assert.throws(
    () => resolveCanvasCamera({ panX: NaN, panY: 0, zoom: 1 }),
    RangeError,
  );
});
