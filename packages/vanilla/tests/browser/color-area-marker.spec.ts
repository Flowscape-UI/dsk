import { expect, test } from '@playwright/test';

test.use({ deviceScaleFactor: 1.25 });

test('marker keeps a fixed diameter and pixel phase throughout dragging', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-color-area');
    const area = document.createElement('dsk-color-area');
    area.id = 'marker-area';
    area.style.cssText =
      'position: fixed; left: 20.375px; top: 20.25px; z-index: 1000';
    document.body.append(area);
  });
  const surface = page.locator('#marker-area [part="surface"]');
  const marker = page.locator('#marker-area [part="marker"]');
  const box = await surface.boundingBox();
  if (!box) throw new Error('The color surface must be visible.');
  await page.mouse.move(box.x + 40, box.y + 50);
  await page.mouse.down();
  for (let offset = 0; offset < 8; offset++) {
    await page.mouse.move(box.x + 40 + offset, box.y + 50 + offset);
    const geometry = await marker.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        centerX: (rect.left + rect.width / 2) * devicePixelRatio,
        centerY: (rect.top + rect.height / 2) * devicePixelRatio,
      };
    });
    expect(geometry.width).toBeCloseTo(14, 4);
    expect(geometry.height).toBeCloseTo(14, 4);
    expect(geometry.centerX).toBeCloseTo(Math.round(geometry.centerX), 2);
    expect(geometry.centerY).toBeCloseTo(Math.round(geometry.centerY), 2);
  }
  await page.mouse.up();
  await expect(marker).toHaveCSS('width', '14px');
  await expect(marker).toHaveCSS('height', '14px');
});
