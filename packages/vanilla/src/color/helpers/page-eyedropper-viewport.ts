/** Keep layout spacers for offscreen branches without cloning their contents. */
export class PageViewportTree {
  private readonly visible = new WeakSet<Node>();
  private readonly clones = new WeakMap<Node, Node>();
  private readonly spacers = new WeakMap<Node, HTMLElement>();
  private readonly document: Document;

  constructor(document: Document) {
    this.document = document;
    const view = document.defaultView!;
    const visit = (node: Node, keep = false): boolean => {
      if (!(node instanceof Element)) return false;
      if (
        node.matches('head, script, style, link, [data-dsk-eyedropper-overlay]')
      )
        return false;
      const bounds = node.getBoundingClientRect();
      // A small overscan retains nearby shadows and antialiased edges.
      let visible =
        keep ||
        (bounds.width > 0 &&
          bounds.height > 0 &&
          bounds.right > -128 &&
          bounds.bottom > -128 &&
          bounds.left < view.innerWidth + 128 &&
          bounds.top < view.innerHeight + 128);
      const atomic = visible && node.matches('svg, select, textarea');
      for (const child of this.children(node)) {
        if (visit(child, atomic || keep)) visible = true;
      }
      if (visible) this.visible.add(node);
      return visible;
    };
    visit(document.documentElement);
  }

  private children(node: Node): Node[] {
    if (node instanceof HTMLSlotElement) {
      const assigned = node.assignedNodes();
      if (assigned.length) return assigned;
    }
    return Array.from(
      node instanceof Element && node.shadowRoot
        ? node.shadowRoot.childNodes
        : node.childNodes,
    );
  }

  includes(node: Node): boolean {
    if (
      (!(node instanceof HTMLElement) && !(node instanceof SVGSVGElement)) ||
      this.visible.has(node)
    )
      return true;
    const computed = this.document.defaultView!.getComputedStyle(node);
    const spacer = this.document.createElement('div');
    // Preserve layout only. In particular, do not copy resource URLs, fonts,
    // generated content or pixels from an offscreen canvas.
    for (const property of [
      'display',
      'position',
      'box-sizing',
      'width',
      'height',
      'min-width',
      'min-height',
      'max-width',
      'max-height',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'border-top-width',
      'border-right-width',
      'border-bottom-width',
      'border-left-width',
      'border-style',
      'top',
      'right',
      'bottom',
      'left',
      'float',
      'clear',
      'flex',
      'order',
      'align-self',
      'grid-area',
      'transform',
      'transform-origin',
      'zoom',
      'vertical-align',
    ])
      spacer.style.setProperty(property, computed.getPropertyValue(property));
    spacer.style.visibility = 'hidden';
    spacer.style.pointerEvents = 'none';
    this.spacers.set(node, spacer);
    return false;
  }

  capture(node: Node, clone: Node): void {
    this.clones.set(node, clone);
    // The renderer will subsequently apply its scroll correction to these
    // spacers together with the ordinary cloned children.
    let next: Node | null = null;
    for (const child of this.children(node).reverse()) {
      const spacer = this.spacers.get(child);
      if (spacer) {
        clone.insertBefore(spacer, next);
        next = spacer;
      } else {
        const childClone = this.clones.get(child);
        if (childClone?.parentNode === clone) next = childClone;
      }
    }
  }
}
