import { expect, test, type Page } from '@playwright/test';
import type {
  ColorFormat,
  DskInputColor,
  DskInputHex,
} from '@flowscape-ui/dsk';

async function configure(
  page: Page,
  format: ColorFormat,
  value: string,
): Promise<void> {
  await page.evaluate(
    ({ format, value }) => {
      const demo = document.querySelector<DskInputColor>('#color-demo');
      if (!demo) throw new Error('The color demo is missing.');
      demo.format = format;
      demo.value = value;
    },
    { format, value },
  );
}

async function expectColor(page: Page, value: string): Promise<void> {
  await expect(page.locator('#color-demo [part~="color"]')).toHaveAttribute(
    'fill',
    value ? `#${value}` : 'transparent',
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#color-demo input')).toHaveValue('557BE880');
});

test('color registration, HTML format order, fallback and legacy hex alias are consistent', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const Color = customElements.get('dsk-input-color');
    const Hex = customElements.get('dsk-input-hex');
    if (!Color || !Hex)
      throw new Error('The color and HEX inputs must register.');
    const container = document.createElement('div');
    container.innerHTML = [
      '<dsk-input-color value="112233"></dsk-input-color>',
      '<dsk-input-color value="11223380" format="8"></dsk-input-color>',
      '<dsk-input-color format="8" value="11223380"></dsk-input-color>',
      '<dsk-input-color format="6" value="112233"></dsk-input-color>',
      '<dsk-input-color format="3" value="112233"></dsk-input-color>',
      '<dsk-input-color hex="8" value="112233"></dsk-input-color>',
    ].join('');
    document.body.append(container);
    const values = [...container.querySelectorAll('dsk-input-color')].map(
      (input) => [input.format, input.hex, input.value],
    );
    const detached = document.createElement('dsk-input-color');
    detached.hex = 8;
    detached.value = '11223380';
    const alias = [
      detached.format,
      detached.getAttribute('format'),
      detached.value,
    ];
    detached.hex = 3;
    return {
      inherits: new Color() instanceof Hex,
      values,
      alias,
      unsupportedAlias: [detached.format, detached.hex, detached.value],
    };
  });
  expect(result).toEqual({
    inherits: true,
    values: [
      [6, 6, '112233'],
      [8, 8, '11223380'],
      [8, 8, '11223380'],
      [6, 6, '112233'],
      [6, 6, '112233'],
      [6, 6, '112233'],
    ],
    alias: [8, '8', '11223380'],
    unsupportedAlias: [6, 6, '112233'],
  });
});

test('pre-upgrade format properties take precedence over hex before interpreting value', async ({
  page,
}) => {
  const values = await page.evaluate(() => {
    const Color = customElements.get('dsk-input-color') as
      typeof DskInputColor | undefined;
    if (!Color) throw new Error('The color input must register.');
    const pendingValues = [
      { value: '11223380', hex: 2, format: 8 },
      { format: 8, value: '11223380', hex: 2 },
      { value: '112233', format: 6, hex: 8 },
    ];
    return pendingValues.map((properties, index) => {
      const name = `test-pending-color-${index}`;
      const pending = document.createElement(name);
      Object.assign(pending, properties);
      document.body.append(pending);
      customElements.define(name, class extends Color {});
      if (!(pending instanceof Color))
        throw new Error('The color input did not upgrade.');
      return [pending.format, pending.hex, pending.value];
    });
  });
  expect(values).toEqual([
    [8, 8, '11223380'],
    [8, 8, '11223380'],
    [6, 6, '112233'],
  ]);
});

test('RGBA swatches render the color over a visible self-contained checkerboard', async ({
  page,
}, testInfo) => {
  const swatch = page.locator('#color-demo [part~="swatch"]');
  const checker = swatch.locator('image');
  await expect(swatch).toBeVisible();
  await expect(checker).toBeVisible();
  await expectColor(page, '557BE880');
  const checkerContent = await checker.evaluate((element) => {
    const href = element.getAttribute('href');
    if (!href?.startsWith('data:image/svg+xml,')) {
      throw new Error('The checkerboard must use a self-contained SVG image.');
    }
    return decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  });
  expect(checkerContent).toMatch(/<svg\b/);
  expect(checkerContent).toMatch(/<pattern\b/);
  expect(checkerContent).toMatch(/(?:#fff(?:fff)?|white)\b/i);
  expect(checkerContent).toMatch(/(?:#000(?:000)?|black)\b/i);
  await page.locator('#color-demo').evaluate((element: DskInputColor) => {
    element.style.width = '300px';
    element.style.height = '64px';
    element.style.setProperty('--dsk-input-handle-width', '64px');
    element.style.setProperty('--dsk-input-swatch-size', '48px');
  });
  for (const [name, alpha] of [
    ['transparent', '00'],
    ['translucent', '80'],
    ['opaque', 'FF'],
  ] as const) {
    const value = `557BE8${alpha}`;
    await configure(page, 8, value);
    await expectColor(page, value);
    await expect(checker).toBeVisible();
    const screenshot = testInfo.outputPath(`color-${name}.png`);
    await page.locator('#color-demo').screenshot({ path: screenshot });
    await testInfo.attach(`color-${name}`, {
      path: screenshot,
      contentType: 'image/png',
    });
  }
});

test('programmatic and draft edits update the swatch without waiting for a public event', async ({
  page,
}) => {
  await configure(page, 6, '112233');
  const input = page.locator('#color-demo input');
  await expectColor(page, '112233');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    demo.valueAsNumber = 255;
  });
  await expect(input).toHaveValue('FF0000');
  await expectColor(page, 'FF0000');
  await input.fill('#aabbcc');
  await expectColor(page, 'AABBCC');
  await expect(input).toHaveValue('#aabbcc');
  await input.press('Enter');
  await expect(input).toHaveValue('AABBCC');
  for (const draft of ['GGGGGG', '', '10 + 1']) {
    await input.fill(draft);
    await expectColor(page, '');
  }
  await input.press('Enter');
  await expect(input).toHaveValue('0B0000');
  await expectColor(page, '0B0000');
  await input.fill('invalid');
  await expectColor(page, '');
  await input.press('Escape');
  await expect(input).toHaveValue('0B0000');
  await expectColor(page, '0B0000');
  await input.fill('');
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await expectColor(page, '');
});

test('arrows, per-axis steps and undo/redo keep the swatch synchronized', async ({
  page,
}) => {
  await configure(page, 6, 'FE0000');
  const input = page.locator('#color-demo input');
  await input.press('ArrowRight');
  await expectColor(page, 'FF0000');
  await input.press('ArrowRight');
  await expect(input).toHaveValue('FF0100');
  await expectColor(page, 'FF0100');
  await input.press('Control+z');
  await expectColor(page, 'FF0000');
  await input.press('Control+Shift+z');
  await expectColor(page, 'FF0100');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    demo.keyVerticalStep = 5;
  });
  await input.press('ArrowUp');
  await expect(input).toHaveValue('FF0600');
  await expectColor(page, 'FF0600');
});

test('drag updates the swatch live and records one undoable change', async ({
  page,
}) => {
  await configure(page, 6, 'FE0000');
  const input = page.locator('#color-demo input');
  const handle = page.locator('#color-demo [part="handle"]');
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  if (!box) throw new Error('The color handle must be visible.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('color-demo');
  await page.evaluate(() => {
    document.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        movementX: 8,
        buttons: 1,
      }),
    );
  });
  await expect(input).toHaveValue('FF0100');
  await expectColor(page, 'FF0100');
  await page.mouse.up();
  await input.press('Control+z');
  await expect(input).toHaveValue('FE0000');
  await expectColor(page, 'FE0000');
  await input.press('Control+Shift+z');
  await expectColor(page, 'FF0100');
});

test('format conversions and form reset preserve channels and update the swatch', async ({
  page,
}) => {
  await configure(page, 8, '11223380');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    demo.format = 6;
  });
  await expect(page.locator('#color-demo input')).toHaveValue('112233');
  await expectColor(page, '112233');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    demo.format = 8;
  });
  await expect(page.locator('#color-demo input')).toHaveValue('112233FF');
  await expectColor(page, '112233FF');
  const result = await page.evaluate(() => {
    const form = document.createElement('form');
    form.innerHTML =
      '<dsk-input-color id="reset-color" format="8" value="11223380" name="color"></dsk-input-color>';
    document.body.append(form);
    const input = form.querySelector('dsk-input-color');
    if (!input) throw new Error('The color form field is missing.');
    input.format = 6;
    input.value = 'FF0000';
    form.reset();
    return { value: input.value, submitted: new FormData(form).get('color') };
  });
  expect(result).toEqual({ value: '112233', submitted: '112233' });
  await expect(page.locator('#reset-color [part~="color"]')).toHaveAttribute(
    'fill',
    '#112233',
  );
});

test('src temporarily replaces the swatch and restores the current color when cleared', async ({
  page,
}) => {
  const src =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="6"/></svg>',
    );
  await page.evaluate((src) => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    demo.src = src;
    demo.value = '11223380';
  }, src);
  await expect(page.locator('#color-demo img')).toBeVisible();
  await expect(page.locator('#color-demo [part~="swatch"]')).toBeHidden();
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    demo.src = null;
  });
  await expect(page.locator('#color-demo img')).toBeHidden();
  await expect(page.locator('#color-demo [part~="swatch"]')).toBeVisible();
  await expectColor(page, '11223380');
});

test('swatch sizing, public parts and inherited input accessibility remain usable', async ({
  page,
}) => {
  const swatch = page.locator('#color-demo [part~="swatch"]');
  await expect(swatch).toHaveCSS('width', '16px');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    demo.style.setProperty('--dsk-input-swatch-size', '22px');
    demo.style.height = '48px';
    demo.positioning = 'right';
    demo.selectOnFocus = true;
    const style = document.createElement('style');
    style.textContent =
      '#color-demo::part(swatch) { outline: 1px solid red; } #color-demo::part(color) { opacity: 0.5; }';
    document.head.append(style);
  });
  await expect(swatch).toHaveCSS('width', '22px');
  await expect(swatch).toHaveCSS('height', '22px');
  await expect(swatch).toHaveCSS('outline-style', 'solid');
  await expect(page.locator('#color-demo [part~="color"]')).toHaveCSS(
    'opacity',
    '0.5',
  );
  const input = page.getByRole('spinbutton', { name: 'Color preview value' });
  await expect(input).toHaveAttribute('aria-valuetext', '557BE880');
  await expect(input).toHaveCSS('text-align', 'right');
  await expect(input).toHaveCSS('height', '46px');
  await input.focus();
  expect(
    await input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([0, 8]);
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputColor>('#color-demo');
    if (!demo) throw new Error('The color demo is missing.');
    const inherited: DskInputHex = demo;
    inherited.readOnly = true;
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('557BE880');
  await expectColor(page, '557BE880');
});
