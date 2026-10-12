import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`color controls update independent and combined previews (${prefix || 'en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/components/color`);
    await expect(page.locator('.dsk-color-example')).toHaveCount(9);
    const area = page.locator('.dsk-color-example[data-kind=area]').first();
    await area
      .locator('dsk-color-area [part=surface]')
      .click({ position: { x: 90, y: 90 } });
    await expect(area.locator('output')).not.toHaveText('#FF0073');
    const hue = page.locator('.dsk-color-example[data-kind=hue]').first();
    await hue
      .locator('dsk-color-hue')
      .evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press('End');
    await expect(hue.locator('output')).toHaveText('#FF0000');
    const alpha = page.locator('.dsk-color-example[data-kind=alpha]').first();
    await alpha
      .locator('dsk-color-alpha')
      .evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press('Home');
    await expect(alpha.locator('output')).toHaveText('#FF007300');
    await expect(alpha.locator('.dsk-color-example-object')).toHaveCSS(
      'background-color',
      'rgba(255, 0, 115, 0)',
    );
    const combined = page.locator('.dsk-color-example[data-kind=combined]');
    await combined
      .locator('dsk-color-hue')
      .evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press('Home');
    await expect(combined.locator('output')).toHaveText('#FF000099');
    await combined
      .locator('dsk-color-alpha')
      .evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press('End');
    await expect(combined.locator('output')).toHaveText('#FF0000FF');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test('canvas eyedropper selects pixels, cancels, and cleans up on navigation', async ({
  page,
}) => {
  await page.goto('/components/color');
  const panel = page
    .locator('.dsk-color-example[data-kind=eyedropper]')
    .first();
  await panel.scrollIntoViewIfNeeded();
  const button = panel.locator('dsk-color-eyedropper [part=button]');
  await button.click();
  const samples = panel.locator('canvas.dsk-color-example-samples');
  await samples.click({ position: { x: 90, y: 48 } });
  await expect(panel.locator('.dsk-color-example-value')).toHaveText('#7755FF');
  await expect(panel.locator('.dsk-color-example-object')).toHaveCSS(
    'background-color',
    'rgb(119, 85, 255)',
  );
  const mode = panel.locator('select[data-mode]');
  await mode.selectOption('grayscale');
  await expect(panel.locator('.dsk-color-example-hint')).toContainText(
    'Custom application mode',
  );
  await button.click();
  await samples.click({ position: { x: 90, y: 48 } });
  await expect(panel.locator('.dsk-color-example-value')).toHaveText('#696969');
  await mode.selectOption('canvas');
  await button.click();
  await samples.click({ position: { x: 90, y: 48 } });
  await expect(panel.locator('.dsk-color-example-value')).toHaveText('#7755FF');
  await button.click();
  await page.keyboard.press('Escape');
  await expect(panel.locator('.dsk-color-example-value')).toHaveText('#7755FF');
  await expect(panel.locator('.dsk-color-example-status')).toContainText(
    'Canceled',
  );
  await button.click();
  await page
    .locator('.VPSidebar a[href="/components/inputs"]')
    .first()
    .evaluate((element: HTMLAnchorElement) => element.click());
  await expect(page.locator('.dsk-color-example')).toHaveCount(0);
  await expect(page.locator('dsk-color-eyedropper [part=overlay]')).toHaveCount(
    0,
  );
});

test('eyedropper mode menu explains unavailable native mode and opens a page snapshot', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'EyeDropper', {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto('/components/color');
  const panel = page
    .locator('.dsk-color-example[data-kind=eyedropper]')
    .first();
  const mode = panel.locator('select[data-mode]');
  const button = panel.locator('dsk-color-eyedropper [part=button]');
  await mode.selectOption('native');
  await expect(button).toBeDisabled();
  await expect(panel.locator('.dsk-color-example-hint')).toContainText(
    'unavailable',
  );
  await mode.selectOption('auto');
  await expect(panel.locator('.dsk-color-example-hint')).toContainText(
    'resolves to page',
  );
  await mode.selectOption('page');
  await button.click();
  await expect(page.locator('[part=snapshot]')).toBeVisible({ timeout: 30000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('[part=snapshot]')).toHaveCount(0);
  await expect(panel.locator('.dsk-color-example-value')).toHaveText('#FF0073');
});
