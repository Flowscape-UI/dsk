import { test, expect } from '@playwright/test';
import type { DskRuler } from '@flowscape-ui/dsk';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.body.innerHTML = `<div style="display:grid;grid-template-columns:24px 600px;grid-template-rows:24px 300px;margin:40px"><div></div><dsk-ruler id="x" offset="-50" highlights="[[-25,25],[100,150]]" target="#canvas"></dsk-ruler><dsk-ruler id="y" orientation="vertical" offset="-50" target="#canvas"></dsk-ruler><div id="canvas" style="background:#eee"></div></div>`;
  });
});

test('visible scale, intervals and world mapping remain bounded when panning and zooming', async ({
  page,
}) => {
  const ruler = page.locator('#x');
  await expect(ruler.locator('[part=highlight]')).toHaveCount(2);
  expect(await ruler.locator('[part=tick]').count()).toBeLessThan(100);
  await expect(ruler.locator('[part=highlight]').first()).toHaveAttribute(
    'x',
    '25',
  );
  await page.evaluate(() => {
    const ruler = document.querySelector<DskRuler>('#x')!;
    ruler.zoom = 2;
  });
  await expect(ruler.locator('[part=highlight]').first()).toHaveAttribute(
    'x',
    '50',
  );
  expect(
    await page.evaluate(() => {
      const ruler = document.querySelector<DskRuler>('#x')!;
      return [ruler.toPixel(20), ruler.toValue(140)];
    }),
  ).toEqual([140, 20]);
  await page.evaluate(() => {
    document.querySelector<DskRuler>('#x')!.offset = -1e10;
  });
  await expect(ruler.locator('[part=highlight]')).toHaveCount(0);
  expect(await ruler.locator('[part=tick]').count()).toBeLessThan(100);
});

test('all four orientations flip the tick edge without reversing coordinates', async ({
  page,
}) => {
  await expect(page.locator('#x [part=tick]').first()).toHaveAttribute(
    'y1',
    '24',
  );
  await expect(page.locator('#y [part=tick]').first()).toHaveAttribute(
    'x1',
    '24',
  );
  await page.evaluate(() => {
    document.querySelector<DskRuler>('#x')!.orientation = 'horizontal-reversed';
    document.querySelector<DskRuler>('#y')!.orientation = 'vertical-reversed';
  });
  await expect(page.locator('#x [part=tick]').first()).toHaveAttribute(
    'y1',
    '0',
  );
  await expect(page.locator('#y [part=tick]').first()).toHaveAttribute(
    'x1',
    '0',
  );
});

test('drag creates a full-area guide, supports moving, keyboard deletion and Escape cancellation', async ({
  page,
}) => {
  const scale = await page.locator('#x').boundingBox();
  const area = await page.locator('#canvas').boundingBox();
  if (!scale || !area) throw new Error('Missing layout');
  await page.mouse.move(scale.x + 100, scale.y + 12);
  await page.mouse.down();
  await page.mouse.move(scale.x + 200, area.y + 100, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector<DskRuler>('#x')!.guides),
    )
    .toEqual([50]);
  const guide = page.locator('#x [part=guide]');
  await expect(guide).toHaveCount(1);
  expect((await guide.boundingBox())!.width).toBe(area.width);
  await guide.focus();
  await guide.press('ArrowRight');
  await expect
    .poll(() =>
      page.evaluate(() => document.querySelector<DskRuler>('#x')!.guides),
    )
    .toEqual([51]);
  await guide.press('Delete');
  await expect(guide).toHaveCount(0);
  await page.mouse.move(scale.x + 80, scale.y + 12);
  await page.mouse.down();
  await page.mouse.move(scale.x + 150, area.y + 100);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(
    await page.evaluate(() => document.querySelector<DskRuler>('#x')!.guides),
  ).toEqual([]);
});

test('vertical guides follow camera updates and disconnect cleans up overlays', async ({
  page,
}) => {
  await page.evaluate(() => {
    const ruler = document.querySelector<DskRuler>('#y')!;
    ruler.guides = [50];
    ruler.formatLabel = (value) => `${value} u`;
  });
  const guide = page.locator('#y [part=guide]');
  await expect(guide).toBeVisible();
  await expect(guide).toHaveCSS('left', '100px');
  const area = (await page.locator('#canvas').boundingBox())!;
  expect((await guide.boundingBox())!.height).toBe(area.height);
  await page.evaluate(() => {
    const ruler = document.querySelector<DskRuler>('#y')!;
    ruler.zoom = 2;
    ruler.offset = 0;
  });
  await expect(guide).toHaveCSS('left', '100px');
  await page.evaluate(() => {
    document.querySelector<DskRuler>('#y')!.offset = 25;
  });
  await expect(guide).toHaveCSS('left', '50px');
  await expect(page.locator('#y [part=label]').first()).toContainText('u');
  await page.evaluate(() => {
    document.querySelector('#y')!.remove();
  });
  await expect(page.locator('#y [part=guide]')).toHaveCount(0);
});

test('playground ties object, ruler highlights and grid to shared zoom', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.locator('#ruler-canvas').scrollIntoViewIfNeeded();
  await page.locator('#ruler-zoom').fill('2');
  await expect(page.locator('#ruler-object')).toHaveCSS('width', '200px');
  await expect(
    page.locator('#ruler-x [part=highlight]').first(),
  ).toHaveAttribute('width', '200');
  await page
    .locator('#ruler-canvas')
    .locator('..')
    .screenshot({ path: testInfo.outputPath('ruler.png') });
});

test('click does not create a guide; drag focuses a blue guide with an orange coordinate', async ({
  page,
}) => {
  const scale = (await page.locator('#x').boundingBox())!;
  const area = (await page.locator('#canvas').boundingBox())!;
  await page.locator('#x').click();
  expect(
    await page.evaluate(() => document.querySelector<DskRuler>('#x')!.guides),
  ).toEqual([]);
  await expect(page.locator('#x [part=guide]')).toHaveCount(0);
  await page.mouse.move(scale.x + 90, scale.y + 12);
  await page.mouse.down();
  await expect(page.locator('#x [part=guide]')).toHaveCount(0);
  await page.mouse.move(scale.x + 90, area.y + 140, { steps: 4 });
  const guide = page.locator('#x [part=guide]');
  await expect(guide).toHaveAttribute('data-axis', 'y');
  await expect(guide).toHaveAttribute('data-active', '');
  await page.mouse.up();
  await expect(guide).toBeFocused();
  await expect(guide.locator('[part=guide-label]')).toHaveText('90');
  expect(
    await guide.evaluate(
      (node) => getComputedStyle(node, '::after').backgroundColor,
    ),
  ).toBe('rgb(13, 153, 255)');
  await expect(guide.locator('[part=guide-label]')).toHaveCSS(
    'color',
    'rgb(242, 153, 74)',
  );
  await expect(page.locator('#x [part=marker]')).toHaveCount(0);
  await page.mouse.click(area.x + 250, area.y + 250);
  await expect(guide).not.toHaveAttribute('data-active');
  await expect(guide.locator('[part=guide-label]')).toBeHidden();
  expect(
    await guide.evaluate(
      (node) => getComputedStyle(node, '::after').backgroundColor,
    ),
  ).toBe('rgb(242, 153, 74)');
  await guide.click();
  await expect(guide).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(guide).toHaveCount(0);
});
