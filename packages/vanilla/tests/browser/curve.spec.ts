import { expect, test, type Page } from '@playwright/test';
import type { CurvePoints, DskCurve } from '@flowscape-ui/dsk';

interface CurveEvent {
  type: string;
  value: string;
  bubbles: boolean;
  composed: boolean;
  hostTarget: boolean;
}

declare global {
  interface Window {
    testCurve: DskCurve;
    curveEvents: CurveEvent[];
    curveCommits: number;
    curvePointerId: number;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-curve');
    const curve = document.createElement('dsk-curve');
    curve.id = 'curve-under-test';
    curve.style.cssText =
      'position: fixed; left: 24px; top: 24px; z-index: 1000';
    document.body.append(curve);
    window.testCurve = curve;
    window.curveEvents = [];
    window.curveCommits = 0;
    curve.setAttribute('onchange', 'window.curveCommits += 1');
    for (const type of ['input', 'change']) {
      curve.addEventListener(type, (event) => {
        window.curveEvents.push({
          type: event.type,
          value: curve.value,
          bubbles: event.bubbles,
          composed: event.composed,
          hostTarget: event.target === curve,
        });
      });
    }
    curve.addEventListener('pointerdown', (event) => {
      window.curvePointerId = event.pointerId;
    });
  });
});

function curveLocator(page: Page) {
  return page.locator('#curve-under-test');
}

function handleLocator(page: Page, index = 0) {
  return curveLocator(page).locator(`[part~="handle"][data-handle="${index}"]`);
}

function fieldLocator(page: Page, index = 0) {
  return curveLocator(page).locator(
    `[part~="coordinate"][data-coordinate="${index}"]`,
  );
}

async function graphPoint(page: Page, x: number, y: number) {
  const graph = curveLocator(page).locator('[part="graph"]');
  const box = await graph.boundingBox();
  if (!box) throw new Error('The curve graph must be visible.');
  return {
    x: box.x + 28 + x * (box.width - 56),
    y: box.y + 28 + (1 - y) * (box.height - 56),
  };
}

async function handleCenter(page: Page, index = 0) {
  const box = await handleLocator(page, index).boundingBox();
  if (!box) throw new Error('The curve handle must be visible.');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function startDrag(page: Page, index = 0) {
  const point = await handleCenter(page, index);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
}

async function moveToPoint(page: Page, x: number, y: number) {
  const point = await graphPoint(page, x, y);
  await page.mouse.move(point.x, point.y);
}

async function insertMiddle(page: Page) {
  const point = await graphPoint(page, 0.5, 0.5);
  await page.mouse.click(point.x, point.y);
}

test('clicking the curve inserts and selects a node without changing its shape', async ({
  page,
}) => {
  const path = curveLocator(page).locator('[part="curve"]');
  const before = await path.evaluate((element) => {
    const path = element as SVGPathElement;
    return Array.from({ length: 21 }, (_, i) => {
      const p = path.getPointAtLength((path.getTotalLength() * i) / 20);
      return [p.x, p.y];
    });
  });
  await insertMiddle(page);
  expect(await page.evaluate(() => window.testCurve.nodes)).toEqual([
    { x: 0.5, y: 0.5, kind: 'node' },
  ]);
  await expect(handleLocator(page, 2)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.testCurve.activePoint)).toBe(2);
  expect(
    await page.evaluate(() => window.curveEvents.map((e) => e.type)),
  ).toEqual(['input', 'change']);
  const after = await path.evaluate((element) => {
    const path = element as SVGPathElement;
    return Array.from({ length: 21 }, (_, i) => {
      const p = path.getPointAtLength((path.getTotalLength() * i) / 20);
      return [p.x, p.y];
    });
  });
  for (let i = 0; i < before.length; i++) {
    expect(after[i]?.[0]).toBeCloseTo(before[i]?.[0] ?? 0, 2);
    expect(after[i]?.[1]).toBeCloseTo(before[i]?.[1] ?? 0, 2);
  }
  const empty = await graphPoint(page, 0.05, 0.95);
  await page.mouse.click(empty.x, empty.y);
  expect(await page.evaluate(() => window.testCurve.nodes.length)).toBe(1);
});

test('added nodes drag freely in both axes within the graph and retain fixed marker size', async ({
  page,
}) => {
  await insertMiddle(page);
  const before = await handleLocator(page, 2).boundingBox();
  await startDrag(page, 2);
  await moveToPoint(page, 0.7, 0.2);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.nodes[0])).toEqual({
    x: 0.7,
    y: 0.2,
    kind: 'node',
  });
  expect((await handleLocator(page, 2).boundingBox())?.width).toBe(
    before?.width,
  );
  await expect(fieldLocator(page, 4)).toHaveValue('0.7');
  await expect(fieldLocator(page, 5)).toHaveValue('0.2');
  await startDrag(page, 2);
  await moveToPoint(page, 1.2, -0.3);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.nodes[0])).toEqual({
    x: 0.99999,
    y: 0,
    kind: 'node',
  });
});

test('multiple points preserve time order, selection is silent, and Delete removes a node', async ({
  page,
}) => {
  await insertMiddle(page);
  await curveLocator(page).locator('[part="add"]').click();
  expect(await page.evaluate(() => window.testCurve.nodes.length)).toBe(2);
  await page.evaluate(() => {
    window.curveEvents = [];
  });
  await handleLocator(page, 2).click();
  expect(await page.evaluate(() => window.curveEvents)).toEqual([]);
  await page.keyboard.press('End');
  const nodes = await page.evaluate(() => window.testCurve.nodes);
  expect(nodes[0]!.x).toBeLessThan(nodes[1]!.x);
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Delete');
  expect(await page.evaluate(() => window.testCurve.nodes.length)).toBe(1);
  await expect(
    curveLocator(page).locator('[data-preset="ease-in-out"]'),
  ).toHaveAttribute('aria-pressed', 'false');
  await curveLocator(page).locator('[data-preset="ease-in-out"]').click();
  expect(await page.evaluate(() => window.testCurve.nodes)).toEqual([]);
});

test('Escape cancels insertion or node movement without committing', async ({
  page,
}) => {
  const middle = await graphPoint(page, 0.5, 0.5);
  await page.mouse.move(middle.x, middle.y);
  await page.mouse.down();
  await moveToPoint(page, 0.6, 0.3);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.nodes)).toEqual([]);
  expect(await page.evaluate(() => window.curveCommits)).toBe(0);
  await insertMiddle(page);
  const start = await page.evaluate(() => window.testCurve.value);
  await startDrag(page, 2);
  await moveToPoint(page, 0.3, 0.8);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.value)).toBe(start);
  expect(await page.evaluate(() => window.curveCommits)).toBe(1);
  await fieldLocator(page, 5).fill('0.7');
  await fieldLocator(page, 5).press('Escape');
  expect(await page.evaluate(() => window.testCurve.value)).toBe(start);
});

test('segmented values round trip silently, return copies and export valid CSS easing', async ({
  page,
}) => {
  await insertMiddle(page);
  const result = await page.evaluate(() => {
    const curve = window.testCurve;
    const saved = curve.value;
    const segments = curve.segments;
    curve.value = 'linear';
    window.curveEvents = [];
    curve.value = saved;
    const restored = curve.value;
    const css = curve.cssValue;
    segments[0]![0] = 0.99;
    const independent = curve.segments[0]![0] !== 0.99;
    const restoredSegments = curve.segments;
    curve.segments = restoredSegments;
    return {
      saved,
      restored,
      css,
      supported: CSS.supports('animation-timing-function', css),
      independent,
      events: window.curveEvents,
    };
  });
  expect(result.saved).toMatch(/^curve\(/);
  expect(result.restored).toBe(result.saved);
  expect(result.css).toMatch(/^linear\(/);
  expect(result.supported).toBe(true);
  expect(result.independent).toBe(true);
  expect(result.events).toEqual([]);
});

test('readonly and disabled block insertion and node edits', async ({
  page,
}) => {
  await insertMiddle(page);
  const start = await page.evaluate(() => window.testCurve.value);
  for (const flag of ['readOnly', 'disabled'] as const) {
    await page.evaluate((flag) => {
      window.testCurve[flag] = true;
    }, flag);
    await expect(curveLocator(page).locator('[part="add"]')).toBeDisabled();
    await startDrag(page, 2);
    await moveToPoint(page, 0.1, 0.1);
    await page.mouse.up();
    expect(await page.evaluate(() => window.testCurve.value)).toBe(start);
    await page.evaluate((flag) => {
      window.testCurve[flag] = false;
    }, flag);
  }
});

test('normalizes the public API and keeps programmatic changes silent', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const curve = window.testCurve;
    const defaults = {
      value: curve.value,
      points: curve.points,
      preset: curve.preset,
      step: curve.step,
      duration: curve.duration,
      width: curve.width,
      color: curve.color,
      grid: curve.grid,
    };
    curve.value = 'ease';
    const named = { points: curve.points, preset: curve.preset };
    curve.value = '0.2, 0.3, 0.7, 0.8';
    const custom = { points: curve.points, preset: curve.preset };
    curve.value = 'cubic-bezier(-1, 2, 0.5, -0.2)';
    const clamped = curve.points;
    curve.value = 'not a curve';
    const invalid = curve.points;
    curve.points = [0.15, 0.2, 0.85, 0.9];
    const returned = curve.points;
    const sameReference = returned === curve.points;
    curve.step = -1;
    curve.duration = -100;
    curve.width = 0;
    curve.color = 'invalid-color';
    curve.setAttribute('grid', 'false');
    return {
      defaults,
      named,
      custom,
      clamped,
      invalid,
      returned,
      sameReference,
      final: [curve.step, curve.duration, curve.width, curve.color, curve.grid],
      cssMatches: curve.cssValue === curve.value,
      events: window.curveEvents,
    };
  });
  expect(result).toEqual({
    defaults: {
      value: 'cubic-bezier(0.42, 0, 0.58, 1)',
      points: [0.42, 0, 0.58, 1],
      preset: 'ease-in-out',
      step: 0.01,
      duration: 1200,
      width: 370,
      color: '#557be8',
      grid: true,
    },
    named: { points: [0.25, 0.1, 0.25, 1], preset: 'ease' },
    custom: { points: [0.2, 0.3, 0.7, 0.8], preset: 'custom' },
    clamped: [0, 1, 0.5, 0],
    invalid: [0.42, 0, 0.58, 1],
    returned: [0.15, 0.2, 0.85, 0.9],
    sameReference: false,
    final: [0.01, 1200, 370, '#557be8', false],
    cssMatches: true,
    events: [],
  });
});

test('upgrades properties assigned before registration', async ({ page }) => {
  const result = await page.evaluate(() => {
    const late = document.createElement('late-curve-test');
    Reflect.set(late, 'value', [0.1, 0.2, 0.8, 0.9]);
    Reflect.set(late, 'step', 0.05);
    Reflect.set(late, 'width', 320);
    Reflect.set(late, 'readOnly', true);
    document.body.append(late);
    const Curve = window.testCurve.constructor as typeof DskCurve;
    class LateCurve extends Curve {}
    customElements.define('late-curve-test', LateCurve);
    const curve = late as DskCurve;
    return {
      points: curve.points,
      step: curve.step,
      width: curve.width,
      readOnly: curve.readOnly,
      ownValue: Object.hasOwn(curve, 'value'),
    };
  });
  expect(result).toEqual({
    points: [0.1, 0.2, 0.8, 0.9],
    step: 0.05,
    width: 320,
    readOnly: true,
    ownValue: false,
  });
});

test('preset buttons select standard curves and commit one composed event', async ({
  page,
}) => {
  await curveLocator(page).locator('[data-preset="ease-out"]').click();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0, 0, 0.58, 1,
  ]);
  await expect(
    curveLocator(page).locator('[data-preset="ease-out"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  const events = await page.evaluate(() => window.curveEvents);
  expect(events.map((event) => event.type)).toEqual(['input', 'change']);
  expect(
    events.every(
      (event) => event.bubbles && event.composed && event.hostTarget,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => window.curveCommits)).toBe(1);
  await curveLocator(page).locator('[data-preset="ease-out"]').click();
  expect(await page.evaluate(() => window.curveEvents.length)).toBe(2);
});

test('drags both handles on the graph with step rounding and a single commit', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testCurve.step = 0.05;
  });
  await startDrag(page);
  await moveToPoint(page, 0.26, 0.34);
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.25, 0.35, 0.58, 1,
  ]);
  expect(await page.evaluate(() => window.curveCommits)).toBe(0);
  await page.mouse.up();
  expect(await page.evaluate(() => window.curveCommits)).toBe(1);
  await startDrag(page, 1);
  await moveToPoint(page, 0.78, 0.63);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.25, 0.35, 0.8, 0.65,
  ]);
  expect(await page.evaluate(() => window.curveCommits)).toBe(2);
});

test('preserves the pointer grab offset and clamps outside the graph', async ({
  page,
}) => {
  const start = await handleCenter(page);
  await page.mouse.move(start.x + 4, start.y - 3);
  await page.mouse.down();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.42, 0, 0.58, 1,
  ]);
  const target = await graphPoint(page, 0.6, 0.4);
  await page.mouse.move(target.x + 4, target.y - 3);
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.6, 0.4, 0.58, 1,
  ]);
  await moveToPoint(page, -0.1, 1.1);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0, 1, 0.58, 1,
  ]);
});

test('clicking a handle preserves coordinates that are between steps', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testCurve.step = 0.05;
  });
  await handleLocator(page).click();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.42, 0, 0.58, 1,
  ]);
  expect(await page.evaluate(() => window.curveEvents)).toEqual([]);
});

test('an external value ends a drag without restoring or committing stale points', async ({
  page,
}) => {
  await startDrag(page);
  await moveToPoint(page, 0.2, 0.3);
  await page.evaluate(() => {
    window.testCurve.value = 'ease';
    window.curveEvents = [];
  });
  await page.keyboard.press('Escape');
  await moveToPoint(page, 0.8, 0.6);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.25, 0.1, 0.25, 1,
  ]);
  expect(await page.evaluate(() => window.curveEvents)).toEqual([]);
});

for (const interaction of ['keyboard', 'preset'] as const) {
  test(`${interaction} does not commit a value replaced by an input listener`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.testCurve.addEventListener(
        'input',
        () => {
          window.testCurve.value = 'linear';
        },
        { once: true },
      );
    });
    if (interaction === 'keyboard') {
      await handleLocator(page).focus();
      await page.keyboard.press('ArrowRight');
    } else await curveLocator(page).locator('[data-preset="ease"]').click();
    expect(await page.evaluate(() => window.testCurve.preset)).toBe('linear');
    expect(
      await page.evaluate(() => window.curveEvents.map((event) => event.type)),
    ).toEqual(['input']);
  });
}

test('preset selection stops if committing a pending field disables the editor', async ({
  page,
}) => {
  await fieldLocator(page).fill('0.2');
  await page.evaluate(() => {
    const curve = window.testCurve;
    curve.addEventListener(
      'change',
      () => {
        curve.disabled = true;
      },
      { once: true },
    );
    curve.shadowRoot
      ?.querySelector<HTMLButtonElement>('[data-preset="linear"]')
      ?.click();
  });
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.2, 0, 0.58, 1,
  ]);
  expect(
    await page.evaluate(() => window.curveEvents.map((event) => event.type)),
  ).toEqual(['input', 'change']);
});

test('moving focus to a coordinate cancels a drag before starting another edit', async ({
  page,
}) => {
  await startDrag(page);
  await moveToPoint(page, 0.2, 0.3);
  const field = fieldLocator(page);
  await field.focus();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.42, 0, 0.58, 1,
  ]);
  await field.fill('0.6');
  await field.press('Escape');
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.42, 0, 0.58, 1,
  ]);
  expect(await page.evaluate(() => window.curveCommits)).toBe(0);
});

for (const cancellation of ['Escape', 'pointercancel', 'blur'] as const) {
  test(`${cancellation} restores an unfinished drag without committing`, async ({
    page,
  }) => {
    await startDrag(page);
    await moveToPoint(page, 0.2, 0.3);
    expect(await page.evaluate(() => window.testCurve.points)).toEqual([
      0.2, 0.3, 0.58, 1,
    ]);
    if (cancellation === 'Escape') await page.keyboard.press('Escape');
    else if (cancellation === 'blur')
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    else
      await handleLocator(page).evaluate((handle) => {
        handle.dispatchEvent(
          new PointerEvent('pointercancel', {
            pointerId: window.curvePointerId,
            bubbles: true,
            composed: true,
          }),
        );
      });
    await page.mouse.up();
    expect(await page.evaluate(() => window.testCurve.points)).toEqual([
      0.42, 0, 0.58, 1,
    ]);
    expect(await page.evaluate(() => window.curveCommits)).toBe(0);
    const events = await page.evaluate(() => window.curveEvents);
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.every((event) => event.type === 'input')).toBe(true);
    expect(events.at(-1)?.value).toBe('cubic-bezier(0.42, 0, 0.58, 1)');
  });
}

test('supports keyboard editing and focus on both handles', async ({
  page,
}) => {
  const first = handleLocator(page);
  await first.focus();
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowUp');
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.43, 0.1, 0.58, 1,
  ]);
  await page.keyboard.press('End');
  await page.keyboard.press('Shift+End');
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    1, 1, 0.58, 1,
  ]);
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+Home');
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0, 0, 0.58, 1,
  ]);
  const second = handleLocator(page, 1);
  await second.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0, 0, 0.57, 0.99,
  ]);
  expect(await page.evaluate(() => window.curveCommits)).toBe(8);
});

test('coordinate fields edit live, commit once and cancel invalid drafts', async ({
  page,
}) => {
  const field = fieldLocator(page);
  await expect(field).toHaveAccessibleName('Point 1 X');
  await field.fill('0.27');
  expect((await page.evaluate(() => window.testCurve.points))[0]).toBe(0.27);
  expect(await page.evaluate(() => window.curveCommits)).toBe(0);
  await field.press('Enter');
  await fieldLocator(page, 1).focus();
  expect(await page.evaluate(() => window.curveCommits)).toBe(1);
  await field.fill('');
  await field.press('Escape');
  await expect(field).toHaveValue('0.27');
  expect((await page.evaluate(() => window.testCurve.points))[0]).toBe(0.27);
  expect(await page.evaluate(() => window.curveCommits)).toBe(1);
  await field.fill('0.8');
  await field.press('Escape');
  await expect(field).toHaveValue('0.27');
  expect((await page.evaluate(() => window.testCurve.points))[0]).toBe(0.27);
  expect(await page.evaluate(() => window.curveCommits)).toBe(1);
  await fieldLocator(page, 3).fill('0.75');
  await fieldLocator(page, 2).focus();
  expect((await page.evaluate(() => window.testCurve.points))[3]).toBe(0.75);
  expect(await page.evaluate(() => window.curveCommits)).toBe(2);
});

test('programmatic values replace pending coordinate drafts without stale commits', async ({
  page,
}) => {
  const field = fieldLocator(page);
  await field.fill('0.2');
  await page.evaluate(() => {
    window.testCurve.value = 'ease-out';
    window.curveEvents = [];
  });
  await field.press('Escape');
  await fieldLocator(page, 1).focus();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0, 0, 0.58, 1,
  ]);
  await expect(field).toHaveValue('0');
  expect(await page.evaluate(() => window.curveEvents)).toEqual([]);
});

test('readonly blocks editing but allows preview; disabled blocks both', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testCurve.readOnly = true;
    window.testCurve.duration = 400;
  });
  const handle = handleLocator(page);
  await expect(handle).toHaveJSProperty('disabled', false);
  await expect(handle).toHaveAttribute('aria-disabled', 'true');
  await expect(fieldLocator(page)).toHaveJSProperty('readOnly', true);
  await expect(
    curveLocator(page).locator('[data-preset="linear"]'),
  ).toBeDisabled();
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  await startDrag(page);
  await moveToPoint(page, 0.8, 0.8);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.42, 0, 0.58, 1,
  ]);
  const play = curveLocator(page).locator('[part="play"]');
  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => {
    window.testCurve.disabled = true;
    window.testCurve.play();
  });
  await expect(handle).toBeDisabled();
  await expect(fieldLocator(page)).toBeDisabled();
  await expect(play).toBeDisabled();
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.curveEvents)).toEqual([]);
});

test('preview runs once and stop is silent', async ({ page }) => {
  const play = curveLocator(page).locator('[part="play"]');
  await page.evaluate(() => {
    window.testCurve.duration = 400;
    window.testCurve.play();
  });
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => {
    window.testCurve.duration = 2000;
    window.testCurve.play();
  });
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.testCurve.stop());
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.curveEvents)).toEqual([]);
});

test('reduced motion previews finish without starting an animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const result = await page.evaluate(() => {
    window.testCurve.play();
    return {
      pressed: window.testCurve.shadowRoot
        ?.querySelector('[part="play"]')
        ?.getAttribute('aria-pressed'),
      animations: window.testCurve.shadowRoot
        ?.getAnimations()
        .filter((animation) => animation.playState === 'running').length,
      events: window.curveEvents,
    };
  });
  expect(result).toEqual({ pressed: 'false', animations: 0, events: [] });
});

test('reconnecting cleans up an active drag and keeps one set of listeners', async ({
  page,
}) => {
  await startDrag(page);
  await moveToPoint(page, 0.2, 0.3);
  await page.evaluate(() => {
    const curve = window.testCurve;
    curve.remove();
    document.body.append(curve);
    curve.value = 'ease-in-out';
    window.curveEvents = [];
    window.curveCommits = 0;
  });
  await page.mouse.up();
  await handleLocator(page).focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.testCurve.points)).toEqual([
    0.43, 0, 0.58, 1,
  ]);
  expect(
    await page.evaluate(() => window.curveEvents.map((event) => event.type)),
  ).toEqual(['input', 'change']);
  expect(await page.evaluate(() => window.curveCommits)).toBe(1);
});

test('fits compact containers and keeps the handle target size constant', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.evaluate(() => {
    window.testCurve.style.width = 'calc(100vw - 48px)';
  });
  const initial = await handleLocator(page).boundingBox();
  await startDrag(page);
  await moveToPoint(page, 0.8, 0.8);
  const dragging = await handleLocator(page).boundingBox();
  await page.mouse.up();
  expect(initial?.width).toBe(32);
  expect(initial?.height).toBe(32);
  expect(dragging?.width).toBe(initial?.width);
  expect(dragging?.height).toBe(initial?.height);
  const graph = await curveLocator(page)
    .locator('[part="graph"]')
    .boundingBox();
  expect(graph?.width).toBeCloseTo(graph?.height ?? 0, 5);
  const hostBox = await curveLocator(page).boundingBox();
  expect((hostBox?.x ?? 0) + (hostBox?.width ?? 0)).toBeLessThanOrEqual(360);
  await page.evaluate(() => {
    window.testCurve.hidden = true;
  });
  await expect(curveLocator(page)).toBeHidden();
  await page.evaluate(() => {
    window.testCurve.hidden = false;
    window.testCurve.focus();
  });
  await expect(curveLocator(page)).toBeVisible();
  await expect(handleLocator(page)).toBeFocused();
});

test('renders the curve editor with light and dark tokens', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => {
    window.testCurve.remove();
    const gallery = document.createElement('div');
    gallery.id = 'curve-visual-gallery';
    gallery.style.cssText =
      'position: fixed; inset: 0; z-index: 2000; padding: 28px; background: #edf0f5; display: flex; gap: 24px; align-items: start';
    for (const dark of [false, true]) {
      const curve = document.createElement('dsk-curve');
      curve.value = dark ? 'ease' : 'ease-in-out';
      if (dark)
        curve.style.cssText =
          '--dsk-curve-color: #91aaff; --dsk-curve-background: #171e2b; --dsk-curve-text-color: #eef2fa; --dsk-curve-muted-color: #a0afc4; --dsk-curve-border-color: #3d485b; --dsk-curve-grid-color: #303c4e';
      gallery.append(curve);
    }
    document.body.append(gallery);
  });
  const gallery = page.locator('#curve-visual-gallery');
  await expect(gallery.locator('dsk-curve')).toHaveCount(2);
  const darkCurve = gallery.locator('dsk-curve').last();
  await darkCurve.locator('[part="add"]').click();
  await darkCurve.locator('[part="add"]').click();
  await expect(darkCurve.locator('[data-kind="node"]')).toHaveCount(2);
  await darkCurve.evaluate((element) => {
    const curve = element as DskCurve;
    curve.start = [0.1, 0.2];
    curve.end = [0.9, 0.8];
    curve.activePoint = curve.segments.length * 3;
  });
  const screenshot = testInfo.outputPath('curve-editor-themes.png');
  await gallery.screenshot({ path: screenshot });
  await testInfo.attach('curve-editor-themes', {
    path: screenshot,
    contentType: 'image/png',
  });
});

test('all four coordinate fields keep their own values and labels', async ({
  page,
}) => {
  const points: CurvePoints = [0.1, 0.2, 0.7, 0.9];
  await page.evaluate((points) => {
    window.testCurve.points = points;
  }, points);
  for (const [index, label] of [
    'Point 1 X',
    'Point 1 Y',
    'Point 2 X',
    'Point 2 Y',
  ].entries()) {
    await expect(fieldLocator(page, index)).toHaveAccessibleName(label);
    await expect(fieldLocator(page, index)).toHaveValue(String(points[index]));
  }
});

test('playground settings, generated HTML and events stay synchronized', async ({
  page,
}) => {
  await page.evaluate(() => window.testCurve.remove());
  const demo = page.locator('#curve-demo');
  await demo.scrollIntoViewIfNeeded();
  const code = page.locator('#curve-code');
  await expect(page.locator('#curve-current-preset')).toHaveText('ease-in-out');
  await page.locator('[name="curve-value"]').fill('linear');
  await expect(page.locator('#curve-current-preset')).toHaveText('linear');
  await page.locator('[name="curve-grid"]').uncheck();
  await expect(code).toContainText('grid="false"');
  await page.locator('[name="curve-step"]').fill('0.05');
  await expect(code).toContainText('step="0.05"');
  await demo.locator('[part~="handle"][data-handle="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#curve-current-preset')).toHaveText('custom');
  await expect(page.locator('#curve-count')).toHaveText('1');
  await expect(page.locator('[name="curve-value"]')).toHaveValue(
    'cubic-bezier(0.05, 0, 1, 1)',
  );
  await expect(page.locator('#curve-events')).toContainText('change');
  await page.locator('#curve-reset').click();
  await expect(page.locator('#curve-current-preset')).toHaveText('ease-in-out');
  await expect(page.locator('#curve-count')).toHaveText('0');
  await expect(page.locator('[name="curve-grid"]')).toBeChecked();
  await expect(page.locator('[name="curve-step"]')).toHaveValue('');
  await expect(code).not.toContainText('grid=');
});

test('endpoints drag in both axes, expose coordinates, and preserve saved paths', async ({
  page,
}) => {
  await startDrag(page, 2);
  await moveToPoint(page, 0.15, 0.3);
  await page.mouse.up();
  await startDrag(page, 3);
  await moveToPoint(page, 0.85, 0.7);
  await page.mouse.up();
  expect(
    await page.evaluate(() => [window.testCurve.start, window.testCurve.end]),
  ).toEqual([
    [0.15, 0.3],
    [0.85, 0.7],
  ]);
  await expect(fieldLocator(page, 6)).toHaveAccessibleName('End point X');
  await fieldLocator(page, 7).fill('0.6');
  await fieldLocator(page, 7).press('Enter');
  expect(await page.evaluate(() => window.curveCommits)).toBe(3);
  const saved = await page.evaluate(() => window.testCurve.value);
  await startDrag(page, 3);
  await moveToPoint(page, 0.4, 0.2);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.value)).toBe(saved);
  await handleLocator(page, 2).focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.testCurve.start[0])).toBe(0.16);
  await page.keyboard.press('Delete');
  expect(await page.evaluate(() => window.testCurve.segments.length)).toBe(1);
  await page.evaluate((saved) => {
    window.testCurve.value = 'linear';
    window.testCurve.value = saved;
  }, saved);
  expect(
    await page.evaluate(() => [
      window.testCurve.start,
      window.testCurve.end,
      window.testCurve.preset,
      CSS.supports('animation-timing-function', window.testCurve.cssValue),
    ]),
  ).toEqual([[0.15, 0.3], [0.85, 0.6], 'custom', true]);
});

test('endpoints cannot cross neighboring nodes and respect readonly and disabled', async ({
  page,
}) => {
  await insertMiddle(page);
  await startDrag(page, 5);
  await moveToPoint(page, 0.9, 0.8);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testCurve.start)).toEqual([
    0.49999, 0.8,
  ]);
  await handleLocator(page, 6).focus();
  await page.keyboard.press('Home');
  expect(await page.evaluate(() => window.testCurve.end[0])).toBe(0.50001);
  const saved = await page.evaluate(() => {
    window.testCurve.readOnly = true;
    return window.testCurve.value;
  });
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.testCurve.value)).toBe(saved);
  await page.evaluate(() => {
    window.testCurve.disabled = true;
  });
  await expect(handleLocator(page, 5)).toBeDisabled();
  await expect(handleLocator(page, 6)).toBeDisabled();
});

test('endpoint API is silent and preview uses the selected endpoint progress', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const result = await page.evaluate(() => {
    const curve = window.testCurve;
    curve.start = [0.2, 0.3];
    curve.end = [0.8, 0.7];
    const path = curve.segments;
    const copiedStart = curve.start;
    copiedStart[1] = 0.9;
    path.start![1] = 0.9;
    const preview =
      curve.shadowRoot!.querySelector<HTMLElement>('[part="preview"]')!;
    const dot = curve.shadowRoot!.querySelector<HTMLElement>(
      '[part="motion-dot"]',
    )!;
    const travel = preview.clientWidth - dot.offsetWidth;
    curve.stop();
    const initial = Number.parseFloat(dot.style.transform.slice(11));
    curve.play();
    const final = Number.parseFloat(dot.style.transform.slice(11));
    const start = curve.start;
    curve.value = 'ease';
    return {
      initial: initial / travel,
      final: final / travel,
      start,
      reset: [curve.start, curve.end],
      events: window.curveEvents,
    };
  });
  expect(result.initial).toBeCloseTo(0.3);
  expect(result.final).toBeCloseTo(0.7);
  expect(result.start).toEqual([0.2, 0.3]);
  expect(result.reset).toEqual([
    [0, 0],
    [1, 1],
  ]);
  expect(result.events).toEqual([]);
});
