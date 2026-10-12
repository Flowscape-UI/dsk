import { expect, test, type Locator, type Page } from '@playwright/test';

async function scenePoint(demo: Locator, x: number, y: number) {
  const viewport = await demo.locator('.dsk-engine-viewport').boundingBox();
  if (!viewport) throw new Error('Missing engine viewport');
  const marker = demo.locator('dsk-canvas-marker');
  const zoom = Number(await marker.getAttribute('zoom'));
  const panX = Number(await marker.getAttribute('pan-x'));
  const panY = Number(await marker.getAttribute('pan-y'));
  return { x: viewport.x + x * zoom + panX, y: viewport.y + y * zoom + panY };
}

async function drag(page: Page, from: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 32, from.y + 24, { steps: 8 });
  await page.mouse.up();
}

for (const engine of ['excalidraw', 'reactflow'] as const) {
  for (const prefix of ['', '/ru']) {
    test(`${engine} connects native controls, selection and camera (${prefix || 'en'})`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${prefix}/examples/${engine}`, {
        waitUntil: 'domcontentloaded',
      });
      const demo = page.locator(`.dsk-${engine}-example`);
      await expect(demo).toHaveAttribute('data-ready', 'true', {
        timeout: 60_000,
      });
      await demo.scrollIntoViewIfNeeded();
      const x = demo.locator('dsk-input[data-field=x] input');
      const rotation = demo.locator('dsk-input[data-field=rotation] input');
      const marker = demo.locator('dsk-canvas-marker');
      await expect(x).toHaveValue('80');

      // A native DSK edit changes the engine's geometry and its world-space marker.
      await x.fill('150');
      await x.press('Enter');
      await expect
        .poll(async () => Number(await marker.getAttribute('x')))
        .toBeCloseTo(330, 0);
      const markerBeforeRotation = await marker.getAttribute('x');
      await rotation.fill('45');
      await rotation.press('Enter');
      await expect(marker).not.toHaveAttribute('x', markerBeforeRotation!);
      if (engine === 'reactflow') {
        await expect(demo.locator('.dsk-flow-rectangle')).toHaveCSS(
          'transform',
          /matrix\(0\.707/,
        );
      }

      // Drag on the actual engine surface and verify the inspector reads it back.
      const center = await scenePoint(
        demo,
        240,
        engine === 'excalidraw' ? 145 : 140,
      );
      await drag(page, center);
      await expect(x).not.toHaveValue('150');
      await expect(rotation).toHaveValue('45');

      // Changing selection must not move the comment to the second shape.
      const rectangleMarker = await marker.getAttribute('x');
      const ellipse = await scenePoint(
        demo,
        engine === 'excalidraw' ? 405 : 440,
        engine === 'excalidraw' ? 225 : 250,
      );
      await page.mouse.click(ellipse.x, ellipse.y);
      await expect(x).toHaveValue('350');
      await expect(rotation).toHaveValue('0');
      await expect(marker).toHaveAttribute('x', rectangleMarker!);

      const ruler = demo.locator('.dsk-engine-x');
      const zoom = await ruler.getAttribute('zoom');
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -120);
      await page.keyboard.up('Control');
      await expect(ruler).not.toHaveAttribute('zoom', zoom!);
      await expect(marker).toHaveAttribute(
        'zoom',
        (await ruler.getAttribute('zoom'))!,
      );

      await demo.locator('[data-action=reset]').click();
      await expect(x).toHaveValue('80');
      await expect(rotation).toHaveValue('0');
      await demo.locator('[data-action=fit]').click();
      const scale = await ruler.boundingBox();
      const viewport = await demo.locator('.dsk-engine-viewport').boundingBox();
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
      await expect(demo).toHaveCount(0);
      await expect(page.locator('.react-flow, .excalidraw')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}
