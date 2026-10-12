import { expect, test, type Page } from '@playwright/test';
import type {
  DskInputBase,
  DskInputHex,
  HexFormat,
  NumericValue,
} from '@flowscape-ui/dsk';

async function configure(
  page: Page,
  hex: HexFormat,
  value: string,
): Promise<void> {
  await page.evaluate(
    ({ hex, value }) => {
      const demo = document.querySelector<DskInputHex>('#hex-demo')!;
      demo.hex = hex;
      demo.value = value;
    },
    { hex, value },
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hex-demo input')).toHaveValue('FE0000');
});

test('all formats fill channels and drain them in reverse order', async ({
  page,
}) => {
  const input = page.locator('#hex-demo input');
  for (const [hex, initial, next] of [
    [1, 'E', 'F'],
    [2, '0F', '10'],
    [3, 'F00', 'F10'],
    [6, 'FF0000', 'FF0100'],
    [6, 'FFFF00', 'FFFF01'],
    [8, 'FFFFFF00', 'FFFFFF01'],
    [8, 'FFFFFFFE', 'FFFFFFFF'],
  ] as const) {
    await configure(page, hex, initial);
    await input.press('ArrowRight');
    await expect(input).toHaveValue(next);
    await input.press('ArrowLeft');
    await expect(input).toHaveValue(initial);
  }
});

test('HEX steps use integer decimal amounts, independent axes, bounds and loops', async ({
  page,
}) => {
  await configure(page, 2, 'FE');
  const input = page.locator('#hex-demo input');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputHex>('#hex-demo')!;
    demo.step = 2;
    demo.loopAfter = true;
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('01');
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('FE');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputHex>('#hex-demo')!;
    demo.min = '10';
    demo.max = '20';
    demo.value = '20';
    demo.keyHorizontalStep = 3;
    demo.keyVerticalStep = 5;
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('13');
  await input.press('ArrowUp');
  await expect(input).toHaveValue('18');
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputHex>('#hex-demo')!;
    demo.keyHorizontalStep = 0.5;
    demo.step = 0.25;
  });
  await input.press('ArrowLeft');
  await expect(input).toHaveValue('17');
});

test('manual HEX drafts, arithmetic, cancellation and history preserve canonical values', async ({
  page,
}) => {
  const input = page.locator('#hex-demo input');
  await input.fill('#ff0000');
  await input.press('Enter');
  await expect(input).toHaveValue('FF0000');
  await input.fill('0xFF0000 + 1');
  await input.press('Enter');
  await expect(input).toHaveValue('000100');
  await input.press('Control+z');
  await expect(input).toHaveValue('FF0000');
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('000100');
  await input.fill('10 + 1');
  await input.press('Enter');
  await expect(input).toHaveValue('0B0000');
  for (const invalid of ['1 / 2', 'GGGGGG', '1#FF', '1234567']) {
    await input.fill(invalid);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.press('Enter');
    await expect(input).toHaveValue('0B0000');
  }
  await input.fill('FFFFFF');
  await input.press('Escape');
  await expect(input).toHaveValue('0B0000');
  await expect(input).not.toBeFocused();
});

test('format conversion preserves channels and clears unrepresentable nibble reductions', async ({
  page,
}) => {
  const input = page.locator('#hex-demo input');
  await configure(page, 3, 'F80');
  await page.locator('[name="hex-format"]').selectOption('6');
  await expect(input).toHaveValue('FF8800');
  await page.locator('[name="hex-format"]').selectOption('8');
  await expect(input).toHaveValue('FF8800FF');
  await page.locator('[name="hex-format"]').selectOption('2');
  await expect(input).toHaveValue('FF');
  await page.locator('[name="hex-format"]').selectOption('1');
  await expect(input).toHaveValue('F');
  await configure(page, 6, 'FE0000');
  await page.locator('[name="hex-format"]').selectOption('3');
  await expect(input).toHaveValue('');
  await input.press('Control+z');
  await expect(input).toHaveValue('');
});

test('HTML attribute order, detached configuration, scalar API and pre-upgrade properties work', async ({
  page,
}) => {
  const values = await page.evaluate(() => {
    const container = document.createElement('div');
    container.innerHTML =
      '<dsk-input-hex value="F80" hex="3"></dsk-input-hex><dsk-input-hex hex="3" value="F80"></dsk-input-hex>';
    document.body.append(container);
    const values = [...container.querySelectorAll('dsk-input-hex')].map(
      (input) => input.value,
    );
    const detached = document.createElement('dsk-input-hex');
    detached.hex = 3;
    detached.value = 'F80';
    detached.hex = 6;
    values.push(detached.value);
    detached.valueAsNumber = 256;
    values.push(detached.value, String(detached.valueAsNumber));
    const pending = document.createElement('test-pending-hex');
    Object.assign(pending, { value: 'F80', hex: 3 });
    document.body.append(pending);
    const HexInput = customElements.get('dsk-input-hex') as typeof DskInputHex;
    customElements.define('test-pending-hex', class extends HexInput {});
    values.push((pending as DskInputHex).value);
    return values;
  });
  expect(values).toEqual(['F80', 'F80', 'FF8800', '000100', '256', 'F80']);
});

test('HEX inherits tags, styling, form values, select-on-focus, readonly and disabled behavior', async ({
  page,
}) => {
  await page.evaluate(() => {
    const demo = document.querySelector<DskInputHex>('#hex-demo')!;
    const form = document.createElement('form');
    form.id = 'hex-form';
    demo.before(form);
    form.append(demo);
    demo.name = 'color';
    demo.tag = '#';
    demo.tagPosition = 'left';
    demo.positioning = 'right';
    demo.style.height = '48px';
    demo.selectOnFocus = true;
  });
  const input = page.locator('#hex-demo input');
  await expect(page.locator('#hex-demo [part="tag"]')).toHaveText('#');
  await expect(input).toHaveCSS('text-align', 'right');
  await expect(page.locator('#hex-demo')).toHaveCSS('height', '48px');
  await expect(input).toHaveCSS('height', '46px');
  await input.focus();
  expect(
    await input.evaluate((element: HTMLInputElement) => [
      element.selectionStart,
      element.selectionEnd,
    ]),
  ).toEqual([0, 6]);
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#hex-form')!).get(
        'color',
      ),
    ),
  ).toBe('FE0000');
  await page.evaluate(() => {
    document.querySelector<DskInputHex>('#hex-demo')!.readOnly = true;
  });
  await input.press('ArrowRight');
  await expect(input).toHaveValue('FE0000');
  await page.evaluate(() => {
    document.querySelector<DskInputHex>('#hex-demo')!.disabled = true;
  });
  await expect(input).toBeDisabled();
  expect(
    await page.evaluate(() =>
      new FormData(document.querySelector<HTMLFormElement>('#hex-form')!).get(
        'color',
      ),
    ),
  ).toBeNull();
});

test('default hash handle can be replaced with src and restored', async ({
  page,
}) => {
  await expect(page.locator('#hex-demo svg path')).toHaveCount(1);
  const src =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle r="6" cx="8" cy="8"/></svg>',
    );
  await page.evaluate((src) => {
    document.querySelector<DskInputHex>('#hex-demo')!.src = src;
  }, src);
  await expect(page.locator('#hex-demo img')).toBeVisible();
  await expect(page.locator('#hex-demo svg')).toBeHidden();
  await page.evaluate(() => {
    document.querySelector<DskInputHex>('#hex-demo')!.src = null;
  });
  await expect(page.locator('#hex-demo svg')).toBeVisible();
});

test('form reset restores initial channels in the current format and exposes HEX text accessibly', async ({
  page,
}) => {
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'reset-hex-form';
    form.innerHTML =
      '<dsk-input-hex id="reset-hex" hex="3" value="F80" name="color"></dsk-input-hex>';
    document.body.append(form);
    const input = form.querySelector('dsk-input-hex')!;
    input.hex = 6;
    input.value = '0000FF';
    form.reset();
  });
  const input = page.locator('#reset-hex input');
  await expect(input).toHaveValue('FF8800');
  await expect(input).toHaveAttribute('aria-valuetext', 'FF8800');
  expect(
    await page.evaluate(() =>
      new FormData(
        document.querySelector<HTMLFormElement>('#reset-hex-form')!,
      ).get('color'),
    ),
  ).toBe('FF8800');
});

test('HEX handle fills channels, reverses immediately at bounds and records one history entry', async ({
  page,
}) => {
  const input = page.locator('#hex-demo input');
  await page.locator('#hex-demo').scrollIntoViewIfNeeded();
  const box = await page.locator('#hex-demo [part="handle"]').boundingBox();
  if (!box) throw new Error('Missing HEX handle');
  await page.mouse.move(box.x + 12, box.y + 12);
  await page.mouse.down();
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('hex-demo');
  async function move(movementX: number) {
    await page.evaluate(
      (movementX) =>
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            pointerType: 'mouse',
            movementX,
            buttons: 1,
          }),
        ),
      movementX,
    );
  }
  await move(8);
  await expect(input).toHaveValue('FF0100');
  await move(-8);
  await expect(input).toHaveValue('FE0000');
  await move(-4000);
  await move(-4000);
  await expect(input).toHaveValue('000000');
  await move(4);
  await expect(input).toHaveValue('010000');
  await page.mouse.up();
  await input.press('Control+z');
  await expect(input).toHaveValue('FE0000');
  await input.press('Control+Shift+z');
  await expect(input).toHaveValue('010000');
});

test('custom subclasses inherit interactions through only the protected value contract', async ({
  page,
}) => {
  await page.evaluate(() => {
    const Base = Object.getPrototypeOf(
      customElements.get('dsk-input')!,
    ) as typeof DskInputBase;
    class BinaryInput extends Base {
      protected override parseValue(value: NumericValue): number {
        if (typeof value === 'number') return value;
        return /^[01]+$/.test(value ?? '') ? Number.parseInt(value!, 2) : NaN;
      }
      protected override formatValue(value: number): string {
        return value.toString(2);
      }
      protected override evaluateValue(text: string): number {
        return this.parseValue(text);
      }
    }
    customElements.define('test-binary-input', BinaryInput);
    const input = new BinaryInput();
    input.id = 'binary';
    input.min = '0';
    input.value = '111';
    document.body.append(input);
  });
  const input = page.locator('#binary input');
  await input.press('ArrowRight');
  await expect(input).toHaveValue('1000');
  await input.press('Control+z');
  await expect(input).toHaveValue('111');
  await input.fill('1010');
  await input.press('Enter');
  await expect(input).toHaveValue('1010');
});
