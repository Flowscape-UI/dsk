import { expect, test } from '@playwright/test';
import type { DskPanZoom, DskRuler } from '@flowscape-ui/dsk';

test('grid fades between 70 and 55 percent and detaches below the threshold', async ({
  page,
}) => {
  await page.goto('/');
  const viewport = page.locator('dsk-pan-zoom');
  const grid = viewport.locator('[part=grid]');
  for (const [zoom, opacity] of [
    [0.7, 1],
    [0.625, 0.5],
    [0.55, 0],
    [0.25, 0],
    [0.625, 0.5],
    [1, 1],
  ]) {
    await viewport.evaluate((element, zoom) => {
      const view = element as DskPanZoom;
      view.camera = { ...view.camera, zoom: zoom! };
    }, zoom);
    if (opacity === 0) await expect(grid).toHaveCount(0);
    else {
      await expect(grid).toHaveCount(1);
      expect(
        await grid.evaluate((element) =>
          Number(getComputedStyle(element).opacity),
        ),
      ).toBeCloseTo(opacity!);
    }
  }
});

test('world grid scales with the scene and stays bounded during large pans', async ({
  page,
}) => {
  await page.goto('/');
  const viewport = page.locator('dsk-pan-zoom');
  const grid = viewport.locator('[part=grid]');
  await expect(grid).toBeAttached();
  for (const zoom of [0.7, 2]) {
    const measurements = await viewport.evaluate((element, zoom) => {
      const view = element as DskPanZoom;
      view.camera = { panX: 100, panY: 150, zoom };
      const grid = view.shadowRoot!.querySelector<HTMLElement>('[part=grid]')!;
      const width = grid.getBoundingClientRect().width;
      const localWidth = grid.offsetWidth;
      const left = grid.offsetLeft;
      view.camera = { panX: 100 + 18 * zoom, panY: 150, zoom };
      const nextLeft = grid.offsetLeft;
      view.camera = { panX: 1e8, panY: -1e8, zoom };
      return {
        scale: width / localWidth,
        localWidth,
        distantWidth: grid.offsetWidth,
        shift: nextLeft - left,
      };
    }, zoom);
    expect(measurements.scale).toBeCloseTo(zoom);
    expect(measurements.shift).toBe(-18);
    expect(measurements.distantWidth).toBe(measurements.localWidth);
  }
});

test('demo pans, anchors wheel zoom and resets without decorative handles', async ({
  page,
}) => {
  await page.goto('/');
  const viewport = page.locator('dsk-pan-zoom');
  const surface = viewport.locator('[part=viewport]');
  await expect(surface).toBeVisible();
  await viewport.scrollIntoViewIfNeeded();
  // The homepage canvas opts into gestures only after click or keyboard focus.
  await surface.focus();
  await expect(page.locator('.dsk-docs-shape i')).toHaveCount(0);
  const camera = () => viewport.evaluate((el) => (el as DskPanZoom).camera);
  const initial = await camera();
  const box = (await surface.boundingBox())!;
  const x = Math.floor(box.x + box.width - 100);
  const y = Math.floor(box.y + 350);
  const size = await surface.evaluate((element) => ({
    width: element.clientWidth,
    height: element.clientHeight,
  }));
  const scaleX = size.width / box.width;
  const scaleY = size.height / box.height;
  const localX = (x - box.x) * scaleX;
  const localY = (y - box.y) * scaleY;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 20, { steps: 5 });
  await page.mouse.up();
  expect((await camera()).panX).toBeCloseTo(initial.panX + 40 * scaleX);
  expect((await camera()).panY).toBeCloseTo(initial.panY + 20 * scaleY);
  const before = await camera();
  await surface.dispatchEvent('wheel', {
    clientX: x,
    clientY: y,
    deltaY: -40,
    ctrlKey: true,
  });
  const after = await camera();
  expect(after.zoom).toBeGreaterThan(before.zoom);
  expect((localX - after.panX) / after.zoom).toBeCloseTo(
    (localX - before.panX) / before.zoom,
  );
  expect((localY - after.panY) / after.zoom).toBeCloseTo(
    (localY - before.panY) / before.zoom,
  );
  expect(
    await page
      .locator('dsk-ruler')
      .first()
      .evaluate((el) => (el as DskRuler).camera),
  ).toEqual(after);
  await page.getByRole('button', { name: 'Reset view' }).click();
  expect(await camera()).toEqual({
    panX: size.width / 2,
    panY: size.height / 2,
    zoom: 1,
  });
  await surface.focus();
  await page.keyboard.press('+');
  expect((await camera()).zoom).toBeCloseTo(1.2);
  await page.keyboard.press('0');
  expect(await camera()).toEqual({
    panX: size.width / 2,
    panY: size.height / 2,
    zoom: 1,
  });
});

test('touch pinch, one-finger continuation and cancellation stay continuous', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const viewport = page.locator('dsk-pan-zoom');
  const surface = viewport.locator('[part=viewport]');
  await expect(surface).toBeVisible();
  await viewport.scrollIntoViewIfNeeded();
  // The homepage canvas opts into gestures only after click or keyboard focus.
  await surface.focus();
  const box = (await surface.boundingBox())!;
  const initialZoom = await viewport.evaluate(
    (el) => (el as DskPanZoom).camera.zoom,
  );
  await page.locator('.dsk-docs-ruler-horizontal').evaluate((element) => {
    const ruler = element as DskRuler;
    ruler.guides = [ruler.guideOffset + 430 / ruler.guideZoom];
  });
  await expect(
    page.locator('.dsk-docs-ruler-horizontal [part=guide]'),
  ).toHaveCount(1);
  const client = await page.context().newCDPSession(page);
  const touch = (id: number, x: number) => ({
    id,
    x: box.x + x,
    y: box.y + 430,
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [touch(0, 90), touch(1, 190)],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [touch(0, 65), touch(1, 215)],
  });
  await expect
    .poll(() => viewport.evaluate((el) => (el as DskPanZoom).camera.zoom))
    .toBeCloseTo(initialZoom * 1.5);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [touch(1, 215)],
  });
  const before = await viewport.evaluate((el) => (el as DskPanZoom).camera);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [touch(0, 85)],
  });
  await expect
    .poll(() => viewport.evaluate((el) => (el as DskPanZoom).camera.panX))
    .toBeCloseTo(before.panX + 20);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  });
  await expect(surface).not.toHaveAttribute('data-dragging');
  await client.detach();
});

test('plain HTML slots, bounds and reconnect work without framework bindings', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('dsk-pan-zoom [part=viewport]')).toBeVisible();
  await page.evaluate(() => {
    const viewport = document.createElement('dsk-pan-zoom');
    viewport.id = 'plain-viewport';
    viewport.innerHTML = '<button type="button">Native action</button>';
    viewport.style.height = '200px';
    document.body.append(viewport);
    viewport.remove();
    document.body.append(viewport);
    viewport.querySelector('button')!.onclick = () =>
      (viewport.dataset.clicked = 'yes');
  });
  const viewport = page.locator('#plain-viewport');
  await viewport.getByRole('button', { name: 'Native action' }).click();
  await expect(viewport).toHaveAttribute('data-clicked', 'yes');
  await expect(viewport.locator('[part=viewport]')).not.toHaveAttribute(
    'data-dragging',
  );
  const result = await viewport.evaluate((el) => {
    const viewport = el as DskPanZoom;
    viewport.zoomBy(1000);
    const max = viewport.camera.zoom;
    viewport.zoomBy(0.00001);
    return { max, min: viewport.camera.zoom };
  });
  expect(result).toEqual({ max: 4, min: 0.25 });
});
