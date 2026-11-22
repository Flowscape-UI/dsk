import type {
  DskPanel,
  PanelDragEnd,
  PanelResizeDetail,
} from '@flowscape-ui/dsk';
import './panel-demo.css';

const panel = document.querySelector<DskPanel>('#panel-demo');
const side = document.querySelector<HTMLSelectElement>('#panel-side');
const output = document.querySelector<HTMLOutputElement>('#panel-output');
for (const attribute of ['min-size', 'max-size', 'offset', 'inset']) {
  const input = document.querySelector<HTMLInputElement>(`#panel-${attribute}`);
  input?.addEventListener('input', () => {
    if (!panel) return;
    if (!input.value) panel.removeAttribute(attribute);
    else if (input.validity.valid) panel.setAttribute(attribute, input.value);
  });
}
side?.addEventListener('change', () => {
  if (panel && side) panel.dragEnd = side.value as PanelDragEnd;
});
panel?.addEventListener('input', (event) => {
  if (event.target !== panel || !(event instanceof CustomEvent)) return;
  const { width, height } = (event as CustomEvent<PanelResizeDetail>).detail;
  if (output) output.value = `${Math.round(width)} × ${Math.round(height)} px`;
});
for (const attribute of ['disabled', 'readonly']) {
  document
    .querySelector<HTMLInputElement>(`#panel-${attribute}`)
    ?.addEventListener('change', (event) => {
      panel?.toggleAttribute(
        attribute,
        (event.currentTarget as HTMLInputElement).checked,
      );
    });
}
