import { expect, test } from '@playwright/test';

for (const engine of ['konva', 'fabric']) {
  test(`${engine} connects native fields, gestures and camera overlays`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`/examples/${engine}`);
    const demo = page.locator('.dsk-engine-example');
    await expect(demo).toHaveAttribute('data-ready', 'true', {
      timeout: 30_000,
    });
    const surface = demo.locator('.dsk-engine-surface');
    const x = demo.locator('dsk-input[data-field=x] input');
    const rotation = demo.locator('dsk-input[data-field=rotation] input');
    const marker = demo.locator('dsk-canvas-marker');
    const ruler = demo.locator('.dsk-engine-x');
    await expect(x).toHaveValue('180');
    const initialAnchor = Number(await marker.getAttribute('x'));

    // The marker comes from the engine's geometry, not the input's own state.
    await x.fill('250');
    await x.press('Enter');
    await expect
      .poll(async () => Number(await marker.getAttribute('x')))
      .toBeCloseTo(initialAnchor + 70, 1);
    const beforeRotation = await marker.getAttribute('x');
    await rotation.fill('35');
    await rotation.press('Enter');
    await expect(marker).not.toHaveAttribute('x', beforeRotation!);
    await demo.locator('[data-action=reset]').click();
    await expect(x).toHaveValue('180');
    await expect(rotation).toHaveValue('0');

    await surface.scrollIntoViewIfNeeded();
    const bounds = await surface.boundingBox();
    if (!bounds) throw new Error('Missing engine surface');
    const zoom = Number(await marker.getAttribute('zoom'));
    const panX = Number(await marker.getAttribute('pan-x'));
    const panY = Number(await marker.getAttribute('pan-y'));
    const center = {
      x: bounds.x + panX + 180 * zoom,
      y: bounds.y + panY + 145 * zoom,
    };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 20, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await x.inputValue()))
      .toBeCloseTo(180 + 40 / zoom, 0);
    await expect
      .poll(async () => Number(await marker.getAttribute('x')))
      .toBeCloseTo(initialAnchor + 40 / zoom, 0);

    // Selecting a different engine object changes the same DSK inspector.
    await page.mouse.click(
      bounds.x + panX + 390 * zoom,
      bounds.y + panY + 235 * zoom,
    );
    await expect(x).toHaveValue('390');
    const rectangleAnchor = await marker.getAttribute('x');
    await x.fill('420');
    await x.press('Enter');
    await expect(marker).toHaveAttribute('x', rectangleAnchor!);

    // Empty-space drag pans; zoom uses the same camera for both overlays.
    await page.mouse.move(bounds.x + 12, bounds.y + 16);
    await page.mouse.down();
    await page.mouse.move(bounds.x + 42, bounds.y + 36, { steps: 6 });
    await page.mouse.up();
    await expect(marker).not.toHaveAttribute('pan-x', String(panX));
    await page.mouse.click(bounds.x + 12, bounds.y + 16);
    await expect(x).toBeDisabled();
    const beforeZoom = await marker.getAttribute('zoom');
    await page.mouse.wheel(0, -120);
    await expect(marker).not.toHaveAttribute('zoom', beforeZoom!);
    await expect(ruler).toHaveAttribute(
      'zoom',
      (await marker.getAttribute('zoom'))!,
    );
    await demo.locator('[data-action=select]').click();
    await expect(x).toBeEnabled();

    await page.locator('.VPSidebar a[href="/components/canvas"]').click();
    await expect(page.locator('.dsk-engine-example')).toHaveCount(0);
    await expect(
      page.locator('.konvajs-content, .canvas-container'),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
