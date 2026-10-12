import assert from 'node:assert/strict';
import test from 'node:test';
import {
  rulerTicks,
  rulerStep,
} from '../../../src/canvas-widgets/helpers/ruler-model.ts';

test('ticks stay bounded and follow negative coordinates at large zoom ranges', () => {
  for (const zoom of [1e-12, 0.25, 1, 10, 1e12]) {
    const ticks = rulerTicks(-125 / zoom, zoom, 800, rulerStep(zoom));
    assert.ok(ticks.length > 0 && ticks.length < 100);
    assert.ok(
      ticks.every(
        ({ pixel, value }) =>
          pixel >= 0 && pixel <= 800 && Number.isFinite(value),
      ),
    );
    assert.ok(ticks.some(({ value }) => value < 0));
    assert.ok(ticks.some(({ value }) => value > 0));
  }
});
test('tick allocation depends on viewport, not distance from zero', () => {
  for (const offset of [-1e12, 0, 1e12]) {
    const ticks = rulerTicks(offset, 1, 1000, rulerStep(1));
    assert.ok(ticks.length <= 52);
    assert.ok(ticks.some(({ major }) => major));
  }
});
