import { test, expect } from '@playwright/test';
import type {
  DskListValue,
  ListToggleDetail,
  LayerReorderDetail,
} from '@flowscape-ui/dsk';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.body.innerHTML = `<dsk-layer-tree id="tree" aria-label="Layers">
      <dsk-list-value id="frame"><dsk-list-header>Frame</dsk-list-header>
        <span slot="expand-icon">+</span><span slot="collapse-icon">−</span>
        <dsk-list-value id="text" label="Text"></dsk-list-value>
        <dsk-list-value id="group" label="Group"><dsk-list-value id="image" label="Image"></dsk-list-value></dsk-list-value>
        <dsk-list-footer><button id="action">Add layer</button></dsk-list-footer>
      </dsk-list-value>
      <dsk-list-value id="locked" label="Locked" disabled></dsk-list-value>
      <dsk-list-value id="background" label="Background"></dsk-list-value>
    </dsk-layer-tree>`;
  });
});

test('declarative branches animate, expose custom slots and keep collapsed content inert', async ({
  page,
}) => {
  const frame = page.locator('#frame');
  await expect(page.getByRole('tree', { name: 'Layers' })).toHaveCount(1);
  await expect(
    page.getByRole('treeitem', { name: 'Frame', exact: true }),
  ).toHaveCount(1);
  expect(
    await frame.evaluate(
      (node) =>
        node
          .shadowRoot!.querySelector<HTMLSlotElement>('slot[name=header]')!
          .assignedElements()[0]?.textContent,
    ),
  ).toBe('Frame');
  await expect(page.locator('dsk-list-header')).toHaveAttribute(
    'slot',
    'header',
  );
  expect(
    await page.evaluate(
      () => document.querySelector<DskListValue>('#frame')!.expandable,
    ),
  ).toBe(true);
  await frame.locator('[part=row]').first().click();
  await expect(frame).toHaveAttribute('open', '');
  await expect(page.locator('#action')).toBeVisible();
  expect(
    await frame.evaluate(
      (node) =>
        getComputedStyle(node.shadowRoot!.querySelector('[part=children]')!)
          .transitionDuration,
    ),
  ).toBe('0.18s');
  await frame.press('ArrowLeft');
  await expect(frame).not.toHaveAttribute('open');
  expect(
    await frame.evaluate(
      (node) =>
        node.shadowRoot!.querySelector<HTMLElement>('[part=children]')!.inert,
    ),
  ).toBe(true);
  await expect
    .poll(() =>
      frame.evaluate(
        (node) =>
          node
            .shadowRoot!.querySelector('[part=children]')!
            .getBoundingClientRect().height,
      ),
    )
    .toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await frame.evaluate(
      (node) =>
        getComputedStyle(node.shadowRoot!.querySelector('[part=children]')!)
          .transitionDuration,
    ),
  ).toBe('0s');
});

test('playground renders a declarative tree with custom disclosure icons', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const tree = page.locator('#layer-tree-demo');
  const hero = tree.getByRole('treeitem', { name: 'Hero', exact: true });
  await hero.locator('[part=row]').first().click();
  await expect(hero).toHaveAttribute('open', '');
  await expect(hero.locator('[slot=collapse-icon]')).toBeVisible();
  await expect(
    tree.getByRole('treeitem', { name: 'Headline', exact: true }),
  ).toBeVisible();
  await tree.screenshot({
    path: testInfo.outputPath('layer-tree.png'),
    animations: 'disabled',
  });
});

test('keyboard traverses visible rows and returns focus to a collapsed parent', async ({
  page,
}) => {
  const frame = page.locator('#frame');
  await frame.focus();
  await frame.press('ArrowRight');
  await frame.press('ArrowRight');
  await expect(page.locator('#text')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#group')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#image')).toBeFocused();
  await page.evaluate(() => {
    document.querySelector<DskListValue>('#frame')!.open = false;
  });
  await expect(frame).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#background')).toBeFocused();
  await page.keyboard.press('Home');
  await expect(frame).toBeFocused();
  await page.keyboard.press(' ');
  await expect(frame).toHaveAttribute('open', '');
});

test('events, dynamic children and reconnect do not double toggle; footer actions stay independent', async ({
  page,
}) => {
  await page.evaluate(() => {
    const frame = document.querySelector<DskListValue>('#frame')!;
    frame.addEventListener('toggle', (event: Event) => {
      const { open } = (event as CustomEvent<ListToggleDetail>).detail;
      frame.dataset.lastToggle = String(open);
      frame.dataset.events = String(Number(frame.dataset.events ?? 0) + 1);
    });
    const tree = document.querySelector('dsk-layer-tree')!;
    tree.remove();
    document.body.append(tree);
  });
  await page.locator('#frame').press('Enter');
  await expect(page.locator('#frame')).toHaveAttribute('data-events', '1');
  await page.locator('#action').click();
  await expect(page.locator('#frame')).toHaveAttribute('open', '');
  await page.evaluate(() => {
    const child = document.createElement('dsk-list-value');
    child.label = 'New';
    child.id = 'new';
    document.querySelector('#background')!.append(child);
  });
  await page.locator('#background').press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#new')).toBeFocused();
});

test('drag keeps the source in place until drop and shows a line with a dot', async ({
  page,
}) => {
  await page.evaluate(() =>
    document.querySelector('#tree')!.addEventListener('reorder', (event) => {
      const detail = (event as CustomEvent<LayerReorderDetail>).detail;
      document
        .querySelector('#tree')!
        .setAttribute(
          'data-move',
          `${detail.item.id}:${detail.oldIndex}:${detail.newIndex}`,
        );
    }),
  );
  const source = await page
    .locator('#background')
    .locator('[part=row]')
    .boundingBox();
  const target = await page
    .locator('#frame')
    .locator('[part=row]')
    .first()
    .boundingBox();
  if (!source || !target) throw new Error('Missing rows');
  await page.mouse.move(source.x + 80, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + 90, source.y + source.height / 2, {
    steps: 3,
  });
  await page.mouse.move(target.x + 80, target.y + 2, { steps: 8 });
  await page.mouse.move(target.x + 81, target.y + 2);
  const line = page.locator('#tree').locator('[part=drop-indicator]');
  await expect(line).toBeVisible();
  expect(
    await line.evaluate(
      (node) => getComputedStyle(node, '::before').borderRadius,
    ),
  ).toBe('50%');
  expect(
    await page
      .locator('#tree > dsk-list-value')
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(['frame', 'locked', 'background']);
  await page.mouse.up();
  await expect(page.locator('#tree')).toHaveAttribute(
    'data-move',
    'background:2:0',
  );
  expect(
    await page
      .locator('#tree > dsk-list-value')
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(['background', 'frame', 'locked']);
  await expect(line).not.toBeVisible();
  await expect(page.locator('#background')).toBeFocused();
});

test('keyboard reorders whole branches, supports cancellation and can be disabled', async ({
  page,
}) => {
  await page.locator('#frame').focus();
  await page.keyboard.press('Alt+ArrowDown');
  expect(
    await page
      .locator('#tree > dsk-list-value')
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(['locked', 'frame', 'background']);
  await expect(page.locator('#frame #text')).toHaveCount(1);
  await page.evaluate(() =>
    document
      .querySelector('#tree')!
      .addEventListener('beforereorder', (event) => event.preventDefault(), {
        once: true,
      }),
  );
  await page.keyboard.press('Alt+ArrowDown');
  expect(
    await page
      .locator('#tree > dsk-list-value')
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(['locked', 'frame', 'background']);
  await page.evaluate(() => {
    document.querySelector('dsk-layer-tree')!.reorderable = false;
  });
  await page.keyboard.press('Alt+ArrowUp');
  expect(
    await page
      .locator('#tree > dsk-list-value')
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(['locked', 'frame', 'background']);
});

test('drag into a group and back out preserves children and reports both parents', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() =>
    document.querySelector('#tree')!.addEventListener('reorder', (event) => {
      const detail = (event as CustomEvent<LayerReorderDetail>).detail;
      document
        .querySelector('#tree')!
        .setAttribute(
          'data-parents',
          `${detail.oldParent.id}:${detail.parent.id}:${detail.position}`,
        );
    }),
  );
  const drag = async (sourceId: string, targetId: string, fraction: number) => {
    const source = await page
      .locator(sourceId)
      .locator('[part=row]')
      .first()
      .boundingBox();
    const target = await page
      .locator(targetId)
      .locator('[part=row]')
      .first()
      .boundingBox();
    if (!source || !target) throw new Error('Missing row');
    await page.mouse.move(source.x + 90, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(source.x + 100, source.y + source.height / 2, {
      steps: 3,
    });
    await page.mouse.move(target.x + 90, target.y + target.height * fraction, {
      steps: 8,
    });
    await page.mouse.move(target.x + 91, target.y + target.height * fraction);
  };
  await drag('#background', '#frame', 0.5);
  await expect(page.locator('[part=drop-indicator]')).toHaveAttribute(
    'data-inside',
    '',
  );
  await page.mouse.up();
  await expect(page.locator('#frame > #background')).toHaveCount(1);
  await expect(page.locator('#frame')).toHaveAttribute('open', '');
  await expect(page.locator('#tree')).toHaveAttribute(
    'data-parents',
    'tree:frame:inside',
  );
  await drag('#background', '#frame', 0.05);
  await expect(page.locator('[part=drop-indicator]')).not.toHaveAttribute(
    'data-inside',
  );
  await page.mouse.up();
  await expect(page.locator('#tree > #background')).toHaveCount(1);
  await expect(page.locator('#tree')).toHaveAttribute(
    'data-parents',
    'frame:tree:before',
  );
  await page.locator('#frame').focus();
  await page.keyboard.press('Alt+ArrowRight');
  await expect(page.locator('#background > #frame > #text')).toHaveCount(1);
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator('#tree > #frame > #text')).toHaveCount(1);
});

test('drag rejects cycles and disabled destination groups', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const tree = document.querySelector('dsk-layer-tree')!;
    const frame = document.querySelector<DskListValue>('#frame')!;
    frame.open = true;
    document.querySelector<DskListValue>('#group')!.open = true;
    const source = frame.shadowRoot!.querySelector<HTMLElement>('[part=row]')!;
    const dataTransfer = new DataTransfer();
    source.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        composed: true,
        dataTransfer,
      }),
    );
    const accepted: boolean[] = [];
    for (const id of ['image', 'locked']) {
      const row = document
        .getElementById(id)!
        .shadowRoot!.querySelector<HTMLElement>('[part=row]')!;
      const rect = row.getBoundingClientRect();
      const over = new DragEvent('dragover', {
        bubbles: true,
        composed: true,
        cancelable: true,
        dataTransfer,
        clientX: rect.left + 40,
        clientY: rect.top + rect.height / 2,
      });
      row.dispatchEvent(over);
      accepted.push(over.defaultPrevented);
      row.dispatchEvent(
        new DragEvent('drop', { bubbles: true, composed: true, dataTransfer }),
      );
    }
    source.dispatchEvent(
      new DragEvent('dragend', { bubbles: true, composed: true }),
    );
    return {
      accepted,
      parent: frame.parentElement?.id,
      visible: tree
        .shadowRoot!.querySelector('[part=drop-indicator]')!
        .matches(':popover-open'),
    };
  });
  expect(result).toEqual({
    accepted: [false, false],
    parent: 'tree',
    visible: false,
  });
});

test('disabled branches expand for inspection but cannot move or release their children', async ({
  page,
}) => {
  await page.evaluate(() => {
    const locked = document.querySelector<DskListValue>('#locked')!;
    const child = document.createElement('dsk-list-value');
    child.id = 'locked-child';
    child.label = 'Archived';
    locked.append(child);
  });
  await page.locator('#locked').locator('[part=row]').first().click();
  await expect(page.locator('#locked')).toHaveAttribute('open', '');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#locked-child')).toBeFocused();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator('#locked > #locked-child')).toHaveCount(1);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Alt+ArrowUp');
  expect(
    await page
      .locator('#tree > dsk-list-value')
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(['frame', 'locked', 'background']);
  await page.keyboard.press('Enter');
  await expect(page.locator('#locked')).not.toHaveAttribute('open');
  await page.keyboard.press(' ');
  await expect(page.locator('#locked')).toHaveAttribute('open', '');
  expect(
    await page.evaluate(() => {
      const row = document
        .querySelector('#locked')!
        .shadowRoot!.querySelector('[part=row]')!;
      const event = new DragEvent('dragstart', {
        bubbles: true,
        composed: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      });
      row.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
});

test('disabled descendants share opacity and can reorder only inside their boundary', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const locked = document.querySelector<DskListValue>('#locked')!;
    locked.innerHTML =
      '<dsk-list-value id="a" label="A"></dsk-list-value><dsk-list-value id="b" label="B"><dsk-list-value id="c" label="C"></dsk-list-value></dsk-list-value>';
    locked.open = true;
  });
  for (const id of ['locked', 'a', 'b', 'c']) {
    expect(
      await page
        .locator(`#${id}`)
        .evaluate(
          (node) =>
            getComputedStyle(node.shadowRoot!.querySelector('[part=row]')!)
              .opacity,
        ),
    ).toBe('0.45');
  }
  const a = await page.locator('#a').locator('[part=row]').boundingBox();
  const b = await page
    .locator('#b')
    .locator('[part=row]')
    .first()
    .boundingBox();
  if (!a || !b) throw new Error('Missing rows');
  await page.mouse.move(a.x + 80, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 90, a.y + a.height / 2, { steps: 3 });
  await page.mouse.move(b.x + 80, b.y + b.height - 2, { steps: 8 });
  await page.mouse.move(b.x + 81, b.y + b.height - 2);
  await expect(page.locator('[part=drop-indicator]')).toBeVisible();
  await page.mouse.up();
  expect(
    await page
      .locator('#locked > dsk-list-value')
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(['b', 'a']);
  await page.keyboard.press('Alt+ArrowRight');
  await expect(page.locator('#locked > #b > #a')).toHaveCount(1);
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator('#locked > #a')).toHaveCount(1);
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator('#locked > #a')).toHaveCount(1);
  await page.evaluate(() =>
    document.querySelector('#locked')!.removeAttribute('disabled'),
  );
  expect(
    await page
      .locator('#a')
      .evaluate(
        (node) =>
          getComputedStyle(node.shadowRoot!.querySelector('[part=row]')!)
            .opacity,
      ),
  ).toBe('1');
});

test('optional search reveals matching paths and restores visibility and expansion', async ({
  page,
}) => {
  await page.evaluate(() => {
    const search = document.createElement('dsk-tree-search');
    document.querySelector('#tree')!.prepend(search);
  });
  const search = page.locator('dsk-tree-search').locator('input');
  await search.fill('IMAGE');
  await expect(page.locator('#image')).toBeVisible();
  await expect(page.locator('#frame')).toHaveAttribute('open', '');
  await expect(page.locator('#group')).toHaveAttribute('open', '');
  await expect(page.locator('#text')).toBeHidden();
  await expect(page.locator('#background')).toBeHidden();
  await search.fill('no match');
  await expect(page.locator('#frame')).toBeHidden();
  await search.fill('');
  await expect(page.locator('#frame')).not.toHaveAttribute('open');
  await expect(page.locator('#group')).not.toHaveAttribute('open');
  await expect(page.locator('#background')).toBeVisible();
  await search.fill('text');
  await page.evaluate(() =>
    document.querySelector('dsk-tree-search')!.remove(),
  );
  await expect(page.locator('#background')).toBeVisible();
  await expect(page.locator('#frame')).not.toHaveAttribute('open');
});

test('double click renames in place; Enter commits, Escape cancels, header markup survives', async ({
  page,
}) => {
  const frame = page.locator('#frame');
  await frame.locator('[part=row]').first().dblclick();
  const editor = frame.locator('[part=editor]').first();
  await expect(editor).toBeFocused();
  await expect(editor).toHaveValue('Frame');
  await expect(frame).not.toHaveAttribute('open');
  await editor.fill('New frame');
  await editor.press('Enter');
  await expect(frame).toHaveAttribute('label', 'New frame');
  await expect(frame.locator('dsk-list-header')).toHaveText('New frame');
  await frame.press('F2');
  await editor.fill('Cancelled');
  await editor.press('Escape');
  await expect(frame).toHaveAttribute('label', 'New frame');
  await page.evaluate(() => {
    const header = document.querySelector('dsk-list-header')!;
    header.innerHTML =
      '<strong data-dsk-name>Styled</strong><span> Frame</span>';
  });
  await frame.press('F2');
  await expect(editor).toHaveValue('Styled');
  await editor.fill('Renamed');
  await editor.press('Tab');
  await expect(frame.locator('strong')).toHaveText('Renamed');
  await expect(frame.locator('dsk-list-header > span')).toHaveText(' Frame');
});

test('matching groups keep their descendants browsable during search', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => {
    const search = document.createElement('dsk-tree-search');
    document.querySelector('#tree')!.prepend(search);
    document.querySelector('#text')!.setAttribute('hidden', '');
  });
  const search = page.locator('dsk-tree-search input');
  await search.fill('Frame');
  await expect(page.locator('#frame')).not.toHaveAttribute('open');
  await page.locator('#frame').locator('[part=row]').first().click();
  await expect(page.locator('#group')).toBeVisible();
  await expect(page.locator('#text')).toBeHidden();
  await page.locator('#group').locator('[part=row]').first().click();
  await expect(page.locator('#image')).toBeVisible();
  await page.locator('#frame').locator('[part=row]').first().click();
  await expect(page.locator('#frame')).not.toHaveAttribute('open');
  await search.fill('Image');
  await expect(page.locator('#image')).toBeVisible();
  await search.fill('');
  await expect(page.locator('#frame')).not.toHaveAttribute('open');
  await expect(page.locator('#text')).toHaveAttribute('hidden', '');
});
