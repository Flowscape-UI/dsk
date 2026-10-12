import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`Three.js meshes share selection, transforms and camera with DSK (${prefix || 'en'})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${prefix}/examples/three`);
    const demo = page.locator('.dsk-three-example');
    await expect(demo).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.dsk-engine-loader')).toHaveAttribute(
      'aria-busy',
      'false',
    );
    const canvas = demo.locator('canvas');
    const x = demo.locator('dsk-input[data-field=x] input');
    const y = demo.locator('dsk-input[data-field=y] input');
    const rotation = demo.locator('dsk-input[data-field=rotation] input');
    const marker = demo.locator('dsk-canvas-marker');
    const ruler = demo.locator('.dsk-engine-x');
    const camera = () =>
      ruler.evaluate(
        (element) =>
          (
            element as HTMLElement & {
              camera: { panX: number; panY: number; zoom: number };
            }
          ).camera,
      );

    await expect(x).toHaveValue('150');
    await expect(y).toHaveValue('130');
    await x.fill('190');
    await x.press('Enter');
    await y.fill('170');
    await y.press('Enter');
    const beforeRotation = await marker.getAttribute('x');
    await rotation.fill('45');
    await rotation.press('Enter');
    await expect(rotation).toHaveValue('45');
    await expect(marker).not.toHaveAttribute('x', beforeRotation!);

    // Raycast at the object's new center to verify fields changed the real mesh.
    await canvas.scrollIntoViewIfNeeded();
    const viewport = await canvas.boundingBox();
    if (!viewport) throw new Error('Three.js canvas did not render');
    const start = await camera();
    const center = {
      x: viewport.x + start.panX + 190 * start.zoom,
      y: viewport.y + start.panY + 170 * start.zoom,
    };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 40, center.y + 20, { steps: 6 });
    await page.mouse.up();
    expect(Number(await x.inputValue())).toBeCloseTo(190 + 40 / start.zoom, 1);
    expect(Number(await y.inputValue())).toBeCloseTo(170 + 20 / start.zoom, 1);
    await expect(rotation).toHaveValue('45');

    // A different mesh gets its own transform, but the comment stays on the box.
    const boxAnchor = await marker.getAttribute('x');
    await page.mouse.click(
      viewport.x + start.panX + 380 * start.zoom,
      viewport.y + start.panY + 220 * start.zoom,
    );
    await expect(x).toHaveValue('380');
    await expect(demo.locator('output')).toHaveText(
      prefix ? 'Фиолетовый диск' : 'Purple puck',
    );
    await canvas.press('ArrowRight');
    await expect(x).toHaveValue('381');
    await canvas.press('Shift+ArrowDown');
    await expect(y).toHaveValue('230');
    await expect(marker).toHaveAttribute('x', boxAnchor!);

    const beforeZoom = await camera();
    await page.mouse.move(viewport.x + 30, viewport.y + 30);
    await page.mouse.wheel(0, -160);
    await expect
      .poll(async () => (await camera()).zoom)
      .toBeGreaterThan(beforeZoom.zoom);
    const afterZoom = await camera();
    await expect(marker).toHaveAttribute('zoom', String(afterZoom.zoom));
    await expect(marker).toHaveAttribute('pan-x', String(afterZoom.panX));
    await expect(marker).toHaveAttribute('pan-y', String(afterZoom.panY));

    // Pan from empty space, then clear selection with the keyboard.
    await page.mouse.move(viewport.x + 12, viewport.y + 12);
    await page.mouse.down();
    await page.mouse.move(viewport.x + 42, viewport.y + 32, { steps: 4 });
    await page.mouse.up();
    const afterPan = await camera();
    expect(afterPan.panX - afterZoom.panX).toBeCloseTo(30, 1);
    expect(afterPan.panY - afterZoom.panY).toBeCloseTo(20, 1);
    await canvas.press('Escape');
    await expect(x).toBeDisabled();
    await expect(rotation).toBeDisabled();
    await demo.locator('[data-action=select]').click();
    await expect(x).toBeEnabled();
    await demo.locator('[data-action=reset]').click();
    await expect(x).toHaveValue('150');
    await expect(y).toHaveValue('130');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(canvas).toBeVisible();
    await expect(x).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const mobile = await canvas.boundingBox();
    expect(mobile?.width).toBeGreaterThan(200);
    expect(mobile?.width).toBeLessThan(390);

    // SPA navigation removes the WebGL canvas and permits a fresh mount.
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page
      .locator(`.VPSidebar a[href="${prefix}/components/canvas"]`)
      .click();
    await expect(demo).toHaveCount(0);
    await expect(page.locator('.dsk-canvas-example')).toHaveCount(6);
    await page.locator(`.VPSidebar a[href="${prefix}/examples/three"]`).click();
    await expect(demo).toHaveAttribute('data-ready', 'true');
    await expect(x).toHaveValue('150');
    await expect(demo.locator('canvas')).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
