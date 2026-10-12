interface CssUrl {
  end: number;
  value: string;
}

/** Decode a CSS escape without treating escaped quotes as string delimiters. */
function cssEscape(css: string, start: number): CssUrl {
  let end = start + 1;
  if (end >= css.length) return { end, value: '' };
  const character = css[end]!;
  if (character === '\n' || character === '\f')
    return { end: end + 1, value: '' };
  if (character === '\r')
    return { end: end + (css[end + 1] === '\n' ? 2 : 1), value: '' };
  if (!/[\da-f]/i.test(character)) return { end: end + 1, value: character };
  const first = end;
  while (end < first + 6 && /[\da-f]/i.test(css[end] ?? '')) end++;
  const point = Number.parseInt(css.slice(first, end), 16);
  if (/[\t\n\f\r ]/.test(css[end] ?? '')) {
    if (css[end] === '\r' && css[end + 1] === '\n') end++;
    end++;
  }
  return {
    end,
    value: String.fromCodePoint(
      point === 0 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)
        ? 0xfffd
        : point,
    ),
  };
}

function skipWhitespace(css: string, start: number): number {
  let end = start;
  while (/[\t\n\f\r ]/.test(css[end] ?? '')) end++;
  return end;
}

/** Read quoted and unquoted URL tokens, including escaped closing brackets. */
function readCssUrl(css: string, start: number): CssUrl | undefined {
  let end = skipWhitespace(css, start + 3);
  if (css[end] !== '(') return;
  end = skipWhitespace(css, end + 1);
  const quote = css[end] === '"' || css[end] === "'" ? css[end++] : '';
  let value = '';
  while (end < css.length) {
    const character = css[end]!;
    if (character === '\\') {
      const escape = cssEscape(css, end);
      value += escape.value;
      end = escape.end;
    } else if (quote && character === quote) {
      end = skipWhitespace(css, end + 1);
      if (css[end] === ')') return { end: end + 1, value };
      return;
    } else if (!quote && character === ')') {
      return { end: end + 1, value };
    } else if (!quote && /[\t\n\f\r ]/.test(character)) {
      end = skipWhitespace(css, end);
      if (css[end] === ')') return { end: end + 1, value };
      return;
    } else if (
      (!quote &&
        (character === '(' || character === '"' || character === "'")) ||
      (quote && /[\n\r\f]/.test(character))
    ) {
      return;
    } else {
      value += character;
      end++;
    }
  }
  return;
}

function quotedCssUrl(value: string): string {
  return `url("${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
}

/** Inline extra CSS resources with a fresh, deduplicated cache per capture. */
export function createPageResourceLoader(
  document: Document,
  signal: AbortSignal,
): {
  inlineCss: (css: string, base: string) => Promise<string>;
  dataUrl: (url: string) => Promise<string | null>;
} {
  const view = document.defaultView;
  if (!view)
    throw new DOMException(
      'The page has no active window.',
      'InvalidStateError',
    );
  const resources = new Map<string, Promise<string | null>>();

  const readBlob = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      let settled = false;
      const cleanup = (): void => {
        signal.removeEventListener('abort', aborted);
        reader.onload = null;
        reader.onerror = null;
        reader.onabort = null;
      };
      const finish = (error?: unknown): void => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error !== undefined) reject(error);
        else if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Cannot read a captured CSS resource.'));
      };
      const aborted = (): void => {
        finish(
          signal.reason ??
            new DOMException('Page capture canceled.', 'AbortError'),
        );
        reader.abort();
      };
      reader.onload = () => finish();
      reader.onerror = () =>
        finish(
          reader.error ?? new Error('Cannot read a captured CSS resource.'),
        );
      reader.onabort = () =>
        finish(new DOMException('CSS resource read canceled.', 'AbortError'));
      signal.addEventListener('abort', aborted, { once: true });
      if (signal.aborted) aborted();
      else {
        try {
          reader.readAsDataURL(blob);
        } catch (error: unknown) {
          finish(error);
        }
      }
    });

  const dataUrl = (url: string): Promise<string | null> => {
    if (/^data:/i.test(url)) return Promise.resolve(url);
    let target: URL;
    try {
      target = new URL(url, document.baseURI);
    } catch {
      return Promise.resolve(null);
    }
    url = target.href;
    if (target.hash) {
      const fragment = target.hash;
      target.hash = '';
      return dataUrl(target.href).then((value) =>
        value ? value + fragment : null,
      );
    }
    const cached = resources.get(url);
    if (cached) return cached;
    const pending = (async () => {
      try {
        signal.throwIfAborted();
        const response = await view.fetch(url, { signal });
        if (!response.ok) return null;
        const blob = await response.blob();
        signal.throwIfAborted();
        return await readBlob(blob);
      } catch (error: unknown) {
        if (signal.aborted) throw error;
        return null;
      }
    })();
    resources.set(url, pending);
    return pending;
  };

  const inlineCss = async (css: string, base: string): Promise<string> => {
    signal.throwIfAborted();
    let output = '';
    let copied = 0;
    let cursor = 0;
    while (cursor < css.length) {
      signal.throwIfAborted();
      const character = css[cursor]!;
      // Text content and comments may mention url() without referencing an image.
      if (character === '/' && css[cursor + 1] === '*') {
        const end = css.indexOf('*/', cursor + 2);
        cursor = end < 0 ? css.length : end + 2;
      } else if (character === '"' || character === "'") {
        const quote = character;
        cursor++;
        while (cursor < css.length) {
          if (css[cursor] === '\\') cursor = cssEscape(css, cursor).end;
          else if (css[cursor++] === quote) break;
        }
      } else if (character === '\\') {
        cursor = cssEscape(css, cursor).end;
      } else if (
        css.slice(cursor, cursor + 3).toLowerCase() === 'url' &&
        !/[\w\-\\\u0080-\uffff]/.test(css[cursor - 1] ?? '')
      ) {
        const token = readCssUrl(css, cursor);
        if (!token) {
          cursor++;
          continue;
        }
        if (token.value && !/^(?:data:|#)/i.test(token.value)) {
          let replacement = '';
          try {
            const target = new URL(token.value, base);
            const fragment = target.hash;
            target.hash = '';
            const embedded = await dataUrl(target.href);
            if (embedded) replacement = embedded + fragment;
          } catch (error: unknown) {
            if (signal.aborted) throw error;
          }
          output += css.slice(copied, cursor) + quotedCssUrl(replacement);
          copied = token.end;
        }
        cursor = token.end;
      } else cursor++;
    }
    signal.throwIfAborted();
    return output + css.slice(copied);
  };
  return { inlineCss, dataUrl };
}
