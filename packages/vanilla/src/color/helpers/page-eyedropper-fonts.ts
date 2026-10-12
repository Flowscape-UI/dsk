/** Normalize the family names used by computed styles and @font-face rules. */
export function collectFontFamilies(
  value: string,
  families: Set<string>,
): void {
  for (const match of value.matchAll(
    /\s*(?:"([^"]*)"|'([^']*)'|([^,]+))\s*(?:,|$)/g,
  )) {
    const family = (match[1] ?? match[2] ?? match[3] ?? '')
      .trim()
      .toLowerCase();
    if (family) families.add(family);
  }
}

interface FontRule {
  style: CSSStyleDeclaration;
  base: string;
}

/**
 * Find fonts in current CSSOM, imports, and open shadow roots. Font bytes are
 * embedded in the detached snapshot, including CORS-readable imported sheets.
 * Per-capture caches avoid duplicate requests without retaining stale styles.
 */
export async function snapshotFontCss(
  document: Document,
  families: ReadonlySet<string>,
  signal: AbortSignal,
  shadowRoots: ReadonlySet<ShadowRoot>,
): Promise<string> {
  const view = document.defaultView;
  if (!view || families.size === 0) return '';
  const fonts: FontRule[] = [];
  const seenSheets = new WeakSet<CSSStyleSheet>();
  const externalSheets = new Set<string>();
  const resources = new Map<string, Promise<string | null>>();

  const matchesMedia = (media: MediaList): boolean =>
    !media.mediaText || view.matchMedia(media.mediaText).matches;

  const readExternal = async (href: string): Promise<void> => {
    if (externalSheets.has(href)) return;
    externalSheets.add(href);
    try {
      const response = await view.fetch(href, { signal });
      if (!response.ok) return;
      const text = await response.text();
      signal.throwIfAborted();
      const detached = document.implementation.createHTMLDocument('');
      const style = detached.createElement('style');
      style.textContent = text;
      detached.head.append(style);
      if (style.sheet)
        await readRules(style.sheet.cssRules, response.url || href, true);
    } catch (error: unknown) {
      if (signal.aborted) throw error;
      // A stylesheet displayed by the browser may still reject CORS reads.
    }
  };

  const readSheet = async (
    sheet: CSSStyleSheet,
    base: string,
  ): Promise<void> => {
    if (seenSheets.has(sheet) || sheet.disabled || !matchesMedia(sheet.media))
      return;
    seenSheets.add(sheet);
    const href = sheet.href || base;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      if (sheet.href) await readExternal(sheet.href);
      return;
    }
    await readRules(rules, href);
  };

  const readRules = async (
    rules: CSSRuleList,
    base: string,
    external = false,
  ): Promise<void> => {
    for (const rule of rules) {
      signal.throwIfAborted();
      if (rule instanceof CSSFontFaceRule) {
        const declared = new Set<string>();
        collectFontFamilies(
          rule.style.getPropertyValue('font-family'),
          declared,
        );
        if ([...declared].some((family) => families.has(family)))
          fonts.push({ style: rule.style, base });
      } else if (rule instanceof CSSImportRule) {
        if (!matchesMedia(rule.media)) continue;
        const href = new URL(rule.href, base).href;
        // Detached Firefox documents expose empty import sheets with an invalid
        // base URL. Resolve fetched imports ourselves; live CSSOM stays current.
        if (external) await readExternal(href);
        else if (rule.styleSheet) await readSheet(rule.styleSheet, href);
        else await readExternal(href);
      } else if (rule instanceof CSSGroupingRule) {
        if (
          rule instanceof CSSMediaRule &&
          !view.matchMedia(rule.conditionText).matches
        )
          continue;
        if (
          rule instanceof CSSSupportsRule &&
          !CSS.supports(rule.conditionText)
        )
          continue;
        await readRules(rule.cssRules, base, external);
      }
    }
  };

  for (const root of [document, ...shadowRoots]) {
    for (const sheet of [...root.styleSheets, ...root.adoptedStyleSheets])
      await readSheet(sheet, document.baseURI);
  }

  const dataUrl = (url: string): Promise<string | null> => {
    let pending = resources.get(url);
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await view.fetch(url, { signal });
        if (!response.ok) return null;
        const blob = await response.blob();
        signal.throwIfAborted();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          const abort = (): void => {
            reader.abort();
            reject(signal.reason);
          };
          signal.addEventListener('abort', abort, { once: true });
          reader.onloadend = () => {
            signal.removeEventListener('abort', abort);
            if (typeof reader.result === 'string') resolve(reader.result);
            else
              reject(reader.error ?? new Error('Cannot read a captured font.'));
          };
          reader.readAsDataURL(blob);
        });
      } catch (error: unknown) {
        if (signal.aborted) throw error;
        return null;
      }
    })();
    resources.set(url, pending);
    return pending;
  };

  const embedSource = async (source: string, base: string): Promise<string> => {
    const urls = [
      ...source.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi),
    ];
    let result = source;
    for (const match of urls.reverse()) {
      const value = (match[1] ?? match[2] ?? match[3] ?? '').trim();
      if (/^data:/i.test(value)) continue;
      let replacement = '';
      try {
        replacement = (await dataUrl(new URL(value, base).href)) ?? '';
      } catch (error: unknown) {
        if (signal.aborted) throw error;
      }
      result =
        result.slice(0, match.index) +
        `url("${replacement}")` +
        result.slice(match.index + match[0].length);
    }
    return result;
  };

  const embedded = await Promise.all(
    fonts.map(async ({ style, base }) => {
      const source = await embedSource(style.getPropertyValue('src'), base);
      const declarations = Array.from(style, (property) => {
        const value =
          property === 'src' ? source : style.getPropertyValue(property);
        return `${property}:${value};`;
      }).join('');
      return `@font-face{${declarations}font-display:block;}`;
    }),
  );
  signal.throwIfAborted();
  return [...new Set(embedded)].join('\n');
}
