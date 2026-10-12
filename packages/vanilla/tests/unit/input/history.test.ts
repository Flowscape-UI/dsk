import assert from 'node:assert/strict';
import test from 'node:test';
import { DskHistory } from '../../../src/helpers/history.ts';

test('history branches, resets and bounds snapshots', () => {
  const history = new DskHistory(0);
  for (let i = 1; i <= 120; i++) history.record(i);
  for (let i = 119; i >= 21; i--) assert.equal(history.restore(false), i);
  assert.equal(history.restore(false), undefined);
  assert.equal(history.restore(true), 22);
  history.record(300);
  assert.equal(history.restore(true), undefined);
  assert.equal(history.restore(false), 22);
  history.reset(7);
  assert.equal(history.restore(false), undefined);
  assert.equal(history.restore(true), undefined);
});

test('duplicate commits preserve redo; drafts may explicitly discard it', () => {
  const history = new DskHistory('first');
  history.record('second');
  history.restore(false);
  history.record('first');
  assert.equal(history.canRedo, true);
  history.discardRedo();
  assert.equal(history.canRedo, false);
});
