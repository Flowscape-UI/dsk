import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-panel');
    document.body.innerHTML = `<style>
      body { margin:40px; }
      dsk-panel { width:240px; height:200px; min-width:120px; max-width:400px; min-height:100px; max-height:320px; padding:12px; border:2px solid black; }
    </style><dsk-panel id="panel" aria-label="Inspector" data-custom="kept"><input aria-label="Title" value="Hello"><span>Content</span></dsk-panel><button id="outside">Outside</button>`;
    const panel = document.querySelector('dsk-panel')!;
    for (const type of ['input', 'change'])
      panel.addEventListener(type, (event) => {
        if (event.target === panel)
          panel.dataset[type] = String(Number(panel.dataset[type] ?? 0) + 1);
      });
  });
});

async function startDrag(page: Page) {
  const box = (await page
    .locator('dsk-panel')
    .locator('[part=handle]')
    .boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  return { x, y };
}

for (const side of ['right', 'left', 'top', 'bottom'] as const) {
  test(`${side} offset and inset move only the handle and preserve dragging`, async ({
    page,
  }) => {
    const panel = page.locator('dsk-panel');
    await panel.evaluate(
      (element, side) => element.setAttribute('drag-end', side),
      side,
    );
    const handle = panel.locator('[part=handle]');
    const original = (await handle.boundingBox())!;
    const horizontal = side === 'left' || side === 'right';
    const axis = horizontal ? 'x' : 'y';
    const sign = side === 'left' || side === 'top' ? -1 : 1;
    await panel.evaluate((element) => element.setAttribute('offset', '20'));
    expect((await handle.boundingBox())![axis]).toBeCloseTo(
      original[axis] + sign * 20,
      1,
    );
    await panel.evaluate((element) => element.setAttribute('inset', '30'));
    expect((await handle.boundingBox())![axis]).toBeCloseTo(
      original[axis] - sign * 10,
      1,
    );
    await expect(panel).toHaveCSS('width', '240px');
    await expect(panel).toHaveCSS('height', '200px');
    const point = await startDrag(page);
    await page.mouse.move(
      point.x + (horizontal ? sign * 30 : 0),
      point.y + (horizontal ? 0 : sign * 30),
    );
    await page.mouse.up();
    await expect(panel).toHaveCSS(
      horizontal ? 'width' : 'height',
      horizontal ? '270px' : '230px',
    );
    await panel.evaluate((element) => {
      element.removeAttribute('offset');
      element.setAttribute('inset', '-5');
    });
    await expect(panel).toHaveJSProperty('offset', 0);
    await expect(panel).toHaveJSProperty('inset', -5);
    await expect(handle).toHaveCSS(side, '-5px');
    await panel.evaluate((element) => element.setAttribute('offset', '-12'));
    await expect(panel).toHaveJSProperty('offset', -12);
    await expect(handle).toHaveCSS(side, '7px');
    await panel.evaluate((element) => {
      element.setAttribute('offset', 'invalid');
      element.removeAttribute('inset');
    });
    await expect(handle).toHaveCSS(side, '0px');
  });
}

for (const side of ['right', 'left', 'top', 'bottom'] as const) {
  test(`${side} resizes the correct dimension and records one undoable gesture`, async ({
    page,
  }) => {
    const panel = page.locator('dsk-panel');
    await panel.evaluate((element, side) => {
      element.setAttribute('drag-end', side);
    }, side);
    const horizontal = side === 'left' || side === 'right';
    const sign = side === 'left' || side === 'top' ? -1 : 1;
    const point = await startDrag(page);
    const before = (await panel.boundingBox())!;
    await page.mouse.move(
      point.x + (horizontal ? sign * 60 : 0),
      point.y + (horizontal ? 0 : sign * 60),
      { steps: 4 },
    );
    await expect(panel).toHaveCSS(
      horizontal ? 'width' : 'height',
      horizontal ? '300px' : '260px',
    );
    await expect(panel).not.toHaveAttribute('data-change');
    await page.mouse.up();
    const after = (await panel.boundingBox())!;
    if (side === 'left')
      expect(after.x + after.width).toBeCloseTo(before.x + before.width, 1);
    if (side === 'top')
      expect(after.y + after.height).toBeCloseTo(before.y + before.height, 1);
    await expect(panel).toHaveAttribute('data-change', '1');
    await page.keyboard.press('Control+z');
    await expect(panel).toHaveCSS(
      horizontal ? 'width' : 'height',
      horizontal ? '240px' : '200px',
    );
    expect(
      await panel.evaluate(
        (element, horizontal) =>
          (element as HTMLElement).style[horizontal ? 'width' : 'height'],
        horizontal,
      ),
    ).toBe('');
    await page.keyboard.press('Control+Shift+z');
    await expect(panel).toHaveCSS(
      horizontal ? 'width' : 'height',
      horizontal ? '300px' : '260px',
    );
  });
}

test('default edge, full length, cursor styling, content and ordinary attributes', async ({
  page,
}) => {
  const panel = page.locator('dsk-panel');
  const handle = panel.locator('[part=handle]');
  await expect(handle).toHaveAttribute('data-side', 'right');
  await expect(handle).toHaveAttribute('role', 'separator');
  await expect(handle).toHaveAttribute('aria-orientation', 'vertical');
  await expect(panel).toHaveAttribute('data-custom', 'kept');
  await expect(panel.getByRole('textbox', { name: 'Title' })).toHaveValue(
    'Hello',
  );
  await page.addStyleTag({
    content:
      'dsk-panel::part(handle){width:12px;height:9px;cursor:col-resize;background:rgb(255,0,0)}',
  });
  await expect(handle).toHaveCSS('width', '12px');
  await expect(handle).toHaveCSS('height', '196px');
  await expect(handle).toHaveCSS('cursor', 'col-resize');
  await expect(handle).toHaveCSS('background-color', 'rgb(255, 0, 0)');
  await panel.evaluate((element) => element.setAttribute('drag-end', 'bottom'));
  await expect(handle).toHaveCSS('width', '236px');
  await expect(handle).toHaveCSS('height', '9px');
  await expect(handle).toHaveAttribute('aria-orientation', 'horizontal');
  await panel.evaluate((element) =>
    element.setAttribute('drag-end', 'invalid'),
  );
  await expect(handle).toHaveAttribute('data-side', 'right');
  await panel.evaluate((element) => element.setAttribute('hidden', ''));
  await expect(panel).toBeHidden();
});

test('size attributes constrain both axes and default to no additional limits', async ({
  page,
}) => {
  const panel = page.locator('dsk-panel');
  await panel.evaluate((element) => {
    element.setAttribute('min-size', '230');
    element.setAttribute('max-size', '250');
    element.setAttribute('step', '100');
  });
  const handle = panel.locator('[part=handle]');
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(panel).toHaveCSS('width', '250px');
  await page.keyboard.press('ArrowLeft');
  await expect(panel).toHaveCSS('width', '230px');
  await panel.evaluate((element) => element.setAttribute('drag-end', 'bottom'));
  await page.keyboard.press('ArrowDown');
  await expect(panel).toHaveCSS('height', '250px');
  await panel.evaluate((element) => {
    element.removeAttribute('min-size');
    element.removeAttribute('max-size');
  });
  await page.keyboard.press('ArrowDown');
  await expect(panel).toHaveCSS('height', '320px');
});

test('CSS bounds clamp pointer and keyboard edits without extra commits at the limit', async ({
  page,
}) => {
  const panel = page.locator('dsk-panel');
  const point = await startDrag(page);
  await page.mouse.move(point.x + 500, point.y);
  await page.mouse.up();
  await expect(panel).toHaveCSS('width', '400px');
  await page.keyboard.press('ArrowRight');
  await expect(panel).toHaveAttribute('data-change', '1');
  await panel.evaluate((element) => {
    element.setAttribute('step', '5');
    element.setAttribute('handle-label', 'Resize inspector');
  });
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(panel).toHaveCSS('width', '350px');
  await expect(panel.locator('[part=handle]')).toHaveAttribute(
    'aria-label',
    'Resize inspector',
  );
  await expect(panel.locator('[part=handle]')).toHaveAttribute(
    'aria-valuenow',
    '350',
  );
  const next = await startDrag(page);
  await page.mouse.move(next.x - 500, next.y);
  await page.mouse.up();
  await expect(panel).toHaveCSS('width', '120px');
});

for (const cancel of [
  'Escape',
  'pointercancel',
  'blur',
  'disconnect',
] as const) {
  test(`${cancel} restores the original CSS sizing without committing`, async ({
    page,
  }) => {
    const panel = page.locator('dsk-panel');
    const point = await startDrag(page);
    await page.mouse.move(point.x + 50, point.y);
    if (cancel === 'Escape') await page.keyboard.press('Escape');
    else if (cancel === 'pointercancel')
      await panel.locator('[part=handle]').dispatchEvent('pointercancel');
    else if (cancel === 'blur') await page.locator('#outside').focus();
    else
      await panel.evaluate((element) => {
        element.remove();
        document.body.append(element);
      });
    await page.mouse.up();
    await expect(panel).toHaveCSS('width', '240px');
    await expect(panel).not.toHaveAttribute('data-change');
    await expect(panel.locator('[part=handle]')).not.toHaveAttribute(
      'data-dragging',
    );
    await panel.locator('[part=handle]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(panel).toHaveAttribute('data-change', '1');
  });
}

test('external sizing is silent, resets history and wins over a drag', async ({
  page,
}) => {
  const panel = page.locator('dsk-panel');
  await panel.locator('[part=handle]').focus();
  await page.keyboard.press('ArrowRight');
  await panel.evaluate((element) => {
    (element as HTMLElement).style.width = '280px';
  });
  await page.keyboard.press('Control+z');
  await expect(panel).toHaveCSS('width', '280px');
  await expect(panel).toHaveAttribute('data-change', '1');
  const point = await startDrag(page);
  await page.mouse.move(point.x + 30, point.y);
  await panel.evaluate((element) => {
    (element as HTMLElement).style.width = '300px';
  });
  await page.mouse.move(point.x + 70, point.y);
  await page.mouse.up();
  await expect(panel).toHaveCSS('width', '300px');
  await expect(panel).toHaveAttribute('data-change', '1');
});

test('disabled and readonly only block resizing, not the slotted controls', async ({
  page,
}) => {
  const panel = page.locator('dsk-panel');
  for (const attribute of ['disabled', 'readonly']) {
    await panel.evaluate(
      (element, attribute) => element.setAttribute(attribute, ''),
      attribute,
    );
    const point = await startDrag(page);
    await page.mouse.move(point.x + 30, point.y);
    await page.mouse.up();
    await panel.locator('[part=handle]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(panel).toHaveCSS('width', '240px');
    await panel.getByRole('textbox').fill(attribute);
    await expect(panel.getByRole('textbox')).toHaveValue(attribute);
    await panel.evaluate(
      (element, attribute) => element.removeAttribute(attribute),
      attribute,
    );
  }
});

test('content-box sizing and scaled panels use local CSS pixels', async ({
  page,
}) => {
  const panel = page.locator('dsk-panel');
  await page.addStyleTag({
    content:
      'dsk-panel{box-sizing:content-box;transform:scale(1.5);transform-origin:top left}',
  });
  const point = await startDrag(page);
  await page.mouse.move(point.x + 60, point.y);
  await page.mouse.up();
  await expect(panel).toHaveCSS('width', '280px');
});

test('right edge preserves the left edge even in a right-anchored layout', async ({
  page,
}) => {
  const panel = page.locator('dsk-panel');
  await page.addStyleTag({
    content: 'dsk-panel { position:absolute;right:100px;top:100px }',
  });
  const before = (await panel.boundingBox())!;
  const point = await startDrag(page);
  await page.mouse.move(point.x + 40, point.y);
  await page.mouse.up();
  const after = (await panel.boundingBox())!;
  expect(after.x).toBeCloseTo(before.x, 1);
  expect(after.width).toBeCloseTo(before.width + 40, 1);
});
