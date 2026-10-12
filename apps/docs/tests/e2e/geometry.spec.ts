import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`geometry examples connect controls to motion (${prefix || 'en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/components/geometry`);
    await expect(page.locator('.dsk-geometry-example')).toHaveCount(4);
    const angle = page
      .locator('.dsk-geometry-example[data-kind=angle]')
      .first();
    await angle
      .locator('dsk-angle')
      .evaluate((element: HTMLElement) => element.focus());
    await page.keyboard.press('ArrowRight');
    await expect(angle.locator('output')).toHaveText('46°');
    const before = await angle
      .locator('.dsk-geometry-shape')
      .getAttribute('style');
    await angle.locator('select').selectOption('rad');
    await expect(angle.locator('output')).toContainText('rad');
    expect(
      await angle.locator('.dsk-geometry-shape').getAttribute('style'),
    ).toBe(before);
    const curve = page
      .locator('.dsk-geometry-example[data-kind=curve]')
      .first();
    await curve.locator('dsk-curve [data-preset="ease-in"]').click();
    await expect(curve.locator('output')).toContainText('0.42, 0, 1, 1');
    await curve.locator('select').selectOption('rotate');
    const shape = curve.locator('.dsk-geometry-shape').first();
    await expect
      .poll(() =>
        shape.evaluate(
          (element) => element.getAnimations()[0]?.effect?.getTiming().easing,
        ),
      )
      .toBe('cubic-bezier(0.42, 0, 1, 1)');
    // Reduced motion ends at the final state rather than playing a long flight.
    await expect(shape).toHaveCSS('transform', 'matrix(-1, 0, 0, -1, 0, 0)');
    await curve.locator('.dsk-geometry-actions button').last().click();
    expect(
      await shape.evaluate((element) => element.getAnimations().length),
    ).toBe(0);
    await curve.locator('dsk-curve [part=add]').click();
    await expect(curve.locator('output')).toContainText('linear(');
    await page.setViewportSize({ width: 390, height: 844 });
    await curve.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test('motion compares different easing and releases animations on navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/components/geometry');
  const curve = page.locator('.dsk-geometry-example[data-kind=curve]').first();
  await curve.locator('dsk-curve [data-preset="ease-in"]').click();
  const states = await curve
    .locator('.dsk-geometry-shape')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const animation = element.getAnimations()[0]!;
        animation.pause();
        animation.currentTime = 800;
        return {
          transform: getComputedStyle(element).transform,
          easing: animation.effect?.getTiming().easing,
        };
      }),
    );
  expect(states[0]!.easing).not.toBe(states[1]!.easing);
  expect(states[0]!.transform).not.toBe(states[1]!.transform);
  const handle = await curve
    .locator('.dsk-geometry-shape')
    .first()
    .elementHandle();
  await page.locator('.VPSidebar a[href="/components/color"]').first().click();
  await expect(page.locator('.dsk-geometry-example')).toHaveCount(0);
  expect(
    await handle!.evaluate((element) => element.getAnimations().length),
  ).toBe(0);
});
