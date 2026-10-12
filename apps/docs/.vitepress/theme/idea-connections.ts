/** Keep decorative SVG frames and connectors anchored to the actual card bounds. */
export function connectIdeas(): () => void {
  const section = document.querySelector<HTMLElement>('.dsk-docs-build-ideas');
  if (!section) return () => {};
  const illustrations = [
    ...section.querySelectorAll<HTMLElement>('.dsk-docs-idea-art'),
  ];
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('dsk-docs-idea-connections');
  svg.setAttribute('aria-hidden', 'true');
  section.append(svg);
  let frame = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ready = new Set<number>();
  const flowing = new Set<number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  };
  if (reduced.matches)
    illustrations.forEach((_, index) => {
      ready.add(index);
      flowing.add(index);
    });
  const draw = () => {
    const root = section.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${root.width} ${root.height}`);
    svg.replaceChildren();
    const bounds = illustrations.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left - root.left,
        y: rect.top - root.top,
        width: rect.width,
        height: rect.height,
      };
    });
    for (const [index, rect] of bounds.entries()) {
      if (!ready.has(index)) continue;
      const border = document.createElementNS(ns, 'rect');
      for (const [name, value] of Object.entries({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rx: 24,
      }))
        border.setAttribute(name, String(value));
      if (!flowing.has(index) && !reduced.matches) {
        const mask = document.createElementNS(ns, 'mask');
        const id = `dsk-idea-frame-mask-${index}`;
        mask.id = id;
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', '0');
        mask.setAttribute('y', '0');
        mask.setAttribute('width', String(root.width));
        mask.setAttribute('height', String(root.height));
        const trace = border.cloneNode() as SVGRectElement;
        trace.classList.add('dsk-docs-line-trace');
        trace.setAttribute('pathLength', '1');
        mask.append(trace);
        svg.append(mask);
        border.setAttribute('mask', `url(#${id})`);
        border.style.animation = 'none';
      }
      svg.append(border);
    }
    bounds.slice(0, -1).forEach((rect, index) => {
      if (!ready.has(index) || !ready.has(index + 1)) return;
      const next = bounds[index + 1]!;
      const x1 = rect.x + rect.width / 2;
      const y1 = rect.y + rect.height;
      const x2 = next.x + next.width / 2;
      const y2 = next.y;
      const mid = (y1 + y2) / 2;
      const radius = Math.min(18, (y2 - y1) / 4);
      const sign = Math.sign(x2 - x1);
      const path = document.createElementNS(ns, 'path');
      path.setAttribute(
        'd',
        `M ${x1} ${y1} V ${mid - radius} Q ${x1} ${mid} ${x1 + sign * radius} ${mid} H ${x2 - sign * radius} Q ${x2} ${mid} ${x2} ${mid + radius} V ${y2}`,
      );
      if (!flowing.has(index + 1) && !reduced.matches) {
        const mask = document.createElementNS(ns, 'mask');
        const id = `dsk-idea-line-mask-${index}`;
        mask.id = id;
        mask.setAttribute('maskUnits', 'userSpaceOnUse');
        mask.setAttribute('x', '0');
        mask.setAttribute('y', '0');
        mask.setAttribute('width', String(root.width));
        mask.setAttribute('height', String(root.height));
        const trace = path.cloneNode() as SVGPathElement;
        trace.classList.add('dsk-docs-line-trace');
        trace.setAttribute('pathLength', '1');
        mask.append(trace);
        svg.append(mask);
        path.setAttribute('mask', `url(#${id})`);
        path.style.animation = 'none';
      }
      svg.append(path);
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ]) {
        const circle = document.createElementNS(ns, 'circle');
        circle.setAttribute('cx', String(x));
        circle.setAttribute('cy', String(y));
        circle.setAttribute('r', '7');
        svg.append(circle);
      }
    });
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(draw);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(section);
  illustrations.forEach((element) => observer.observe(element));
  const visibility = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = illustrations.indexOf(entry.target as HTMLElement);
        visibility.unobserve(entry.target);
        later(
          () => {
            ready.add(index);
            schedule();
            later(() => {
              flowing.add(index);
              schedule();
            }, 950);
          },
          reduced.matches ? 0 : 850,
        );
      }
    },
    { threshold: 0.15 },
  );
  illustrations.forEach((element) => visibility.observe(element));
  schedule();
  return () => {
    visibility.disconnect();
    timers.forEach(clearTimeout);
    observer.disconnect();
    cancelAnimationFrame(frame);
    svg.remove();
  };
}
