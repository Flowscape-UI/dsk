import { expect, test, type Page } from '@playwright/test';
import type { DskColorArea } from '@flowscape-ui/dsk';

interface ColorAreaEvent {
  type: string;
  saturation: number;
  brightness: number;
  bubbles: boolean;
  composed: boolean;
  hostTarget: boolean;
}

declare global {
  interface Window {
    colorAreaEvents: ColorAreaEvent[];
    colorAreaChanges: number;
    colorAreaPointerId: number;
    getColorArea: () => DskColorArea;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-color-area');
    const area = document.createElement('dsk-color-area');
    area.id = 'area-under-test';
    area.style.cssText =
      'position: fixed; left: 16px; top: 16px; z-index: 1000';
    document.body.append(area);
    window.getColorArea = () => area;
    window.colorAreaEvents = [];
    window.colorAreaChanges = 0;
    area.setAttribute('onchange', 'window.colorAreaChanges += 1');
    const record = (event: Event) => {
      window.colorAreaEvents.push({
        type: event.type,
        saturation: area.saturation,
        brightness: area.brightness,
        bubbles: event.bubbles,
        composed: event.composed,
        hostTarget: event.target === area,
      });
    };
    area.addEventListener('input', record);
    area.addEventListener('change', record);
    area.addEventListener('pointerdown', (event) => {
      window.colorAreaPointerId = event.pointerId;
    });
  });
});

async function surfaceBox(page: Page) {
  const box = await page
    .locator('#area-under-test [part~="surface"]')
    .boundingBox();
  if (!box) throw new Error('The color area must have a visible surface.');
  return box;
}

async function expectSide(page: Page, side: number): Promise<void> {
  await expect
    .poll(async () => {
      const box = await page.locator('#area-under-test').boundingBox();
      return box ? [Math.round(box.width), Math.round(box.height)] : null;
    })
    .toEqual([side, side]);
}

test('registers independently and normalizes the public HSV API without emitting events', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const area = window.getColorArea();
    const defaults = [area.hue, area.saturation, area.brightness, area.color];
    area.hue = '570';
    area.saturation = '50';
    area.brightness = 80;
    const blue = [area.hue, area.saturation, area.brightness, area.color];
    area.hue = -240;
    area.saturation = 200;
    area.brightness = -10;
    const clamped = [area.hue, area.saturation, area.brightness, area.color];
    area.hue = null;
    area.saturation = undefined;
    area.brightness = null;
    area.step = -2;
    const reset = [
      area.hue,
      area.saturation,
      area.brightness,
      area.color,
      area.step,
    ];
    area.setAttribute('hue', '120');
    area.setAttribute('saturation', '50');
    area.setAttribute('brightness', '50');
    return {
      defaults,
      blue,
      clamped,
      reset,
      green: area.color,
      events: window.colorAreaEvents,
    };
  });
  expect(result).toEqual({
    defaults: [0, 100, 100, '#FF0000'],
    blue: [210, 50, 80, '#6699CC'],
    clamped: [120, 100, 0, '#000000'],
    reset: [0, 100, 100, '#FF0000', 1],
    green: '#408040',
    events: [],
  });
  await expect(page.locator('#area-under-test [part~="surface"]')).toHaveCSS(
    'background-color',
    'rgb(0, 255, 0)',
  );
  await expect(page.locator('#area-under-test [part~="marker"]')).toHaveCSS(
    'background-color',
    'rgb(64, 128, 64)',
  );
  const surface = await surfaceBox(page);
  const marker = await page
    .locator('#area-under-test [part~="marker"]')
    .boundingBox();
  if (!marker) throw new Error('The selection marker is missing.');
  expect(marker.x + marker.width / 2).toBeCloseTo(
    surface.x + surface.width / 2,
    1,
  );
  expect(marker.y + marker.height / 2).toBeCloseTo(
    surface.y + surface.height / 2,
    1,
  );
});

test('preserves standard HTML attributes and honors hidden', async ({
  page,
}) => {
  const area = page.locator('#area-under-test');
  await page.evaluate(() => {
    const area = window.getColorArea();
    area.className = 'customer-palette';
    area.setAttribute('aria-label', 'Accent color');
    area.setAttribute('title', 'Choose an accent');
    area.setAttribute('data-theme', 'custom');
    area.style.borderRadius = '12px';
    area.hue = 45;
  });
  await expect(area).toHaveAttribute('id', 'area-under-test');
  await expect(area).toHaveClass('customer-palette');
  await expect(area).toHaveAttribute('aria-label', 'Accent color');
  await expect(area).toHaveAttribute('title', 'Choose an accent');
  await expect(area).toHaveAttribute('data-theme', 'custom');
  await expect(area).toHaveCSS('border-radius', '12px');
  await page.evaluate(() => {
    window.getColorArea().hidden = true;
  });
  await expect(area).toBeHidden();
  await page.evaluate(() => {
    window.getColorArea().hidden = false;
  });
  await expect(area).toBeVisible();
});

test('clicking the palette updates both channels and emits native host events', async ({
  page,
}) => {
  const box = await surfaceBox(page);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await page.evaluate(() => window.colorAreaEvents)).toEqual([
    {
      type: 'input',
      saturation: 50,
      brightness: 50,
      bubbles: true,
      composed: true,
      hostTarget: true,
    },
    {
      type: 'change',
      saturation: 50,
      brightness: 50,
      bubbles: true,
      composed: true,
      hostTarget: true,
    },
  ]);
  expect(await page.evaluate(() => window.colorAreaChanges)).toBe(1);
  expect(await page.evaluate(() => window.getColorArea().color)).toBe(
    '#804040',
  );
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  expect(await page.evaluate(() => window.colorAreaEvents.length)).toBe(2);
});

test('dragging beyond the palette clamps the channels and commits once on release', async ({
  page,
}) => {
  const box = await surfaceBox(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 80, box.y + box.height + 80, {
    steps: 5,
  });
  expect(await page.evaluate(() => window.getColorArea().saturation)).toBe(100);
  expect(await page.evaluate(() => window.getColorArea().brightness)).toBe(0);
  expect(await page.evaluate(() => window.colorAreaChanges)).toBe(0);
  await page.mouse.up();
  expect(await page.evaluate(() => window.colorAreaChanges)).toBe(1);
  expect(
    await page.evaluate(
      () =>
        window.colorAreaEvents.filter((event) => event.type === 'input').length,
    ),
  ).toBeGreaterThan(1);
});

for (const cancellation of ['Escape', 'pointercancel'] as const) {
  test(`${cancellation} restores the starting selection without committing the drag`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      const area = window.getColorArea();
      area.saturation = 20;
      area.brightness = 70;
    });
    const box = await surfaceBox(page);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    if (cancellation === 'Escape') {
      await page.keyboard.press('Escape');
    } else {
      await page.evaluate(() => {
        const surface = window
          .getColorArea()
          .shadowRoot?.querySelector('[part~="surface"]');
        if (!surface) throw new Error('The palette surface is missing.');
        surface.dispatchEvent(
          new PointerEvent('pointercancel', {
            pointerId: window.colorAreaPointerId,
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
    await page.mouse.move(box.x + box.width + 40, box.y + box.height + 40);
    await page.mouse.up();
    expect(
      await page.evaluate(() =>
        window.colorAreaEvents.map((event) => [
          event.type,
          event.saturation,
          event.brightness,
        ]),
      ),
    ).toEqual([
      ['input', 50, 50],
      ['input', 20, 70],
    ]);
    expect(await page.evaluate(() => window.colorAreaChanges)).toBe(0);
  });
}

test('keyboard access exposes both channels and supports arrows, Shift, Home and End', async ({
  page,
}) => {
  const area = page.locator('#area-under-test');
  const saturation = area.getByRole('slider', {
    name: 'Saturation',
    exact: true,
  });
  const brightness = area.getByRole('slider', {
    name: 'Brightness',
    exact: true,
  });
  await page.evaluate(() => {
    const area = window.getColorArea();
    area.saturation = 40;
    area.brightness = 60;
    area.step = 2;
    area.focus({ preventScroll: true });
  });
  await expect(saturation).toBeFocused();
  await expect(saturation).toHaveValue('40');
  await expect(brightness).toHaveValue('60');
  await page.keyboard.press('ArrowRight');
  await expect(saturation).toHaveValue('42');
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(saturation).toHaveValue('22');
  await page.keyboard.press('ArrowUp');
  await expect(brightness).toHaveValue('62');
  await expect(brightness).toBeFocused();
  await page.keyboard.press('Home');
  await expect(brightness).toHaveValue('0');
  await page.keyboard.press('End');
  await expect(brightness).toHaveValue('100');
  await page.keyboard.press('ArrowLeft');
  await expect(saturation).toBeFocused();
  await expect(saturation).toHaveValue('20');
  await page.keyboard.press('Home');
  await expect(saturation).toHaveValue('0');
  await expect(brightness).toHaveValue('100');
  const events = await page.evaluate(() =>
    window.colorAreaEvents.map((event) => event.type),
  );
  expect(events).toEqual(
    Array.from({ length: 7 }, () => ['input', 'change']).flat(),
  );
});

for (const state of ['disabled', 'readOnly'] as const) {
  test(`${state} blocks pointer and keyboard changes and stops an active drag`, async ({
    page,
  }) => {
    await page.evaluate((state) => {
      const area = window.getColorArea();
      area.saturation = 25;
      area.brightness = 75;
      area[state] = true;
    }, state);
    await expect(page.locator('#area-under-test')).toHaveAttribute(
      state.toLowerCase(),
      '',
    );
    const box = await surfaceBox(page);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.evaluate(() => window.getColorArea().focus());
    await page.keyboard.press('ArrowLeft');
    expect(
      await page.evaluate(() => [
        window.getColorArea().saturation,
        window.getColorArea().brightness,
      ]),
    ).toEqual([25, 75]);
    expect(await page.evaluate(() => window.colorAreaEvents)).toEqual([]);
    await page.evaluate((state) => {
      window.getColorArea()[state] = false;
    }, state);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.evaluate((state) => {
      window.getColorArea()[state] = true;
    }, state);
    const stopped = await page.evaluate(() => [
      window.getColorArea().saturation,
      window.getColorArea().brightness,
    ]);
    await page.mouse.move(box.x + box.width + 40, box.y + box.height + 40);
    await page.mouse.up();
    expect(
      await page.evaluate(() => [
        window.getColorArea().saturation,
        window.getColorArea().brightness,
      ]),
    ).toEqual(stopped);
    expect(await page.evaluate(() => window.colorAreaChanges)).toBe(0);
  });
}

test('width and height requests always use the larger side and can shrink again', async ({
  page,
}) => {
  await expectSide(page, 208);
  for (const [width, height, expected] of [
    [180, 280, 280],
    [400, 280, 400],
    [120, 280, 280],
    [120, 80, 120],
    [null, 80, 80],
    [null, null, 208],
  ] as const) {
    await page.evaluate(
      ({ width, height }) => {
        const area = window.getColorArea();
        area.width = width;
        area.height = height;
      },
      { width, height },
    );
    await expectSide(page, expected);
  }
  await page.evaluate(() => {
    const area = window.getColorArea();
    area.setAttribute('width', '320');
    area.setAttribute('height', '240');
  });
  await expectSide(page, 320);
});

test('ordinary CSS dimensions stay square through changes and responsive parent resizing', async ({
  page,
}) => {
  await page.evaluate(() => {
    const area = window.getColorArea();
    area.style.width = '180px';
    area.style.height = '300px';
  });
  await expectSide(page, 300);
  await page.evaluate(() => {
    window.getColorArea().style.height = '120px';
  });
  await expectSide(page, 180);
  await page.evaluate(() => {
    const parent = document.createElement('div');
    parent.id = 'area-size-parent';
    parent.style.cssText =
      'position: fixed; left: 16px; top: 16px; width: 240px';
    document.body.append(parent);
    const area = window.getColorArea();
    area.style.position = 'relative';
    area.style.left = '0';
    area.style.top = '0';
    area.style.width = '100%';
    parent.append(area);
  });
  await expectSide(page, 240);
  await page.evaluate(() => {
    const parent = document.getElementById('area-size-parent');
    if (!parent) throw new Error('The responsive parent is missing.');
    parent.style.width = '140px';
  });
  await expectSide(page, 140);
  await page.evaluate(() => {
    window.getColorArea().style.transform = 'scale(0.5)';
  });
  await expectSide(page, 70);
  await page.evaluate(async () => {
    for (let frame = 0; frame < 6; frame += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
  });
  await expectSide(page, 70);
});

test('disconnecting cancels interaction and reconnecting does not duplicate listeners', async ({
  page,
}) => {
  const box = await surfaceBox(page);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.evaluate(() => window.getColorArea().remove());
  const stopped = await page.evaluate(() => [
    window.getColorArea().saturation,
    window.getColorArea().brightness,
  ]);
  await page.mouse.move(box.x + box.width + 40, box.y + box.height + 40);
  await page.mouse.up();
  expect(
    await page.evaluate(() => [
      window.getColorArea().saturation,
      window.getColorArea().brightness,
    ]),
  ).toEqual(stopped);
  expect(await page.evaluate(() => window.colorAreaChanges)).toBe(0);
  await page.evaluate(() => {
    const area = window.getColorArea();
    for (let index = 0; index < 3; index += 1) {
      document.body.append(area);
      area.remove();
    }
    document.body.append(area);
    area.saturation = 40;
    area.brightness = 60;
    window.colorAreaEvents = [];
    area.focus();
  });
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.getColorArea().saturation)).toBe(41);
  expect(
    await page.evaluate(() =>
      window.colorAreaEvents.map((event) => event.type),
    ),
  ).toEqual(['input', 'change']);
});

test('Escape remains available to a containing dialog outside an active drag', async ({
  page,
}) => {
  const prevented = await page.evaluate(() => {
    const area = window.getColorArea();
    area.focus();
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    area.dispatchEvent(escape);
    return escape.defaultPrevented;
  });
  expect(prevented).toBe(false);
});

test('playground displays the standalone palette and synchronizes live controls', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => window.getColorArea().remove());
  const lab = page.locator('.area-lab');
  const demo = page.locator('#area-demo');
  await lab.scrollIntoViewIfNeeded();
  await page.locator('[name="area-hue"]').fill('210');
  await page.locator('[name="area-saturation"]').fill('50');
  await page.locator('[name="area-brightness"]').fill('80');
  await expect(page.locator('#area-current-color')).toHaveText('#6699CC');
  await expect(page.locator('#area-swatch')).toHaveCSS(
    'background-color',
    'rgb(102, 153, 204)',
  );
  await expect(page.locator('#area-code')).toContainText('hue="210"');
  await demo.evaluate((area: DskColorArea) => area.focus());
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('[name="area-saturation"]')).toHaveValue('49');
  await expect(page.locator('#area-change-count')).toHaveText('1');
  await page.locator('#area-reset').click();
  const screenshot = testInfo.outputPath('color-area-playground.png');
  await lab.screenshot({ path: screenshot });
  await testInfo.attach('color-area-playground', {
    path: screenshot,
    contentType: 'image/png',
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await demo.boundingBox();
  if (!box) throw new Error('The playground color area must remain visible.');
  expect(box.width).toBe(208);
  expect(box.height).toBe(208);
});
