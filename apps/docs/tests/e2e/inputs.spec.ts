import { expect, test } from '@playwright/test';

for (const prefix of ['', '/ru']) {
  test(`input inspector updates every object property (${prefix || 'en'})`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/components/inputs`);
    const lab = page.locator('.dsk-input-lab');
    const shape = lab.locator('.dsk-input-lab-object');
    await expect(shape).toHaveCSS('width', '160px');
    const x = lab.locator('dsk-input[data-field="x"] input');
    await x.fill('20 + 10');
    await x.press('Enter');
    await expect(shape).toHaveCSS('left', '30px');
    await lab.locator('[data-option=linked]').check();
    const width = lab.locator('dsk-input[data-field="width"] input');
    await width.fill('200');
    await width.press('Enter');
    await expect(shape).toHaveCSS('width', '200px');
    await expect(shape).toHaveCSS('height', '200px');
    await lab.locator('[data-option=linked]').uncheck();
    const height = lab.locator('dsk-input[data-field="height"] input');
    await height.fill('100');
    await height.press('Enter');
    await lab.locator('[data-option=mixed]').check();
    await expect(shape).toHaveCSS('width', '200px');
    await expect(shape).toHaveCSS('height', '100px');
    const hex = lab.locator('dsk-input-hex input');
    await hex.fill('20');
    await hex.press('Enter');
    await expect(shape).toHaveCSS('border-radius', '32px');
    await lab
      .locator('dsk-input-color')
      .evaluate((element) => element.setAttribute('alpha-mode', 'hex'));
    const color = lab.locator('dsk-input-color input').first();
    await color.fill('00FF0080');
    await color.press('Enter');
    await expect(shape).toHaveCSS('background-color', 'rgb(0, 255, 0)');
    await expect(shape).toHaveCSS('opacity', '0.501961');
    await lab.locator('[data-option=disabled]').check();
    await expect(x).toBeDisabled();
    await expect(lab.locator('dsk-input-upload [part=button]')).toBeDisabled();
    await lab.locator('[data-reset]').click();
    await expect(shape).toHaveCSS('width', '160px');
    await expect(x).toBeEnabled();
  });
}

test('uploaded images and documents update the object; navigation cleans up', async ({
  page,
}) => {
  await page.goto('/components/inputs');
  const lab = page.locator('.dsk-input-lab');
  const picker = lab.locator('dsk-input-upload input');
  await picker.setInputFiles({
    name: 'cover.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="red"/></svg>',
    ),
  });
  const image = lab.locator('.dsk-input-lab-object img');
  await expect(image).toBeVisible();
  const url = await image.getAttribute('src');
  await picker.setInputFiles({
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF'),
  });
  await expect(image).toBeHidden();
  await expect(lab.locator('.dsk-input-lab-object span')).toHaveText(
    'notes.pdf',
  );
  expect(
    await page.evaluate(async (url) => {
      try {
        await fetch(url!);
        return true;
      } catch {
        return false;
      }
    }, url),
  ).toBe(false);
  await picker.setInputFiles({
    name: 'bad.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('bad'),
  });
  await expect(lab.locator('.dsk-input-lab-object span')).toHaveText(
    'notes.pdf',
  );
  await expect(lab.locator('.dsk-input-lab-status')).toContainText(
    'Choose one',
  );
  await lab.locator('dsk-input-upload [part=clear]').click();
  await expect(lab.locator('.dsk-input-lab-object span')).toHaveText('dsk');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator('.VPSidebar a[href="/guide/styling"]')
    .first()
    .evaluate((element: HTMLAnchorElement) => element.click());
  await expect(lab).toHaveCount(0);
});

test('each input has isolated standard and styled examples before the combined inspector', async ({
  page,
}) => {
  await page.goto('/components/inputs');
  const examples = page.locator('.dsk-single-input');
  await expect(examples).toHaveCount(10);
  const number = examples
    .filter({ has: page.locator('dsk-input[aria-label="Width"]') })
    .first();
  const field = number.locator('dsk-input input');
  await field.fill('180');
  await field.press('Enter');
  await expect(number.locator('.dsk-single-input-object')).toHaveCSS(
    'width',
    '180px',
  );
  await expect(examples.nth(1).locator('.dsk-single-input-object')).toHaveCSS(
    'width',
    '120px',
  );
  await expect(examples.nth(1).locator('dsk-input')).toHaveCSS(
    'height',
    '38px',
  );
  const hex = page
    .locator('.dsk-single-input[data-kind="dsk-input-hex"]')
    .first();
  await hex.locator('dsk-input-hex input').fill('00FF00');
  await hex.locator('dsk-input-hex input').press('Enter');
  await expect(hex.locator('.dsk-single-input-object')).toHaveCSS(
    'background-color',
    'rgb(0, 255, 0)',
  );
  const color = page
    .locator('.dsk-single-input[data-kind="dsk-input-color"]')
    .first();
  await color.locator('[data-option="alpha-mode"]').selectOption('percent');
  await expect(color.locator('dsk-input-color dsk-input')).toBeVisible();
  const group = page
    .locator('.dsk-single-input[data-kind="dsk-input-group"]')
    .first();
  await group.locator('[data-option=linked]').check();
  await group.locator('dsk-input input').first().fill('150');
  await group.locator('dsk-input input').first().press('Enter');
  await expect(group.locator('.dsk-single-input-object')).toHaveCSS(
    'height',
    '150px',
  );
  const upload = page
    .locator('.dsk-single-input[data-kind="dsk-input-upload"]')
    .first();
  await upload.locator('dsk-input-upload input').setInputFiles({
    name: 'readme.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });
  await expect(upload.locator('.dsk-single-input-object span')).toHaveText(
    'readme.txt',
  );
  const order = await page.evaluate(() => {
    const last = document.querySelectorAll('.dsk-single-input')[9]!;
    return Boolean(
      last.compareDocumentPosition(document.querySelector('.dsk-input-lab')!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  expect(order).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
