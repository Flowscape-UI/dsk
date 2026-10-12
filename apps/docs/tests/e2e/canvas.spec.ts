import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`canvas examples share camera coordinates and editable guides (${prefix || 'en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/components/canvas`);
    await expect(page.locator('.dsk-canvas-example')).toHaveCount(6);
    const markerDemo = page
      .locator('.dsk-canvas-example[data-kind=marker]')
      .first();
    const marker = markerDemo.locator('dsk-canvas-marker').first();
    const fixed = markerDemo.locator('dsk-canvas-marker').last();
    await expect(
      markerDemo.locator('.dsk-canvas-toolbar button').first(),
    ).toBeEnabled();
    const fixedPosition = await fixed.evaluate(
      (element) => (element as HTMLElement).style.translate,
    );
    await markerDemo.locator('.dsk-canvas-toolbar button').nth(1).click();
    await expect(marker).toHaveAttribute('zoom', '1.25');
    expect(
      await fixed.evaluate(
        (element) => (element as HTMLElement).style.translate,
      ),
    ).toBe(fixedPosition);
    await markerDemo.locator('input[type=checkbox]').nth(2).check();
    await expect(marker).toHaveCSS('scale', '1.25');
    await markerDemo.locator('input[type=checkbox]').nth(0).uncheck();
    await markerDemo.locator('input[type=checkbox]').nth(1).uncheck();
    await expect(marker).toHaveCSS('translate', '60px 60px');
    await expect(marker).toHaveCSS('scale', '1');
    const html = page.locator('.dsk-canvas-example[data-kind=html]');
    await html.locator('.dsk-canvas-note').click();
    await expect(html.locator('.dsk-canvas-events')).not.toBeEmpty();
    const rulerDemo = page
      .locator('.dsk-canvas-example[data-kind=ruler]')
      .first();
    await rulerDemo.scrollIntoViewIfNeeded();
    const ruler = rulerDemo.locator('.dsk-canvas-x');
    const scale = await ruler.boundingBox();
    const viewport = await rulerDemo.locator('dsk-pan-zoom').boundingBox();
    if (!scale || !viewport) throw new Error('Missing ruler layout');
    await page.mouse.move(scale.x + 100, scale.y + 12);
    await page.mouse.down();
    await page.mouse.move(viewport.x + 100, viewport.y + 100, { steps: 6 });
    await page.mouse.up();
    const guide = ruler.locator('[part=guide]');
    await expect(guide).toHaveCount(1);
    await expect(rulerDemo.locator('.dsk-canvas-events')).toContainText(
      'guidechange',
    );
    await guide.focus();
    await guide.press('Delete');
    await expect(guide).toHaveCount(0);
    const pan = page.locator('.dsk-canvas-example[data-kind=pan]');
    for (let i = 0; i < 3; i++)
      await pan.locator('.dsk-canvas-toolbar button').first().click();
    await expect(pan.locator('dsk-pan-zoom [part=grid]')).toHaveCount(0);
    await pan.locator('.dsk-canvas-toolbar button').nth(2).click();
    await expect(pan.locator('dsk-pan-zoom [part=grid]')).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
