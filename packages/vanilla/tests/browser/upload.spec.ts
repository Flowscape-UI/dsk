import { test, expect } from '@playwright/test';
import type { DskInputUpload } from '@flowscape-ui/dsk';

test('upload accepts documents, rejects invalid types, and clears with events', async ({
  page,
}) => {
  await page.goto('/');
  const upload = page.locator('#upload-demo');
  await upload.evaluate((element) => {
    element.addEventListener('change', () =>
      element.setAttribute(
        'data-changes',
        String(Number(element.getAttribute('data-changes') ?? 0) + 1),
      ),
    );
    element.addEventListener('dsk-upload-reject', () =>
      element.setAttribute('data-rejected', 'true'),
    );
  });
  await upload.locator('input').setInputFiles({
    name: 'report.PDF',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF'),
  });
  await expect(upload.locator('[part=filename]')).toHaveText('report.PDF');
  await expect(upload).toHaveAttribute('data-changes', '1');
  await upload.locator('input').setInputFiles({
    name: 'app.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('test'),
  });
  await expect(upload).toHaveAttribute('data-rejected', 'true');
  await expect(upload.locator('[part=filename]')).toHaveText('report.PDF');
  await upload.locator('[part=clear]').click();
  await expect(upload.locator('[part=filename]')).toHaveText('Choose a file');
  await expect(upload).toHaveAttribute('data-changes', '2');
});

test('image previews survive reconnection, disabled blocks drops, keyboard opens picker', async ({
  page,
}) => {
  await page.goto('/');
  const upload = page.locator('#upload-demo');
  await upload.locator('input').setInputFiles({
    name: 'image.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
    ),
  });
  await expect(upload.locator('img')).toBeVisible();
  const original = await upload.locator('img').getAttribute('src');
  await upload.evaluate((element) => {
    const parent = element.parentElement!;
    element.remove();
    parent.append(element);
  });
  await expect(upload.locator('img')).toBeVisible();
  expect(await upload.locator('img').getAttribute('src')).not.toBe(original);
  await upload.evaluate((element: DskInputUpload) => {
    element.disabled = true;
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(['test'], 'new.pdf', { type: 'application/pdf' }),
    );
    element.dispatchEvent(
      new DragEvent('drop', { dataTransfer: transfer, bubbles: true }),
    );
  });
  await expect(upload.locator('[part=filename]')).toHaveText('image.svg');
  await expect(upload.locator('[part=button]')).toBeDisabled();
  await upload.evaluate((element: DskInputUpload) => {
    element.disabled = false;
  });
  await upload.locator('[part=button]').focus();
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('Enter');
  await (await chooser).setFiles([]);
});

test('drops enforce extension filters and reject multiple files without replacing the value', async ({
  page,
}) => {
  await page.goto('/');
  const upload = page.locator('#upload-demo');
  await upload.evaluate((element: DskInputUpload) => {
    element.accept = '.pdf';
    const transfer = new DataTransfer();
    transfer.items.add(new File(['report'], 'report.PDF'));
    element.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer }));
  });
  await expect(upload.locator('[part=filename]')).toHaveText('report.PDF');
  await upload.evaluate((element: DskInputUpload) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['a'], 'a.pdf'));
    transfer.items.add(new File(['b'], 'b.pdf'));
    element.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer }));
  });
  await expect(upload.locator('[part=filename]')).toHaveText('report.PDF');
  await expect(upload.locator('[part=status]')).toHaveText(
    'Choose one file at a time.',
  );
});
