import { DskInputGroup, DskInput } from '@flowscape-ui/dsk';

/** A minimal application-owned control using the standard value/event contract. */
class DemoValueInput extends HTMLElement {
  static readonly observedAttributes = ['placeholder', 'aria-label'];
  private readonly _input: HTMLInputElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>:host{display:inline-block;width:150px}input{box-sizing:border-box;width:100%;height:32px;padding:6px 8px;font:inherit;color:inherit;border:1px solid #dce2ec;border-radius:6px;background:transparent}</style><input type="number">`;
    this._input = root.querySelector('input')!;
    this._input.addEventListener('change', () =>
      this.dispatchEvent(
        new Event('change', { bubbles: true, composed: true }),
      ),
    );
  }

  connectedCallback(): void {
    this.value = this.getAttribute('value') ?? '';
    this.attributeChangedCallback();
  }
  attributeChangedCallback(): void {
    this._input.placeholder = this.getAttribute('placeholder') ?? '';
    this._input.setAttribute(
      'aria-label',
      this.getAttribute('aria-label') ?? 'Custom value',
    );
  }
  get value(): string {
    return this._input.value;
  }
  set value(value: string) {
    this._input.value = value;
  }
  get placeholder(): string {
    return this.getAttribute('placeholder') ?? '';
  }
  set placeholder(value: string) {
    this.setAttribute('placeholder', value);
  }
}
customElements.define('demo-value-input', DemoValueInput);

const group = document.querySelector<DskInputGroup>('#input-group-demo')!;
const width = document.querySelector<DskInput>('#input-group-width')!;
const linked = document.querySelector<HTMLInputElement>('#input-group-linked')!;
const automatic = document.querySelector<HTMLInputElement>(
  '#input-group-automatic',
)!;
const label = document.querySelector<HTMLInputElement>('#input-group-label')!;
const code = document.querySelector('#input-group-code')!;
const values = document.querySelector('#input-group-values')!;

function render(): void {
  values.textContent = JSON.stringify(group.values);
  const stored = group.storedValues.map((value) =>
    value.replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
  );
  code.textContent = `<dsk-input-group${group.linked ? ' linked' : ''}${group.hasMixedValues ? ' has-mixed-values="true"' : ''} mixed-label="${group.mixedLabel.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">
  <dsk-input value="${stored[0]}" aria-label="Width"></dsk-input>
  <input type="number" value="${stored[1]}" aria-label="Height">
  <input type="number" value="${stored[2]}" aria-label="Depth">
</dsk-input-group>`;
}
linked.addEventListener('change', () => {
  group.linked = linked.checked;
  render();
});
automatic.addEventListener('change', () => {
  group.hasMixedValues = automatic.checked;
  render();
});
for (const event of ['focusin', 'focusout'])
  group.addEventListener(event, () => queueMicrotask(render));
label.addEventListener('input', () => {
  group.mixedLabel = label.value;
  render();
});
group.addEventListener('input', render);
group.addEventListener('change', render);
document.querySelector('#input-group-reset')!.addEventListener('click', () => {
  group.hasMixedValues = automatic.checked = false;
  group.linked = linked.checked = false;
  group.mixedLabel = label.value = 'Mixed';
  width.value = 120;
  document.querySelector<HTMLInputElement>('#input-group-height')!.value = '80';
  document.querySelector<DemoValueInput>('#input-group-depth')!.value = '40';
  render();
});
render();
