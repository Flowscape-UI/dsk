import { collectFontFamilies } from './page-eyedropper-fonts.ts';
import {
  eyeDropperPagePseudoElements,
  type EyeDropperPageOptions,
} from '../page-eyedropper-options.ts';
import { createPageResourceLoader } from './page-eyedropper-resources.ts';

interface CapturedPseudo {
  selector: string;
  style: CSSStyleDeclaration;
  base: string;
}

/** Commas inside functional selectors or attribute values do not split a list. */
function selectorBranches(selector: string): string[] {
  const result: string[] = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  for (let index = 0; index < selector.length; index++) {
    const character = selector[index];
    if (character === '\\') {
      index++;
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '(' || character === '[') depth++;
    else if (character === ')' || character === ']') depth--;
    else if (character === ',' && depth === 0) {
      result.push(selector.slice(start, index));
      start = index + 1;
    }
  }
  result.push(selector.slice(start));
  return result;
}

/** A single policy for inline, stylesheet, script, browser, and pseudo styles. */
export class PageSnapshotStyles {
  private readonly document: Document;
  private readonly options: Readonly<EyeDropperPageOptions>;
  private readonly properties: ReadonlySet<string> | undefined;
  private readonly pseudos: Set<string>;
  private readonly roots = new WeakSet<Document | ShadowRoot>();
  private readonly prefix = `dsk-page-${Math.random().toString(36).slice(2)}`;
  private readonly captured: CapturedPseudo[] = [];
  private readonly authored: Array<{
    root: Document | ShadowRoot;
    pseudo: string;
    selector: string;
    style: CSSStyleDeclaration;
  }> = [];
  private readonly elements: Array<{
    node: Element;
    clone: HTMLElement | SVGElement;
  }> = [];
  private readonly resources: ReturnType<typeof createPageResourceLoader>;
  private sequence = 0;
  readonly families = new Set<string>();
  readonly shadowRoots = new Set<ShadowRoot>();

  constructor(
    document: Document,
    options: Readonly<EyeDropperPageOptions>,
    signal: AbortSignal,
  ) {
    this.document = document;
    this.options = options;
    this.properties =
      options.styleProperties === undefined
        ? undefined
        : new Set(options.styleProperties);
    this.pseudos = new Set(
      options.pseudoElements === false
        ? []
        : (options.pseudoElements ?? eyeDropperPagePseudoElements),
    );
    this.resources = createPageResourceLoader(document, signal);
    this.discover(document);
  }

  private discover(root: Document | ShadowRoot): void {
    if (this.roots.has(root)) return;
    this.roots.add(root);
    if (root instanceof ShadowRoot) this.shadowRoots.add(root);
    const sheets = new WeakSet<CSSStyleSheet>();
    const readRules = (rules: CSSRuleList): void => {
      for (const rule of rules) {
        if (
          rule instanceof CSSMediaRule &&
          !this.document.defaultView!.matchMedia(rule.conditionText).matches
        )
          continue;
        if (
          rule instanceof CSSSupportsRule &&
          !CSS.supports(rule.conditionText)
        )
          continue;
        if (rule instanceof CSSStyleRule) {
          for (const selector of selectorBranches(rule.selectorText))
            for (const match of selector.matchAll(
              /::([a-zA-Z][\w-]*)(?![\w-]|\()|:(first-letter|first-line)(?![\w-])/g,
            )) {
              const pseudo = `::${match[1] ?? match[2]}`;
              if (this.options.pseudoElements === undefined)
                this.pseudos.add(pseudo);
              if (pseudo === '::first-letter' || pseudo === '::first-line')
                this.authored.push({
                  root,
                  pseudo,
                  selector: selector.replaceAll(match[0], ''),
                  style: rule.style,
                });
            }
        }
        if (
          rule instanceof CSSImportRule &&
          rule.styleSheet &&
          (!rule.media.mediaText ||
            this.document.defaultView!.matchMedia(rule.media.mediaText).matches)
        )
          readSheet(rule.styleSheet);
        if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList)
          readRules(rule.cssRules);
      }
    };
    const readSheet = (sheet: CSSStyleSheet): void => {
      if (
        sheets.has(sheet) ||
        sheet.disabled ||
        (sheet.media.mediaText &&
          !this.document.defaultView!.matchMedia(sheet.media.mediaText).matches)
      )
        return;
      sheets.add(sheet);
      try {
        readRules(sheet.cssRules);
      } catch {
        // Cross-origin rules may be unreadable; ordinary computed styles still work.
      }
    };
    for (const sheet of [...root.styleSheets, ...root.adoptedStyleSheets])
      readSheet(sheet);
  }

  private allows(
    node: Element,
    property: string,
    pseudo: string | null,
  ): boolean {
    return (
      (!this.properties || this.properties.has(property)) &&
      (this.options.filterStyles?.(node, property, pseudo) ?? true)
    );
  }

  private copy(
    node: Element,
    computed: CSSStyleDeclaration,
    target: CSSStyleDeclaration,
    pseudo: string | null,
    inherited?: CSSStyleDeclaration,
  ): void {
    // cloneNode copies authored inline declarations, which can be overridden by
    // CSS !important or animation in the live page. Start from resolved values.
    target.cssText = '';
    const authored = inherited
      ? this.authored.filter((rule) => {
          if (rule.root !== node.getRootNode() || rule.pseudo !== pseudo)
            return false;
          try {
            return node.matches(rule.selector);
          } catch {
            return false;
          }
        })
      : [];
    for (const property of computed) {
      // CSSOM exposes host defaults even when no typographic pseudo is styled.
      // Re-declaring those defaults would override a styled first line or a
      // generated child. Let unchanged values inherit in the reconstructed tree.
      if (
        inherited &&
        computed.getPropertyValue(property) ===
          inherited.getPropertyValue(property) &&
        !authored.some(({ style }) => style.getPropertyValue(property) !== '')
      )
        continue;
      if (this.allows(node, property, pseudo))
        target.setProperty(
          property,
          computed.getPropertyValue(property),
          computed.getPropertyPriority(property),
        );
    }
    // The capture represents one frame; replaying animations changes that frame.
    target.setProperty('animation', 'none', 'important');
    target.setProperty('transition', 'none', 'important');
    if (this.options.embedFonts !== false)
      collectFontFamilies(target.fontFamily, this.families);
  }

  /** Runs before the renderer applies scrolling and geometry corrections. */
  capture(node: Element, clone: Element): { generatedContent: boolean } {
    if (node.shadowRoot) this.discover(node.shadowRoot);
    const root = node.getRootNode();
    if (root instanceof ShadowRoot) this.discover(root);
    const view = this.document.defaultView!;
    const computed = view.getComputedStyle(node);
    if (clone instanceof HTMLElement || clone instanceof SVGElement) {
      this.copy(node, computed, clone.style, null);
      this.elements.push({ node, clone });
    }
    let generatedContent = false;
    for (const pseudo of this.pseudos) {
      if (!CSS.supports(`selector(${pseudo})`)) continue;
      if (
        pseudo === '::placeholder' &&
        !node.matches('input[placeholder],textarea[placeholder]')
      )
        continue;
      if (
        pseudo === '::file-selector-button' &&
        !node.matches('input[type="file"]')
      )
        continue;
      if (pseudo === '::marker' && !computed.display.includes('list-item'))
        continue;
      if (
        (pseudo === '::first-letter' || pseudo === '::first-line') &&
        (!node.textContent?.trim() ||
          ![
            'block',
            'list-item',
            'inline-block',
            'flow-root',
            'table-cell',
            'table-caption',
          ].includes(computed.display))
      )
        continue;
      const style = view.getComputedStyle(node, pseudo);
      if (style.length === 0) continue;
      if (pseudo === '::before' || pseudo === '::after') {
        if (
          !style.content ||
          style.content === 'none' ||
          style.content === 'normal'
        )
          continue;
        generatedContent = true;
      }
      const declarations = this.document.createElement('span').style;
      this.copy(
        node,
        style,
        declarations,
        pseudo,
        pseudo === '::first-letter' || pseudo === '::first-line'
          ? computed
          : undefined,
      );
      if (
        (pseudo === '::marker' ||
          pseudo === '::first-letter' ||
          pseudo === '::first-line') &&
        style.color !== computed.color &&
        (clone instanceof HTMLElement || clone instanceof SVGElement)
      ) {
        // Resolved RGB loses the inherited currentColor dependency. These text
        // pseudos cannot override WebKit text paint themselves; their resolved
        // paint following their own color proves that the host must retain it.
        for (const property of [
          '-webkit-text-fill-color',
          '-webkit-text-stroke-color',
        ]) {
          if (
            this.allows(node, property, null) &&
            computed.getPropertyValue(property) === computed.color &&
            style.getPropertyValue(property) === style.color
          ) {
            clone.style.setProperty(property, 'currentColor');
            if (
              this.allows(node, property, pseudo) &&
              declarations.getPropertyValue(property)
            )
              declarations.setProperty(property, 'currentColor');
          }
        }
      }
      const name = `${this.prefix}-${this.sequence++}`;
      clone.classList.add(name);
      this.captured.push({
        selector: `.${name}${pseudo}`,
        style: declarations,
        base: node.baseURI,
      });
    }
    return { generatedContent };
  }

  /** Resource inlining also covers styles stored in pseudo rules, not just nodes. */
  async css(): Promise<string> {
    return (
      await Promise.all(
        this.captured.map(async ({ selector, style, base }) => {
          const css =
            this.options.inlineImages === false
              ? style.cssText
              : await this.resources.inlineCss(style.cssText, base);
          return `${selector}{${css}}`;
        }),
      )
    ).join('\n');
  }

  /** Keep CSS resources and content images on the same escape-aware path. */
  async embedImages(root: HTMLElement): Promise<void> {
    if (this.options.inlineImages === false) return;
    await Promise.all(
      Array.from(root.querySelectorAll('*'), async (element) => {
        if (element instanceof HTMLElement || element instanceof SVGElement)
          element.style.cssText = await this.resources.inlineCss(
            element.style.cssText,
            this.document.baseURI,
          );
        if (element instanceof HTMLImageElement) {
          const source = element.getAttribute('src');
          if (!source) return;
          const embedded = await this.resources.dataUrl(source);
          if (embedded) element.src = embedded;
          else element.style.visibility = 'hidden';
        } else if (element instanceof SVGImageElement) {
          const source = element.href.baseVal;
          if (!source || source.startsWith('#')) return;
          const embedded = await this.resources.dataUrl(source);
          element.href.baseVal = embedded ?? '';
        }
      }),
    );
    root.style.cssText = await this.resources.inlineCss(
      root.style.cssText,
      this.document.baseURI,
    );
  }

  /** Remove renderer-added declarations outside an explicit capture allowlist. */
  finish(): void {
    if (!this.properties && !this.options.filterStyles) return;
    for (const { node, clone } of this.elements) {
      for (const property of Array.from(clone.style)) {
        if (
          property.startsWith('animation') ||
          property.startsWith('transition')
        )
          continue;
        if (!this.allows(node, property, null))
          clone.style.removeProperty(property);
      }
    }
  }
}
