import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`tldraw adapter edits shapes and tracks its camera (${prefix || 'en'})`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${prefix}/examples/tldraw`);
    const demo = page.locator('.dsk-tldraw-example');
    await expect(demo).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const x = demo.locator('dsk-input[data-field=x] input');
    const rotation = demo.locator('dsk-input[data-field=rotation] input');
    const shape = demo.locator('.tl-shape[data-shape-id="shape:dsk-example"]');
    await expect(x).toHaveValue('80');
    await x.fill('150');
    await x.press('Enter');
    await expect(shape).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 150, 80)');
    await demo.locator('[data-action=undo]').click();
    await expect(x).toHaveValue('80');
    await demo.locator('[data-action=redo]').click();
    await expect(x).toHaveValue('150');
    await rotation.fill('45');
    await rotation.press('Enter');
    await expect(shape).toHaveCSS('transform', /matrix\(0\.707/);
    await demo.locator('[data-action=undo]').click();
    await expect(rotation).toHaveValue('0');
    const marker = demo.locator('dsk-canvas-marker');
    const before = await marker.getAttribute('x');
    const bounds = await shape.boundingBox();
    if (!bounds) throw new Error('Shape did not render');
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 40,
      bounds.y + bounds.height / 2 + 20,
      { steps: 8 },
    );
    await page.mouse.up();
    await expect(x).not.toHaveValue('150');
    await expect(marker).not.toHaveAttribute('x', before!);
    const ruler = demo.locator('.dsk-tldraw-x');
    const zoom = await ruler.getAttribute('zoom');
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -120);
    await page.keyboard.up('Control');
    await expect(ruler).not.toHaveAttribute('zoom', zoom!);
    await expect(marker).toHaveAttribute(
      'zoom',
      (await ruler.getAttribute('zoom'))!,
    );
    const scale = await ruler.boundingBox();
    const viewport = await demo.locator('.dsk-tldraw-viewport').boundingBox();
    if (!scale || !viewport) throw new Error('Missing ruler layout');
    await page.mouse.move(scale.x + 100, scale.y + 12);
    await page.mouse.down();
    await page.mouse.move(viewport.x + 100, viewport.y + 100, { steps: 6 });
    await page.mouse.up();
    const guide = ruler.locator('[part=guide]');
    await expect(guide).toHaveCount(1);
    await guide.focus();
    await guide.press('Delete');
    await expect(guide).toHaveCount(0);
    await expect(shape).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(x).toBeEnabled();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page
      .locator(`.VPSidebar a[href="${prefix}/components/canvas"]`)
      .click();
    await expect(page.locator('.tl-container')).toHaveCount(0);
    await expect(page.locator('.dsk-canvas-example')).toHaveCount(6);
    expect(errors).toEqual([]);
  });
}
