import { expect, test, type Page } from '@playwright/test';
import type { DskDock } from '../../src/index.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('#dock-section').scrollIntoViewIfNeeded();
});
async function drag(page: Page, target: string): Promise<void> {
  const handle = page.locator('#dock-inspector [data-dsk-dock-handle]');
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + 6, h.y + h.height / 2);
  const z = (await page.locator(target).boundingBox())!;
  await page.mouse.move(z.x + z.width / 2, z.y + 15, { steps: 8 });
}
test('pointer docking preserves content and highlights only the target', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.locator('#dock-name').fill('Retained name');
  const sceneBefore = await page.locator('.dock-scene').boundingBox();
  await expect(page.locator('#dock-bottom')).toBeHidden();
  await expect(page.locator('#dock-bottom .dock-zone-label')).toBeHidden();
  await drag(page, '#dock-bottom');
  expect(await page.locator('.dock-scene').boundingBox()).toEqual(sceneBefore);
  await expect(page.locator('#dock-bottom .dock-zone-label')).toBeVisible();
  await expect(page.locator('#dock-bottom')).toHaveAttribute(
    'data-drag-over',
    '',
  );
  await expect(page.locator('dsk-dock [part=preview]')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('#dock-bottom #dock-inspector')).toHaveCount(1);
  await expect(page.locator('#dock-right')).toBeHidden();
  await expect(page.locator('#dock-bottom')).toHaveCSS('position', 'relative');
  await expect(page.locator('#dock-name')).toHaveValue('Retained name');
  await expect(page.locator('#dock-events')).toContainText('change:');
  await expect(page.locator('[data-drag-over]')).toHaveCount(0);
  await expect(page.locator('dsk-dock [part=preview]')).toBeHidden();
  await expect(page.locator('#dock-bottom .dock-zone-label')).toBeHidden();
  expect(errors).toEqual([]);
});
test('Escape and dropping outside leave the original layout', async ({
  page,
}) => {
  await drag(page, '#dock-bottom');
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('#dock-right #dock-inspector')).toHaveCount(1);
  await drag(page, '.dock-scene');
  await page.mouse.up();
  await expect(page.locator('#dock-right #dock-inspector')).toHaveCount(1);
});
test('keyboard docking discovers dynamic zones and skips disabled destinations', async ({
  page,
}) => {
  await page.locator('#dock-add-zone').click();
  await page
    .locator('#dock-bottom')
    .evaluate((el) => el.setAttribute('disabled', ''));
  const handle = page.locator('#dock-inspector [data-dsk-dock-handle]');
  await handle.press('Space');
  await handle.press('ArrowRight');
  await expect(page.locator('#dock-extra-1')).toHaveAttribute(
    'data-drag-over',
    '',
  );
  await handle.press('Enter');
  await expect(page.locator('#dock-extra-1 #dock-inspector')).toHaveCount(1);
  await expect(handle).toBeFocused();
});
test('readonly and disabled prevent edits; API assignment is silent', async ({
  page,
}) => {
  const handle = page.locator('#dock-inspector [data-dsk-dock-handle]');
  for (const id of ['dock-readOnly', 'dock-disabled']) {
    await page.locator(`#${id}`).check();
    await handle.press('Space');
    await expect(page.locator('#dock-demo')).not.toHaveAttribute(
      'data-dragging',
      '',
    );
    await page.locator(`#${id}`).uncheck();
  }
  const result = await page.locator('#dock-demo').evaluate((el: DskDock) => {
    let changes = 0;
    el.addEventListener('change', () => changes++);
    const item = el.querySelector('dsk-dock-item')!;
    const zone = el.querySelector<DskDock['zones'][number]>('#dock-bottom')!;
    return {
      moved: el.dock(item, zone),
      changes,
      parent: item.parentElement?.id,
    };
  });
  expect(result).toEqual({ moved: true, changes: 0, parent: 'dock-bottom' });
});
test('consumer can veto a drop and disconnect cleans up drag preview', async ({
  page,
}) => {
  await page.locator('#dock-demo').evaluate((el) =>
    el.addEventListener('beforedock', (e) => e.preventDefault(), {
      once: true,
    }),
  );
  await drag(page, '#dock-bottom');
  await page.mouse.up();
  await expect(page.locator('#dock-right #dock-inspector')).toHaveCount(1);
  await drag(page, '#dock-bottom');
  const cleaned = await page.locator('#dock-demo').evaluate((el) => {
    el.remove();
    return (
      !el.hasAttribute('data-dragging') &&
      el.shadowRoot!.querySelector<HTMLElement>('[part=preview]')!.hidden
    );
  });
  await page.mouse.up();
  expect(cleaned).toBe(true);
});
