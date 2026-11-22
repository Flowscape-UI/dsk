import { expect, test } from '@playwright/test';
import type { DskTimeline } from '@flowscape-ui/dsk';

for (const prefix of ['', '/ru']) {
  test(`transform examples preserve content and expose handles (${prefix || 'en'})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${prefix}/components/transform-box`);
    const boxes = page.locator('.dsk-editor-example dsk-transform-box');
    await expect(boxes).toHaveCount(4);
    await boxes.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(boxes.first()).toHaveJSProperty('x', 13);
    const headerBox = boxes.nth(1);
    await headerBox.locator('input').fill('My object');
    await headerBox.locator('dsk-transform-header').press('Shift+ArrowRight');
    await expect(headerBox).toHaveJSProperty('x', 22);
    await expect(headerBox.locator('input')).toHaveValue('My object');
    const handles = boxes.nth(2);
    await handles
      .locator('dsk-transform-box-handle-rotate')
      .press('ArrowRight');
    await expect(handles).toHaveJSProperty('angle', 1);
    await handles
      .locator('dsk-transform-box-handle-resize')
      .press('ArrowRight');
    await expect(handles).toHaveJSProperty('width', 201);
    await page.keyboard.press('Control+z');
    await expect(handles).toHaveJSProperty('width', 200);
    await handles
      .locator('..')
      .screenshot({ path: test.info().outputPath('transform.png') });
    await expect(
      page
        .locator('.dsk-framework-code')
        .getByText('React', { exact: true })
        .first(),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`timeline playback, editing and cleanup (${prefix || 'en'})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${prefix}/components/timeline`);
    const demo = page.locator('.dsk-editor-example').first();
    const timeline = demo.locator('dsk-timeline');
    await expect(timeline.locator('[part~=track]')).toHaveCount(3);
    const object = demo.locator('.dsk-editor-motion-object');
    const before = await object.getAttribute('style');
    await timeline.locator('[part~=play-button]').click();
    await expect.poll(() => object.getAttribute('style')).not.toBe(before);
    await timeline.locator('[part~=play-button]').click();
    const advanced = page.locator('.dsk-editor-example').nth(1);
    await advanced.screenshot({ path: test.info().outputPath('timeline.png') });
    const editor = advanced.locator('dsk-timeline');
    await editor.locator('[part~=track-header]').first().press('Enter');
    await advanced.locator('[data-add]').click();
    await expect(editor.locator('[part~=keyframe]')).toHaveCount(7);
    await editor.focus();
    await page.keyboard.press('Control+z');
    await expect(editor.locator('[part~=keyframe]')).toHaveCount(6);
    await editor.locator('[part~=track-header]').first().press('Enter');
    await advanced.locator('[data-lock]').check();
    await expect(editor.locator('[part~=locked-track]')).toHaveCount(1);
    await advanced.locator('[data-lock]').uncheck();
    await advanced.locator('[data-delete]').click();
    await expect(editor.locator('[part~=track]')).toHaveCount(2);
    await editor.focus();
    await page.keyboard.press('Control+z');
    await expect(editor.locator('[part~=track]')).toHaveCount(3);
    await editor.locator('[part~=keyframe]').first().press('Enter');
    await advanced.locator('[data-easing]').selectOption('custom');
    await advanced.locator('[data-coordinate]').first().fill('0.5');
    await advanced.locator('[data-coordinate]').first().press('Tab');
    await expect
      .poll(() =>
        editor.evaluate(
          (element: DskTimeline) => element.tracks[0]?.keyframes?.[0]?.easing,
        ),
      )
      .toEqual([0.5, 0.1, 0.25, 1]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page
      .locator('.VPSidebar')
      .getByRole('link', { name: prefix ? 'Док-панели' : 'Dock', exact: true })
      .click();
    await expect(page.locator('dsk-dock').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test(`dock destinations and drag-only overlays (${prefix || 'en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/components/dock`);
    for (const dock of [
      page.locator('dsk-dock').first(),
      page.locator('dsk-dock').nth(1),
    ]) {
      const zones = dock.locator('dsk-dock-zone');
      const handle = dock.locator('[data-dsk-dock-handle]');
      await dock.locator('input').fill('Preserved');
      if (
        await dock.evaluate((el) =>
          el.classList.contains('dsk-editor-dock-overlay'),
        )
      ) {
        await expect(zones.nth(1)).toBeHidden();
      }
      await handle.press('Space');
      await expect(zones.nth(1)).toBeVisible();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(zones.nth(1).locator('dsk-dock-item')).toHaveCount(1);
      await expect(zones.nth(1).locator('input')).toHaveValue('Preserved');
      await expect(dock).not.toHaveAttribute('data-dragging');
    }
    await page
      .locator('dsk-dock')
      .first()
      .screenshot({ path: test.info().outputPath('dock.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
