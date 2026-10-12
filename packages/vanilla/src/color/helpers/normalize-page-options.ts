import type { EyeDropperPageOptions } from '../page-eyedropper-options.ts';

/** Snapshot configuration must not change underneath an asynchronous capture. */
export function normalizePageOptions(
  value: EyeDropperPageOptions | null | undefined,
): Readonly<EyeDropperPageOptions> {
  if (value == null) return Object.freeze({});
  if (typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Page options must be an object.');
  for (const name of ['embedFonts', 'inlineImages', 'preserveScroll'] as const)
    if (value[name] !== undefined && typeof value[name] !== 'boolean')
      throw new TypeError(`Page ${name} must be a boolean.`);
  for (const name of ['filter', 'filterStyles'] as const)
    if (value[name] !== undefined && typeof value[name] !== 'function')
      throw new TypeError(`Page ${name} must be a function.`);
  const list = (
    entries: readonly string[],
    pseudo: boolean,
  ): readonly string[] => {
    if (
      !Array.isArray(entries) ||
      !entries.every(
        (entry: unknown) =>
          typeof entry === 'string' &&
          (pseudo
            ? /^::[a-zA-Z][\w-]*$/.test(entry)
            : /^(?:--[\w\u0080-\uFFFF-]+|[a-zA-Z-][\w-]*)$/.test(entry)),
      )
    )
      throw new TypeError(
        pseudo
          ? 'Page pseudo-elements must be simple ::name selectors.'
          : 'Page style properties must be CSS property names.',
      );
    return Object.freeze([...new Set(entries)]);
  };
  return Object.freeze({
    ...value,
    ...(value.pseudoElements !== undefined && value.pseudoElements !== false
      ? { pseudoElements: list(value.pseudoElements, true) }
      : {}),
    ...(value.styleProperties !== undefined
      ? { styleProperties: list(value.styleProperties, false) }
      : {}),
  });
}
