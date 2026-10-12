import { expect, test } from '@playwright/test';

for (const release of ['pointerup', 'released-buttons', 'pointercancel']) {
  test(`locked input uses pointer events while pressed and stops on ${release}`, async ({
    page,
  }) => {
    await page.goto('/');
    const demo = page.locator('#demo');
    await expect(demo.locator('input')).toHaveValue('40');
    await demo.evaluate((element) => {
      element.addEventListener(
        'pointerdown',
        (event) => {
          if (event instanceof PointerEvent)
            element.setAttribute('data-pointer', String(event.pointerId));
        },
        { once: true },
      );
      element.addEventListener('change', () =>
        element.setAttribute(
          'data-commits',
          String(Number(element.getAttribute('data-commits')) + 1),
        ),
      );
    });
    const box = await demo.locator('[part=handle]').boundingBox();
    if (!box) throw new Error('Missing handle');
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.down();
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement?.id))
      .toBe('demo');
    // Firefox suppresses compatibility mouse events after preventDefault on
    // pointerdown. The locked element, not its handle, receives these events.
    await demo.evaluate((element) => {
      const pointerId = Number(element.getAttribute('data-pointer'));
      element.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId,
          pointerType: 'mouse',
          buttons: 1,
          movementX: 40,
        }),
      );
    });
    await expect(demo.locator('input')).toHaveValue('50');
    // A browser that also emits mousemove must not apply the delta twice.
    await demo.dispatchEvent('mousemove', { buttons: 1, movementX: 40 });
    await expect(demo.locator('input')).toHaveValue('50');
    await demo.evaluate((element, release) => {
      const pointerId = Number(element.getAttribute('data-pointer'));
      element.dispatchEvent(
        new PointerEvent(
          release === 'released-buttons' ? 'pointermove' : release,
          {
            bubbles: true,
            pointerId,
            pointerType: 'mouse',
            button: 0,
            buttons: 0,
            movementX: 200,
          },
        ),
      );
    }, release);
    await expect(demo.locator('[data-dragging]')).toHaveCount(0);
    await expect(page.locator('.dsk-drag-cursor')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement))
      .toBeNull();
    await page.mouse.up();
    await demo.dispatchEvent('pointermove', {
      pointerType: 'mouse',
      buttons: 0,
      movementX: 400,
    });
    await expect(demo.locator('input')).toHaveValue(
      release === 'pointercancel' ? '40' : '50',
    );
    if (release === 'pointercancel')
      await expect(demo).not.toHaveAttribute('data-commits');
    else await expect(demo).toHaveAttribute('data-commits', '1');
  });
}
