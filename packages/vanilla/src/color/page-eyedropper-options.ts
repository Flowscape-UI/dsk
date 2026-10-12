/** Pseudo-elements captured even when their styles come only from the browser. */
export const eyeDropperPagePseudoElements: readonly string[] = Object.freeze([
  '::before',
  '::after',
  '::placeholder',
  '::marker',
  '::first-letter',
  '::first-line',
  '::file-selector-button',
]);

/** Optional performance tradeoffs for page snapshots; omitted features stay on. */
export interface EyeDropperPageOptions {
  readonly embedFonts?: boolean;
  readonly inlineImages?: boolean;
  readonly preserveScroll?: boolean;
  /** Replaces defaults and stylesheet discovery. An empty list or false disables pseudos. */
  readonly pseudoElements?: readonly string[] | false;
  /** CSS property names, including custom properties. Omit to copy every computed property. */
  readonly styleProperties?: readonly string[];
  /** Further restrict element and pseudo styles. Viewport geometry remains managed by DSK. */
  readonly filterStyles?: (
    element: Element,
    property: string,
    pseudo: string | null,
  ) => boolean;
  /** Excluding a node also excludes its descendants. The document root is always captured. */
  readonly filter?: (node: Node) => boolean;
}
