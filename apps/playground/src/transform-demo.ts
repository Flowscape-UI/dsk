import type { DskTransformBox } from '@flowscape-ui/dsk';
import logo from '@flowscape-ui/dsk/logo.svg?url';
import './transform-demo.css';
const box = document.querySelector<DskTransformBox>('#transform-demo')!;
const content = box.querySelector('dsk-transform-content')!;
const initial = { x: 80, y: 80, width: 240, height: 160, angle: 0 };
const output = document.querySelector<HTMLOutputElement>('#transform-output')!;
function sync(): void {
  output.value = JSON.stringify(box.value);
  for (const name of ['x', 'y', 'width', 'height', 'angle'] as const) {
    const input = document.querySelector<HTMLInputElement>(
      `#transform-${name}`,
    )!;
    if (document.activeElement !== input)
      input.value = String(Math.round(box[name] * 100) / 100);
  }
}
for (const name of ['x', 'y', 'width', 'height', 'angle'] as const) {
  document
    .querySelector<HTMLInputElement>(`#transform-${name}`)!
    .addEventListener('input', (event) => {
      const input = event.currentTarget as HTMLInputElement;
      if (input.value && input.validity.valid) {
        box[name] = input.valueAsNumber;
        sync();
      }
    });
}
for (const name of ['movable', 'disabled', 'readonly']) {
  document
    .querySelector<HTMLInputElement>(`#transform-${name}`)!
    .addEventListener('change', (event) => {
      const checked = (event.currentTarget as HTMLInputElement).checked;
      if (name === 'disabled' || name === 'readonly')
        box.toggleAttribute(name, checked);
      else box.setAttribute(name, String(checked));
    });
}
box.addEventListener('input', (event) => {
  if (event.target === box) sync();
});
document.querySelector('#transform-reset')!.addEventListener('click', () => {
  box.value = initial;
  sync();
});
document
  .querySelector('#transform-zoom')!
  .addEventListener('change', (event) => {
    document.querySelector<HTMLElement>('#transform-world')!.style.transform =
      `scale(${(event.currentTarget as HTMLSelectElement).value})`;
  });
document
  .querySelector('#transform-content')!
  .addEventListener('change', (event) => {
    const mode = (event.currentTarget as HTMLSelectElement).value;
    if (mode === 'image') {
      const image = document.createElement('img');
      image.src = logo;
      image.alt = 'DSK logo';
      image.draggable = false;
      content.replaceChildren(image);
    } else if (mode === 'form') {
      content.innerHTML =
        '<div class="transform-demo-card"><label>Title <input aria-label="Object title" value="Editable text" /></label><button type="button">Clicks: 0</button></div>';
      let count = 0;
      content.querySelector('button')!.addEventListener('click', (event) => {
        (event.currentTarget as HTMLButtonElement).textContent =
          `Clicks: ${++count}`;
      });
    } else
      content.innerHTML =
        '<div class="transform-demo-card"><strong>Your HTML</strong><p>Move, resize, rotate.</p></div>';
  });
sync();

const plain = document.querySelector<DskTransformBox>('#transform-no-header')!;
const plainOutput = document.querySelector<HTMLOutputElement>(
  '#transform-no-header-output',
)!;
const syncPlain = () => {
  plainOutput.value = JSON.stringify(plain.value);
};
plain.addEventListener('input', (event) => {
  if (event.target === plain) syncPlain();
});
document
  .querySelector('#transform-no-header-reset')!
  .addEventListener('click', () => {
    plain.x = 80;
    plain.y = 80;
    syncPlain();
  });
syncPlain();

document
  .querySelector<HTMLInputElement>('#transform-snap-angle')!
  .addEventListener('input', (event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value && input.validity.valid)
      box.snapAngle = input.valueAsNumber;
  });
let extraHandles = 0;
document
  .querySelector('#transform-add-rotate')!
  .addEventListener('click', () => {
    const handle = document.createElement('dsk-transform-box-handle-rotate');
    handle.className = 'transform-rotate-extra';
    handle.style.left = `${extraHandles++ * 30}px`;
    handle.setAttribute('aria-label', `Extra rotation handle ${extraHandles}`);
    handle.textContent = '↻';
    box.append(handle);
  });
