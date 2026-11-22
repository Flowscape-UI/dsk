import type { DskTimeline } from '../../src/index.ts';
import { test, expect } from '@playwright/test';

test('Delete removes a track with its contents and restores order through undo/redo', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  const before = await timeline.evaluate((el: DskTimeline) => el.tracks);
  await timeline.locator('[part~=track-header]').nth(1).press('Delete');
  await expect(timeline.locator('[part~=track]')).toHaveCount(2);
  await expect(timeline).toHaveJSProperty('selection', null);
  await page.keyboard.press('Control+z');
  expect(await timeline.evaluate((el: DskTimeline) => el.tracks)).toEqual(
    before,
  );
  await page.keyboard.press('Control+Shift+z');
  await expect(timeline.locator('[part~=track]')).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await timeline.locator('[part~=track-header]').first().press('Enter');
  await page.check('#timeline-readOnly');
  await expect(page.locator('#timeline-delete-selection')).toBeDisabled();
  await timeline.focus();
  await page.keyboard.press('Delete');
  await expect(timeline.locator('[part~=track]')).toHaveCount(3);
});

test('playground delete button removes only the selected clip and supports an empty timeline', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  const before = await timeline.evaluate((el: DskTimeline) => el.tracks);
  await timeline
    .locator('[part~=track]')
    .nth(1)
    .locator('[part~=clip]')
    .press('Enter');
  await page.click('#timeline-delete-selection');
  await expect(timeline.locator('[part~=track]')).toHaveCount(3);
  await expect(timeline.locator('[part~=clip]')).toHaveCount(2);
  await expect(page.locator('#timeline-delete-selection')).toBeDisabled();
  await page.keyboard.press('Control+z');
  expect(await timeline.evaluate((el: DskTimeline) => el.tracks)).toEqual(
    before,
  );
  for (let i = 0; i < 3; i++) {
    await timeline.locator('[part~=track-header]').first().press('Enter');
    await page.click('#timeline-delete-selection');
  }
  await expect(timeline.locator('[part~=track]')).toHaveCount(0);
  await page.click('#timeline-add-clip');
  await expect(timeline.locator('[part~=track]')).toHaveCount(0);
  await timeline.focus();
  await page.keyboard.press('Control+z');
  await expect(timeline.locator('[part~=track]')).toHaveCount(1);
  await page.click('#timeline-reset');
  await expect(timeline.locator('[part~=track]')).toHaveCount(3);
});

test('direct track keyframes work without clips and can coexist with optional clips', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  await page.fill('#timeline-track-name', 'Direct X');
  await page.click('#timeline-add-track');
  await expect(timeline.locator('[part~=track]')).toHaveCount(4);
  const row = timeline.locator('[part~=track]').last();
  await expect(row.locator('[part~=clip]')).toHaveCount(0);
  await expect(row.locator('[part~=keyframe]')).toHaveCount(2);
  const key = row.locator('[part~=keyframe]').last();
  await key.press('ArrowLeft');
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[3]!.keyframes![1]!.time),
    )
    .toBe(3.75);
  const r = (await key.boundingBox())!,
    scale = (await timeline.locator('[part~=ruler]').boundingBox())!.width / 12;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 - scale, r.y + r.height / 2);
  await page.mouse.up();
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[3]!.keyframes![1]!.time),
    )
    .toBe(2.75);
  await key.press('Delete');
  await expect(row.locator('[part~=keyframe]')).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(row.locator('[part~=keyframe]')).toHaveCount(2);
  await row.locator('[part~=track-header]').click();
  await page.locator('#timeline-add-keyframe').click();
  await expect(row.locator('[part~=keyframe]')).toHaveCount(3);
  await expect(row.locator('[part~=clip]')).toHaveCount(0);
  await page.click('#timeline-add-clip');
  await expect(row.locator('[part~=clip]')).toHaveCount(1);
  await expect(row.locator('[part~=keyframe]')).toHaveCount(5);
});

test('styling parts and geometry tokens survive editing and history', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  await page.selectOption('#timeline-appearance', 'light');
  const clip = timeline.locator('[part~=motion-clip]');
  await expect(clip).toHaveCSS('background-color', 'rgb(215, 240, 229)');
  await expect(timeline.locator('[part~=keyframe-marker]').first()).toHaveCSS(
    'border-radius',
    '50%',
  );
  await clip.press('ArrowRight');
  await expect(clip).toHaveAttribute('part', /selected-clip/);
  await expect(clip).toHaveCSS('outline-width', '2px');
  await clip.press('Control+z');
  await expect(clip).toHaveCSS('background-color', 'rgb(215, 240, 229)');
  await page.selectOption('#timeline-appearance', 'compact');
  await expect(timeline.locator('[part~=track]').first()).toHaveCSS(
    'height',
    '42px',
  );
  await expect(timeline.locator('[part~=track-header]').first()).toHaveCSS(
    'width',
    '100px',
  );
  const first = timeline.locator('[part~=clip]').first();
  const r = (await first.boundingBox())!,
    scale = (await timeline.locator('[part~=ruler]').boundingBox())!.width / 12;
  await page.mouse.move(r.x + 20, r.y + 10);
  await page.mouse.down();
  await page.mouse.move(r.x + 20 + scale, r.y + 10);
  await page.mouse.up();
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.clips[0]!.start),
    )
    .toBe(1.5);
});

test('keyframes can be added, edited, deleted and restored with history', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  await timeline.evaluate((el: DskTimeline) => {
    el.currentTime = 3;
  });
  await timeline
    .locator('[part~=track]')
    .nth(1)
    .locator('[part~=clip]')
    .press('Enter');
  await page.locator('#timeline-add-keyframe').click();
  await expect(timeline.locator('[part~=keyframe]')).toHaveCount(10);
  await expect
    .poll(() =>
      timeline.evaluate(
        (el: DskTimeline) => el.tracks[1]!.clips[0]!.keyframes!.at(-1)!.time,
      ),
    )
    .toBe(2);
  await timeline
    .locator('[part~=track]')
    .nth(1)
    .locator('[part~=keyframe]')
    .last()
    .click();
  await page.locator('#timeline-keyframe-value').fill('0.2');
  await page.locator('#timeline-update-keyframe').click();
  await expect
    .poll(() =>
      timeline.evaluate(
        (el: DskTimeline) => el.tracks[1]!.clips[0]!.keyframes!.at(-1)!.value,
      ),
    )
    .toBe(0.2);
  await page.locator('#timeline-delete-keyframe').click();
  await expect(timeline.locator('[part~=keyframe]')).toHaveCount(9);
  await timeline.focus();
  await page.keyboard.press('Control+z');
  await expect(timeline.locator('[part~=keyframe]')).toHaveCount(10);
  await page.keyboard.press('Control+Shift+z');
  await expect(timeline.locator('[part~=keyframe]')).toHaveCount(9);
});

test('keyframe dragging and keyboard editing preserve clip geometry', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo'),
    key = timeline
      .locator('[part~=track]')
      .nth(1)
      .locator('[part~=keyframe]')
      .nth(1);
  const r = (await key.boundingBox())!,
    scale = (await timeline.locator('[part~=ruler]').boundingBox())!.width / 12;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 + scale, r.y + r.height / 2, {
    steps: 4,
  });
  await page.mouse.up();
  await expect
    .poll(() =>
      timeline.evaluate(
        (el: DskTimeline) => el.tracks[1]!.clips[0]!.keyframes![1]!.time,
      ),
    )
    .toBe(4.5);
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[1]!.clips[0]!.start),
    )
    .toBe(1);
  await key.press('ArrowLeft');
  await expect
    .poll(() =>
      timeline.evaluate(
        (el: DskTimeline) => el.tracks[1]!.clips[0]!.keyframes![1]!.time,
      ),
    )
    .toBe(4.25);
  await key.press('Delete');
  await expect(timeline.locator('[part~=keyframe]')).toHaveCount(8);
  await page.keyboard.press('Control+z');
  await expect(timeline.locator('[part~=keyframe]')).toHaveCount(9);
});

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('#timeline-demo').scrollIntoViewIfNeeded();
});
test('playback drives preview, pauses, ends and loops', async ({ page }) => {
  const timeline = page.locator('#timeline-demo');
  await timeline.locator('[part~=play-button]').click();
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.currentTime))
    .toBeGreaterThan(0.1);
  await timeline.locator('[part~=play-button]').click();
  const time = await timeline.evaluate((el: DskTimeline) => el.currentTime);
  await expect(timeline).toHaveJSProperty('playing', false);
  await expect(timeline).toHaveJSProperty('currentTime', time);
  await timeline.evaluate((el: DskTimeline) => {
    el.currentTime = 11.9;
    el.play();
  });
  await expect(timeline).toHaveJSProperty('playing', false);
  await expect(timeline).toHaveJSProperty('currentTime', 12);
  await timeline.evaluate((el: DskTimeline) => {
    el.loop = true;
    el.play();
  });
  await expect(timeline).toHaveJSProperty('playing', true);
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.currentTime))
    .toBeLessThan(12);
  await timeline.evaluate((el: DskTimeline) => el.pause());
});
test('track pointer reorder and keyboard undo/redo', async ({ page }) => {
  const timeline = page.locator('#timeline-demo');
  const label = timeline.locator('[part~=track-header]').first();
  const r = (await label.boundingBox())!;
  await page.mouse.move(r.x + 30, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + 30, r.y + r.height * 2.5, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks.map((t) => t.id)),
    )
    .toEqual(['rotation', 'opacity', 'position']);
  await timeline.focus();
  await page.keyboard.press('Control+z');
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.tracks[0]!.id))
    .toBe('position');
  await page.keyboard.press('Control+Shift+z');
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.tracks[2]!.id))
    .toBe('position');
  await timeline.locator('[part~=track-header]').last().press('Alt+ArrowUp');
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.tracks[1]!.id))
    .toBe('position');
});
test('clips move and resize with history and cancel', async ({ page }) => {
  const timeline = page.locator('#timeline-demo');
  const clip = timeline.locator('[part~=clip]').first();
  const r = (await clip.boundingBox())!;
  await page.mouse.move(r.x + 30, r.y + 15);
  await page.mouse.down();
  await page.mouse.move(r.x + 80, r.y + 15, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.clips[0]!.start),
    )
    .toBeGreaterThan(0.5);
  await clip.press('Control+z');
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.clips[0]!.start),
    )
    .toBe(0.5);
  await clip.press('Alt+ArrowRight');
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.clips[0]!.duration),
    )
    .toBe(4.25);
  const edge = (await clip.locator('[part~=resize-end]').boundingBox())!;
  await page.mouse.move(edge.x + 2, edge.y + 10);
  await page.mouse.down();
  await page.mouse.move(edge.x + 52, edge.y + 10);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.clips[0]!.duration),
    )
    .toBe(4.25);
});
test('readonly preserves playback, disabled blocks it, assignment is isolated', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  await timeline.evaluate((el: DskTimeline) => {
    el.readOnly = true;
    const tracks = el.tracks;
    tracks[0]!.clips[0]!.start = 8;
  });
  await timeline.locator('[part~=clip]').first().press('ArrowRight');
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.clips[0]!.start),
    )
    .toBe(0.5);
  await timeline.locator('[part~=play-button]').click();
  await expect(timeline).toHaveJSProperty('playing', true);
  await timeline.evaluate((el: DskTimeline) => {
    el.disabled = true;
  });
  await expect(timeline).toHaveJSProperty('playing', false);
  await expect(timeline.locator('[part~=play-button]')).toBeDisabled();
  await timeline.evaluate((el: DskTimeline) => {
    el.disabled = false;
    el.play();
    el.remove();
  });
});

test('seeking updates preview and zoomed clips retain time coordinates', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  const ruler = timeline.locator('[part~=ruler]');
  const rect = (await ruler.boundingBox())!;
  const before = await page
    .locator('#timeline-preview-object')
    .evaluate((el) => el.style.transform);
  await page.mouse.click(rect.x + rect.width / 2, rect.y + 15);
  await expect
    .poll(() => timeline.evaluate((el: DskTimeline) => el.currentTime))
    .toBeCloseTo(6, 1);
  await expect
    .poll(() =>
      page
        .locator('#timeline-preview-object')
        .evaluate((el) => el.style.transform),
    )
    .not.toBe(before);
  await page.selectOption('#timeline-zoom', '2');
  const clip = timeline.locator('[part~=clip]').first();
  const clipRect = (await clip.boundingBox())!;
  const scale = (await ruler.boundingBox())!.width / 12;
  await page.mouse.move(clipRect.x + 20, clipRect.y + 15);
  await page.mouse.down();
  await page.mouse.move(clipRect.x + 20 + scale, clipRect.y + 15);
  await page.mouse.up();
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.clips[0]!.start),
    )
    .toBe(1.5);
});

test('rejects invalid data and disconnect stops the playback clock', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  expect(
    await timeline.evaluate((el: DskTimeline) => {
      try {
        el.tracks = [
          {
            id: 'x',
            label: 'X',
            clips: [{ id: 'a', label: 'A', start: NaN, duration: 1 }],
          },
        ];
      } catch (error) {
        return error instanceof RangeError;
      }
      return false;
    }),
  ).toBe(true);
  const state = await timeline.evaluate((el: DskTimeline) => {
    el.play();
    el.remove();
    return { playing: el.playing, count: el.tracks.length };
  });
  expect(state).toEqual({ playing: false, count: 3 });
});

test('playground combines properties and lets users add motion layers', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo');
  const ruler = timeline.locator('[part~=ruler]'),
    r = (await ruler.boundingBox())!;
  await page.mouse.click(r.x + r.width / 4, r.y + 12);
  const before = await page
    .locator('#timeline-preview-object')
    .evaluate((el) => ({
      transform: el.style.transform,
      opacity: Number(el.style.opacity),
    }));
  expect(before.transform).toContain('translateX(');
  expect(before.transform).not.toContain('rotate(0deg)');
  expect(before.opacity).toBeGreaterThan(0.2);
  expect(before.opacity).toBeLessThan(1);
  await page.check('#timeline-with-clip');
  for (const property of ['position', 'rotation', 'opacity']) {
    await page.selectOption('#timeline-track-property', property);
    await page.fill('#timeline-track-name', `Extra ${property}`);
    await page.click('#timeline-add-track');
  }
  await expect(timeline.locator('[part~=track]')).toHaveCount(6);
  const tracks = await timeline.evaluate((el: DskTimeline) => el.tracks);
  expect(new Set(tracks.map((t) => t.id)).size).toBe(6);
  expect(
    tracks.slice(3).every((t) => t.clips[0]!.keyframes!.length === 2),
  ).toBe(true);
  // At five seconds all three new layers are halfway through their four-second clips.
  await ruler.scrollIntoViewIfNeeded();
  const next = (await ruler.boundingBox())!;
  await page.mouse.click(next.x + (next.width * 5) / 12, next.y + 12);
  const values = await page
    .locator('#timeline-preview-object')
    .evaluate((el) => ({
      transform: el.style.transform,
      opacity: Number(el.style.opacity),
    }));
  expect(values.transform).toContain('translateX(130px)');
  expect(values.transform).toContain('rotate(');
  expect(values.opacity).toBeLessThan(0.66);
  await page.click('#timeline-reset');
  await expect(timeline.locator('[part~=track]')).toHaveCount(3);
  await expect(timeline).toHaveJSProperty('currentTime', 0);
  await page.check('#timeline-readOnly');
  await expect(page.locator('#timeline-add-track')).toBeDisabled();
});

test('track selection remains visible and directs new keyframes to the selected track', async ({
  page,
}) => {
  const timeline = page.locator('#timeline-demo'),
    rows = timeline.locator('[part~=track]');
  await expect(page.locator('#timeline-add-keyframe')).toBeDisabled();
  await rows.nth(2).locator('[part~=track-header]').click();
  await expect(rows.nth(2)).toHaveAttribute('part', /selected-track/);
  await expect(rows.nth(2).locator('[part~=track-header]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('#timeline-keyframe-target')).toContainText(
    'Opacity',
  );
  const lane = rows.first().locator('[part~=lane]'),
    r = (await lane.boundingBox())!;
  await page.mouse.click(r.x + r.width - 20, r.y + 5);
  await expect(rows.first()).toHaveAttribute('part', /selected-track/);
  await expect(rows.nth(2).locator('[part~=track-header]')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await page.click('#timeline-add-keyframe');
  await expect
    .poll(() =>
      timeline.evaluate((el: DskTimeline) => el.tracks[0]!.keyframes?.length),
    )
    .toBe(1);
  await expect(rows.first()).toHaveAttribute('part', /selected-track/);
  await rows.nth(1).locator('[part~=track-header]').press('Enter');
  await expect(page.locator('#timeline-keyframe-target')).toContainText(
    'Rotation',
  );
  await expect(rows.nth(1)).toHaveAttribute('part', /selected-track/);
});
