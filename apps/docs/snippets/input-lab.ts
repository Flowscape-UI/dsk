import '@flowscape-ui/dsk';
import './input-lab.css';
import type { DskInput, DskPanZoom } from '@flowscape-ui/dsk';

/** Mount a framework-independent inspector and release its resources on teardown. */
export function mountInputLab(
  host: HTMLElement,
  locale: 'en' | 'ru' = 'en',
): () => void {
  const t = (en: string, ru: string) => (locale === 'ru' ? ru : en);
  const root = document.createElement('section');
  root.className = 'dsk-input-lab';
  root.innerHTML = `
    <div class="dsk-input-lab-controls">
      <fieldset><legend>dsk-input</legend>
        <label>X <dsk-input data-field="x" value="0" min="-100" max="100" tag="px" aria-label="X"></dsk-input></label>
        <label>Y <dsk-input data-field="y" value="0" min="-80" max="80" tag="px" aria-label="Y"></dsk-input></label>
      </fieldset>
      <fieldset><legend>dsk-input-group</legend>
        <dsk-input-group aria-label="Dimensions">
          <label>${t('Width', 'Ширина')} <dsk-input data-field="width" value="160" min="40" max="240" tag="px" aria-label="Width"></dsk-input></label>
          <label>${t('Height', 'Высота')} <dsk-input data-field="height" value="120" min="40" max="240" tag="px" aria-label="Height"></dsk-input></label>
        </dsk-input-group>
        <label class="dsk-input-lab-check"><input type="checkbox" data-option="linked"> ${t('Link dimensions', 'Связать размеры')}</label>
        <label class="dsk-input-lab-check"><input type="checkbox" data-option="mixed"> ${t('Show mixed values', 'Показывать разные значения')}</label>
      </fieldset>
      <fieldset><legend>dsk-input-hex</legend>
        <label>${t('Corner radius', 'Скругление')} <dsk-input-hex hex="2" value="18" min="00" max="50" aria-label="Corner radius"></dsk-input-hex></label>
        <small>${t('00–50 HEX = 0–80 px', '00–50 HEX = 0–80 px')}</small>
      </fieldset>
      <fieldset><legend>dsk-input-color</legend>
        <label>${t('Fill', 'Заливка')} <dsk-input-color format="8" alpha-mode="percent" value="FF007AFF" aria-label="Fill"></dsk-input-color></label>
      </fieldset>
      <fieldset><legend>dsk-input-upload</legend>
        <dsk-input-upload accept="image/*,.pdf,.doc,.docx,.txt" aria-label="Object asset"></dsk-input-upload>
        <small>${t('Images fill the object; documents update its label.', 'Изображение заполняет объект, документ меняет подпись.')}</small>
      </fieldset>
      <div class="dsk-input-lab-options">
        <label class="dsk-input-lab-check"><input type="checkbox" data-option="disabled"> disabled</label>
        <label class="dsk-input-lab-check"><input type="checkbox" data-option="readonly"> readonly</label>
        <label>${t('Alignment', 'Выравнивание')} <select data-option="positioning"><option>center</option><option>left</option><option>right</option></select></label>
        <label>${t('Drag response', 'Перетаскивание')} <select data-option="progression"><option>linear</option><option>exponential</option><option>logarithmic</option></select></label>
        <button type="button" data-reset>${t('Reset example', 'Сбросить пример')}</button>
      </div>
    </div>
    <div class="dsk-input-lab-preview">
      <dsk-pan-zoom aria-label="Input example canvas"><div class="dsk-input-lab-object"><img alt=""><span>dsk</span></div></dsk-pan-zoom>
      <div class="dsk-input-lab-toolbar"><span>${t('Pan · scroll to zoom', 'Перетаскивание · прокрутка для зума')}</span><button type="button" data-camera>${t('Center', 'По центру')}</button></div>
      <output class="dsk-input-lab-status" aria-live="polite"></output>
      <pre class="dsk-input-lab-state" aria-label="Object state"></pre>
    </div>`;
  host.append(root);
  const group = root.querySelector('dsk-input-group')!;
  const hex = root.querySelector('dsk-input-hex')!;
  const color = root.querySelector('dsk-input-color')!;
  const upload = root.querySelector('dsk-input-upload')!;
  const canvas = root.querySelector<DskPanZoom>('dsk-pan-zoom')!;
  const object = root.querySelector<HTMLElement>('.dsk-input-lab-object')!;
  const image = object.querySelector('img')!;
  const caption = object.querySelector('span')!;
  const status = root.querySelector('output')!;
  const stateView = root.querySelector('pre')!;
  const inputs = [...root.querySelectorAll<DskInput>('dsk-input')];
  const numeric = [...inputs, hex, color];
  const state = {
    x: 0,
    y: 0,
    width: 160,
    height: 120,
    radius: 24,
    fill: '#FF007AFF',
    file: '',
  };
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  let imageUrl: string | undefined;
  let commits = 0;
  const releaseImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = undefined;
    image.removeAttribute('src');
    image.hidden = true;
  };
  const render = () => {
    Object.assign(object.style, {
      left: `${state.x}px`,
      top: `${state.y}px`,
      width: `${state.width}px`,
      height: `${state.height}px`,
      borderRadius: `${state.radius}px`,
      backgroundColor: state.fill.slice(0, 7),
      opacity: String(parseInt(state.fill.slice(7, 9), 16) / 255),
    });
    stateView.textContent = JSON.stringify(state, null, 2);
  };
  const sync = () => {
    for (const field of inputs) {
      const key = field.dataset.field;
      if ((key === 'x' || key === 'y') && Number.isFinite(field.valueAsNumber))
        state[key] = field.valueAsNumber;
    }
    const [width, height] = group.storedValues;
    if (width && Number.isFinite(Number(width))) state.width = Number(width);
    if (height && Number.isFinite(Number(height)))
      state.height = Number(height);
    if (/^[0-9A-F]{2}$/.test(hex.value)) state.radius = parseInt(hex.value, 16);
    if (/^[0-9A-F]{8}$/.test(color.value)) state.fill = `#${color.value}`;
    render();
  };
  root.addEventListener('input', sync, options);
  root.addEventListener(
    'change',
    (event) => {
      if (
        !(event.target instanceof HTMLElement) ||
        !event.target.localName.startsWith('dsk-input')
      )
        return;
      sync();
      commits += 1;
      status.textContent = `${t('Committed edits', 'Подтверждённые изменения')}: ${commits}`;
    },
    options,
  );
  upload.addEventListener(
    'change',
    () => {
      releaseImage();
      const file = upload.file;
      state.file = file?.name ?? '';
      caption.textContent = file?.name ?? 'dsk';
      if (
        file &&
        (file.type.startsWith('image/') ||
          /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name))
      ) {
        imageUrl = URL.createObjectURL(file);
        image.src = imageUrl;
        image.hidden = false;
      }
      render();
    },
    options,
  );
  image.addEventListener('error', releaseImage, options);
  upload.addEventListener(
    'dsk-upload-reject',
    () => {
      status.textContent = t(
        'Choose one image, PDF, DOC, DOCX or TXT file.',
        'Выберите одно изображение, PDF, DOC, DOCX или TXT.',
      );
    },
    options,
  );
  root.querySelector('[data-option=linked]')!.addEventListener(
    'change',
    (event) => {
      group.linked = (event.currentTarget as HTMLInputElement).checked;
    },
    options,
  );
  root.querySelector('[data-option=mixed]')!.addEventListener(
    'change',
    (event) => {
      group.hasMixedValues = (event.currentTarget as HTMLInputElement).checked;
    },
    options,
  );
  for (const name of ['disabled', 'readonly', 'positioning', 'progression']) {
    root.querySelector(`[data-option=${name}]`)!.addEventListener(
      'change',
      (event) => {
        const target = event.currentTarget as
          HTMLInputElement | HTMLSelectElement;
        for (const field of numeric) {
          if (target instanceof HTMLInputElement)
            field.toggleAttribute(name, target.checked);
          else field.setAttribute(name, target.value);
        }
        if (name === 'disabled' && target instanceof HTMLInputElement)
          upload.disabled = target.checked;
      },
      options,
    );
  }
  const center = () => {
    canvas.camera = {
      panX: canvas.clientWidth / 2,
      panY: canvas.clientHeight / 2,
      zoom: 1,
    };
  };
  root
    .querySelector('[data-camera]')!
    .addEventListener('click', center, options);
  root.querySelector('[data-reset]')!.addEventListener(
    'click',
    () => {
      group.hasMixedValues = false;
      group.linked = false;
      for (const field of numeric) {
        field.disabled = false;
        field.readOnly = false;
        field.positioning = 'center';
        field.progression = 'linear';
      }
      inputs.forEach((field) => {
        field.value =
          field.dataset.field === 'width'
            ? 160
            : field.dataset.field === 'height'
              ? 120
              : 0;
      });
      hex.value = '18';
      color.value = 'FF007AFF';
      upload.disabled = false;
      upload.clear();
      root
        .querySelectorAll<HTMLInputElement>('input[type=checkbox]')
        .forEach((input) => {
          input.checked = false;
        });
      root.querySelectorAll('select').forEach((select) => {
        select.selectedIndex = 0;
      });
      releaseImage();
      state.file = '';
      caption.textContent = 'dsk';
      commits = 0;
      status.textContent = '';
      sync();
      center();
    },
    options,
  );
  releaseImage();
  render();
  return () => {
    listeners.abort();
    releaseImage();
    root.remove();
  };
}
