import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-transform-box');
    document.body.innerHTML =
      '<div id="world" style="position:relative;margin:100px;width:700px;height:500px;transform-origin:0 0"><dsk-transform-box x="40" y="40" width="200" height="120"><div style="width:100%;height:100%;background:#283857"><span>Drag surface</span><input aria-label="Title" value="Hello"><button>Child</button></div></dsk-transform-box></div><button id="outside">Outside</button>';
    const box = document.querySelector('dsk-transform-box')!;
    box.addEventListener('change', (event) => {
      if (event.target === box)
        box.dataset.changes = String(Number(box.dataset.changes ?? 0) + 1);
    });
  });
});
async function drag(page: Page, dx: number, dy: number, release = true) {
  const rect = (await page.locator('dsk-transform-box').boundingBox())!;
  const x = rect.x + rect.width - 10,
    y = rect.y + rect.height - 10;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  if (release) await page.mouse.up();
}
test('plain content dragging, undo/redo, cancellation and silent assignments', async ({
  page,
}) => {
  const box = page.locator('dsk-transform-box');
  await drag(page, 60, 30);
  await expect(box).toHaveJSProperty('x', 100);
  await expect(box).toHaveJSProperty('y', 70);
  await expect(box).toHaveAttribute('data-changes', '1');
  await page.keyboard.press('Control+z');
  await expect(box).toHaveJSProperty('x', 40);
  await page.keyboard.press('Control+Shift+z');
  await expect(box).toHaveJSProperty('x', 100);
  await drag(page, 30, 20, false);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(box).toHaveJSProperty('x', 100);
  await box.evaluate((element) => element.setAttribute('x', '10'));
  await page.keyboard.press('Control+z');
  await expect(box).toHaveJSProperty('x', 10);
  await expect(box).toHaveAttribute('data-changes', '3');
});
test('no outline or handles; dimensions and angle remain programmable', async ({
  page,
}) => {
  const box = page.locator('dsk-transform-box');
  expect(
    await box.evaluate(
      (element) =>
        element.shadowRoot!.querySelectorAll(
          'button,[part=outline],[data-action]',
        ).length,
    ),
  ).toBe(0);
  await box.evaluate((element) => {
    element.setAttribute('width', '300');
    element.setAttribute('height', '180');
    element.setAttribute('angle', '30');
  });
  await expect(box).toHaveCSS('width', '300px');
  await expect(box).toHaveCSS('height', '180px');
  await expect(box).toHaveJSProperty('angle', 30);
  await expect(box).not.toHaveAttribute('data-changes');
});
test('scaled and rotated parent coordinates', async ({ page }) => {
  const box = page.locator('dsk-transform-box');
  await page
    .locator('#world')
    .evaluate(
      (element) => ((element as HTMLElement).style.transform = 'scale(1.5)'),
    );
  await drag(page, 60, 30);
  await expect(box).toHaveJSProperty('x', 80);
  await expect(box).toHaveJSProperty('y', 60);
});
test('disabled, readonly and movable preserve child interactions', async ({
  page,
}) => {
  const box = page.locator('dsk-transform-box');
  for (const attribute of ['disabled', 'readonly', 'movable']) {
    await box.evaluate(
      (element, attribute) =>
        element.setAttribute(attribute, attribute === 'movable' ? 'false' : ''),
      attribute,
    );
    await drag(page, 30, 20);
    await box.focus();
    await page.keyboard.press('ArrowRight');
    await expect(box).toHaveJSProperty('x', 40);
    await box.locator('input').fill(attribute);
    await expect(box.locator('input')).toHaveValue(attribute);
    await box.evaluate(
      (element, attribute) => element.removeAttribute(attribute),
      attribute,
    );
  }
});
test('disconnect and blur cancel dragging', async ({ page }) => {
  const box = page.locator('dsk-transform-box');
  await drag(page, 30, 20, false);
  await page.locator('#outside').focus();
  await page.mouse.up();
  await expect(box).toHaveJSProperty('x', 40);
  await drag(page, 30, 20, false);
  await box.evaluate((element) => {
    const parent = element.parentElement!;
    element.remove();
    parent.append(element);
  });
  await page.mouse.up();
  await expect(box).toHaveJSProperty('x', 40);
  await box.focus();
  await page.keyboard.press('ArrowRight');
  await expect(box).toHaveJSProperty('x', 41);
});
test('touch drag without a header cancels cleanly', async ({ page }) => {
  const box = page.locator('dsk-transform-box');
  const rect = (await box.boundingBox())!;
  const x = rect.x + rect.width - 10,
    y = rect.y + rect.height - 10;
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 40, y: y + 20 }],
  });
  await expect(box).toHaveJSProperty('x', 80);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  });
  await expect(box).toHaveJSProperty('x', 40);
  await client.detach();
});
test('playground shows both variants and content switching keeps the header', async ({
  page,
}) => {
  await page.goto('/');
  const box = page.locator('#transform-demo');
  await expect(box.locator('dsk-transform-header')).toHaveCount(1);
  await expect(
    page.locator('#transform-no-header dsk-transform-header'),
  ).toHaveCount(0);
  await page.locator('#transform-x').fill('120');
  await expect(box).toHaveJSProperty('x', 120);
  await page.locator('#transform-content').selectOption('image');
  await expect(box.locator('img')).toBeVisible();
  await expect(box.locator('dsk-transform-header')).toHaveCount(1);
  await page.locator('#transform-content').selectOption('form');
  await box.getByRole('textbox').fill('Working form');
  await box.getByRole('button', { name: 'Clicks: 0', exact: true }).click();
  await expect(
    box.getByRole('button', { name: 'Clicks: 1', exact: true }),
  ).toBeVisible();
  await expect(box).toHaveJSProperty('x', 120);
  await page.locator('#transform-reset').click();
  await expect(box).toHaveJSProperty('x', 80);
  await page.locator('#transform-no-header input').fill('Editable card');
  await expect(page.locator('#transform-no-header')).toHaveJSProperty('x', 80);
});
test('header is the only drag surface and content preserves native interactions', async ({
  page,
}) => {
  const box = page.locator('dsk-transform-box');
  await box.evaluate((element) => {
    element.innerHTML =
      '<dsk-transform-header style="height:36px;background:#444">Inspector <button id="header-button">Action</button></dsk-transform-header><dsk-transform-content><p>Selectable content</p><input aria-label="Content input" value="Text"></dsk-transform-content>';
  });
  const header = box.locator('dsk-transform-header');
  const rect = (await header.boundingBox())!;
  await page.mouse.move(rect.x + rect.width - 10, rect.y + 15);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width + 30, rect.y + 35);
  await page.mouse.up();
  await expect(box).toHaveJSProperty('x', 80);
  const text = (await box.locator('p').boundingBox())!;
  await page.mouse.move(text.x + 5, text.y + 5);
  await page.mouse.down();
  await page.mouse.move(text.x + 60, text.y + 5);
  await page.mouse.up();
  await expect(box).toHaveJSProperty('x', 80);
  await box.getByRole('textbox').fill('Editable');
  await box.getByRole('textbox').press('ArrowLeft');
  await expect(box).toHaveJSProperty('x', 80);
  await header.locator('button').click();
  await expect(box).toHaveJSProperty('x', 80);
  await header.focus();
  await page.keyboard.press('ArrowRight');
  await expect(box).toHaveJSProperty('x', 81);
  await page.keyboard.press('Control+z');
  await expect(box).toHaveJSProperty('x', 80);
  await expect(box.locator('[part=outline]')).toHaveCount(0);
  await expect(box).toHaveCSS('touch-action', 'auto');
  await header.evaluate((element) => element.remove());
  await box.getByRole('textbox').fill('Content stays protected without header');
  const content = (await box.locator('p').boundingBox())!;
  await page.mouse.move(content.x + 5, content.y + 5);
  await page.mouse.down();
  await page.mouse.move(content.x + 45, content.y + 5);
  await page.mouse.up();
  await expect(box).toHaveJSProperty('x', 80);
});

for (const header of [false, true]) {
  test(`text selection does not move the box (${header ? 'header' : 'plain'})`, async ({
    page,
  }) => {
    const box = page.locator('dsk-transform-box');
    await box.evaluate((element, header) => {
      const tag = header ? 'dsk-transform-header' : 'div';
      element.innerHTML = `<${tag} style="height:100%;padding:20px;box-sizing:border-box"><span>Selectable example text</span></${tag}>`;
    }, header);
    const rects = await box.locator('span').evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return [...range.getClientRects()].map((rect) => ({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }));
    });
    const rect = rects[0]!;
    const last = rects[rects.length - 1]!;
    await page.mouse.move(rect.x + 2, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(last.x + last.width - 2, last.y + last.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
    expect(
      await page.evaluate(() => window.getSelection()?.toString()),
    ).toContain('example');
    await expect(box).toHaveJSProperty('x', 40);
    await expect(box).not.toHaveAttribute('data-changes');
    const area = (await box.boundingBox())!;
    await page.mouse.move(area.x + area.width - 5, area.y + area.height - 5);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width + 25, area.y + area.height + 15);
    await page.mouse.up();
    await expect(box).toHaveJSProperty('x', 70);
    await expect(box).toHaveJSProperty('y', 60);
  });
}

async function addRotationHandles(page: Page) {
  await page.locator('dsk-transform-box').evaluate((element) => {
    element.insertAdjacentHTML(
      'beforeend',
      '<dsk-transform-box-handle-rotate id="rotate-a" style="position:absolute;left:calc(50% - 10px);top:-30px">A</dsk-transform-box-handle-rotate><dsk-transform-box-handle-rotate id="rotate-b" style="position:absolute;left:calc(100% + 10px);top:calc(50% - 10px);border-radius:0;background:rgb(20,30,40)">B</dsk-transform-box-handle-rotate>',
    );
  });
}
async function rotateHandle(page: Page, id: string, release = true) {
  const rect = (await page.locator('dsk-transform-box').boundingBox())!;
  const handle = (await page.locator(id).boundingBox())!;
  const cx = rect.x + rect.width / 2,
    cy = rect.y + rect.height / 2;
  const dx = handle.x + handle.width / 2 - cx,
    dy = handle.y + handle.height / 2 - cy;
  await page.mouse.move(cx + dx, cy + dy);
  await page.mouse.down();
  for (let step = 1; step <= 6; step++) {
    const angle = ((Math.PI / 2) * step) / 6;
    await page.mouse.move(
      cx + dx * Math.cos(angle) - dy * Math.sin(angle),
      cy + dx * Math.sin(angle) + dy * Math.cos(angle),
    );
  }
  if (release) await page.mouse.up();
}
for (const id of ['#rotate-a', '#rotate-b']) {
  test(`user-defined handle ${id} rotates with history and custom styles`, async ({
    page,
  }) => {
    const box = page.locator('dsk-transform-box');
    await addRotationHandles(page);
    await box.evaluate((element) => element.setAttribute('movable', 'false'));
    await rotateHandle(page, id);
    expect(
      await box.evaluate((element) => Number(element.getAttribute('angle'))),
    ).toBeCloseTo(90, 1);
    await expect(box).toHaveJSProperty('x', 40);
    await expect(box).toHaveJSProperty('y', 40);
    await expect(box).toHaveAttribute('data-changes', '1');
    await expect(page.locator('#rotate-b')).toHaveCSS('border-radius', '0px');
    await expect(page.locator('#rotate-b')).toHaveCSS(
      'background-color',
      'rgb(20, 30, 40)',
    );
    await page.keyboard.press('Control+z');
    await expect(box).toHaveJSProperty('angle', 0);
    await page.keyboard.press('Control+Shift+z');
    expect(
      await box.evaluate((element) => Number(element.getAttribute('angle'))),
    ).toBeCloseTo(90, 1);
  });
}
test('rotation keyboard, snapping, cancellation and disabled states', async ({
  page,
}) => {
  const box = page.locator('dsk-transform-box');
  await addRotationHandles(page);
  const handle = page.locator('#rotate-a');
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(box).toHaveJSProperty('angle', 1);
  await box.evaluate((element) => element.setAttribute('snap-angle', '30'));
  await page.keyboard.press('Shift+ArrowRight');
  await expect(box).toHaveJSProperty('angle', 31);
  await box.evaluate((element) => element.setAttribute('angle', '0'));
  await rotateHandle(page, '#rotate-a', false);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(box).toHaveJSProperty('angle', 0);
  await page.keyboard.down('Shift');
  await rotateHandle(page, '#rotate-a');
  await page.keyboard.up('Shift');
  await expect(box).toHaveJSProperty('angle', 90);
  await handle.evaluate((element) => element.setAttribute('disabled', ''));
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await expect(box).toHaveJSProperty('angle', 90);
  await expect(handle).toHaveAttribute('aria-disabled', 'true');
  await handle.evaluate((element) => element.removeAttribute('disabled'));
  await box.evaluate((element) => element.setAttribute('readonly', ''));
  await page.keyboard.press('ArrowLeft');
  await expect(box).toHaveJSProperty('angle', 90);
});
test('removed or disabled active rotation handles cancel and content handles cannot transform', async ({
  page,
}) => {
  const box = page.locator('dsk-transform-box');
  await addRotationHandles(page);
  await rotateHandle(page, '#rotate-a', false);
  await page.locator('#rotate-a').evaluate((element) => element.remove());
  await page.mouse.up();
  await expect(box).toHaveJSProperty('angle', 0);
  await rotateHandle(page, '#rotate-b', false);
  await page
    .locator('#rotate-b')
    .evaluate((element) => element.setAttribute('disabled', ''));
  await page.mouse.up();
  await expect(box).toHaveJSProperty('angle', 0);
  await box.evaluate((element) => {
    const content = document.createElement('dsk-transform-content');
    const handle = document.createElement('dsk-transform-box-handle-rotate');
    handle.id = 'protected-rotate';
    content.append(handle);
    element.append(content);
  });
  await page.locator('#protected-rotate').focus();
  await page.keyboard.press('ArrowRight');
  await expect(box).toHaveJSProperty('angle', 0);
});
test('playground supports adding more styled rotation handles', async ({
  page,
}) => {
  await page.goto('/');
  const handles = page.locator(
    '#transform-demo dsk-transform-box-handle-rotate',
  );
  await expect(handles).toHaveCount(2);
  await page.locator('#transform-add-rotate').click();
  await page.locator('#transform-add-rotate').click();
  await expect(handles).toHaveCount(4);
  await handles.nth(3).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#transform-demo')).toHaveJSProperty('angle', 1);
});

test('mixed move and rotate history reports the restored action', async ({
  page,
}) => {
  const box = page.locator('dsk-transform-box');
  await addRotationHandles(page);
  await box.evaluate((element) =>
    element.addEventListener('change', (event) => {
      if (event.target === element && event instanceof CustomEvent)
        element.setAttribute('data-action', event.detail.action);
    }),
  );
  await page.locator('#rotate-a').focus();
  await page.keyboard.press('ArrowRight');
  await box.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Control+z');
  await expect(box).toHaveAttribute('data-action', 'move');
  await page.keyboard.press('Control+z');
  await expect(box).toHaveAttribute('data-action', 'rotate');
  await expect(box).toHaveJSProperty('angle', 0);
});

for (const direction of ['t', 'l', 'r', 'b', 'tl', 'tr', 'bl', 'br']) {
  test(`resize ${direction} preserves the opposite edges and supports history`, async ({
    page,
  }) => {
    await page.evaluate((direction) => {
      const box = document.querySelector('dsk-transform-box')!;
      box.setAttribute('movable', 'false');
      box.insertAdjacentHTML(
        'beforeend',
        `<dsk-transform-box-handle-resize direction="${direction}" style="position:absolute;left:90px;top:50px"></dsk-transform-box-handle-resize>`,
      );
    }, direction);
    const handle = page.locator('dsk-transform-box-handle-resize');
    const rect = (await handle.boundingBox())!;
    await page.mouse.move(rect.x + 6, rect.y + 6);
    await page.mouse.down();
    await page.mouse.move(rect.x + 26, rect.y + 16, { steps: 4 });
    await page.mouse.up();
    const box = page.locator('dsk-transform-box');
    await expect(box).toHaveJSProperty(
      'width',
      direction.includes('r') ? 220 : direction.includes('l') ? 180 : 200,
    );
    await expect(box).toHaveJSProperty(
      'height',
      direction.includes('b') ? 130 : direction.includes('t') ? 110 : 120,
    );
    await expect(box).toHaveJSProperty('x', direction.includes('l') ? 60 : 40);
    await expect(box).toHaveJSProperty('y', direction.includes('t') ? 50 : 40);
    await expect(box).toHaveAttribute('data-changes', '1');
    await page.keyboard.press('Control+z');
    await expect(box).toHaveJSProperty('width', 200);
    await expect(box).toHaveJSProperty('height', 120);
    await page.keyboard.press('Control+Shift+z');
    await expect(box).toHaveAttribute('data-changes', '3');
    await handle.press('Escape');
    await handle.evaluate((element) => element.setAttribute('disabled', ''));
    const before = await box.evaluate((element) =>
      element.getAttribute('width'),
    );
    await handle.press('ArrowRight');
    await expect(box).toHaveAttribute('width', before!);
  });
}
test('rotated scaled resize, keyboard, cancellation and content isolation', async ({
  page,
}) => {
  await page.evaluate(() => {
    const box = document.querySelector('dsk-transform-box')!;
    box.setAttribute('angle', '90');
    document.querySelector<HTMLElement>('#world')!.style.transform =
      'scale(1.5)';
    box.insertAdjacentHTML(
      'beforeend',
      '<dsk-transform-box-handle-resize direction="r" style="position:absolute;right:-6px;top:50px"></dsk-transform-box-handle-resize>',
    );
  });
  const box = page.locator('dsk-transform-box');
  const handle = page.locator('dsk-transform-box-handle-resize');
  const rect = (await handle.boundingBox())!;
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2 + 60);
  await page.mouse.up();
  await expect(box).toHaveJSProperty('width', 240);
  await expect(box).toHaveJSProperty('x', 20);
  await expect(box).toHaveJSProperty('y', 60);
  await handle.press('ArrowRight');
  await expect(box).toHaveJSProperty('width', 241);
  await handle.press('Control+z');
  await expect(box).toHaveJSProperty('width', 240);
  const next = (await handle.boundingBox())!;
  await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2);
  await page.mouse.down();
  await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2 + 30);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(box).toHaveJSProperty('width', 240);
  await handle.evaluate((element) => {
    const content = document.createElement('dsk-transform-content');
    element.parentElement!.append(content);
    content.append(element);
  });
  await handle.press('ArrowRight');
  await expect(box).toHaveJSProperty('width', 240);
});

test('resize crosses both opposite edges and returns continuously through zero', async ({
  page,
}) => {
  await page.evaluate(() => {
    const box = document.querySelector('dsk-transform-box')!;
    box.insertAdjacentHTML(
      'beforeend',
      '<dsk-transform-box-handle-resize direction="tl" style="position:absolute;left:-6px;top:-6px"></dsk-transform-box-handle-resize>',
    );
  });
  const box = page.locator('dsk-transform-box');
  const handle = page.locator('dsk-transform-box-handle-resize');
  const rect = (await handle.boundingBox())!;
  const x = rect.x + 6,
    y = rect.y + 6;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 200, y + 120);
  await expect(box).toHaveJSProperty('width', 0);
  await expect(box).toHaveJSProperty('height', 0);
  await page.mouse.move(x + 250, y + 150);
  await expect(box).toHaveJSProperty('width', 50);
  await expect(box).toHaveJSProperty('height', 30);
  await expect(box).toHaveJSProperty('x', 240);
  await expect(box).toHaveJSProperty('y', 160);
  await page.mouse.move(x + 100, y + 60);
  await expect(box).toHaveJSProperty('width', 100);
  await expect(box).toHaveJSProperty('height', 60);
  await expect(box).toHaveJSProperty('x', 140);
  await expect(box).toHaveJSProperty('y', 100);
  await page.mouse.move(x + 250, y + 150);
  await page.mouse.up();
  await expect(box).toHaveAttribute('data-changes', '1');
  await page.keyboard.press('Control+z');
  await expect(box).toHaveJSProperty('width', 200);
  await expect(box).toHaveJSProperty('x', 40);
  await page.keyboard.press('Control+Shift+z');
  await expect(box).toHaveJSProperty('width', 50);
  await expect(box).toHaveJSProperty('x', 240);
});
