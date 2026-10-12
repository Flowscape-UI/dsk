import { expect, test, type Page } from '@playwright/test';
import type { DskInput } from '@flowscape-ui/dsk';

type KeyDetails = Pick<
  KeyboardEventInit,
  'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'
>;

async function sendKey(page: Page, details: KeyDetails): Promise<boolean> {
  return page.locator('#layout-input input').evaluate((input, details) => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      ...details,
    });
    input.dispatchEvent(event);
    return event.defaultPrevented;
  }, details);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-input');
    const input: DskInput = document.createElement('dsk-input');
    input.id = 'layout-input';
    input.min = 0;
    input.max = 100;
    input.keyHorizontalStep = 2;
    input.keyVerticalStep = 5;
    input.value = 10;
    document.body.append(input);
  });
});

for (const modifier of ['ctrlKey', 'metaKey'] as const) {
  test(`${modifier} undo and redo follow KeyZ in a Cyrillic layout`, async ({
    page,
  }) => {
    const input = page.locator('#layout-input input');
    await input.press('ArrowRight');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('17');

    expect(
      await sendKey(page, { key: 'я', code: 'KeyZ', [modifier]: true }),
    ).toBe(true);
    await expect(input).toHaveValue('12');

    expect(
      await sendKey(page, {
        key: 'Я',
        code: 'KeyZ',
        [modifier]: true,
        shiftKey: true,
      }),
    ).toBe(true);
    await expect(input).toHaveValue('17');
  });
}

test('a letter z on another physical key does not trigger undo', async ({
  page,
}) => {
  const input = page.locator('#layout-input input');
  await input.press('ArrowRight');
  expect(await sendKey(page, { key: 'z', code: 'KeyY', ctrlKey: true })).toBe(
    false,
  );
  await expect(input).toHaveValue('12');
  expect(await sendKey(page, { key: 'я', code: 'KeyZ', ctrlKey: true })).toBe(
    true,
  );
  await expect(input).toHaveValue('10');
});

test('keyboard history falls back to the letter when a physical code is unavailable', async ({
  page,
}) => {
  const input = page.locator('#layout-input input');
  await input.press('ArrowRight');
  expect(await sendKey(page, { key: 'z', code: '', ctrlKey: true })).toBe(true);
  await expect(input).toHaveValue('10');
  expect(
    await sendKey(page, {
      key: 'Z',
      code: 'Unidentified',
      ctrlKey: true,
      shiftKey: true,
    }),
  ).toBe(true);
  await expect(input).toHaveValue('12');
});

test('arrows require focus and Escape restores the value and removes focus', async ({
  page,
}) => {
  const input = page.locator('#layout-input input');
  expect(await sendKey(page, { key: 'ArrowRight', code: 'ArrowRight' })).toBe(
    false,
  );
  await expect(input).toHaveValue('10');

  await input.focus();
  for (const [key, value] of [
    ['ArrowRight', '12'],
    ['ArrowUp', '17'],
    ['ArrowLeft', '15'],
    ['ArrowDown', '10'],
  ] as const) {
    expect(await sendKey(page, { key, code: key })).toBe(true);
    await expect(input).toHaveValue(value);
  }

  await input.fill('7 + 3');
  expect(await sendKey(page, { key: 'Escape', code: 'Escape' })).toBe(true);
  await expect(input).toHaveValue('10');
  await expect(input).not.toBeFocused();
  expect(await sendKey(page, { key: 'ArrowUp', code: 'ArrowUp' })).toBe(false);
  expect(await sendKey(page, { key: 'я', code: 'KeyZ', ctrlKey: true })).toBe(
    false,
  );
  await expect(input).toHaveValue('10');
});
