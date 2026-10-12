import { expect, test } from '@playwright/test';
import type { DskInputHex } from '@flowscape-ui/dsk';

for (const id of ['hex-demo', 'color-demo']) {
  for (const locked of [true, false]) {
    test(`${id} continues dragging after landing exactly on full red (locked=${locked})`, async ({
      page,
    }) => {
      await page.goto('/');
      const field = page.locator('#' + id);
      await field.evaluate((element: DskInputHex, locked) => {
        element.hex = 8;
        element.value = 'FE7BE880';
        if (!locked)
          Object.defineProperty(element, 'requestPointerLock', {
            value: undefined,
          });
      }, locked);
      const handle = field.locator('[part="handle"]');
      await handle.scrollIntoViewIfNeeded();
      const box = await handle.boundingBox();
      if (!box) throw new Error('The handle is missing.');
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      if (locked)
        await expect
          .poll(() => page.evaluate(() => document.pointerLockElement?.id))
          .toBe(id);
      await page.mouse.move(x + 4, y);
      await expect(field.locator('input')).toHaveValue('FF7BE880');
      await page.mouse.move(x + 8, y);
      await expect(field.locator('input')).toHaveValue('FF7CE880');
      await page.mouse.move(x + 12, y);
      await expect(field.locator('input')).toHaveValue('FF7DE880');
      await page.mouse.move(x + 4, y);
      await expect(field.locator('input')).toHaveValue('FF7BE880');
      await page.mouse.up();
    });
  }
}
