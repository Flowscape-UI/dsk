import '@flowscape-ui/dsk';
import './single-input.css';
import type {
  DskInput,
  DskInputHex,
  DskInputColor,
  DskInputUpload,
} from '@flowscape-ui/dsk';

export type InputExampleKind =
  | 'dsk-input'
  | 'dsk-input-hex'
  | 'dsk-input-color'
  | 'dsk-input-group'
  | 'dsk-input-upload';

/** Each instance owns its controls, preview, and resource cleanup. */
export function mountSingleInput(
  host: HTMLElement,
  kind: InputExampleKind,
  styled = false,
): () => void {
  const root = document.createElement('section');
  root.className = `dsk-single-input${styled ? ' dsk-single-input-custom' : ''}`;
  root.dataset.kind = kind;
  const markup: Record<InputExampleKind, string> = {
    'dsk-input':
      '<dsk-input value="120" min="40" max="200" step="1" tag="px" aria-label="Width"></dsk-input><label>Step <select data-option="step"><option>1</option><option>0.5</option><option>10</option></select></label><label><input type="checkbox" data-option="readonly"> readonly</label>',
    'dsk-input-hex':
      '<dsk-input-hex hex="6" value="557BE8" aria-label="HEX value"></dsk-input-hex><label>hex <select data-option="hex"><option>1</option><option>2</option><option>3</option><option selected>6</option><option>8</option></select></label>',
    'dsk-input-color':
      '<dsk-input-color format="8" value="FF007A80" aria-label="Fill"></dsk-input-color><label>alpha-mode <select data-option="alpha-mode"><option>hex</option><option>percent</option></select></label><label>format <select data-option="format"><option>6</option><option selected>8</option></select></label>',
    'dsk-input-group':
      '<dsk-input-group aria-label="Dimensions"><dsk-input value="120" min="40" max="200" aria-label="Width"></dsk-input><dsk-input value="80" min="40" max="200" aria-label="Height"></dsk-input></dsk-input-group><label><input type="checkbox" data-option="linked"> linked</label><label><input type="checkbox" data-option="has-mixed-values"> has-mixed-values</label>',
    'dsk-input-upload':
      '<dsk-input-upload accept="image/*,.pdf,.txt" aria-label="Asset"></dsk-input-upload><label>accept <select data-option="accept"><option value="image/*,.pdf,.txt">Images, PDF, TXT</option><option value="image/*">Images</option><option value=".pdf,.txt">PDF, TXT</option></select></label><label><input type="checkbox" data-option="disabled"> disabled</label>',
  };
  root.innerHTML = `<div class="dsk-single-input-controls">${markup[kind]}<output aria-live="polite"></output></div><dsk-pan-zoom aria-label="${kind} canvas"><div class="dsk-single-input-object"><img alt="" hidden><span>dsk</span></div></dsk-pan-zoom>`;
  host.append(root);
  const control = root.querySelector(kind)!;
  const object = root.querySelector<HTMLElement>('.dsk-single-input-object')!;
  const image = object.querySelector('img')!;
  const caption = object.querySelector('span')!;
  const output = root.querySelector('output')!;
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let url: string | undefined;
  const release = () => {
    if (url) URL.revokeObjectURL(url);
    url = undefined;
    image.removeAttribute('src');
    image.hidden = true;
  };
  const render = () => {
    if (kind === 'dsk-input') {
      const field = control as DskInput;
      if (Number.isFinite(field.valueAsNumber))
        object.style.width = `${field.valueAsNumber}px`;
      output.textContent = `value: ${field.value || '(empty)'}`;
    } else if (kind === 'dsk-input-group') {
      const group = root.querySelector('dsk-input-group')!;
      const [width, height] = group.storedValues;
      if (width && Number.isFinite(Number(width)))
        object.style.width = `${width}px`;
      if (height && Number.isFinite(Number(height)))
        object.style.height = `${height}px`;
      output.textContent = JSON.stringify({
        values: group.values,
        storedValues: group.storedValues,
      });
    } else if (kind === 'dsk-input-hex' || kind === 'dsk-input-color') {
      const field = control as DskInputHex | DskInputColor;
      const value = field.value;
      if (/^[0-9A-F]+$/.test(value) && [1, 2, 3, 6, 8].includes(value.length)) {
        const hex =
          value.length === 1
            ? value.repeat(6)
            : value.length === 2
              ? value.repeat(3)
              : value;
        object.style.backgroundColor = `#${hex}`;
      }
      output.textContent = `value: ${value || '(empty)'}; rank: ${field.valueAsNumber}`;
    } else {
      output.textContent = `file: ${(control as DskInputUpload).file?.name ?? '(empty)'}`;
    }
  };
  root.addEventListener('input', render, options);
  root.addEventListener('change', render, options);
  root
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-option]')
    .forEach((option) => {
      option.addEventListener(
        'change',
        () => {
          const attribute = option.dataset.option!;
          if (option instanceof HTMLInputElement)
            control.toggleAttribute(attribute, option.checked);
          else control.setAttribute(attribute, option.value);
          render();
        },
        options,
      );
    });
  if (kind === 'dsk-input-upload') {
    control.addEventListener(
      'change',
      () => {
        release();
        const file = (control as DskInputUpload).file;
        caption.textContent = file?.name ?? 'dsk';
        if (file && file.type.startsWith('image/')) {
          url = URL.createObjectURL(file);
          image.src = url;
          image.hidden = false;
        }
        render();
      },
      options,
    );
    control.addEventListener(
      'dsk-upload-reject',
      () => {
        output.textContent = 'File rejected. Check accept; choose one file.';
      },
      options,
    );
    image.addEventListener('error', release, options);
  }
  render();
  return () => {
    listeners.abort();
    release();
    root.remove();
  };
}
