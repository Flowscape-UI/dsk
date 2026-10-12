import { connectIdeas } from './idea-connections.ts';
import type { CanvasCamera, DskPanZoom } from '@flowscape-ui/dsk';

/** Homepage motion is decorative and yields immediately to user interaction. */
export function animateHomepage(
  viewport: DskPanZoom,
  sync: (camera: CanvasCamera) => void,
  focus: { x: number; y: number },
): () => void {
  const disconnectIdeas = connectIdeas();
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const hero = viewport.querySelector<HTMLElement>('.dsk-docs-hero-copy');
  const wide = width >= 900 && !matchMedia('(max-width: 648px)').matches;
  const top = wide
    ? 32
    : (hero ? hero.offsetTop + hero.offsetHeight : 280) + 24;
  const bottom = height - (wide ? 32 : 100);
  const available = Math.max(100, bottom - top);
  const objectLeft = wide && hero ? hero.offsetLeft + hero.offsetWidth + 24 : 0;
  const objectRight = width - 24;
  const finalZoom = wide
    ? Math.min(
        3.21,
        Math.max(160, objectRight - objectLeft) / 200,
        (available * 0.92) / 200,
      )
    : 0.84;
  const centerX = wide ? (objectLeft + objectRight) / 2 : width / 2;
  const centerY = (top + bottom) / 2;
  viewport.camera = {
    panX: centerX - focus.x * finalZoom,
    panY: centerY - focus.y * finalZoom,
    zoom: finalZoom,
  };
  sync(viewport.camera);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  let frame = 0;
  let started = false;
  let settled: CanvasCamera | undefined;
  const stop = () => {
    cancelAnimationFrame(frame);
    if (settled) {
      viewport.camera = settled;
      sync(settled);
      settled = undefined;
    }
  };
  for (const event of ['pointerdown', 'wheel', 'keydown']) {
    viewport.closest('.dsk-docs-editor')?.addEventListener(event, stop, {
      capture: true,
      passive: true,
      signal: controller.signal,
    });
  }
  const reveal = document.querySelectorAll<HTMLElement>(
    '.dsk-docs-idea, .dsk-docs-build-ideas > h2, .dsk-docs-home > h2, .dsk-docs-home > p, .dsk-docs-cards a, .dsk-docs-home div[class*="language-"]',
  );
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('dsk-docs-revealed');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.08 },
  );
  if (!reduced.matches) {
    reveal.forEach((element) => {
      element.classList.add('dsk-docs-reveal');
      observer.observe(element);
    });
    frame = requestAnimationFrame(() => {
      if (started) return;
      started = true;
      settled = viewport.camera;
      const destination = settled;
      const world =
        viewport.shadowRoot?.querySelector<HTMLElement>('[part="world"]');
      const duration = 3800;
      const anchor = {
        x: destination.panX + focus.x * destination.zoom,
        y: destination.panY + focus.y * destination.zoom,
      };
      // Clamp the starting scale once, not each frame: small final scales
      // must start approaching immediately rather than waiting at the minimum.
      const startZoom = Math.max(0.25, destination.zoom * 0.1);
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        // Smooth acceleration and deceleration keep the half-turn readable.
        const ease = progress * progress * (3 - 2 * progress);
        const zoom = startZoom + (destination.zoom - startZoom) * ease;
        // Low-frequency sway fades in and out without frame-to-frame noise.
        const envelope = Math.sin(Math.PI * progress) ** 2;
        const phase = progress * Math.PI * 2;
        const swayX =
          envelope * (5 * Math.sin(phase * 1.2) + 1.5 * Math.sin(phase * 2.1));
        const swayY = envelope * 3.5 * Math.sin(phase * 1.6 + 0.7);
        const roll = envelope * 0.65 * Math.sin(phase * 1.1 + 0.4);
        viewport.camera = {
          panX: anchor.x + swayX - focus.x * zoom,
          panY: anchor.y + swayY - focus.y * zoom,
          zoom,
        };
        if (world && progress < 1) {
          // Apply the same gentle camera sway to the object and its world grid.
          world.style.transform = `translate(${anchor.x + swayX}px, ${anchor.y + swayY}px) rotate(${-180 * (1 - ease) + roll}deg) scale(${zoom}) translate(${-focus.x}px, ${-focus.y}px)`;
        }
        sync(viewport.camera);
        if (progress < 1) frame = requestAnimationFrame(tick);
        else {
          settled = undefined;
        }
      };
      tick(start);
    });
  }
  reduced.addEventListener('change', stop, { signal: controller.signal });
  return () => {
    disconnectIdeas();
    stop();
    controller.abort();
    observer.disconnect();
    reveal.forEach((element) =>
      element.classList.remove('dsk-docs-reveal', 'dsk-docs-revealed'),
    );
  };
}
