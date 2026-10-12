import logo from '@flowscape-ui/dsk/logo.svg?url';
import {
  DskAngle,
  DskCurve,
  DskInput,
  DskInputHex,
  DskInputColor,
  DskColorHue,
  DskColorAlpha,
  DskColorArea,
  DskColorEyedropper,
  type EyeDropperErrorDetail,
  type Progression,
} from '@flowscape-ui/dsk';
import './style.css';
import './theme.ts';
import './input-group-demo.ts';
import './ruler-demo.ts';

const brandLogo = document.querySelector<HTMLImageElement>('.brand-mark');
if (brandLogo) brandLogo.src = logo;
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = logo;
document.head.append(favicon);

function requireElement<T extends Element>(
  selector: string,
  elementType: new () => T,
): T {
  const element = document.querySelector(selector);
  if (!(element instanceof elementType)) {
    throw new Error(`Missing or invalid playground element: ${selector}`);
  }
  return element;
}

const demo = requireElement('#demo', DskInput);
const settings = requireElement('#settings', HTMLFormElement);
const code = requireElement('#code', HTMLElement);
const events = requireElement('#events', HTMLOListElement);
const curveNote = requireElement('#curve-note', HTMLElement);
const currentValue = requireElement('#current-value', HTMLElement);
const changeCount = requireElement('#change-count', HTMLElement);
const attributes = [
  'min',
  'max',
  'value',
  'placeholder',
  'src',
  'step',
  'key-horizontal-step',
  'key-vertical-step',
  'progression',
  'positioning',
  'tag',
  'tag-position',
  'tag-gap',
] as const;
type InputAttribute = (typeof attributes)[number];
type Preset = Partial<Record<InputAttribute, string>>;
const attributeDefaults: Preset = {
  progression: 'linear',
  positioning: 'center',
  'tag-position': 'right',
  'tag-gap': '4px',
};

const presets = {
  basic: { value: '40', min: '0', max: '100', step: '1' },
  decimal: { value: '0.5', min: '0', max: '1', step: '0.01' },
  unbounded: { value: '0', step: '1' },
  empty: { placeholder: 'Enter a number', step: '1' },
} satisfies Record<string, Preset>;
type PresetName = keyof typeof presets;
const flags = [
  'disabled',
  'readonly',
  'select-on-focus',
  'loopafter',
  'loopafter-min',
  'loopafter-max',
] as const;

const curveNotes = {
  linear: 'Constant sensitivity. Every 4 px changes the value by one step.',
  exponential: 'Starts gently, then accelerates as you drag farther.',
  logarithmic:
    'Starts gently, then slows down for finer adjustments over a long drag.',
} satisfies Record<Progression, string>;
let commits = 0;

function setting(name: string): HTMLInputElement | HTMLSelectElement {
  const field = settings.elements.namedItem(name);
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  )) {
    throw new Error(`Missing or invalid playground setting: ${name}`);
  }
  return field;
}

function checkbox(name: string): HTMLInputElement {
  const field = setting(name);
  if (!(field instanceof HTMLInputElement) || field.type !== 'checkbox') {
    throw new Error(`Missing or invalid playground checkbox: ${name}`);
  }
  return field;
}

function isPresetName(name: string | undefined): name is PresetName {
  return name !== undefined && Object.hasOwn(presets, name);
}

function isProgression(value: string): value is Progression {
  return Object.hasOwn(curveNotes, value);
}

function render(): void {
  currentValue.textContent = demo.value === '' ? 'Empty' : demo.value;
  changeCount.textContent = String(commits);
  const escape = (value: string): string =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  const entries = attributes.flatMap((name) => {
    const value = demo.getAttribute(name);
    return value === null ? [] : ['  ' + name + '="' + escape(value) + '"'];
  });
  for (const name of flags) {
    if (demo.hasAttribute(name)) entries.push('  ' + name);
  }
  entries.push('  aria-label="Value"');
  code.textContent = '<dsk-input\n' + entries.join('\n') + '\n></dsk-input>';
  const progression = demo.progression;
  curveNote.textContent = isProgression(progression)
    ? curveNotes[progression]
    : curveNotes.linear;
}

function clearEvents(): void {
  events.replaceChildren();
  const empty = document.createElement('li');
  empty.className = 'empty-log';
  empty.textContent = 'Interact with the input to see events.';
  events.append(empty);
  commits = 0;
  render();
}

function applyPreset(name: PresetName): void {
  const preset: Preset = presets[name];
  for (const attr of [...attributes, ...flags]) demo.removeAttribute(attr);
  for (const [attr, value] of Object.entries(preset)) {
    if (attr !== 'value') demo.setAttribute(attr, value);
  }
  // Apply the value after the bounds so a previous preset cannot clamp it.
  demo.value = preset.value || '';
  for (const attr of attributes) {
    setting(attr).value =
      demo.getAttribute(attr) || attributeDefaults[attr] || '';
  }
  for (const flag of flags) checkbox(flag).checked = false;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-preset]',
  )) {
    button.setAttribute('aria-pressed', String(button.dataset.preset === name));
  }
  clearEvents();
}

settings.addEventListener('submit', (event) => event.preventDefault());
settings.addEventListener('change', (event) => {
  const field = event.target;
  if (field instanceof HTMLInputElement && field.name === 'value') {
    field.value = demo.value;
  }
});
settings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  ))
    return;
  if (!field.name) return;
  for (const button of document.querySelectorAll('[data-preset]'))
    button.setAttribute('aria-pressed', 'false');
  if (field instanceof HTMLInputElement && field.type === 'checkbox')
    demo.toggleAttribute(field.name, field.checked);
  else if (field.value === '') demo.removeAttribute(field.name);
  else demo.setAttribute(field.name, field.value);
  if (field.name !== 'value') setting('value').value = demo.value;
  render();
});

for (const type of ['input', 'change']) {
  demo.addEventListener(type, () => {
    if (type === 'change') commits++;
    events.querySelector('.empty-log')?.remove();
    const entry = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'event-type ' + type;
    label.textContent = type;
    const value = document.createElement('code');
    value.textContent = demo.value === '' ? '(empty)' : demo.value;
    entry.append(label, value);
    events.prepend(entry);
    while (events.children.length > 8) events.lastElementChild?.remove();
    setting('value').value = demo.value;
    render();
  });
}
requireElement('#reset', HTMLButtonElement).addEventListener('click', () =>
  applyPreset('basic'),
);
requireElement('#clear-events', HTMLButtonElement).addEventListener(
  'click',
  clearEvents,
);
document
  .querySelectorAll<HTMLButtonElement>('[data-preset]')
  .forEach((button) => {
    const name = button.dataset.preset;
    if (!isPresetName(name))
      throw new Error(`Unknown playground preset: ${name}`);
    button.addEventListener('click', () => applyPreset(name));
  });
requireElement('#demo-label', HTMLLabelElement).addEventListener('click', () =>
  demo.focus(),
);
render();

const hexDemo = requireElement('#hex-demo', DskInputHex);
const hexSettings = requireElement('#hex-settings', HTMLFormElement);
const hexCode = requireElement('#hex-code', HTMLElement);
const hexEvents = requireElement('#hex-events', HTMLOListElement);
const hexCurrentValue = requireElement('#hex-current-value', HTMLElement);
const hexChangeCount = requireElement('#hex-change-count', HTMLElement);
const hexFormatNote = requireElement('#hex-format-note', HTMLElement);
const hexAttributes = ['hex', 'value', 'min', 'max', 'step', 'src'] as const;
const hexFlags = ['loopafter', 'select-on-focus'] as const;
let hexCommits = 0;

function hexSetting(name: string): HTMLInputElement | HTMLSelectElement {
  const field = hexSettings.elements.namedItem(name);
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  )) {
    throw new Error(`Missing or invalid HEX playground setting: ${name}`);
  }
  return field;
}

function renderHex(): void {
  hexCurrentValue.textContent = hexDemo.value || 'Empty';
  hexChangeCount.textContent = String(hexCommits);
  const formats = {
    1: 'One channel uses one HEX digit.',
    2: 'One channel uses two HEX digits.',
    3: 'RGB uses one HEX digit per channel.',
    6: 'RGB uses two HEX digits per channel.',
    8: 'RGBA uses two HEX digits per channel.',
  };
  hexFormatNote.textContent =
    formats[hexDemo.hex] +
    ' Format changes preserve channels; values that cannot narrow exactly become empty.';
  const escape = (value: string): string =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  const entries = hexAttributes.flatMap((name) => {
    const value = hexDemo.getAttribute(name);
    return value === null ? [] : ['  ' + name + '="' + escape(value) + '"'];
  });
  for (const flag of hexFlags) {
    if (hexDemo.hasAttribute(flag)) entries.push('  ' + flag);
  }
  entries.push('  aria-label="HEX preview value"');
  hexCode.textContent =
    '<dsk-input-hex\n' + entries.join('\n') + '\n></dsk-input-hex>';
}

function clearHexEvents(): void {
  const empty = document.createElement('li');
  empty.className = 'empty-log';
  empty.textContent = 'Interact with the HEX input to see events.';
  hexEvents.replaceChildren(empty);
  hexCommits = 0;
  renderHex();
}

hexSettings.addEventListener('submit', (event) => event.preventDefault());
hexSettings.addEventListener('change', (event) => {
  const field = event.target;
  if (field instanceof HTMLInputElement && field.name === 'hex-value') {
    field.value = hexDemo.value;
  }
});
hexSettings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  ))
    return;
  const attribute =
    field.name === 'hex-format' ? 'hex' : field.name.replace(/^hex-/, '');
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    hexDemo.toggleAttribute(attribute, field.checked);
  } else if (field.value === '') {
    hexDemo.removeAttribute(attribute);
  } else {
    hexDemo.setAttribute(attribute, field.value);
  }
  if (attribute !== 'value') hexSetting('hex-value').value = hexDemo.value;
  renderHex();
});

for (const type of ['input', 'change']) {
  hexDemo.addEventListener(type, () => {
    if (type === 'change') hexCommits++;
    hexEvents.querySelector('.empty-log')?.remove();
    const entry = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'event-type ' + type;
    label.textContent = type;
    const value = document.createElement('code');
    value.textContent = hexDemo.value || '(empty)';
    entry.append(label, value);
    hexEvents.prepend(entry);
    while (hexEvents.children.length > 8) hexEvents.lastElementChild?.remove();
    hexSetting('hex-value').value = hexDemo.value;
    renderHex();
  });
}

requireElement('#hex-reset', HTMLButtonElement).addEventListener(
  'click',
  () => {
    for (const attribute of [...hexAttributes, ...hexFlags])
      hexDemo.removeAttribute(attribute);
    hexDemo.setAttribute('hex', '6');
    hexDemo.value = 'FE0000';
    for (const attribute of hexAttributes) {
      const name = attribute === 'hex' ? 'hex-format' : 'hex-' + attribute;
      hexSetting(name).value = hexDemo.getAttribute(attribute) || '';
    }
    for (const flag of hexFlags) {
      const field = hexSetting('hex-' + flag);
      if (field instanceof HTMLInputElement) field.checked = false;
    }
    clearHexEvents();
  },
);
requireElement('#hex-clear-events', HTMLButtonElement).addEventListener(
  'click',
  clearHexEvents,
);
requireElement('#hex-demo-label', HTMLLabelElement).addEventListener(
  'click',
  () => hexDemo.focus(),
);
renderHex();

const colorDemo = requireElement('#color-demo', DskInputColor);
const colorSettings = requireElement('#color-settings', HTMLFormElement);
const colorCode = requireElement('#color-code', HTMLElement);
const colorEvents = requireElement('#color-events', HTMLOListElement);
const colorCurrentValue = requireElement('#color-current-value', HTMLElement);
const colorChangeCount = requireElement('#color-change-count', HTMLElement);
const colorFormatNote = requireElement('#color-format-note', HTMLElement);
const colorAttributes = [
  'format',
  'alpha-mode',
  'value',
  'min',
  'max',
  'step',
  'src',
] as const;
const colorFlags = ['loopafter', 'select-on-focus'] as const;
let colorCommits = 0;

function colorSetting(name: string): HTMLInputElement | HTMLSelectElement {
  const field = colorSettings.elements.namedItem(name);
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  )) {
    throw new Error(`Missing or invalid color playground setting: ${name}`);
  }
  return field;
}

function renderColor(): void {
  colorCurrentValue.textContent = colorDemo.value || 'Empty';
  colorChangeCount.textContent = String(colorCommits);
  colorFormatNote.textContent =
    colorDemo.format === 8
      ? 'RGBA includes alpha. Switching to RGB removes alpha; switching back adds opaque alpha (FF).'
      : 'RGB is opaque. Switching to RGBA adds alpha FF so the color stays opaque.';
  const escape = (value: string): string =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  const entries = colorAttributes.flatMap((name) => {
    const value = colorDemo.getAttribute(name);
    return value === null ? [] : ['  ' + name + '="' + escape(value) + '"'];
  });
  for (const flag of colorFlags) {
    if (colorDemo.hasAttribute(flag)) entries.push('  ' + flag);
  }
  entries.push('  aria-label="Color preview value"');
  colorCode.textContent =
    '<dsk-input-color\n' + entries.join('\n') + '\n></dsk-input-color>';
}

function clearColorEvents(): void {
  const empty = document.createElement('li');
  empty.className = 'empty-log';
  empty.textContent = 'Interact with the color input to see events.';
  colorEvents.replaceChildren(empty);
  colorCommits = 0;
  renderColor();
}

function syncColorSettings(): void {
  for (const attribute of colorAttributes) {
    colorSetting('color-' + attribute).value =
      attribute === 'format'
        ? String(colorDemo.format)
        : attribute === 'alpha-mode'
          ? colorDemo.alphaMode
          : colorDemo.getAttribute(attribute) || '';
  }
  for (const flag of colorFlags) {
    const field = colorSetting('color-' + flag);
    if (field instanceof HTMLInputElement)
      field.checked = colorDemo.hasAttribute(flag);
  }
}

colorSettings.addEventListener('submit', (event) => event.preventDefault());
colorSettings.addEventListener('change', (event) => {
  const field = event.target;
  if (field instanceof HTMLInputElement && field.name === 'color-value') {
    field.value = colorDemo.value;
  }
});
colorSettings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  ))
    return;
  const attribute = field.name.replace(/^color-/, '');
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    colorDemo.toggleAttribute(attribute, field.checked);
  } else if (field.value === '') {
    colorDemo.removeAttribute(attribute);
  } else {
    colorDemo.setAttribute(attribute, field.value);
  }
  if (attribute !== 'value')
    colorSetting('color-value').value = colorDemo.value;
  renderColor();
});

for (const type of ['input', 'change']) {
  colorDemo.addEventListener(type, () => {
    if (type === 'change') colorCommits++;
    colorEvents.querySelector('.empty-log')?.remove();
    const entry = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'event-type ' + type;
    label.textContent = type;
    const value = document.createElement('code');
    value.textContent = colorDemo.value || '(empty)';
    entry.append(label, value);
    colorEvents.prepend(entry);
    while (colorEvents.children.length > 8)
      colorEvents.lastElementChild?.remove();
    colorSetting('color-value').value = colorDemo.value;
    renderColor();
  });
}

requireElement('#color-reset', HTMLButtonElement).addEventListener(
  'click',
  () => {
    for (const attribute of [...colorAttributes, ...colorFlags])
      colorDemo.removeAttribute(attribute);
    colorDemo.format = 8;
    colorDemo.value = '557BE880';
    syncColorSettings();
    clearColorEvents();
  },
);
document
  .querySelectorAll<HTMLButtonElement>('[data-color-value]')
  .forEach((button) => {
    button.addEventListener('click', () => {
      colorDemo.removeAttribute('min');
      colorDemo.removeAttribute('max');
      colorDemo.removeAttribute('src');
      colorDemo.format = 8;
      colorDemo.value = button.dataset.colorValue || '';
      syncColorSettings();
      clearColorEvents();
    });
  });
requireElement('#color-clear-events', HTMLButtonElement).addEventListener(
  'click',
  clearColorEvents,
);
requireElement('#color-demo-label', HTMLLabelElement).addEventListener(
  'click',
  () => colorDemo.focus(),
);
renderColor();

const areaDemo = requireElement('#area-demo', DskColorArea);
const areaSettings = requireElement('#area-settings', HTMLFormElement);
const areaCode = requireElement('#area-code', HTMLElement);
const areaEvents = requireElement('#area-events', HTMLOListElement);
const areaCurrentColor = requireElement('#area-current-color', HTMLElement);
const areaSwatch = requireElement('#area-swatch', HTMLElement);
const areaChangeCount = requireElement('#area-change-count', HTMLElement);
const areaAttributes = [
  'hue',
  'saturation',
  'brightness',
  'width',
  'height',
  'step',
] as const;
const areaFlags = ['disabled', 'readonly'] as const;
let areaCommits = 0;

function areaSetting(name: string): HTMLInputElement {
  const field = areaSettings.elements.namedItem('area-' + name);
  if (!(field instanceof HTMLInputElement)) {
    throw new Error(`Missing or invalid color area setting: ${name}`);
  }
  return field;
}

function renderArea(): void {
  areaCurrentColor.textContent = areaDemo.color;
  areaSwatch.style.backgroundColor = areaDemo.color;
  areaChangeCount.textContent = String(areaCommits);
  const escape = (value: string): string =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  const entries = areaAttributes.flatMap((name) => {
    const value = areaDemo.getAttribute(name);
    return value === null ? [] : ['  ' + name + '="' + escape(value) + '"'];
  });
  for (const flag of areaFlags) {
    if (areaDemo.hasAttribute(flag)) entries.push('  ' + flag);
  }
  entries.push('  aria-label="Fill color"');
  areaCode.textContent =
    '<dsk-color-area\n' + entries.join('\n') + '\n></dsk-color-area>';
}

function syncAreaSettings(): void {
  for (const attribute of areaAttributes) {
    areaSetting(attribute).value = areaDemo.getAttribute(attribute) || '';
  }
  areaSetting('hue').value = String(areaDemo.hue);
  areaSetting('saturation').value = String(areaDemo.saturation);
  areaSetting('brightness').value = String(areaDemo.brightness);
  for (const flag of areaFlags) {
    areaSetting(flag).checked = areaDemo.hasAttribute(flag);
  }
}

function clearAreaEvents(): void {
  const empty = document.createElement('li');
  empty.className = 'empty-log';
  empty.textContent = 'Select a color to see events.';
  areaEvents.replaceChildren(empty);
  areaCommits = 0;
  renderArea();
}

areaSettings.addEventListener('submit', (event) => event.preventDefault());
areaSettings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement)) return;
  const attribute = field.name.replace(/^area-/, '');
  if (field.type === 'checkbox') {
    areaDemo.toggleAttribute(attribute, field.checked);
  } else if (field.value === '') {
    areaDemo.removeAttribute(attribute);
  } else {
    areaDemo.setAttribute(attribute, field.value);
  }
  renderArea();
});
areaSettings.addEventListener('change', syncAreaSettings);

for (const type of ['input', 'change']) {
  areaDemo.addEventListener(type, () => {
    if (type === 'change') areaCommits++;
    areaEvents.querySelector('.empty-log')?.remove();
    const entry = document.createElement('li');
    const label = document.createElement('span');
    label.className = 'event-type ' + type;
    label.textContent = type;
    const value = document.createElement('code');
    value.textContent = areaDemo.color;
    entry.append(label, value);
    areaEvents.prepend(entry);
    while (areaEvents.children.length > 8)
      areaEvents.lastElementChild?.remove();
    syncAreaSettings();
    renderArea();
  });
}

requireElement('#area-reset', HTMLButtonElement).addEventListener(
  'click',
  () => {
    for (const attribute of [...areaAttributes, ...areaFlags]) {
      areaDemo.removeAttribute(attribute);
    }
    areaDemo.hue = 60;
    areaDemo.saturation = 15;
    areaDemo.brightness = 78;
    syncAreaSettings();
    clearAreaEvents();
  },
);
requireElement('#area-clear-events', HTMLButtonElement).addEventListener(
  'click',
  clearAreaEvents,
);
requireElement('#area-demo-label', HTMLLabelElement).addEventListener(
  'click',
  () => areaDemo.focus(),
);
renderArea();

const hueDemo = requireElement('#hue-demo', DskColorHue);
const alphaDemo = requireElement('#alpha-demo', DskColorAlpha);
const linkedArea = requireElement('#linked-area', DskColorArea);
const sliderSettings = requireElement('#slider-settings', HTMLFormElement);
const sliderEvents = requireElement('#slider-events', HTMLOListElement);
const sliderCode = requireElement('#slider-code', HTMLElement);
const sliderHue = requireElement('#slider-hue', HTMLInputElement);
const sliderAlpha = requireElement('#slider-alpha', HTMLInputElement);
let sliderCommits = 0;

function renderSliders(): void {
  requireElement('#slider-rgba', HTMLElement).textContent = alphaDemo.rgba;
  requireElement('#slider-swatch', HTMLElement).style.setProperty(
    '--selected-color',
    alphaDemo.rgba,
  );
  requireElement('#slider-count', HTMLElement).textContent =
    String(sliderCommits);
  sliderCode.textContent = `<dsk-color-hue hue="${hueDemo.hue}" step="${hueDemo.step}" width="${hueDemo.width}"${hueDemo.disabled ? ' disabled' : ''}${hueDemo.readOnly ? ' readonly' : ''}></dsk-color-hue>\n\n<dsk-color-alpha color="${alphaDemo.color}" alpha="${alphaDemo.alpha}" step="${alphaDemo.step}" width="${alphaDemo.width}"${alphaDemo.disabled ? ' disabled' : ''}${alphaDemo.readOnly ? ' readonly' : ''}></dsk-color-alpha>`;
}

function syncSliderColor(): void {
  linkedArea.hue = hueDemo.hue;
  alphaDemo.color = linkedArea.color;
}

sliderSettings.addEventListener('submit', (event) => event.preventDefault());
sliderSettings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement)) return;
  switch (field.id) {
    case 'slider-hue':
      hueDemo.hue = field.value;
      syncSliderColor();
      break;
    case 'slider-alpha':
      alphaDemo.alpha = field.value;
      break;
    case 'slider-hue-step':
      hueDemo.step = field.value;
      break;
    case 'slider-alpha-step':
      alphaDemo.step = field.value;
      break;
    case 'slider-width':
      hueDemo.width = field.value;
      alphaDemo.width = field.value;
      linkedArea.width = field.value;
      break;
    case 'slider-disabled':
      hueDemo.disabled = field.checked;
      alphaDemo.disabled = field.checked;
      break;
    case 'slider-readonly':
      hueDemo.readOnly = field.checked;
      alphaDemo.readOnly = field.checked;
      break;
  }
  renderSliders();
});
sliderSettings.addEventListener('change', () => {
  sliderHue.value = String(hueDemo.hue);
  sliderAlpha.value = String(alphaDemo.alpha);
});
linkedArea.addEventListener('input', () => {
  alphaDemo.color = linkedArea.color;
  renderSliders();
});
for (const slider of [hueDemo, alphaDemo]) {
  for (const type of ['input', 'change']) {
    slider.addEventListener(type, () => {
      if (slider === hueDemo) syncSliderColor();
      sliderHue.value = String(hueDemo.hue);
      sliderAlpha.value = String(alphaDemo.alpha);
      if (type === 'change') sliderCommits++;
      sliderEvents.querySelector('.empty-log')?.remove();
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.className = `event-type ${type}`;
      label.textContent = `${slider === hueDemo ? 'hue' : 'alpha'} ${type}`;
      const value = document.createElement('code');
      value.textContent = alphaDemo.rgba;
      item.append(label, value);
      sliderEvents.prepend(item);
      while (sliderEvents.children.length > 8)
        sliderEvents.lastElementChild?.remove();
      renderSliders();
    });
  }
}
requireElement('#slider-clear', HTMLButtonElement).addEventListener(
  'click',
  () => {
    sliderEvents.replaceChildren();
    sliderCommits = 0;
    renderSliders();
  },
);
syncSliderColor();
renderSliders();

const eyedropperDemo = requireElement('#eyedropper-demo', DskColorEyedropper);
const eyedropperSettings = requireElement(
  '#eyedropper-settings',
  HTMLFormElement,
);
const eyedropperCode = requireElement('#eyedropper-code', HTMLElement);
const eyedropperEvents = requireElement('#eyedropper-events', HTMLOListElement);
const eyedropperMode = requireElement('#eyedropper-mode', HTMLSelectElement);
const eyedropperPageOptions = requireElement(
  '#eyedropper-page-options',
  HTMLFieldSetElement,
);
const eyedropperShape = requireElement('#eyedropper-shape', HTMLSelectElement);
const eyedropperCanvas = requireElement(
  '#eyedropper-canvas',
  HTMLCanvasElement,
);
const eyedropperForeground = requireElement(
  '#eyedropper-foreground',
  HTMLCanvasElement,
);
const eyedropperHint = requireElement('#eyedropper-hint', HTMLElement);
const eyedropperZoom = requireElement('#eyedropper-zoom', HTMLElement);
const eyedropperCanvasListeners = new AbortController();
const eyedropperCanvasContext = eyedropperCanvas.getContext('2d');
const eyedropperForegroundContext = eyedropperForeground.getContext('2d');
if (!eyedropperCanvasContext || !eyedropperForegroundContext)
  throw new Error('Canvas rendering is unavailable');
const eyedropperView = { zoom: 1, x: 0, y: 0 };
let eyedropperPan: { pointerId: number; x: number; y: number } | null = null;
let eyedropperSpace = false;
let eyedropperCommits = 0;
let eyedropperError = '';

eyedropperDemo.registerMode('editor', {
  label: 'Editor / composite',
  isSupported: () => eyedropperCanvas.isConnected,
  createSession: ({ signal }) => {
    const patch = document.createElement('canvas');
    const context = patch.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas sampling is unavailable');
    return {
      sample: ({ x, y, size, signal: sampleSignal }) => {
        if (
          signal.aborted ||
          sampleSignal.aborted ||
          !eyedropperCanvas.isConnected
        )
          return null;
        const bounds = eyedropperCanvas.getBoundingClientRect();
        if (
          bounds.width <= 0 ||
          bounds.height <= 0 ||
          x < bounds.left ||
          x >= bounds.right ||
          y < bounds.top ||
          y >= bounds.bottom
        )
          return null;
        const centerX = Math.floor(
          ((x - bounds.left) * eyedropperCanvas.width) / bounds.width,
        );
        const centerY = Math.floor(
          ((y - bounds.top) * eyedropperCanvas.height) / bounds.height,
        );
        const half = (size - 1) / 2;
        if (patch.width !== size || patch.height !== size) {
          patch.width = size;
          patch.height = size;
        }
        context.fillStyle = '#fff';
        context.fillRect(0, 0, size, size);
        context.drawImage(eyedropperCanvas, half - centerX, half - centerY);
        context.drawImage(eyedropperForeground, half - centerX, half - centerY);
        return context.getImageData(0, 0, size, size);
      },
      dispose: () => {
        patch.width = 1;
        patch.height = 1;
      },
    };
  },
});

function drawEyedropperCanvas(): void {
  if (!eyedropperCanvas.isConnected) return;
  const context = eyedropperCanvasContext;
  if (!context) return;
  const { width, height } = eyedropperCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (
    eyedropperCanvas.width !== pixelWidth ||
    eyedropperCanvas.height !== pixelHeight
  ) {
    eyedropperCanvas.width = pixelWidth;
    eyedropperCanvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = '#edf0f6';
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(
    width / 2 + eyedropperView.x,
    height / 2 + eyedropperView.y,
  );
  context.scale(eyedropperView.zoom, eyedropperView.zoom);
  context.fillStyle = '#c9d0de';
  const left = (-width / 2 - eyedropperView.x) / eyedropperView.zoom;
  const top = (-height / 2 - eyedropperView.y) / eyedropperView.zoom;
  for (
    let x = Math.floor(left / 20) * 20;
    x < left + width / eyedropperView.zoom;
    x += 20
  ) {
    for (
      let y = Math.floor(top / 20) * 20;
      y < top + height / eyedropperView.zoom;
      y += 20
    ) {
      context.fillRect(x, y, 1, 1);
    }
  }
  context.fillStyle = '#fff';
  context.beginPath();
  context.roundRect(-170, -90, 340, 180, 12);
  context.fill();
  context.fillStyle = '#394354';
  context.font = '11px sans-serif';
  context.fillText('LIVE COLOR STUDY', -150, -64);
  const colors = ['#557be8', '#9d6ef2', '#ed759b', '#f3a65b', '#64b68a'];
  colors.forEach((color, index) => {
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(-150 + index * 62, -46, 52, 40, 6);
    context.fill();
  });
  const gradient = context.createLinearGradient(-150, 0, 150, 70);
  gradient.addColorStop(0, '#557be8');
  gradient.addColorStop(0.4, '#bd72d4');
  gradient.addColorStop(0.65, '#ed759b');
  gradient.addColorStop(1, '#ffe39a');
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(-150, 6, 300, 64, 7);
  context.fill();
  context.restore();
  const foreground = eyedropperForegroundContext;
  if (foreground) {
    if (
      eyedropperForeground.width !== pixelWidth ||
      eyedropperForeground.height !== pixelHeight
    ) {
      eyedropperForeground.width = pixelWidth;
      eyedropperForeground.height = pixelHeight;
    }
    foreground.setTransform(1, 0, 0, 1, 0, 0);
    foreground.clearRect(0, 0, pixelWidth, pixelHeight);
    foreground.setTransform(ratio, 0, 0, ratio, 0, 0);
    foreground.translate(
      width / 2 + eyedropperView.x,
      height / 2 + eyedropperView.y,
    );
    foreground.scale(eyedropperView.zoom, eyedropperView.zoom);
    foreground.fillStyle = '#183d99aa';
    foreground.beginPath();
    foreground.arc(96, 36, 43, 0, Math.PI * 2);
    foreground.fill();
    foreground.strokeStyle = '#fff';
    foreground.lineWidth = 2;
    foreground.stroke();
    foreground.fillStyle = '#fff';
    foreground.font = '10px sans-serif';
    foreground.textAlign = 'center';
    foreground.fillText('LAYER 2', 96, 39);
  }
  eyedropperZoom.textContent = `${Math.round(eyedropperView.zoom * 100)}%`;
}

function resetEyedropperView(): void {
  eyedropperView.zoom = 1;
  eyedropperView.x = 0;
  eyedropperView.y = 0;
  drawEyedropperCanvas();
}

eyedropperCanvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const rect = eyedropperCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const previous = eyedropperView.zoom;
    const delta =
      event.deltaY *
      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
    eyedropperView.zoom = Math.max(
      0.4,
      Math.min(4, previous * Math.exp(-delta * 0.0015)),
    );
    eyedropperView.x =
      x - ((x - eyedropperView.x) * eyedropperView.zoom) / previous;
    eyedropperView.y =
      y - ((y - eyedropperView.y) * eyedropperView.zoom) / previous;
    drawEyedropperCanvas();
  },
  { passive: false },
);
eyedropperCanvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 1 && !(event.button === 0 && eyedropperSpace)) return;
  event.preventDefault();
  eyedropperPan = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
  eyedropperCanvas.setPointerCapture(event.pointerId);
});
eyedropperCanvas.addEventListener('pointermove', (event) => {
  if (!eyedropperPan || event.pointerId !== eyedropperPan.pointerId) return;
  eyedropperView.x += event.clientX - eyedropperPan.x;
  eyedropperView.y += event.clientY - eyedropperPan.y;
  eyedropperPan.x = event.clientX;
  eyedropperPan.y = event.clientY;
  drawEyedropperCanvas();
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  eyedropperCanvas.addEventListener(type, () => {
    eyedropperPan = null;
  });
}
window.addEventListener(
  'keydown',
  (event) => {
    const target = event.composedPath()[0];
    if (
      target instanceof HTMLElement &&
      target.matches(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
      )
    )
      return;
    if (
      event.code !== 'Space' ||
      (!eyedropperDemo.picking && document.activeElement !== eyedropperCanvas)
    )
      return;
    eyedropperSpace = true;
    event.preventDefault();
  },
  { signal: eyedropperCanvasListeners.signal },
);
window.addEventListener(
  'keyup',
  (event) => {
    if (event.code === 'Space') eyedropperSpace = false;
  },
  { signal: eyedropperCanvasListeners.signal },
);
window.addEventListener(
  'blur',
  () => {
    eyedropperSpace = false;
    eyedropperPan = null;
  },
  { signal: eyedropperCanvasListeners.signal },
);
const eyedropperCanvasObserver = new ResizeObserver(() => {
  if (!eyedropperCanvas.isConnected) {
    eyedropperCanvasObserver.disconnect();
    eyedropperCanvasListeners.abort();
    return;
  }
  drawEyedropperCanvas();
});
eyedropperCanvasObserver.observe(eyedropperCanvas);
window.addEventListener('resize', drawEyedropperCanvas, {
  signal: eyedropperCanvasListeners.signal,
});
requireElement('#eyedropper-view-reset', HTMLButtonElement).addEventListener(
  'click',
  resetEyedropperView,
);
drawEyedropperCanvas();

function eyedropperSetting(name: string): HTMLInputElement {
  const field = eyedropperSettings.elements.namedItem(`eyedropper-${name}`);
  if (!(field instanceof HTMLInputElement)) {
    throw new Error(`Missing or invalid eyedropper setting: ${name}`);
  }
  return field;
}

function syncEyedropperSettings(): void {
  eyedropperSetting('color').value = eyedropperDemo.color;
  eyedropperSetting('size').value = eyedropperDemo.getAttribute('size') ?? '';
  eyedropperSetting('disabled').checked = eyedropperDemo.disabled;
  const options = eyedropperDemo.modes.map((mode) => {
    const option = document.createElement('option');
    option.value = mode.id;
    option.textContent = `${mode.label}${mode.supported ? '' : ' (unavailable)'}`;
    return option;
  });
  eyedropperMode.replaceChildren(...options);
  eyedropperMode.value =
    eyedropperDemo.mode === 'custom' ? 'canvas' : eyedropperDemo.mode;
  const pageOptions = eyedropperDemo.pageOptions;
  eyedropperSetting('page-fonts').checked = pageOptions.embedFonts !== false;
  eyedropperSetting('page-images').checked = pageOptions.inlineImages !== false;
  eyedropperSetting('page-pseudos').checked =
    pageOptions.pseudoElements !== false;
  eyedropperSetting('magnifier-pixels').value = String(
    eyedropperDemo.magnifierPixels,
  );
  const custom = eyedropperDemo.mode !== 'native';
  eyedropperSetting('magnifier-pixels').disabled = !custom;
  eyedropperSetting('magnifier-size').disabled = !custom;
  eyedropperShape.disabled = !custom;
}

function renderEyedropper(): void {
  const mode = eyedropperDemo.mode;
  eyedropperPageOptions.hidden = mode !== 'page';
  eyedropperPageOptions.disabled = mode !== 'page';
  eyedropperForeground.hidden = mode !== 'editor';
  eyedropperHint.textContent =
    mode === 'page'
      ? 'Capture the visible viewport, then choose a pixel. Offscreen content is skipped automatically. Escape cancels.'
      : mode === 'native'
        ? 'Activate to choose a screen pixel with the browser picker. Escape cancels.'
        : 'Activate, then click a canvas pixel. Scroll to zoom; Space + drag or middle-drag to pan. Escape cancels.';
  requireElement('#eyedropper-color', HTMLElement).textContent =
    eyedropperDemo.color || 'Empty';
  requireElement('#eyedropper-swatch', HTMLElement).style.setProperty(
    '--selected-color',
    eyedropperDemo.color || 'transparent',
  );
  requireElement('#eyedropper-count', HTMLElement).textContent =
    String(eyedropperCommits);
  requireElement('#eyedropper-availability', HTMLElement).textContent =
    !eyedropperDemo.supported
      ? 'This mode is unavailable. Choose canvas mode, or use a browser with EyeDropper support for native screen picking.'
      : eyedropperError ||
        (eyedropperDemo.picking
          ? eyedropperDemo.mode === 'native'
            ? 'Select a screen pixel, or press Escape to cancel.'
            : mode === 'page'
              ? 'Preparing a page snapshot. Choose a pixel when ready, or press Escape to cancel.'
              : 'Click a canvas pixel. Scroll to zoom; Space + drag or middle-drag to pan. Escape cancels.'
          : eyedropperDemo.disabled
            ? 'Eyedropper is disabled. Enable it in the properties to pick a color.'
            : eyedropperDemo.mode === 'native'
              ? 'Native mode samples the screen, including other windows. Its magnifier is controlled by the browser.'
              : mode === 'page'
                ? 'Page mode uses a frozen DOM rendering. Fonts and complex styles may differ; canvas mode stays live.'
                : mode === 'editor'
                  ? 'This registered mode composites two live canvas layers. Navigation and magnifier customization stay shared.'
                  : 'Canvas mode samples live pixels. Arrow keys move; Enter selects; Escape cancels. The page stays interactive.');
  const entries = [
    '  aria-label="Pick a color"',
    `  mode="${eyedropperDemo.mode}"`,
  ];
  if (eyedropperDemo.color) entries.push(`  color="${eyedropperDemo.color}"`);
  if (eyedropperDemo.hasAttribute('size')) {
    entries.push(`  size="${eyedropperDemo.size}"`);
  }
  if (eyedropperDemo.disabled) entries.push('  disabled');
  if (mode !== 'native') {
    if (mode === 'canvas' || mode === 'custom' || mode === 'editor')
      entries.push('  source="#eyedropper-canvas"');
    entries.push(`  magnifier-pixels="${eyedropperDemo.magnifierPixels}"`);
    const styles = eyedropperDemo.getAttribute('style');
    if (styles) entries.push(`  style="${styles}"`);
  }
  entries.push('  onchange="console.log(this.color)"');
  const registration =
    mode === 'editor'
      ? '<!-- First register the renderer in your application:\n  picker.registerMode("editor", sampleComposite);\n  sampleComposite reads the final pixels from all editor layers.\n-->\n'
      : '';
  const pageOptions = eyedropperDemo.pageOptions;
  const pageOverrides = [
    ...(pageOptions.embedFonts === false ? ['    embedFonts: false,'] : []),
    ...(pageOptions.inlineImages === false ? ['    inlineImages: false,'] : []),
    ...(pageOptions.pseudoElements === false
      ? ['    pseudoElements: false,']
      : []),
  ];
  const pageAssignment = pageOverrides.length
    ? `  picker.pageOptions = {\n${pageOverrides.join('\n')}\n  };`
    : '  picker.pageOptions = {}; // Full capture defaults';
  const pageConfiguration =
    mode === 'page'
      ? `\n\n<script type="module">\n  const picker = document.querySelector('dsk-color-eyedropper');\n${pageAssignment}\n</script>`
      : '';
  eyedropperCode.textContent = `${registration}<dsk-color-eyedropper\n${entries.join('\n')}\n></dsk-color-eyedropper>${pageConfiguration}`;
}

function clearEyedropperEvents(): void {
  const empty = document.createElement('li');
  empty.className = 'empty-log';
  empty.textContent = 'Pick a color to see events.';
  eyedropperEvents.replaceChildren(empty);
  eyedropperCommits = 0;
  renderEyedropper();
}

eyedropperSettings.addEventListener('submit', (event) =>
  event.preventDefault(),
);
eyedropperSettings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  ))
    return;
  const attribute = field.name.replace(/^eyedropper-/, '');
  if (attribute === 'magnifier-size') {
    const size = Number(field.value);
    eyedropperDemo.style.setProperty(
      '--dsk-color-eyedropper-magnifier-size',
      `${size >= 40 ? size : 120}px`,
    );
  } else if (attribute === 'shape') {
    eyedropperDemo.style.setProperty(
      '--dsk-color-eyedropper-magnifier-radius',
      field.value === 'square' ? '12px' : '50%',
    );
  } else if (attribute.startsWith('page-')) {
    eyedropperDemo.pageOptions = {
      embedFonts: eyedropperSetting('page-fonts').checked,
      inlineImages: eyedropperSetting('page-images').checked,
      pseudoElements: eyedropperSetting('page-pseudos').checked
        ? undefined
        : false,
    };
  } else if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    eyedropperDemo.disabled = field.checked;
  } else if (field.value === '') {
    eyedropperDemo.removeAttribute(attribute);
  } else {
    eyedropperDemo.setAttribute(attribute, field.value);
  }
  eyedropperError = '';
  renderEyedropper();
});
eyedropperSettings.addEventListener('change', syncEyedropperSettings);

for (const type of ['pickstart', 'input', 'change', 'cancel', 'pickerror']) {
  eyedropperDemo.addEventListener(type, (event) => {
    if (type === 'change') eyedropperCommits++;
    eyedropperError = '';
    let message = eyedropperDemo.color || '(empty)';
    if (type === 'pickstart') message = 'Choosing a pixel';
    if (type === 'cancel') message = 'Selection canceled';
    if (type === 'pickerror') {
      const error = (event as CustomEvent<EyeDropperErrorDetail>).detail.error;
      eyedropperError = error.message;
      message = error.name;
    }
    eyedropperEvents.querySelector('.empty-log')?.remove();
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = `event-type ${type}`;
    label.textContent = type;
    const value = document.createElement('code');
    value.textContent = message;
    item.append(label, value);
    eyedropperEvents.prepend(item);
    while (eyedropperEvents.children.length > 8) {
      eyedropperEvents.lastElementChild?.remove();
    }
    syncEyedropperSettings();
    renderEyedropper();
  });
}

requireElement('#eyedropper-reset', HTMLButtonElement).addEventListener(
  'click',
  () => {
    eyedropperDemo.color = null;
    eyedropperDemo.size = null;
    eyedropperDemo.mode = null;
    eyedropperDemo.pageOptions = null;
    eyedropperDemo.magnifierPixels = null;
    eyedropperDemo.style.removeProperty(
      '--dsk-color-eyedropper-magnifier-size',
    );
    eyedropperDemo.style.removeProperty(
      '--dsk-color-eyedropper-magnifier-radius',
    );
    eyedropperSetting('magnifier-size').value = '120';
    eyedropperShape.value = 'circle';
    eyedropperDemo.disabled = false;
    eyedropperError = '';
    resetEyedropperView();
    syncEyedropperSettings();
    clearEyedropperEvents();
  },
);
requireElement('#eyedropper-clear', HTMLButtonElement).addEventListener(
  'click',
  clearEyedropperEvents,
);
syncEyedropperSettings();
renderEyedropper();

const angleDemo = requireElement('#angle-demo', DskAngle);
const angleSettings = requireElement('#angle-settings', HTMLFormElement);
const angleCode = requireElement('#angle-code', HTMLElement);
const angleEvents = requireElement('#angle-events', HTMLOListElement);
const angleAttributes = [
  'unit',
  'min',
  'max',
  'step',
  'snap-angle',
  'segments',
  'size',
  'color',
  'value',
] as const;
const angleFlags = ['disabled', 'readonly'] as const;
type AnglePreset = Partial<Record<(typeof angleAttributes)[number], string>>;
const anglePresets: Record<string, AnglePreset> = {
  quarter: { unit: 'turn', value: '0.25' },
  restricted: { unit: 'deg', min: '45', max: '270', step: '5', value: '135' },
  radians: { unit: 'rad', value: String(Math.PI) },
  pi: { unit: 'pi', step: '0.125', value: '0.5' },
};
const angleUnitNames = {
  deg: 'degrees',
  rad: 'radians',
  pi: 'multiples of π',
  turn: 'turns',
  grad: 'gradians',
};
const angleRevolutions = {
  deg: 360,
  rad: 2 * Math.PI,
  pi: 2,
  turn: 1,
  grad: 400,
};
let angleCommits = 0;

function angleSetting(name: string): HTMLInputElement | HTMLSelectElement {
  const field = angleSettings.elements.namedItem(`angle-${name}`);
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  )) {
    throw new Error(`Missing or invalid angle setting: ${name}`);
  }
  return field;
}

function syncAngleSettings(): void {
  for (const attribute of angleAttributes) {
    angleSetting(attribute).value = angleDemo.getAttribute(attribute) ?? '';
  }
  angleSetting('unit').value = angleDemo.unit;
  angleSetting('value').value = String(angleDemo.value);
  for (const flag of angleFlags) {
    const field = angleSetting(flag);
    if (field instanceof HTMLInputElement) {
      field.checked = angleDemo.hasAttribute(flag);
    }
  }
  const maximum = angleSetting('max');
  const step = angleSetting('step');
  if (maximum instanceof HTMLInputElement && step instanceof HTMLInputElement) {
    maximum.placeholder = `Optional · ${angleRevolutions[angleDemo.unit]}`;
    step.placeholder = String(angleRevolutions[angleDemo.unit] / 360);
  }
}

function renderAngle(): void {
  const bounded =
    angleDemo.hasAttribute('min') || angleDemo.hasAttribute('max');
  requireElement('#angle-range-note', HTMLElement).textContent = bounded
    ? 'Bounded rotation. The marker stops at the endpoints. Clear both bounds to rotate continuously again.'
    : 'Continuous rotation. Leave both bounds empty to keep rotating through a full turn, or set either bound to stop at endpoints.';
  requireElement('#angle-current-value', HTMLElement).textContent =
    angleDemo.formattedValue;
  requireElement('#angle-count', HTMLElement).textContent =
    String(angleCommits);
  requireElement('#angle-unit-note', HTMLElement).textContent =
    `Values, bounds, and step use ${angleUnitNames[angleDemo.unit]}. Changing the unit converts them while keeping the same physical angle.`;
  const entries = angleAttributes.flatMap((attribute) => {
    const value = angleDemo.getAttribute(attribute);
    if (value === null) return [];
    const escaped = value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    return [`  ${attribute}="${escaped}"`];
  });
  for (const flag of angleFlags) {
    if (angleDemo.hasAttribute(flag)) entries.push(`  ${flag}`);
  }
  entries.push('  aria-label="Rotation angle"');
  angleCode.textContent = `<dsk-angle\n${entries.join('\n')}\n></dsk-angle>`;
}

function clearAngleEvents(): void {
  const empty = document.createElement('li');
  empty.className = 'empty-log';
  empty.textContent = 'Rotate the marker to see events.';
  angleEvents.replaceChildren(empty);
  angleCommits = 0;
  renderAngle();
}

function applyAnglePreset(preset: AnglePreset): void {
  for (const attribute of [...angleAttributes, ...angleFlags]) {
    angleDemo.removeAttribute(attribute);
  }
  for (const attribute of angleAttributes) {
    const value = preset[attribute];
    if (value !== undefined) angleDemo.setAttribute(attribute, value);
  }
  syncAngleSettings();
  clearAngleEvents();
}

angleSettings.addEventListener('submit', (event) => event.preventDefault());
angleSettings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(
    field instanceof HTMLInputElement || field instanceof HTMLSelectElement
  )) {
    return;
  }
  const attribute = field.name.replace(/^angle-/, '');
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    angleDemo.toggleAttribute(attribute, field.checked);
  } else if (field.value === '') {
    angleDemo.removeAttribute(attribute);
  } else {
    angleDemo.setAttribute(attribute, field.value);
  }
  if (attribute === 'unit') syncAngleSettings();
  renderAngle();
});
angleSettings.addEventListener('change', syncAngleSettings);

for (const type of ['input', 'change']) {
  angleDemo.addEventListener(type, () => {
    if (type === 'change') angleCommits++;
    angleEvents.querySelector('.empty-log')?.remove();
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = `event-type ${type}`;
    label.textContent = type;
    const value = document.createElement('code');
    value.textContent = angleDemo.formattedValue;
    item.append(label, value);
    angleEvents.prepend(item);
    while (angleEvents.children.length > 8) {
      angleEvents.lastElementChild?.remove();
    }
    syncAngleSettings();
    renderAngle();
  });
}

for (const button of document.querySelectorAll<HTMLButtonElement>(
  '[data-angle-preset]',
)) {
  button.addEventListener('click', () => {
    const name = button.dataset.anglePreset;
    const preset = name ? anglePresets[name] : undefined;
    if (preset) applyAnglePreset(preset);
  });
}
requireElement('#angle-reset', HTMLButtonElement).addEventListener(
  'click',
  () => {
    applyAnglePreset({ value: '90' });
  },
);
requireElement('#angle-clear', HTMLButtonElement).addEventListener(
  'click',
  clearAngleEvents,
);
syncAngleSettings();
renderAngle();

const curveDemo = requireElement('#curve-demo', DskCurve);
const curveSettings = requireElement('#curve-settings', HTMLFormElement);
const curveCode = requireElement('#curve-code', HTMLElement);
const curveEvents = requireElement('#curve-events', HTMLOListElement);
const curveAttributes = [
  'value',
  'step',
  'duration',
  'width',
  'color',
] as const;
const curveFlags = ['disabled', 'readonly'] as const;
let curveCommits = 0;

function curveSetting(name: string): HTMLInputElement {
  const field = curveSettings.elements.namedItem(`curve-${name}`);
  if (!(field instanceof HTMLInputElement)) {
    throw new Error(`Missing or invalid curve setting: ${name}`);
  }
  return field;
}

function syncCurveSettings(): void {
  for (const attribute of curveAttributes) {
    curveSetting(attribute).value = curveDemo.getAttribute(attribute) ?? '';
  }
  curveSetting('value').value = curveDemo.value;
  curveSetting('grid').checked = curveDemo.grid;
  for (const flag of curveFlags) {
    curveSetting(flag).checked = curveDemo.hasAttribute(flag);
  }
}

function renderCurve(): void {
  requireElement('#curve-current-preset', HTMLElement).textContent =
    curveDemo.preset;
  requireElement('#curve-count', HTMLElement).textContent =
    String(curveCommits);
  const entries = curveAttributes.flatMap((attribute) => {
    const value =
      attribute === 'value'
        ? curveDemo.value
        : curveDemo.getAttribute(attribute);
    if (value === null) return [];
    const escaped = value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    return [`  ${attribute}="${escaped}"`];
  });
  if (!curveDemo.grid) entries.push('  grid="false"');
  for (const flag of curveFlags) {
    if (curveDemo.hasAttribute(flag)) entries.push(`  ${flag}`);
  }
  entries.push('  aria-label="Motion easing"');
  curveCode.textContent = `<dsk-curve\n${entries.join('\n')}\n></dsk-curve>`;
}

function clearCurveEvents(): void {
  const empty = document.createElement('li');
  empty.className = 'empty-log';
  empty.textContent = 'Add or move a point to see events.';
  curveEvents.replaceChildren(empty);
  curveCommits = 0;
  renderCurve();
}

curveSettings.addEventListener('submit', (event) => event.preventDefault());
curveSettings.addEventListener('input', (event) => {
  const field = event.target;
  if (!(field instanceof HTMLInputElement)) return;
  const attribute = field.name.replace(/^curve-/, '');
  if (attribute === 'grid') {
    curveDemo.grid = field.checked;
  } else if (field.type === 'checkbox') {
    curveDemo.toggleAttribute(attribute, field.checked);
  } else if (field.value === '') {
    curveDemo.removeAttribute(attribute);
  } else {
    curveDemo.setAttribute(attribute, field.value);
  }
  renderCurve();
});
curveSettings.addEventListener('change', syncCurveSettings);

for (const type of ['input', 'change']) {
  curveDemo.addEventListener(type, () => {
    if (type === 'change') curveCommits++;
    curveEvents.querySelector('.empty-log')?.remove();
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.className = `event-type ${type}`;
    label.textContent = type;
    const value = document.createElement('code');
    value.textContent = curveDemo.value;
    item.append(label, value);
    curveEvents.prepend(item);
    while (curveEvents.children.length > 8) {
      curveEvents.lastElementChild?.remove();
    }
    syncCurveSettings();
    renderCurve();
  });
}

requireElement('#curve-reset', HTMLButtonElement).addEventListener(
  'click',
  () => {
    curveDemo.stop();
    for (const attribute of [...curveAttributes, ...curveFlags, 'grid']) {
      curveDemo.removeAttribute(attribute);
    }
    curveDemo.value = 'ease-in-out';
    syncCurveSettings();
    clearCurveEvents();
  },
);
requireElement('#curve-clear', HTMLButtonElement).addEventListener(
  'click',
  clearCurveEvents,
);
syncCurveSettings();
renderCurve();
