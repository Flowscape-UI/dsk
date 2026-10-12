import { expect, test } from '@playwright/test';
import type { DskPanZoom } from '@flowscape-ui/dsk';

test('mobile paragraph is centered and camera zoom starts during the first part of the turn', async ({
  page,
}) => {
  await page.setViewportSize({ width: 432, height: 850 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const viewport = page.locator('dsk-pan-zoom');
  const paragraph = page.locator('.dsk-docs-hero-description');
  await expect(paragraph).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const copy = (await page.locator('.dsk-docs-hero-copy').boundingBox())!;
  const bounds = (await paragraph.boundingBox())!;
  expect(bounds.x + bounds.width / 2).toBeCloseTo(copy.x + copy.width / 2, 0);
  expect(bounds.width).toBeLessThanOrEqual(320);
  expect(bounds.x).toBeGreaterThan(0);
  await expect
    .poll(() => viewport.evaluate((el) => (el as DskPanZoom).camera.zoom))
    .toBeLessThan(0.4);
  const change = await viewport.evaluate(async (el) => {
    const view = el as DskPanZoom;
    const initial = view.camera.zoom;
    const end = performance.now() + 600;
    while (performance.now() < end)
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    return view.camera.zoom - initial;
  });
  expect(change).toBeGreaterThan(0.005);
  await expect
    .poll(() => viewport.evaluate((el) => (el as DskPanZoom).camera.zoom))
    .toBe(0.84);
});

test('hero heading follows the 1376px desktop grid and centers on mobile', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  for (const width of [360, 390, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1100 });
    for (const locale of ['/', '/ru/']) {
      await page.goto(locale);
      await expect(page.locator('.dsk-docs-hero-copy h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => {
        const heading = document.querySelector<HTMLElement>(
          '.dsk-docs-hero-copy h1',
        )!;
        const canvas = document.querySelector<HTMLElement>('dsk-pan-zoom')!;
        return {
          headingX: heading.getBoundingClientRect().x,
          canvasX: canvas.getBoundingClientRect().x,
          canvasWidth: canvas.getBoundingClientRect().width,
          center:
            heading.getBoundingClientRect().x +
            heading.getBoundingClientRect().width / 2,
          canvasCenter:
            canvas.getBoundingClientRect().x +
            canvas.getBoundingClientRect().width / 2,
          fontSize: parseFloat(getComputedStyle(heading).fontSize),
          lineHeight: parseFloat(getComputedStyle(heading).lineHeight),
          lines: [...heading.children].map(
            (line) => line.getBoundingClientRect().height,
          ),
          fontLoaded: document.fonts.check('750 32px "DSK Manrope"'),
        };
      });
      if (width > 648)
        expect(layout.headingX).toBeCloseTo(
          layout.canvasX + Math.max(32, (layout.canvasWidth - 1376) / 2),
          0,
        );
      else expect(layout.center).toBeCloseTo(layout.canvasCenter, 0);
      expect(layout.fontSize).toBe(width > 648 ? 64 : 48);
      expect(layout.fontLoaded).toBe(true);
      expect(layout.lines).toHaveLength(3);
      if (width >= 1400)
        for (const height of layout.lines)
          expect(height).toBeGreaterThanOrEqual(layout.lineHeight - 1);
      await page.screenshot({
        path: testInfo.outputPath(
          `hero-${width}-${locale === '/' ? 'en' : 'ru'}.png`,
        ),
      });
    }
  }
});

test('guides pass wheel zoom and middle-button pan to the canvas', async ({
  page,
}) => {
  await page.goto('/');
  const viewport = page.locator('dsk-pan-zoom');
  const ruler = page.locator('.dsk-docs-ruler-horizontal');
  await expect
    .poll(() =>
      viewport.evaluate((element) => (element as DskPanZoom).camera.zoom),
    )
    .toBeGreaterThan(1);
  await viewport.locator('[part=viewport]').focus();
  await expect(viewport).toHaveClass(/dsk-docs-canvas-active/);
  const canvas = (await viewport.boundingBox())!;
  const scale = (await ruler.boundingBox())!;
  const point = { x: canvas.x + canvas.width - 80, y: canvas.y + 350 };
  await page.mouse.move(point.x, scale.y + 12);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 5 });
  await page.mouse.up();
  const guide = ruler.locator('[part=guide]');
  await expect(guide).toHaveCount(1);
  await expect(viewport).toHaveClass(/dsk-docs-canvas-active/);
  const camera = () =>
    viewport.evaluate((element) => (element as DskPanZoom).camera);
  const initial = await camera();
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -20);
  await page.keyboard.up('Control');
  await expect
    .poll(async () => (await camera()).zoom)
    .toBeGreaterThan(initial.zoom);
  await expect(ruler.locator('[part=guide-overlay]')).not.toHaveAttribute(
    'data-navigating',
  );
  const position = (await guide.boundingBox())!;
  await page.mouse.move(point.x, position.y + position.height / 2);
  const before = await camera();
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(point.x + 30, position.y + position.height / 2 + 20, {
    steps: 5,
  });
  await page.mouse.up({ button: 'middle' });
  expect((await camera()).panX).toBeCloseTo(before.panX + 30, 0);
  expect((await camera()).panY).toBeCloseTo(before.panY + 20, 0);
  await expect(guide).toHaveCount(1);
  await expect(ruler.locator('[part=guide-overlay]')).not.toHaveAttribute(
    'data-navigating',
  );
  const moved = (await guide.boundingBox())!;
  await page.mouse.move(point.x, moved.y + moved.height / 2);
  const stable = await camera();
  await page.mouse.down();
  await page.mouse.move(point.x, moved.y + moved.height / 2 + 30, { steps: 5 });
  await page.mouse.up();
  expect(await camera()).toEqual(stable);
  expect((await guide.boundingBox())!.y).toBeGreaterThan(moved.y + 20);
});

test('both rulers create guides on the live canvas and allow deletion', async ({
  page,
}) => {
  await page.goto('/');
  const canvas = (await page.locator('dsk-pan-zoom').boundingBox())!;
  for (const direction of ['horizontal', 'vertical']) {
    const ruler = page.locator(`.dsk-docs-ruler-${direction}`);
    const box = (await ruler.boundingBox())!;
    await page.mouse.move(
      box.x + (direction === 'horizontal' ? 200 : 12),
      box.y + (direction === 'vertical' ? 300 : 12),
    );
    await page.mouse.down();
    await page.mouse.move(canvas.x + 200, canvas.y + 300, { steps: 5 });
    await page.mouse.up();
    const guide = ruler.locator('[part=guide]');
    await expect(guide).toHaveCount(1);
    const bounds = (await guide.boundingBox())!;
    expect(direction === 'horizontal' ? bounds.width : bounds.height).toBe(
      direction === 'horizontal' ? canvas.width : canvas.height,
    );
    await guide.focus();
    await guide.press('Delete');
    await expect(guide).toHaveCount(0);
  }
});

test('mobile uses compact editing tools and desktop keeps the inspector', async ({
  page,
}) => {
  for (const width of [390, 648, 649, 900]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/ru/');
    const controls = page.locator('.dsk-docs-controls-wrap');
    if (width <= 648) {
      await expect(controls).toBeHidden();
      const credits = (await page
        .locator('.dsk-docs-license-strip')
        .boundingBox())!;
      const ideas = (await page
        .locator('.dsk-docs-build-ideas')
        .boundingBox())!;
      expect(ideas.y).toBeGreaterThanOrEqual(credits.y + credits.height);
      await page
        .getByRole('button', { name: 'Инструменты редактирования' })
        .click();
      await page
        .getByRole('button', { name: 'Цвет и прозрачность', exact: true })
        .click();
      const widget = page.locator('.dsk-docs-mobile-widget');
      await expect(widget).toBeVisible();
      const area = (await widget.locator('dsk-color-area').boundingBox())!;
      const hue = (await widget.locator('dsk-color-hue').boundingBox())!;
      expect(hue.y).toBeGreaterThanOrEqual(area.y + area.height);
      expect(hue.width).toBeGreaterThan(150);
    } else {
      await expect(controls).toBeVisible();
      const canvas = (await page.locator('dsk-pan-zoom').boundingBox())!;
      const inspector = (await controls.boundingBox())!;
      expect(inspector.x).toBeGreaterThanOrEqual(canvas.x + canvas.width);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  }
});

test('camera entrance settles and interaction cancels further animation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const viewport = page.locator('dsk-pan-zoom');
  await expect(viewport.locator('[part=viewport]')).toBeVisible();
  await expect
    .poll(() => viewport.evaluate((el) => (el as DskPanZoom).camera.zoom))
    .toBeLessThan(1);
  const drift = await page
    .locator('.dsk-docs-shape')
    .evaluate(async (shape) => {
      const centers: { x: number; y: number }[] = [];
      const end = performance.now() + 4000;
      while (performance.now() < end) {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
        const box = shape.getBoundingClientRect();
        centers.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
      }
      const first = centers[0]!;
      const last = centers.at(-1)!;
      return {
        travel: Math.max(
          ...centers.map((center) =>
            Math.hypot(center.x - first.x, center.y - first.y),
          ),
        ),
        settled: Math.max(
          ...centers
            .slice(-10)
            .map((center) => Math.hypot(center.x - last.x, center.y - last.y)),
        ),
      };
    });
  expect(drift.travel).toBeGreaterThan(1);
  expect(drift.travel).toBeLessThan(14);
  expect(drift.settled).toBeLessThan(0.05);
  const finalZoom = await viewport.evaluate(
    (el) => (el as DskPanZoom).camera.zoom,
  );
  expect(finalZoom).toBeGreaterThan(2.5);
  expect(finalZoom).toBeLessThanOrEqual(3.21);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect
    .poll(() => viewport.evaluate((el) => (el as DskPanZoom).camera.zoom))
    .toBeCloseTo(finalZoom * 1.2);
  await page.locator('.dsk-docs-cards a').first().scrollIntoViewIfNeeded();
  await expect(page.locator('.dsk-docs-cards a').first()).toHaveCSS(
    'opacity',
    '1',
  );
});
