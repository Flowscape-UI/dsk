import { test, expect } from '@playwright/test';
import type { DskCanvasMarker } from '@flowscape-ui/dsk';

test('markers track position independently from size and retain native slot interactions', async ({
  page,
}) => {
  await page.goto('/');
  const marker = page.locator('#canvas-marker-world');
  await expect(marker).toHaveCSS('translate', '75px 140px');
  await page.locator('#ruler-zoom').fill('2');
  await expect(marker).toHaveCSS('translate', '150px 280px');
  await expect(marker).toHaveCSS('scale', '1');
  await page.locator('#marker-size').check();
  await expect(marker).toHaveCSS('scale', '2');
  await page.locator('#marker-pan').uncheck();
  await expect(marker).toHaveCSS('translate', '50px 180px');
  await page.locator('#marker-zoom').uncheck();
  await expect(marker).toHaveCSS('translate', '25px 90px');
  await expect(marker).toHaveCSS('scale', '1');
  await expect(page.locator('#canvas-marker-hud')).toHaveCSS(
    'translate',
    '12px 12px',
  );
  await page.evaluate(() => {
    const marker = document.querySelector<DskCanvasMarker>(
      '#canvas-marker-world',
    )!;
    marker.innerHTML = '<button id="annotation-action">Open comment</button>';
    marker
      .querySelector('button')!
      .addEventListener('click', () =>
        marker.setAttribute('data-clicked', 'true'),
      );
  });
  await page.locator('#annotation-action').focus();
  await page.keyboard.press('Enter');
  await expect(marker).toHaveAttribute('data-clicked', 'true');
});

test('shared helper binds ordinary HTML and restores inline styles on disposal', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const moduleUrl = '/@id/@flowscape-ui/dsk';
    const { bindCanvasWidget } = (await import(
      moduleUrl
    )) as typeof import('@flowscape-ui/dsk');
    const element = document.createElement('div');
    element.style.left = '7px';
    document.body.append(element);
    const binding = bindCanvasWidget(element, {
      position: { x: 10, y: 20 },
      camera: { panX: 100, panY: -30, zoom: 2 },
    });
    const start = element.style.translate;
    binding.update({ followPan: false, scaleWithZoom: true });
    const updated = [element.style.translate, element.style.scale];
    binding.dispose();
    binding.dispose();
    return {
      start,
      updated,
      restored: [
        element.style.left,
        element.style.translate,
        element.style.position,
      ],
    };
  });
  expect(result).toEqual({
    start: '120px 10px',
    updated: ['20px 40px', '2'],
    restored: ['7px', '', ''],
  });
});

test('ruler camera uses the appropriate axes and can ignore pan or zoom', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const ruler = document.querySelector('dsk-ruler')!;
    ruler.camera = { panX: 100, panY: -40, zoom: 2 };
    const initial = [ruler.offset, ruler.guideOffset, ruler.zoom];
    ruler.followPan = false;
    const stationary = [ruler.offset, ruler.guideOffset];
    ruler.followZoom = false;
    return { initial, stationary, zoom: ruler.zoom };
  });
  expect(result).toEqual({
    initial: [-50, 20, 2],
    stationary: [0, 0],
    zoom: 1,
  });
});
