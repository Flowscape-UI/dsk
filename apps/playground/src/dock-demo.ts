import type { DskDock, DockDetail } from '@flowscape-ui/dsk';
import './dock-demo.css';

const dock = document.querySelector<DskDock>('#dock-demo')!;
const status = document.querySelector<HTMLOutputElement>('#dock-events')!;
for (const name of ['dockstart', 'dockover', 'change', 'dockcancel']) {
  dock.addEventListener(name, (event) => {
    if (event.target !== dock) return;
    const { item, from, to } = (event as CustomEvent<DockDetail>).detail;
    status.textContent = `${name}: ${item.id} / ${from.id} → ${to?.id ?? 'outside'}`;
  });
}
for (const property of ['disabled', 'readOnly'] as const) {
  document.querySelector<HTMLInputElement>(`#dock-${property}`)!.onchange = (
    event,
  ) => {
    dock[property] = (event.target as HTMLInputElement).checked;
  };
}
document.querySelector<HTMLInputElement>('#dock-custom-style')!.onchange = (
  event,
) => {
  dock.classList.toggle(
    'dock-alternative',
    (event.target as HTMLInputElement).checked,
  );
};
let count = 0;
document.querySelector<HTMLInputElement>('#dock-overlay-zones')!.onchange = (
  event,
) => {
  dock.cancel();
  dock.classList.toggle(
    'dock-overlay-zones',
    (event.target as HTMLInputElement).checked,
  );
};
document.querySelector<HTMLInputElement>('#dock-reveal-zones')!.onchange = (
  event,
) => {
  dock.classList.toggle(
    'dock-reveal-zones',
    (event.target as HTMLInputElement).checked,
  );
};
document.querySelector<HTMLButtonElement>('#dock-add-zone')!.onclick = () => {
  const zone = document.createElement('dsk-dock-zone');
  zone.id = `dock-extra-${++count}`;
  zone.className = 'dock-extra';
  zone.style.setProperty('--dock-zone-index', String(count - 1));
  zone.setAttribute('aria-label', `Custom zone ${count}`);
  const label = document.createElement('span');
  label.className = 'dock-zone-label';
  label.textContent = `Custom zone ${count}`;
  zone.append(label);
  document.querySelector('#dock-extra-zones')!.append(zone);
};
document.querySelector<HTMLButtonElement>('#dock-reset')!.onclick = () => {
  dock.dock(
    document.querySelector('#dock-inspector')!,
    document.querySelector('#dock-right')!,
  );
  dock.dock(
    document.querySelector('#dock-layers')!,
    document.querySelector('#dock-left')!,
  );
  document.querySelector('#dock-extra-zones')!.replaceChildren();
  status.textContent = 'Layout reset (silent programmatic move).';
};
