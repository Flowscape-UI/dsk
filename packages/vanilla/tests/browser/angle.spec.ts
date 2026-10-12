import { expect, test, type Page } from '@playwright/test';
import type { AngleUnit, DskAngle } from '@flowscape-ui/dsk';

interface AngleEvent {
  type: string;
  value: number;
  bubbles: boolean;
  composed: boolean;
  hostTarget: boolean;
}

declare global {
  interface Window {
    testAngle: DskAngle;
    angleEvents: AngleEvent[];
    angleCommits: number;
    anglePointerId: number;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    await customElements.whenDefined('dsk-angle');
    const angle = document.createElement('dsk-angle');
    angle.id = 'angle-under-test';
    angle.style.cssText =
      'position: fixed; left: 24px; top: 24px; z-index: 1000';
    document.body.append(angle);
    window.testAngle = angle;
    window.angleEvents = [];
    window.angleCommits = 0;
    angle.setAttribute('onchange', 'window.angleCommits += 1');
    for (const type of ['input', 'change']) {
      angle.addEventListener(type, (event) => {
        window.angleEvents.push({
          type: event.type,
          value: angle.value,
          bubbles: event.bubbles,
          composed: event.composed,
          hostTarget: event.target === angle,
        });
      });
    }
    angle.addEventListener('pointerdown', (event) => {
      window.anglePointerId = event.pointerId;
    });
  });
});

async function pointOnDial(page: Page, degrees: number, radiusScale = 1) {
  const box = await page.locator('#angle-under-test').boundingBox();
  if (!box) throw new Error('The angle control must be visible.');
  const radians = (degrees * Math.PI) / 180;
  const radius = (box.width * 77 * radiusScale) / 240;
  return {
    x: box.x + box.width / 2 + Math.sin(radians) * radius,
    y: box.y + box.height / 2 - Math.cos(radians) * radius,
  };
}

async function moveOnDial(page: Page, degrees: number, radiusScale = 1) {
  const point = await pointOnDial(page, degrees, radiusScale);
  await page.mouse.move(point.x, point.y);
}

test('normalizes public attributes and keeps programmatic updates silent', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const angle = window.testAngle;
    const defaults = {
      unit: angle.unit,
      value: angle.value,
      min: angle.min,
      max: angle.max,
      step: angle.step,
      size: angle.size,
      segments: angle.segments,
      degrees: angle.degrees,
      color: angle.color,
    };
    angle.value = '90';
    const quarter = [angle.value, angle.degrees, angle.formattedValue];
    angle.value = 500;
    const high = angle.value;
    angle.value = -20;
    const low = angle.value;
    angle.min = 30;
    angle.max = 10;
    const collapsed = [angle.min, angle.max, angle.value];
    angle.min = null;
    angle.max = undefined;
    angle.value = null;
    angle.step = -1;
    angle.color = 'definitely-not-a-color';
    return {
      defaults,
      quarter,
      high,
      low,
      collapsed,
      reset: [angle.value, angle.min, angle.max, angle.step, angle.color],
      events: window.angleEvents,
    };
  });
  expect(result).toEqual({
    defaults: {
      unit: 'deg',
      value: 0,
      min: 0,
      max: 360,
      step: 1,
      size: 208,
      segments: 24,
      degrees: 0,
      color: '#557be8',
    },
    quarter: [90, 90, '90°'],
    high: 360,
    low: 0,
    collapsed: [30, 30, 30],
    reset: [0, 0, 360, 1, '#557be8'],
    events: [],
  });
});

test('initial units are independent of attribute order and support PI aliases', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = `
      <dsk-angle unit="rad" value="${Math.PI}" min="0" max="${Math.PI * 2}" step="${Math.PI / 180}"></dsk-angle>
      <dsk-angle value="${Math.PI}" min="0" max="${Math.PI * 2}" step="${Math.PI / 180}" unit="rad"></dsk-angle>
      <dsk-angle value="0.5" unit="PI"></dsk-angle>
      <dsk-angle unit="π" value="0.5"></dsk-angle>
    `;
    document.body.append(host);
    return [...host.querySelectorAll('dsk-angle')].map((angle) => ({
      value: angle.value,
      unit: angle.unit,
      degrees: angle.degrees,
      formatted: angle.formattedValue,
    }));
  });
  expect(result[0]).toEqual(result[1]);
  expect(result[0]?.value).toBeCloseTo(Math.PI, 10);
  expect(result[0]?.degrees).toBeCloseTo(180, 8);
  for (const angle of result.slice(2)) {
    expect(angle).toEqual({
      value: 0.5,
      unit: 'pi',
      degrees: 90,
      formatted: 'π/2',
    });
  }
});

test('switching units preserves the angle, explicit bounds and physical step', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const angle = window.testAngle;
    angle.min = 30;
    angle.max = 270;
    angle.step = 15;
    angle.value = 90;
    const units: AngleUnit[] = ['rad', 'pi', 'turn', 'grad', 'deg'];
    return units.map((unit) => {
      angle.unit = unit;
      return {
        unit: angle.unit,
        value: angle.value,
        min: angle.min,
        max: angle.max,
        step: angle.step,
        degrees: angle.degrees,
        events: window.angleEvents.length,
      };
    });
  });
  const revolutions = [Math.PI * 2, 2, 1, 400, 360];
  for (const [index, state] of result.entries()) {
    const revolution = revolutions[index];
    if (revolution === undefined) throw new Error('Missing unit conversion.');
    expect(state.value).toBeCloseTo(revolution / 4, 9);
    expect(state.min).toBeCloseTo(revolution / 12, 9);
    expect(state.max).toBeCloseTo((revolution * 3) / 4, 9);
    expect(state.step).toBeCloseTo(revolution / 24, 9);
    expect(state.degrees).toBeCloseTo(90, 9);
    expect(state.events).toBe(0);
  }
});

test('clicking clockwise selects absolute angles and emits native host events', async ({
  page,
}) => {
  for (const degrees of [90, 180, 270]) {
    const point = await pointOnDial(page, degrees);
    await page.mouse.click(point.x, point.y);
    expect(await page.evaluate(() => window.testAngle.value)).toBe(degrees);
  }
  const events = await page.evaluate(() => window.angleEvents);
  expect(events).toEqual(
    [90, 180, 270].flatMap((value) =>
      ['input', 'change'].map((type) => ({
        type,
        value,
        bubbles: true,
        composed: true,
        hostTarget: true,
      })),
    ),
  );
  expect(await page.evaluate(() => window.angleCommits)).toBe(3);
  const point = await pointOnDial(page, 270);
  await page.mouse.click(point.x, point.y);
  expect(await page.evaluate(() => window.angleEvents.length)).toBe(6);
});

test('custom limits constrain the physical arc and snap relative to the minimum', async ({
  page,
}) => {
  await page.evaluate(() => {
    const angle = window.testAngle;
    angle.min = 15;
    angle.max = 135;
    angle.step = 30;
  });
  for (const [degrees, expected] of [
    [70, 75],
    [180, 135],
    [0, 15],
  ] as const) {
    const point = await pointOnDial(page, degrees);
    await page.mouse.click(point.x, point.y);
    expect(await page.evaluate(() => window.testAngle.value)).toBe(expected);
  }
});

test('dragging across the upper seam clamps at 360 and reverses immediately', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testAngle.min = 0;
    window.testAngle.max = 360;
    window.testAngle.value = 350;
  });
  await moveOnDial(page, 350);
  await page.mouse.down();
  await moveOnDial(page, 0);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(360);
  await moveOnDial(page, 10);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(360);
  await moveOnDial(page, 5);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(355);
  expect(await page.evaluate(() => window.angleCommits)).toBe(0);
  await page.mouse.up();
  expect(await page.evaluate(() => window.angleCommits)).toBe(1);
});

test('dragging across the lower seam clamps at zero and reverses immediately', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testAngle.min = 0;
    window.testAngle.max = 360;
    window.testAngle.value = 10;
  });
  await moveOnDial(page, 10);
  await page.mouse.down();
  await moveOnDial(page, 0);
  await moveOnDial(page, 350);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(0);
  await moveOnDial(page, 355);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(5);
  await page.mouse.up();
  expect(await page.evaluate(() => window.angleCommits)).toBe(1);
});

for (const direction of ['clockwise', 'counterclockwise'] as const) {
  test(`without explicit bounds the dial wraps through multiple ${direction} revolutions`, async ({
    page,
  }) => {
    const clockwise = direction === 'clockwise';
    const start = clockwise ? 350 : 10;
    await page.evaluate((start) => {
      window.testAngle.value = start;
    }, start);
    await moveOnDial(page, start);
    await page.mouse.down();
    const revolution = clockwise
      ? [10, 90, 180, 270, 350]
      : [350, 270, 180, 90, 10];
    for (let turn = 0; turn < 3; turn += 1) {
      for (const degrees of revolution) {
        await moveOnDial(page, degrees);
        expect(await page.evaluate(() => window.testAngle.value)).toBe(degrees);
      }
    }
    await moveOnDial(page, clockwise ? 10 : 350);
    expect(await page.evaluate(() => window.testAngle.value)).toBe(
      clockwise ? 10 : 350,
    );
    expect(await page.evaluate(() => window.angleCommits)).toBe(0);
    await page.mouse.up();
    expect(await page.evaluate(() => window.angleCommits)).toBe(1);
  });
}

for (const [start, grab, move, expected] of [
  [359, 1, 6, 4],
  [1, 359, 354, 356],
] as const) {
  test(`grabbing the marker across the seam at ${start} degrees preserves its value and pointer offset`, async ({
    page,
  }) => {
    await page.evaluate((start) => {
      window.testAngle.value = start;
    }, start);
    await moveOnDial(page, grab);
    await page.mouse.down();
    expect(await page.evaluate(() => window.testAngle.value)).toBe(start);
    expect(await page.evaluate(() => window.angleEvents)).toEqual([]);
    await moveOnDial(page, move);
    expect(await page.evaluate(() => window.testAngle.value)).toBe(expected);
    await page.mouse.up();
    expect(await page.evaluate(() => window.angleCommits)).toBe(1);
  });
}

test('keyboard increments wrap by default and either explicit bound enables endpoint limits', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testAngle.value = 360;
    window.testAngle.focus();
  });
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.testAngle.value)).toBe(1);
  await page.evaluate(() => {
    window.testAngle.value = 0;
  });
  await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => window.testAngle.value)).toBe(359);
  for (const bound of ['min', 'max'] as const) {
    await page.evaluate((bound) => {
      const angle = window.testAngle;
      angle.min = null;
      angle.max = null;
      angle[bound] = bound === 'min' ? 0 : 360;
      angle.value = 360;
      window.angleEvents = [];
    }, bound);
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => window.testAngle.value)).toBe(360);
    await page.evaluate(() => {
      window.testAngle.value = 0;
    });
    await page.keyboard.press('ArrowLeft');
    expect(await page.evaluate(() => window.testAngle.value)).toBe(0);
    expect(await page.evaluate(() => window.angleEvents)).toEqual([]);
  }
});

test('pointer capture continues outside the dial and crossing the center does not jump', async ({
  page,
}) => {
  await moveOnDial(page, 90);
  await page.mouse.down();
  await moveOnDial(page, 180, 3);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(180);
  await moveOnDial(page, 0, 0);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(180);
  await moveOnDial(page, 270);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(180);
  await moveOnDial(page, 280);
  expect(await page.evaluate(() => window.testAngle.value)).toBe(190);
  await page.mouse.up();
  expect(await page.evaluate(() => window.angleCommits)).toBe(1);
});

for (const cancellation of ['Escape', 'pointercancel'] as const) {
  test(`${cancellation} restores the starting value without committing`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.testAngle.value = 45;
    });
    await moveOnDial(page, 90);
    await page.mouse.down();
    expect(await page.evaluate(() => window.testAngle.value)).toBe(90);
    if (cancellation === 'Escape') {
      await page.keyboard.press('Escape');
    } else {
      await page.evaluate(() => {
        const dial =
          window.testAngle.shadowRoot?.querySelector('[part~="dial"]');
        if (!dial) throw new Error('The dial is missing.');
        dial.dispatchEvent(
          new PointerEvent('pointercancel', {
            pointerId: window.anglePointerId,
            bubbles: true,
            composed: true,
          }),
        );
      });
    }
    await moveOnDial(page, 180);
    await page.mouse.up();
    expect(await page.evaluate(() => window.testAngle.value)).toBe(45);
    expect(
      await page.evaluate(() =>
        window.angleEvents.map((event) => [event.type, event.value]),
      ),
    ).toEqual([
      ['input', 90],
      ['input', 45],
    ]);
    expect(await page.evaluate(() => window.angleCommits)).toBe(0);
  });
}

test('keyboard access supports arrows, Shift, Page keys and endpoints in the selected unit', async ({
  page,
}) => {
  await page.evaluate(() => {
    const angle = window.testAngle;
    angle.unit = 'pi';
    angle.step = 0.05;
    angle.value = 0.5;
    angle.setAttribute('aria-label', 'Object rotation');
    angle.focus({ preventScroll: true });
  });
  const slider = page
    .locator('#angle-under-test')
    .getByRole('slider', { name: 'Object rotation' });
  await expect(slider).toBeFocused();
  for (const [key, value] of [
    ['ArrowRight', 0.55],
    ['ArrowUp', 0.6],
    ['Shift+ArrowLeft', 0.1],
    ['PageUp', 0.6],
    ['PageDown', 0.1],
    ['Home', 0],
    ['End', 2],
    ['ArrowDown', 1.95],
  ] as const) {
    await page.keyboard.press(key);
    expect(await page.evaluate(() => window.testAngle.value)).toBeCloseTo(
      value,
      10,
    );
  }
  expect(await page.evaluate(() => window.angleCommits)).toBe(8);
  expect(
    await page.evaluate(() => window.angleEvents.map((event) => event.type)),
  ).toEqual(Array.from({ length: 8 }, () => ['input', 'change']).flat());
});

for (const unit of ['rad', 'pi'] as const) {
  test(`native accessibility adjustments advance one public step in ${unit}`, async ({
    page,
  }) => {
    const result = await page.evaluate((unit) => {
      const angle = window.testAngle;
      angle.unit = unit;
      angle.min = unit === 'rad' ? Math.PI / 6 : 0.25;
      angle.max = unit === 'rad' ? (Math.PI * 3) / 2 : 1.7;
      angle.step = unit === 'rad' ? Math.PI / 12 : 0.125;
      angle.value = unit === 'rad' ? Math.PI / 2 : 0.5;
      const input = angle.shadowRoot?.querySelector('input');
      if (!(input instanceof HTMLInputElement))
        throw new Error('The accessible range is missing.');
      const start = angle.value;
      input.value = String(Number(input.value) + 1);
      input.dispatchEvent(
        new Event('input', { bubbles: true, composed: true }),
      );
      input.dispatchEvent(
        new Event('change', { bubbles: true, composed: true }),
      );
      return {
        start,
        step: angle.step,
        value: angle.value,
        minimum: angle.min,
        maximum: angle.max,
        aria: {
          min: Number(input.getAttribute('aria-valuemin')),
          max: Number(input.getAttribute('aria-valuemax')),
          now: Number(input.getAttribute('aria-valuenow')),
          text: input.getAttribute('aria-valuetext'),
        },
        formatted: angle.formattedValue,
        events: window.angleEvents,
        commits: window.angleCommits,
      };
    }, unit);
    expect(result.value).toBeCloseTo(result.start + result.step, 10);
    expect(result.aria.min).toBeCloseTo(result.minimum, 10);
    expect(result.aria.max).toBeCloseTo(result.maximum, 10);
    expect(result.aria.now).toBeCloseTo(result.value, 10);
    expect(result.aria.text).toBe(result.formatted);
    expect(result.events).toEqual(
      ['input', 'change'].map((type) => ({
        type,
        value: result.value,
        bubbles: true,
        composed: true,
        hostTarget: true,
      })),
    );
    expect(result.commits).toBe(1);
  });
}

test('accessible range preserves non-grid values and endpoints without rounding them to a step', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const angle = window.testAngle;
    angle.unit = 'pi';
    angle.min = 0.1;
    angle.max = 1.93;
    angle.step = 0.3;
    angle.value = 0.47;
    const input = angle.shadowRoot?.querySelector('input');
    if (!(input instanceof HTMLInputElement))
      throw new Error('The accessible range is missing.');
    const selection = {
      value: angle.value,
      inputValue: Number(input.value),
      inputMin: Number(input.min),
      inputMax: Number(input.max),
      inputStep: input.step,
      ariaNow: Number(input.getAttribute('aria-valuenow')),
      ariaMax: Number(input.getAttribute('aria-valuemax')),
    };
    angle.value = angle.max;
    return {
      selection,
      endpoint: {
        value: angle.value,
        inputValue: Number(input.value),
        ariaNow: Number(input.getAttribute('aria-valuenow')),
      },
      events: window.angleEvents,
    };
  });
  expect(result.selection.value).toBe(0.47);
  expect(result.selection.inputValue).toBeCloseTo((0.47 - 0.1) / 0.3, 10);
  expect(result.selection.inputMin).toBe(0);
  expect(result.selection.inputMax).toBeCloseTo((1.93 - 0.1) / 0.3, 10);
  expect(result.selection.inputStep).toBe('any');
  expect(result.selection.ariaNow).toBe(0.47);
  expect(result.selection.ariaMax).toBe(1.93);
  expect(result.endpoint.value).toBe(1.93);
  expect(result.endpoint.inputValue).toBeCloseTo((1.93 - 0.1) / 0.3, 10);
  expect(result.endpoint.ariaNow).toBe(1.93);
  expect(result.events).toEqual([]);
});

for (const state of ['disabled', 'readOnly'] as const) {
  test(`${state} prevents changes and terminates an active drag`, async ({
    page,
  }) => {
    await page.evaluate((state) => {
      const angle = window.testAngle;
      angle.value = 45;
      angle[state] = true;
    }, state);
    await expect(page.locator('#angle-under-test')).toHaveAttribute(
      state.toLowerCase(),
      '',
    );
    const point = await pointOnDial(page, 90);
    await page.mouse.click(point.x, point.y);
    await page.evaluate(() => window.testAngle.focus());
    await page.keyboard.press('ArrowRight');
    expect(await page.evaluate(() => window.testAngle.value)).toBe(45);
    expect(await page.evaluate(() => window.angleEvents)).toEqual([]);
    await page.evaluate((state) => {
      window.testAngle[state] = false;
    }, state);
    await moveOnDial(page, 90);
    await page.mouse.down();
    await page.evaluate((state) => {
      window.testAngle[state] = true;
    }, state);
    const stopped = await page.evaluate(() => window.testAngle.value);
    await moveOnDial(page, 180);
    await page.mouse.up();
    expect(await page.evaluate(() => window.testAngle.value)).toBe(stopped);
    expect(await page.evaluate(() => window.angleCommits)).toBe(0);
  });
}

test('disconnecting cleans up interaction and reconnection does not duplicate listeners', async ({
  page,
}) => {
  const destination = await pointOnDial(page, 180);
  await moveOnDial(page, 90);
  await page.mouse.down();
  await page.evaluate(() => window.testAngle.remove());
  const stopped = await page.evaluate(() => window.testAngle.value);
  await page.mouse.move(destination.x, destination.y);
  await page.mouse.up();
  expect(await page.evaluate(() => window.testAngle.value)).toBe(stopped);
  expect(await page.evaluate(() => window.angleCommits)).toBe(0);
  await page.evaluate(() => {
    const angle = window.testAngle;
    for (let count = 0; count < 3; count += 1) {
      document.body.append(angle);
      angle.remove();
    }
    document.body.append(angle);
    angle.value = 45;
    window.angleEvents = [];
    angle.focus();
  });
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => window.testAngle.value)).toBe(46);
  expect(
    await page.evaluate(() => window.angleEvents.map((event) => event.type)),
  ).toEqual(['input', 'change']);
});

test('custom size and fill color keep the marker fixed and centered on the arc', async ({
  page,
}) => {
  const angle = page.locator('#angle-under-test');
  await page.evaluate(() => {
    window.testAngle.color = '#e86b55';
    window.testAngle.size = 240;
    window.testAngle.value = 90;
  });
  await expect(angle.locator('[part~="fill"]').first()).toHaveCSS(
    'fill',
    'rgb(232, 107, 85)',
  );
  const fillOpacity = await angle
    .locator('[part~="fill"]')
    .evaluate((fill) => Number(getComputedStyle(fill).fillOpacity));
  expect(fillOpacity).toBeGreaterThan(0);
  expect(fillOpacity).toBeLessThan(0.3);
  const box = await angle.boundingBox();
  if (!box) throw new Error('The dial is missing.');
  expect([box.width, box.height]).toEqual([240, 240]);
  const marker = angle.locator('[part~="marker"]');
  for (const degrees of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
    await page.evaluate((degrees) => {
      window.testAngle.value = degrees;
    }, degrees);
    const markerBox = await marker.boundingBox();
    if (!markerBox) throw new Error('The marker is missing.');
    expect(markerBox.width).toBeCloseTo(10, 4);
    expect(markerBox.height).toBeCloseTo(10, 4);
    const expected = await pointOnDial(page, degrees);
    expect(
      Math.abs(markerBox.x + markerBox.width / 2 - expected.x),
    ).toBeLessThanOrEqual(0.51);
    expect(
      Math.abs(markerBox.y + markerBox.height / 2 - expected.y),
    ).toBeLessThanOrEqual(0.51);
  }
});

test('the soft sector follows the selected arc and leaves the center clear', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const angle = window.testAngle;
    const fill = angle.shadowRoot?.querySelector('[part~="fill"]');
    const needle = angle.shadowRoot?.querySelector('[part~="needle"]');
    if (
      !(fill instanceof SVGGeometryElement) ||
      !(needle instanceof SVGGeometryElement)
    )
      throw new Error('The sector and compass needle must be present.');
    const point = (degrees: number, radius = 60) => {
      const radians = (degrees * Math.PI) / 180;
      return new DOMPoint(
        120 + Math.sin(radians) * radius,
        120 - Math.cos(radians) * radius,
      );
    };
    const angles = Array.from({ length: 24 }, (_, index) => index * 15 + 7.5);
    const filledAngles = () =>
      angles.filter((degrees) => fill.isPointInFill(point(degrees)));
    const centerCovered = () =>
      [0, 12, 24, 40].some((radius) =>
        angles.some((degrees) => {
          const sample = point(degrees, radius);
          return fill.isPointInFill(sample) || needle.isPointInStroke(sample);
        }),
      );
    const selections = [0, 90, 180, 270, 360].map((degrees) => {
      angle.value = degrees;
      return {
        degrees,
        filled: filledAngles(),
        centerCovered: centerCovered(),
      };
    });
    angle.min = 30;
    angle.max = 180;
    angle.value = 90;
    const bounded = filledAngles();
    angle.value = angle.min;
    const minimum = filledAngles();
    return { selections, bounded, minimum };
  });
  for (const selection of result.selections) {
    expect(selection.filled).toHaveLength(selection.degrees / 15);
    expect(selection.centerCovered).toBe(false);
    expect(
      selection.filled.every((degrees) => degrees < selection.degrees),
    ).toBe(true);
  }
  expect(result.bounded).toEqual([37.5, 52.5, 67.5, 82.5]);
  expect(result.minimum).toEqual([]);
});

test('compass cardinal labels and center value use the selected unit', async ({
  page,
}) => {
  const angle = page.locator('#angle-under-test');
  for (const [unit, value, center, labels] of [
    ['deg', 90, '90°', ['0°', '90°', '180°', '270°']],
    ['pi', 0.5, 'π/2', ['0', 'π/2', 'π', '3π/2']],
    ['rad', Math.PI / 2, '1.571 rad', ['0', '1.571', '3.142', '4.712']],
    ['turn', 0.25, '0.25 turn', ['0', '0.25', '0.5', '0.75']],
    ['grad', 100, '100 grad', ['0', '100', '200', '300']],
  ] as const) {
    await page.evaluate(
      ({ unit, value }) => {
        window.testAngle.unit = unit;
        window.testAngle.value = value;
      },
      { unit, value },
    );
    await expect(angle.locator('[part~="value"]')).toHaveText(center);
    await expect(angle.locator('[part~="scale-label"]')).toHaveText([
      ...labels,
    ]);
  }
});

test('renders the compass sector in light and dark themes at compact sizes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 980, height: 800 });
  await page.evaluate(() => {
    window.testAngle.remove();
    const gallery = document.createElement('div');
    gallery.id = 'angle-visual-gallery';
    gallery.style.cssText =
      'position: fixed; inset: 0; z-index: 2000; padding: 24px; background: #eff1f5; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; align-content: start; font: 14px system-ui';
    for (const dark of [false, true]) {
      for (const [unit, value, size] of [
        ['deg', 135, 208],
        ['pi', 0.75, 144],
        ['rad', Math.PI * 1.25, 144],
      ] as const) {
        const card = document.createElement('div');
        card.style.cssText = `display: flex; min-height: 270px; flex-direction: column; align-items: center; justify-content: center; gap: 16px; border-radius: 16px; background: ${dark ? '#171e2b' : '#ffffff'}; color: ${dark ? '#eef2fa' : '#243044'}`;
        const caption = document.createElement('div');
        caption.textContent = `${dark ? 'Dark' : 'Light'} / ${unit} / ${size}px`;
        const angle = document.createElement('dsk-angle');
        angle.unit = unit;
        angle.value = value;
        angle.size = size;
        if (dark)
          angle.style.cssText =
            '--dsk-angle-track-color: #465268; --dsk-angle-text-color: #eef2fa; --dsk-angle-color: #86a5ff';
        card.append(angle, caption);
        gallery.append(card);
      }
    }
    document.body.append(gallery);
  });
  const gallery = page.locator('#angle-visual-gallery');
  await expect(gallery.locator('dsk-angle')).toHaveCount(6);
  const centers = await gallery.locator('dsk-angle').evaluateAll((angles) =>
    angles.map((angle) => {
      const output = angle.shadowRoot?.querySelector('[part~="value"]');
      if (!(output instanceof SVGTextElement))
        throw new Error('The center value is missing.');
      const dialBox = angle.getBoundingClientRect();
      const textBox = output.getBoundingClientRect();
      return {
        centeredX:
          textBox.x + textBox.width / 2 - dialBox.x - dialBox.width / 2,
        centeredY:
          textBox.y + textBox.height / 2 - dialBox.y - dialBox.height / 2,
        textWidth: textBox.width,
        clearDiameter: (dialBox.width * 88) / 240,
      };
    }),
  );
  for (const center of centers) {
    expect(Math.abs(center.centeredX)).toBeLessThan(1);
    expect(Math.abs(center.centeredY)).toBeLessThan(1);
    expect(center.textWidth).toBeLessThanOrEqual(center.clearDiameter);
  }
  const screenshot = testInfo.outputPath('angle-soft-sector-themes.png');
  await gallery.screenshot({ path: screenshot });
  await testInfo.attach('angle-soft-sector-themes', {
    path: screenshot,
    contentType: 'image/png',
  });
});

test('a dial connected inside a hidden panel fits its center value when revealed', async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testAngle.remove();
    const panel = document.createElement('div');
    panel.id = 'hidden-angle-panel';
    panel.hidden = true;
    const angle = document.createElement('dsk-angle');
    angle.id = 'revealed-angle';
    angle.unit = 'rad';
    angle.value = Math.PI * 1.5;
    angle.size = 144;
    panel.append(angle);
    document.body.prepend(panel);
  });
  const angle = page.locator('#revealed-angle');
  await expect(angle).toBeHidden();
  await page.locator('#hidden-angle-panel').evaluate((panel) => {
    if (!(panel instanceof HTMLElement)) throw new Error('Missing panel.');
    panel.hidden = false;
  });
  await expect(angle).toBeVisible();
  await expect(angle.locator('[part~="value"]')).toHaveText('4.712 rad');
  await expect
    .poll(() =>
      angle.locator('[part~="value"]').evaluate((output) => {
        if (!(output instanceof SVGTextElement))
          throw new Error('The center value is missing.');
        return output.getBBox().width;
      }),
    )
    .toBeLessThanOrEqual(80.1);
  const center = await angle.locator('[part~="value"]').evaluate((output) => {
    if (!(output instanceof SVGTextElement))
      throw new Error('The center value is missing.');
    const box = output.getBBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  expect(Math.abs(center.x - 120)).toBeLessThan(1);
  expect(Math.abs(center.y - 120)).toBeLessThan(1);
});

test('preserves standard HTML attributes and leaves Escape available outside a drag', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const angle = window.testAngle;
    angle.className = 'customer-angle';
    angle.title = 'Rotate object';
    angle.dataset.theme = 'custom';
    angle.focus();
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    angle.dispatchEvent(escape);
    return escape.defaultPrevented;
  });
  expect(result).toBe(false);
  const angle = page.locator('#angle-under-test');
  await expect(angle).toHaveClass('customer-angle');
  await expect(angle).toHaveAttribute('title', 'Rotate object');
  await expect(angle).toHaveAttribute('data-theme', 'custom');
  await page.evaluate(() => {
    window.testAngle.hidden = true;
  });
  await expect(angle).toBeHidden();
});

test('playground preserves physical angles, exposes optional bounds and resets to free rotation', async ({
  page,
}, testInfo) => {
  await page.evaluate(() => window.testAngle.remove());
  const lab = page.locator('.angle-lab');
  const demo = page.locator('#angle-demo');
  const minimum = page.locator('[name="angle-min"]');
  const maximum = page.locator('[name="angle-max"]');
  const mode = page.locator('#angle-range-note');
  const code = page.locator('#angle-code');
  await lab.scrollIntoViewIfNeeded();
  await expect(page.locator('#angle-current-value')).toHaveText('90°');
  await expect(mode).toContainText('Continuous rotation.');
  await page.locator('[name="angle-unit"]').selectOption('pi');
  expect(await demo.evaluate((angle: DskAngle) => angle.degrees)).toBeCloseTo(
    90,
    10,
  );
  await expect(page.locator('[name="angle-value"]')).toHaveValue('0.5');
  await expect(page.locator('#angle-current-value')).toHaveText('π/2');
  await minimum.fill('0.25');
  await maximum.fill('1.5');
  await expect(mode).toContainText('Bounded rotation.');
  await expect(code).toContainText('min="0.25"');
  await expect(code).toContainText('max="1.5"');
  await minimum.fill('');
  await expect(mode).toContainText('Bounded rotation.');
  await maximum.fill('');
  await expect(mode).toContainText('Continuous rotation.');
  await expect(code).not.toContainText('min=');
  await expect(code).not.toContainText('max=');
  await page.locator('[data-angle-preset="restricted"]').click();
  await expect(mode).toContainText('Bounded rotation.');
  await expect(minimum).toHaveValue('45');
  await expect(maximum).toHaveValue('270');
  await page.locator('#angle-reset').click();
  await expect(page.locator('[name="angle-unit"]')).toHaveValue('deg');
  await expect(page.locator('#angle-current-value')).toHaveText('90°');
  await expect(minimum).toHaveValue('');
  await expect(maximum).toHaveValue('');
  await expect(mode).toContainText('Continuous rotation.');
  await demo.evaluate((angle: DskAngle) => angle.focus());
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[name="angle-value"]')).toHaveValue('91');
  await expect(page.locator('#angle-count')).toHaveText('1');
  await expect(code).toContainText('value="91"');
  await page.locator('#angle-reset').click();
  const screenshot = testInfo.outputPath('angle-playground.png');
  await lab.screenshot({ path: screenshot });
  await testInfo.attach('angle-playground', {
    path: screenshot,
    contentType: 'image/png',
  });
});
