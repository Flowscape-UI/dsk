import type { DskCurve, DskInput } from '@flowscape-ui/dsk';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-angle');
    document.body.innerHTML = `<dsk-angle value="20"></dsk-angle>
      <dsk-color-area saturation="40" brightness="50"></dsk-color-area>
      <dsk-color-hue hue="30"></dsk-color-hue>
      <dsk-color-alpha alpha="60"></dsk-color-alpha>
      <dsk-curve></dsk-curve>
      <dsk-pan-zoom></dsk-pan-zoom>
      <dsk-ruler></dsk-ruler>
      <dsk-input-group linked><dsk-input value="10"></dsk-input><dsk-input value="20"></dsk-input></dsk-input-group>
      <dsk-layer-tree><dsk-list-value label="First"></dsk-list-value><dsk-list-value label="Second"></dsk-list-value></dsk-layer-tree>`;
  });
});

for (const [tag, attribute, initial] of [
  ['dsk-angle', 'value', 20],
  ['dsk-color-area', 'saturation', 40],
  ['dsk-color-hue', 'hue', 30],
  ['dsk-color-alpha', 'alpha', 60],
] as const) {
  test(`${tag}: keyboard history, branching, external reset and readonly`, async ({
    page,
  }) => {
    const control = page.locator(tag);
    await control.evaluate((element) => element.focus());
    await page.keyboard.press('ArrowRight');
    await expect(control).toHaveAttribute(attribute, String(initial + 1));
    await page.keyboard.press('Control+z');
    await expect(control).toHaveAttribute(attribute, String(initial));
    await page.keyboard.press('Control+Shift+z');
    await expect(control).toHaveAttribute(attribute, String(initial + 1));
    await page.keyboard.press('Control+z');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Control+Shift+z');
    await expect(control).toHaveAttribute(attribute, String(initial - 1));
    await control.evaluate((element) => element.setAttribute('readonly', ''));
    await page.keyboard.press('Control+z');
    await expect(control).toHaveAttribute(attribute, String(initial - 1));
    await control.evaluate((element, attribute) => {
      element.removeAttribute('readonly');
      element.setAttribute(attribute, '70');
    }, attribute);
    await page.keyboard.press('Control+z');
    await expect(control).toHaveAttribute(attribute, '70');
  });
}

test('Shift-drag snaps in degrees and one undo restores the complete gesture', async ({
  page,
}) => {
  const angle = page.locator('dsk-angle');
  const box = (await angle.boundingBox())!;
  const point = (degrees: number) => ({
    x:
      box.x +
      box.width / 2 +
      (Math.sin((degrees * Math.PI) / 180) * box.width * 77) / 240,
    y:
      box.y +
      box.height / 2 -
      (Math.cos((degrees * Math.PI) / 180) * box.height * 77) / 240,
  });
  await page.keyboard.down('Shift');
  const start = point(32);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(angle).toHaveAttribute('value', '30');
  for (const degrees of [47, 62, 77]) {
    const position = point(degrees);
    await page.mouse.move(position.x, position.y);
  }
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(angle).toHaveAttribute('value', '75');
  await page.keyboard.press('Control+z');
  await expect(angle).toHaveAttribute('value', '20');
  await page.keyboard.press('Control+Shift+z');
  await expect(angle).toHaveAttribute('value', '75');
  await angle.evaluate((element) => {
    element.setAttribute('snap-angle', '15');
    element.setAttribute('unit', 'rad');
  });
  await page.keyboard.down('Shift');
  await page.mouse.click(start.x, start.y);
  await page.keyboard.up('Shift');
  expect(Number(await angle.getAttribute('value'))).toBeCloseTo(Math.PI / 6, 7);
});

test('linked fields restore distinct original values together', async ({
  page,
}) => {
  const fields = page.locator('dsk-input-group dsk-input');
  await fields.first().evaluate((element) => element.focus());
  await page.keyboard.press('ArrowUp');
  await expect(fields.nth(1)).toHaveAttribute('value', '11');
  await page.keyboard.press('Control+z');
  await expect(fields.first()).toHaveAttribute('value', '10');
  await expect(fields.nth(1)).toHaveAttribute('value', '20');
  await page.keyboard.press('Control+Shift+z');
  await expect(fields.first()).toHaveAttribute('value', '11');
  await expect(fields.nth(1)).toHaveAttribute('value', '11');
});

test('camera and guides support undo and redo', async ({ page }) => {
  const viewport = page.locator('dsk-pan-zoom [part=viewport]');
  await viewport.focus();
  const initial = await page.evaluate(
    () => document.querySelector('dsk-pan-zoom')!.camera,
  );
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Control+z');
  expect(
    await page.evaluate(() => document.querySelector('dsk-pan-zoom')!.camera),
  ).toEqual(initial);
  await page.keyboard.press('Control+Shift+z');
  expect(
    (await page.evaluate(() => document.querySelector('dsk-pan-zoom')!.camera))
      .panX,
  ).toBe(initial.panX - 20);
  await page.locator('dsk-ruler').evaluate((element) => element.focus());
  await page.keyboard.press('Enter');
  expect(
    await page.evaluate(
      () => document.querySelector('dsk-ruler')!.guides.length,
    ),
  ).toBe(1);
  await page.keyboard.press('Control+z');
  expect(
    await page.evaluate(
      () => document.querySelector('dsk-ruler')!.guides.length,
    ),
  ).toBe(0);
  await page.keyboard.press('Control+Shift+z');
  expect(
    await page.evaluate(
      () => document.querySelector('dsk-ruler')!.guides.length,
    ),
  ).toBe(1);
});

test('tree reordering preserves nodes through undo and redo', async ({
  page,
}) => {
  await page.locator('dsk-list-value').first().focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator('dsk-list-value').first()).toHaveAttribute(
    'label',
    'Second',
  );
  await page.keyboard.press('Control+z');
  await expect(page.locator('dsk-list-value').first()).toHaveAttribute(
    'label',
    'First',
  );
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('dsk-list-value').first()).toHaveAttribute(
    'label',
    'Second',
  );
});

test('curve history restores complete paths', async ({ page }) => {
  const curve = page.locator('dsk-curve');
  const initial = await curve.evaluate((element: DskCurve) => element.value);
  await curve.evaluate((element) => element.focus());
  await page.keyboard.press('ArrowRight');
  const edited = await curve.evaluate((element: DskCurve) => element.value);
  expect(edited).not.toBe(initial);
  await page.keyboard.press('Control+z');
  expect(await curve.evaluate((element: DskCurve) => element.value)).toBe(
    initial,
  );
  await page.keyboard.press('Control+Shift+z');
  expect(await curve.evaluate((element: DskCurve) => element.value)).toBe(
    edited,
  );
});

test('tree rename undo keeps header icons and custom nodes', async ({
  page,
}) => {
  const row = page.locator('dsk-list-value').first();
  await row.evaluate((element) => {
    element.innerHTML =
      '<span slot="header"><b data-dsk-name>First</b><i>icon</i></span>';
  });
  await row.focus();
  await page.keyboard.press('F2');
  await row.locator('[part=editor]').fill('Renamed');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+z');
  await expect(row.locator('[data-dsk-name]')).toHaveText('First');
  await expect(row.locator('i')).toHaveText('icon');
  await page.keyboard.press('Control+Shift+z');
  await expect(row.locator('[data-dsk-name]')).toHaveText('Renamed');
});

test('external linked field updates reset group history', async ({ page }) => {
  const fields = page.locator('dsk-input-group dsk-input');
  await fields.first().evaluate((element) => element.focus());
  await page.keyboard.press('ArrowUp');
  await fields.nth(1).evaluate((element: DskInput) => {
    element.value = '77';
  });
  await page.keyboard.press('Control+z');
  await expect(fields.nth(1)).toHaveAttribute('value', '77');
});

test('an explicit origin camera remains at zero after connection', async ({
  page,
}) => {
  await page.evaluate(() => {
    const viewport = document.createElement('dsk-pan-zoom');
    viewport.id = 'explicit-origin';
    viewport.camera = { panX: 0, panY: 0, zoom: 1 };
    document.body.append(viewport);
  });
  await expect(page.locator('#explicit-origin [part=world]')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 0, 0)',
  );
});

test('linked group draft undo and redo preserve distinct committed values', async ({
  page,
}) => {
  const field = page
    .locator('dsk-input-group dsk-input')
    .first()
    .locator('input');
  await field.fill('37');
  await page.keyboard.press('Control+z');
  const fields = page.locator('dsk-input-group dsk-input');
  await expect(fields.first()).toHaveAttribute('value', '10');
  await expect(fields.nth(1)).toHaveAttribute('value', '20');
  await page.keyboard.press('Control+Shift+z');
  await expect(fields.first()).toHaveAttribute('value', '37');
  await expect(fields.nth(1)).toHaveAttribute('value', '37');
});
