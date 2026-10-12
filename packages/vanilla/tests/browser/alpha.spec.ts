import { expect, test } from '@playwright/test';
import type { DskInputColor } from '@flowscape-ui/dsk';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.locator('[name="color-alpha-mode"]').selectOption('percent');
});

test('percent mode separates RGB and alpha while preserving exact RGBA values', async ({
  page,
}, testInfo) => {
  const alpha = page.locator('#color-demo [part="alpha"] input');
  await expect(
    page.locator('#color-demo').locator('input').first(),
  ).toHaveValue('557BE8');
  await expect(alpha).toHaveValue('50.2');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE880',
  );
  await page
    .locator('#color-demo')
    .screenshot({ path: testInfo.outputPath('alpha-percent.png') });
  await page.locator('[name="color-alpha-mode"]').selectOption('hex');
  await expect(page.locator('#color-demo input')).toHaveValue('557BE880');
  await expect(page.locator('#color-demo [part="alpha"]')).toHaveCount(0);
  const values = await page.evaluate(() => {
    const input = document.querySelector<DskInputColor>('#color-demo')!;
    for (let byte = 0; byte < 256; byte++) {
      const value = '123456' + byte.toString(16).padStart(2, '0').toUpperCase();
      input.value = value;
      input.alphaMode = 'percent';
      input.alphaMode = 'hex';
      if (input.value !== value) return false;
    }
    return true;
  });
  expect(values).toBe(true);
});

test('RGB editing, expressions and arrows preserve opacity; invalid drafts revert', async ({
  page,
}) => {
  const rgb = page.locator('#color-demo input').first();
  await rgb.fill('FF0000');
  await rgb.press('Enter');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    'FF000080',
  );
  await rgb.press('ArrowRight');
  await expect(rgb).toHaveValue('FF0100');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    'FF010080',
  );
  await rgb.fill('10 + 1');
  await rgb.press('Enter');
  await expect(rgb).toHaveValue('0B0000');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '0B000080',
  );
  await rgb.fill('1234567');
  await expect(rgb).toHaveAttribute('aria-invalid', 'true');
  await rgb.press('Escape');
  await expect(rgb).toHaveValue('0B0000');
});

test('percentage edits update only alpha, emit host events and share undo/redo', async ({
  page,
}) => {
  const alpha = page.locator('#color-demo [part="alpha"] input');
  await alpha.fill('25');
  await alpha.press('Enter');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE840',
  );
  await expect(alpha).toHaveValue('25');
  await expect(page.locator('#color-change-count')).toHaveText('1');
  await expect(page.locator('#color-demo [part="color"]')).toHaveAttribute(
    'fill',
    '#557BE840',
  );
  await alpha.press('Control+z');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE880',
  );
  await alpha.press('Control+Shift+z');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE840',
  );
  await alpha.fill('200');
  await alpha.press('Enter');
  await expect(alpha).toHaveValue('100');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE8FF',
  );
});

test('percentage drag supports cancellation and commits a single undoable edit', async ({
  page,
}) => {
  await page.evaluate(() => {
    document.querySelector<DskInputColor>('#color-demo')!.value = '557BE880';
  });
  const handle = page.locator('#color-demo [part="alpha"] [part="handle"]');
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  if (!box) throw new Error('Missing alpha handle');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('#color-demo')!.shadowRoot!.pointerLockElement
            ?.localName,
      ),
    )
    .toBe('dsk-input');
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        movementX: 40,
        buttons: 1,
      }),
    ),
  );
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE89A',
  );
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE880',
  );
  await expect(page.locator('#color-change-count')).toHaveText('0');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('#color-demo')!.shadowRoot!.pointerLockElement
            ?.localName,
      ),
    )
    .toBe('dsk-input');
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        movementX: 40,
        buttons: 1,
      }),
    ),
  );
  await page.mouse.up();
  await expect(page.locator('#color-change-count')).toHaveText('1');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE89A',
  );
  await page.locator('#color-demo [part="alpha"] input').press('Control+z');
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE880',
  );
});

test('disabling during an opacity drag cancels both the gesture and the RGBA draft', async ({
  page,
}) => {
  const handle = page.locator('#color-demo [part="alpha"] [part="handle"]');
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  if (!box) throw new Error('Missing alpha handle');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.querySelector('#color-demo')!.shadowRoot!.pointerLockElement
            ?.localName,
      ),
    )
    .toBe('dsk-input');
  await page.evaluate(() =>
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        movementX: 40,
        buttons: 1,
      }),
    ),
  );
  await page.evaluate(() => {
    document.querySelector<DskInputColor>('#color-demo')!.disabled = true;
  });
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE880',
  );
  await expect(page.locator('#color-demo [part="alpha"] input')).toBeDisabled();
  await expect(page.locator('.dsk-drag-cursor')).toHaveCount(0);
  await page.mouse.up();
});

test('forms, disabled state, reconnect and mode/format changes synchronize both fields', async ({
  page,
}) => {
  await page.evaluate(() => {
    const input = document.querySelector<DskInputColor>('#color-demo')!;
    const form = document.createElement('form');
    form.id = 'alpha-form';
    form.innerHTML = '<fieldset></fieldset>';
    input.before(form);
    form.querySelector('fieldset')!.append(input);
    input.name = 'color';
  });
  const alpha = page.locator('#color-demo [part="alpha"] input');
  await alpha.fill('0');
  await alpha.press('Enter');
  expect(
    await page.evaluate(() => [
      ...new FormData(document.querySelector<HTMLFormElement>('#alpha-form')!),
    ]),
  ).toEqual([['color', '557BE800']]);
  await page.evaluate(() => {
    document.querySelector<HTMLFormElement>('#alpha-form')!.reset();
  });
  await expect(page.locator('#color-demo')).toHaveAttribute(
    'value',
    '557BE880',
  );
  await page
    .locator('#alpha-form fieldset')
    .evaluate((el) => el.setAttribute('disabled', ''));
  await expect(alpha).toBeDisabled();
  await expect(page.locator('#color-demo input').first()).toBeDisabled();
  await page.locator('[name="color-format"]').selectOption('6');
  await expect(page.locator('#color-demo [part="alpha"]')).toHaveCount(0);
  await expect(page.locator('#color-demo input')).toHaveValue('557BE8');
});
