import moon from '../assets/icons/moon.svg?raw';
import sun from '../assets/icons/sun.svg?raw';

type Theme = 'light' | 'dark';
const storageKey = 'dsk-playground-theme';
const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
if (!toggle) throw new Error('Missing theme toggle.');

let theme: Theme = 'light';
try {
  if (localStorage.getItem(storageKey) === 'dark') theme = 'dark';
} catch {
  // Theme switching remains available when browser storage is disabled.
}

function renderTheme(): void {
  document.documentElement.dataset.theme = theme;
  if (!toggle) return;
  toggle.innerHTML = theme === 'dark' ? sun : moon;
  const label =
    theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
}

function applyTheme(next: Theme): void {
  theme = next;
  renderTheme();
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Keep the selected theme for this page even without persistent storage.
  }
}

let transitioning = false;
renderTheme();
toggle.addEventListener('click', async () => {
  if (transitioning) return;
  const next = theme === 'light' ? 'dark' : 'light';
  if (
    !document.startViewTransition ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    applyTheme(next);
    return;
  }

  const { left, top, width, height } = toggle.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius =
    Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 1;
  const root = document.documentElement;
  transitioning = true;
  root.dataset.themeTransition = '';
  let transition: ViewTransition | undefined;
  try {
    transition = document.startViewTransition(() => applyTheme(next));
    await transition.ready;
    const reveal = root.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 400,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      },
    );
    await reveal.finished;
    await transition.finished;
  } catch {
    // A skipped transition or unavailable animation must not prevent a theme change.
    transition?.skipTransition();
    applyTheme(next);
  } finally {
    delete root.dataset.themeTransition;
    transitioning = false;
  }
});
