import { expect, test } from '@playwright/test';

test('landing controls change position, dimensions and opacity; MIT is published', async ({
  page,
}) => {
  await page.goto('/');
  for (const [name, value] of [
    ['X', '90'],
    ['Y', '120'],
    ['Height', '210'],
  ]) {
    const field = page.locator(`dsk-input[aria-label="${name}"] input`);
    await field.fill(value!);
    await field.press('Enter');
  }
  await expect(page.locator('.dsk-docs-object')).toHaveCSS('left', '90px');
  await expect(page.locator('.dsk-docs-object')).toHaveCSS('top', '120px');
  await expect(page.locator('.dsk-docs-shape')).toHaveCSS('height', '210px');
  const alpha = page.locator('dsk-color-alpha input');
  await alpha.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.dsk-docs-shape')).toHaveCSS('opacity', '0.99');
  const box = (await page.locator('dsk-pan-zoom').boundingBox())!;
  expect(box.width).toBeGreaterThan(800);
  const controls = (await page
    .locator('.dsk-docs-controls-wrap')
    .boundingBox())!;
  expect(controls.x).toBeGreaterThanOrEqual(box.x + box.width);
  expect(controls.y).toBeLessThan(100);
  await page
    .locator('.dsk-docs-license-strip')
    .getByRole('link', { name: /^MIT/ })
    .click();
  await expect(page.locator('.vp-doc')).toContainText(
    'Permission is hereby granted',
  );
  const license = await page.request.get('/LICENSE.txt');
  expect(await license.text()).toContain('MIT License');
});

for (const locked of [true, false]) {
  test(`width feedback preserves continuous dragging (pointer lock=${locked})`, async ({
    page,
  }) => {
    await page.goto('/');
    const input = page.locator('dsk-input[aria-label="Width"]');
    await expect(input.locator('input')).toHaveValue('160');
    await input.scrollIntoViewIfNeeded();
    await input.evaluate((element, locked) => {
      if (!locked)
        element.requestPointerLock = () =>
          Promise.reject(new DOMException('Denied', 'NotAllowedError'));
      element.addEventListener('change', () => {
        element.dataset.commits = String(
          Number(element.dataset.commits ?? 0) + 1,
        );
      });
    }, locked);
    const box = await input.locator('[part="handle"]').boundingBox();
    if (!box) throw new Error('Missing handle');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    if (locked) await expect(page.locator('.dsk-drag-cursor')).toBeVisible();
    for (const [index, movement] of [40, 40, -40].entries()) {
      if (locked) {
        await page.evaluate(
          (movement) =>
            document.dispatchEvent(
              new PointerEvent('pointermove', {
                pointerType: 'mouse',
                movementX: movement,
                buttons: 1,
              }),
            ),
          movement,
        );
      } else {
        await page.mouse.move(x + (index === 1 ? 80 : 40), y);
      }
      await expect(input.locator('input')).toHaveValue(
        index === 1 ? '180' : '170',
      );
      await expect(page.locator('.dsk-docs-shape')).toHaveCSS(
        'width',
        index === 1 ? '180px' : '170px',
      );
      await expect(input.locator('[data-dragging]')).toHaveCount(1);
      await expect(input).not.toHaveAttribute('data-commits');
    }
    await page.mouse.up();
    await expect(input).toHaveAttribute('data-commits', '1');
    await expect(input.locator('[data-dragging]')).toHaveCount(0);
    await expect(page.locator('.dsk-drag-cursor')).toHaveCount(0);
  });
}

test('home examples update the object and survive route navigation', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message));
  await page.goto('/');
  await expect(page.locator('.dsk-docs-editor')).toBeVisible();
  const width = page.locator('dsk-input[aria-label="Width"] input');
  await width.fill('200');
  await width.press('Enter');
  await expect(page.locator('.dsk-docs-shape')).toHaveCSS('width', '200px');
  const hue = page.locator('dsk-color-hue input[type="range"]');
  const before = await page.locator('.dsk-docs-color-output').innerText();
  await hue.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.dsk-docs-color-output')).not.toHaveText(before);
  await page.screenshot({
    path: testInfo.outputPath('home.png'),
    fullPage: true,
  });
  await page
    .locator('.dsk-docs-hero-actions')
    .getByRole('link', { name: 'Quick start', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: /^Installation/, level: 1 }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.locator('dsk-input[aria-label="Width"] input'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('both locales have searchable content and framework installation examples', async ({
  page,
}) => {
  for (const [base, query, heading] of [
    ['', 'Canvas widgets', 'Canvas widgets'],
    ['/ru', 'направляющие', 'Виджеты холста'],
  ]) {
    await page.goto(`${base}/guide/introduction`, { waitUntil: 'networkidle' });
    await page.locator('.VPNavBarSearch button').click();
    await page.locator('#localsearch-input').fill(query!);
    const result = page
      .locator(`.VPLocalSearchBox a[href*="${base}/components/canvas"]`)
      .filter({ hasText: heading })
      .first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(new RegExp(`${base}/components/canvas`));
    await page.goto(`${base}/guide/installation`);
    const examples = page.locator('.dsk-framework-code').first();
    for (const framework of ['Vanilla', 'React', 'Vue', 'Svelte', 'Angular']) {
      await examples.locator(`label[data-title="${framework}"]`).click();
      const code = examples.locator('.blocks > div.active');
      await expect(code).toBeVisible();
      await expect(code).toContainText("import '@flowscape-ui/dsk'");
      await expect(code).toContainText('dsk-input');
    }
  }
});

test('locale switch preserves page and theme persists on mobile', async ({
  page,
}, testInfo) => {
  await page.goto('/components/canvas');
  await page.getByRole('button', { name: 'Change language' }).click();
  await page.getByRole('link', { name: 'Русский' }).click();
  await expect(page).toHaveURL(/\/ru\/components\/canvas/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  const theme = page.locator('.VPNavBarAppearance button');
  if (!(await page.locator('html').getAttribute('class'))?.includes('dark'))
    await theme.click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.goto('/ru/');
  await page.screenshot({
    path: testInfo.outputPath('home-dark.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.dsk-docs-editor')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('home-mobile.png'),
    fullPage: true,
  });
});
