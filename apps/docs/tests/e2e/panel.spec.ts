import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`panel example supports resizing and history (${prefix || 'en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/components/panel`);
    const panel = page.locator('dsk-panel').first();
    const handle = panel.locator('[part=handle]');
    await expect(handle).toBeVisible();
    await handle.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(panel).toHaveCSS('width', '250px');
    await page.keyboard.press('Control+z');
    await expect(panel).toHaveCSS('width', '240px');
    await page.getByLabel('Offset', { exact: true }).first().fill('-8');
    await page.getByLabel('Inset', { exact: true }).first().fill('-3');
    await expect(handle).toHaveCSS('right', '5px');
    await page
      .getByLabel(prefix ? 'Максимальный размер' : 'Maximum size', {
        exact: true,
      })
      .first()
      .fill('245');
    await handle.press('Shift+ArrowRight');
    await expect(panel).toHaveCSS('width', '245px');
    await page.keyboard.press('Control+z');
    await expect(panel).toHaveCSS('width', '240px');
    await page.locator('.vp-doc select').first().selectOption('bottom');
    await handle.focus();
    await page.keyboard.press('ArrowDown');
    await expect(panel).toHaveCSS('height', '181px');
    await panel.locator('input').fill('Edited');
    await expect(panel.locator('input')).toHaveValue('Edited');
    await expect(
      page.locator('dsk-panel').nth(1).locator('[part=handle]'),
    ).toHaveCSS('cursor', 'grab');
  });
}
