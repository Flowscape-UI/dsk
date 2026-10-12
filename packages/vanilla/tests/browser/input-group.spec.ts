import { expect, test } from '@playwright/test';
import type { DskInputGroup, DskInput } from '@flowscape-ui/dsk';

declare global {
  interface Window {
    inputGroup: DskInputGroup;
    groupEvents: string[];
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    document.body.innerHTML = `<dsk-input-group id="group" aria-label="Dimensions"><label>Width<dsk-input id="width" value="120" placeholder="Width" aria-label="Width"></dsk-input></label><label>Height<input id="height" value="80" type="number" placeholder="Height"></label><textarea id="depth">40</textarea></dsk-input-group>`;
    window.inputGroup = document.querySelector('dsk-input-group')!;
    window.groupEvents = [];
    for (const type of ['input', 'change'])
      window.inputGroup.addEventListener(type, (event) =>
        window.groupEvents.push(
          `${event.type}:${(event.target as HTMLElement).id}`,
        ),
      );
  });
});

test('unlinked fields are independent; linked edits propagate silently across DSK and HTML controls', async ({
  page,
}) => {
  await page.locator('#height').fill('90');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '120',
    '90',
    '40',
  ]);
  await page.evaluate(() => {
    window.inputGroup.linked = true;
    window.groupEvents = [];
  });
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '120',
    '90',
    '40',
  ]);
  await page.locator('#height').fill('240');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '240',
    '240',
    '240',
  ]);
  expect(await page.evaluate(() => window.groupEvents)).toEqual([
    'input:height',
  ]);
  const field = page.locator('#width').locator('input');
  await field.fill('320');
  await field.press('Tab');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '320',
    '320',
    '320',
  ]);
  await field.focus();
  await field.press('ArrowUp');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '321',
    '321',
    '321',
  ]);
  await page.evaluate(() => {
    document.querySelector<DskInput>('#width')!.value = 11;
  });
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '11',
    '321',
    '321',
  ]);
  await page.evaluate(() => {
    window.inputGroup.linked = false;
  });
  await page.locator('#height').fill('55');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '11',
    '55',
    '321',
  ]);
});

test('mixed is per field, localizable, reversible and cleared by a linked edit', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.inputGroup.mixedLabel = 'Multiple values';
    window.inputGroup.setMixed(document.querySelector<DskInput>('#width')!);
  });
  await expect(page.locator('#width').locator('input')).toHaveValue('');
  await expect(page.locator('#width').locator('input')).toHaveAttribute(
    'placeholder',
    'Multiple values',
  );
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    null,
    '80',
    '40',
  ]);
  await page.evaluate(() => {
    window.inputGroup.mixedLabel = 'Different';
  });
  await expect(page.locator('#width').locator('input')).toHaveAttribute(
    'placeholder',
    'Different',
  );
  await page.evaluate(() => {
    window.inputGroup.setMixed(
      document.querySelector<DskInput>('#width')!,
      false,
    );
  });
  await expect(page.locator('#width').locator('input')).toHaveValue('120');
  await expect(page.locator('#width').locator('input')).toHaveAttribute(
    'placeholder',
    'Width',
  );
  await page.evaluate(() => {
    window.inputGroup.linked = true;
    window.inputGroup.setMixed(document.querySelector<DskInput>('#width')!);
    window.inputGroup.setMixed(
      document.querySelector<HTMLInputElement>('#height')!,
    );
  });
  await page.locator('#height').fill('64');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '64',
    '64',
    '64',
  ]);
  await expect(page.locator('#width')).not.toHaveAttribute('mixed');
  await expect(page.locator('#height')).not.toHaveAttribute('mixed');
  await expect(page.locator('#height')).toHaveAttribute(
    'placeholder',
    'Height',
  );
  await page.evaluate(() => {
    window.inputGroup.setMixed(document.querySelector<DskInput>('#width')!);
  });
  await page.locator('#width').locator('input').fill('96');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '96',
    '96',
    '96',
  ]);
});

test('custom controls, late definitions and adapter methods participate without entering their internals', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.inputGroup.linked = true;
    const late = document.createElement('test-group-field');
    late.id = 'custom';
    window.inputGroup.append(late);
  });
  await page.evaluate(() => {
    customElements.define(
      'test-group-field',
      class extends HTMLElement {
        private readonly _field: HTMLInputElement;
        constructor() {
          super();
          this._field = document.createElement('input');
          this._field.value = '12';
          this.attachShadow({ mode: 'open' }).append(this._field);
        }
        get value(): string {
          return this._field.value;
        }
        set value(value: string) {
          this._field.value = value;
        }
        get placeholder(): string {
          return this._field.placeholder;
        }
        set placeholder(value: string) {
          this._field.placeholder = value;
        }
      },
    );
    window.inputGroup.setMixed(document.querySelector<HTMLElement>('#custom')!);
  });
  await expect(page.locator('#custom').locator('input')).toHaveAttribute(
    'placeholder',
    'Mixed',
  );
  await page.locator('#custom').locator('input').fill('75');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '75',
    '75',
    '75',
    '75',
  ]);
  await page.evaluate(() => {
    const field = document.createElement('div');
    field.id = 'adapter';
    field.dataset.amount = '5';
    window.inputGroup.append(field);
    window.inputGroup.registerInput(field, {
      getValue(input) {
        return input.dataset.amount!;
      },
      setValue(input, value) {
        input.dataset.amount = value;
      },
      setMixed(input, mixed, label) {
        input.textContent = mixed ? label : this.getValue(input);
      },
    });
    window.inputGroup.setMixed(field);
  });
  await expect(page.locator('#adapter')).toHaveText('Mixed');
  await page.locator('#height').fill('108');
  await expect(page.locator('#adapter')).toHaveAttribute('data-amount', '108');
  await page.evaluate(() => {
    const field = document.querySelector<HTMLElement>('#adapter')!;
    field.dataset.amount = '150';
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '150',
    '150',
    '150',
    '150',
    '150',
  ]);
});

test('nested groups, locked controls and removed controls remain independent', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.inputGroup.linked = true;
    document.querySelector<HTMLInputElement>('#height')!.readOnly = true;
    document.querySelector<HTMLTextAreaElement>('#depth')!.disabled = true;
    const nested = document.createElement('dsk-input-group');
    nested.linked = true;
    nested.innerHTML =
      '<input id="nested-one" value="1"><input id="nested-two" value="2">';
    window.inputGroup.append(nested);
    const button = document.createElement('button');
    button.value = 'ignored';
    window.inputGroup.append(button);
  });
  await page.locator('#nested-one').fill('9');
  await expect(page.locator('#nested-two')).toHaveValue('9');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '120',
    '80',
    '40',
  ]);
  await page.locator('#width').locator('input').fill('22');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '22',
    '80',
    '40',
  ]);
  await page.evaluate(() => {
    const width = document.querySelector<DskInput>('#width')!;
    window.inputGroup.setMixed(width);
    document.body.append(width);
  });
  await expect(page.locator('#width').locator('input')).toHaveValue('22');
  await expect(page.locator('#width').locator('input')).toHaveAttribute(
    'placeholder',
    'Width',
  );
});

test('disconnect restores mixed presentation and reconnect does not duplicate listeners', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.inputGroup.linked = true;
    window.inputGroup.setMixed(
      document.querySelector<HTMLInputElement>('#height')!,
    );
    window.inputGroup.remove();
  });
  expect(
    await page.evaluate(
      () => window.inputGroup.querySelector<HTMLInputElement>('#height')!.value,
    ),
  ).toBe('80');
  await page.evaluate(() => {
    document.body.append(window.inputGroup);
    window.groupEvents = [];
  });
  await expect(page.locator('#height')).toHaveValue('');
  await page.locator('#height').fill('17');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '17',
    '17',
    '17',
  ]);
  expect(await page.evaluate(() => window.groupEvents)).toEqual([
    'input:height',
  ]);
});

test('playground exposes link and mixed settings', async ({ page }) => {
  await page.goto('/');
  await page.locator('#input-group-linked').check();
  await page.locator('#input-group-height').fill('66');
  await expect(page.locator('#input-group-values')).toHaveText(
    '["66","66","66"]',
  );
  await page.locator('#input-group-reset').click();
  await page.locator('#input-group-label').fill('Multiple');
  await page.locator('#input-group-automatic').check();
  await expect(page.locator('#input-group-code')).toContainText(
    'has-mixed-values="true"',
  );
  await expect(page.locator('#input-group-code')).not.toContainText('setMixed');
  await expect(
    page.locator('#input-group-width').locator('input'),
  ).toHaveAttribute('placeholder', 'Multiple');
  await page.locator('#input-group-reset').click();
  await expect(page.locator('#input-group-values')).toHaveText(
    '["120","80","40"]',
  );
});

test('automatic mixed values preserve memory while focus moves and linked edits resolve differences', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.inputGroup.setAttribute('has-mixed-values', 'true'),
  );
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    null,
    null,
    null,
  ]);
  expect(await page.evaluate(() => window.inputGroup.storedValues)).toEqual([
    '120',
    '80',
    '40',
  ]);
  await page.locator('#width').locator('input').click();
  await expect(page.locator('#width').locator('input')).toHaveValue('120');
  await expect(page.locator('#height')).toHaveValue('');
  await page.locator('#height').click();
  await expect(page.locator('#height')).toHaveValue('80');
  await expect(page.locator('#width').locator('input')).toHaveValue('');
  await expect(page.locator('#width').locator('input')).toHaveAttribute(
    'placeholder',
    'Mixed',
  );
  await page.locator('#height').fill('95');
  await page.locator('#height').press('Tab');
  await expect(page.locator('#depth')).toHaveValue('40');
  expect(await page.evaluate(() => window.inputGroup.storedValues)).toEqual([
    '120',
    '95',
    '40',
  ]);
  await page.evaluate(() =>
    window.inputGroup.setAttribute('has-mixed-values', 'false'),
  );
  await expect(page.locator('#height')).toHaveValue('95');
  await expect(page.locator('#width').locator('input')).toHaveValue('120');
  await page.evaluate(() => {
    window.inputGroup.hasMixedValues = true;
    window.inputGroup.linked = true;
  });
  await page.locator('#depth').fill('70');
  expect(await page.evaluate(() => window.inputGroup.values)).toEqual([
    '70',
    '70',
    '70',
  ]);
});
