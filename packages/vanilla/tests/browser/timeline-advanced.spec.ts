import { test, expect } from '@playwright/test';
import type { DskTimeline } from '../../src/index.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('#timeline-demo').scrollIntoViewIfNeeded();
  await page.locator('#timeline-demo').evaluate((el: DskTimeline) => {
    el.tracks = [
      {
        id: 'position',
        label: 'Position',
        keyframes: [
          { id: 'a', time: 1, value: 0 },
          { id: 'b', time: 3, value: 100 },
        ],
      },
      {
        id: 'rotation',
        label: 'Rotation',
        keyframes: [
          { id: 'c', time: 5, value: 0 },
          { id: 'd', time: 7, value: 90 },
        ],
      },
    ];
  });
});
test('shift selection moves and deletes a group atomically, with boundary clamping and undo', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo'),
    keys = timeline.locator('[part~=keyframe]');
  await keys.nth(0).click();
  await keys.nth(1).click({ modifiers: ['Shift'] });
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.selections.length))
    .toBe(2);
  await keys.nth(1).press('ArrowRight');
  expect(
    await timeline.evaluate((el: DskTimeline) =>
      el.tracks[0]!.keyframes!.map((f) => f.time),
    ),
  ).toEqual([1.25, 3.25]);
  await keys.nth(1).press('Control+z');
  expect(
    await timeline.evaluate((el: DskTimeline) =>
      el.tracks[0]!.keyframes!.map((f) => f.time),
    ),
  ).toEqual([1, 3]);
  const r = (await keys.nth(0).boundingBox())!,
    scale = (await timeline.locator('[part~=ruler]').boundingBox())!.width / 12;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 - scale * 2, r.y + r.height / 2);
  await page.mouse.up();
  expect(
    await timeline.evaluate((el: DskTimeline) =>
      el.tracks[0]!.keyframes!.map((f) => f.time),
    ),
  ).toEqual([0, 2]);
  await keys.nth(0).press('Delete');
  await expect(keys).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(keys).toHaveCount(4);
});
test('marquee selects keys across lanes and Escape restores the previous selection', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo'),
    lanes = timeline.locator('[part~=lane]');
  const a = (await lanes.nth(0).boundingBox())!,
    b = (await lanes.nth(1).boundingBox())!,
    scale = a.width / 12;
  await page.mouse.move(a.x + scale * 0.5, a.y + 3);
  await page.mouse.down();
  await page.mouse.move(a.x + scale * 5.5, b.y + b.height - 3, { steps: 5 });
  await expect(timeline.locator('[part~=selection-box]')).toBeVisible();
  await page.mouse.up();
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.selections.length))
    .toBe(3);
  await page.mouse.move(a.x + scale * 0.1, a.y + 3);
  await page.mouse.down();
  await page.mouse.move(a.x + scale * 8, b.y + b.height - 3);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.selections.length))
    .toBe(3);
});
test('locked tracks reject edits while muted tracks stop affecting the preview', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  await timeline.locator('[part~=track-header]').first().click();
  await page.check('#timeline-track-locked');
  const before = await timeline.evaluate((el: DskTimeline) => el.tracks[0]);
  await timeline.locator('[part~=keyframe]').first().press('ArrowRight');
  await timeline.locator('[part~=keyframe]').first().press('Delete');
  expect(await timeline.evaluate((el: DskTimeline) => el.tracks[0])).toEqual(
    before,
  );
  expect(
    await timeline.evaluate((el: DskTimeline) =>
      el.addKeyframe('position', null, { id: 'no', time: 2 }),
    ),
  ).toBe(false);
  const ruler = (await timeline.locator('[part~=ruler]').boundingBox())!;
  await page.mouse.click(ruler.x + ruler.width / 6, ruler.y + 8);
  await expect(page.locator('#timeline-values')).toContainText('X: 50.0');
  await page.check('#timeline-track-muted');
  await expect(page.locator('#timeline-values')).toContainText('X: 0.0');
  await timeline.focus();
  await page.keyboard.press('Control+z');
  await expect(page.locator('#timeline-values')).toContainText('X: 50.0');
});
test('range playback stops and loops inside the selected interval', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  await timeline.evaluate((el: DskTimeline) => {
    el.rangeStart = 2;
    el.rangeEnd = 2.25;
    el.currentTime = 0;
    el.play();
  });
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.currentTime))
    .toBeGreaterThanOrEqual(2);
  await expect(timeline).toHaveJSProperty('playing', false);
  await expect(timeline).toHaveJSProperty('currentTime', 2.25);
  await timeline.evaluate((el: DskTimeline) => {
    el.loop = true;
    el.play();
  });
  await expect(timeline).toHaveJSProperty('playing', true);
  await page.waitForTimeout(400);
  const current = await timeline.evaluate((el: DskTimeline) => {
    el.pause();
    return el.currentTime;
  });
  expect(current).toBeGreaterThanOrEqual(2);
  expect(current).toBeLessThan(2.25);
  await timeline.locator('[part~=range-end]').press('ArrowRight');
  await expect(timeline).toHaveJSProperty('rangeEnd', 2.5);
});
test('element snapping shows a guide and Alt disables it', async ({ page }) => {
  const timeline = page.locator('#timeline-demo');
  await timeline.evaluate((el: DskTimeline) => {
    el.step = 0.01;
    el.currentTime = 2.13;
  });
  const key = timeline.locator('[part~=keyframe]').first(),
    r = (await key.boundingBox())!,
    scale = (await timeline.locator('[part~=ruler]').boundingBox())!.width / 12;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 + 1.1 * scale, r.y + r.height / 2);
  await expect(timeline.locator('[part~=snap-guide]')).toBeVisible();
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.keyframes![0]!.time),
    )
    .toBeCloseTo(2.13, 2);
  await page.keyboard.down('Alt');
  await page.mouse.move(r.x + r.width / 2 + 1.11 * scale, r.y + r.height / 2);
  await expect(timeline.locator('[part~=snap-guide]')).toHaveCount(0);
  await page.mouse.up();
  await page.keyboard.up('Alt');
});
test('outgoing easing is editable through presets and dsk-curve with history', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  await timeline.locator('[part~=keyframe]').first().click();
  await page.selectOption('#timeline-easing', 'step');
  const ruler = (await timeline.locator('[part~=ruler]').boundingBox())!;
  await page.mouse.click(ruler.x + ruler.width / 6, ruler.y + 8);
  await expect(page.locator('#timeline-values')).toContainText('X: 0.0');
  await page.selectOption('#timeline-easing', 'custom');
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) =>
        Array.isArray(el.tracks[0]!.keyframes![0]!.easing),
      ),
    )
    .toBe(true);
  await timeline.focus();
  await page.keyboard.press('Control+z');
  await expect
    .poll(() =>
      timeline.evaluate(
        (el: DskTimeline) => el.tracks[0]!.keyframes![0]!.easing,
      ),
    )
    .toBe('step');
});
