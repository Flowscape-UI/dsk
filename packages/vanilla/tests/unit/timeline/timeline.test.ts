import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evaluateTimelineKeyframes,
  evaluateTimelineTrack,
} from '../../../src/timeline/interpolation.ts';
import {
  copyTracks,
  type TimelineKeyframe,
} from '../../../src/timeline/helpers/model.ts';
import {
  movingItems,
  moveItems,
} from '../../../src/timeline/helpers/selection.ts';

test('timeline interpolation holds endpoints, steps and resolves duplicate times', () => {
  const frames: TimelineKeyframe[] = [
    { id: 'a', time: 1, value: 0 },
    { id: 'b', time: 3, value: 10 },
  ];
  assert.equal(evaluateTimelineKeyframes(frames, 0), 0);
  assert.equal(evaluateTimelineKeyframes(frames, 2), 5);
  assert.equal(evaluateTimelineKeyframes(frames, 4), 10);
  frames[0]!.easing = 'step';
  assert.equal(evaluateTimelineKeyframes(frames, 2.99), 0);
  assert.equal(evaluateTimelineKeyframes(frames, 3), 10);
  assert.equal(
    evaluateTimelineKeyframes(
      [...frames, { id: 'last', time: 3, value: 20 }],
      3,
    ),
    20,
  );
  assert.equal(evaluateTimelineKeyframes([], 2), undefined);
  assert.equal(evaluateTimelineKeyframes(frames, NaN), undefined);
});
test('Bezier easing uses horizontal inversion and is independently cloned', () => {
  const frames: TimelineKeyframe[] = [
    { id: 'a', time: 0, value: 0, easing: [0.42, 0, 1, 1] },
    { id: 'b', time: 1, value: 1 },
  ];
  const sampled = evaluateTimelineKeyframes(frames, 0.5)!;
  assert.ok(sampled > 0.3 && sampled < 0.33);
  const tracks = copyTracks([{ id: 't', label: 'Track', keyframes: frames }]);
  assert.notEqual(tracks[0]!.keyframes![0]!.easing, frames[0]!.easing);
  assert.throws(
    () =>
      copyTracks([
        {
          id: 't',
          label: 'T',
          keyframes: [{ id: 'a', time: 0, easing: [-1, 0, 1, 1] }],
        },
      ]),
    TypeError,
  );
});
test('muted tracks do not evaluate, locked tracks do, and clip time is local', () => {
  const track = {
    id: 't',
    label: 'T',
    locked: true,
    clips: [
      {
        id: 'c',
        label: 'C',
        start: 2,
        duration: 2,
        keyframes: [
          { id: 'a', time: 0, value: 0 },
          { id: 'b', time: 2, value: 10 },
        ],
      },
    ],
  };
  assert.deepEqual(evaluateTimelineTrack(track, 3), [
    { clipId: 'c', value: 5 },
  ]);
  assert.deepEqual(evaluateTimelineTrack({ ...track, muted: true }, 3), []);
  assert.deepEqual(evaluateTimelineTrack(track, 1), []);
});
test('group movement clamps one common delta and does not move nested keys twice', () => {
  const tracks = copyTracks([
    {
      id: 't',
      label: 'T',
      clips: [
        {
          id: 'c',
          label: 'C',
          start: 1,
          duration: 3,
          keyframes: [{ id: 'f', time: 1, value: 0 }],
        },
      ],
      keyframes: [{ id: 'direct', time: 5, value: 1 }],
    },
  ]);
  const selected = [
    { trackId: 't', clipId: 'c', keyframeId: null },
    { trackId: 't', clipId: 'c', keyframeId: 'f' },
    { trackId: 't', clipId: null, keyframeId: 'direct' },
  ];
  const moved = moveItems(tracks, movingItems(tracks, selected, 6), 10);
  assert.equal(moved[0]!.clips[0]!.start, 2);
  assert.equal(moved[0]!.clips[0]!.keyframes![0]!.time, 1);
  assert.equal(moved[0]!.keyframes![0]!.time, 6);
  assert.equal(tracks[0]!.clips[0]!.start, 1);
  tracks[0]!.locked = true;
  assert.equal(movingItems(tracks, selected, 6).length, 0);
});
