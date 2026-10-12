# Documentation app

VitePress powers this bilingual documentation site. Content lives in ordinary Markdown: English at the root, Russian under `ru/`, with matching relative paths for language switching. The explicit bilingual product requirement applies to translated content; implementation comments remain English.

## Commands

- `pnpm dev:docs` from the [repository](https://github.com/Flowscape-UI/dsk) root: development server on port 5174.
- `pnpm --filter @dsk/docs build`: static production site in `apps/docs/dist` (build the library first, or use the root build).
- `pnpm --filter @dsk/docs preview`: serve the built site on port 4174.
- `pnpm test:docs`: documentation browser checks against the production build.

VitePress owns routing, sidebar navigation, the theme switch, language selection, code highlighting and local full-text search. Search is indexed at build time and needs no external service. The site uses Markdown with Vue-compatible embedded components, not MDX.

## Add a page

1. Add a `.md` file and its counterpart under `ru/`.
2. Add the matching route to `.vitepress/config.ts`.
3. Use absolute locale-prefixed links for Russian content.
4. Keep browser-dependent demos inside `ClientOnly`. Register demo components in `.vitepress/theme/index.ts`; implementations can use typed Vue render functions in `.ts` files.
5. Run `pnpm check`, then documentation browser checks for navigation, search, themes and examples.

The library itself remains framework-free. Vue is used only by the documentation engine. Framework integration pages are placeholders and must not imply that wrapper packages are available.

Live examples import `@flowscape-ui/dsk` through its public entry, only on the client. CSS maps the documentation's theme onto component variables. The navigation and playground share the square SVG at `packages/vanilla/assets/dsk-logo.svg`, exported as `@flowscape-ui/dsk/logo.svg`. The favicon embeds that same asset.

The homepage places controls beside the pan/zoom canvas on desktop and below the credits on mobile. Both rulers target the canvas and track its camera. Drag out guides, select them and press Delete to remove them. Color sliders sit below the color area. The homepage, navigation, and footer link to the [DSK source code](https://github.com/Flowscape-UI/dsk).

The homepage has a 3.8-second camera approach centered on the object with an eased 180-degree turn and gentle, low-frequency camera sway that fades completely at the end and intersection-based content reveals. Motion respects reduced-motion preferences, cancels on interaction, and cleans up on navigation. MIT license pages include the [repository](https://github.com/Flowscape-UI/dsk) license; keep `public/LICENSE.txt` synchronized when that text changes.

The pnpm patch for VitePress 1.6.4 guards outline DOM references after unmount. Its delayed scroll callback can otherwise throw during navigation from a scrolled page. Keep the navigation regression test when upgrading VitePress, and remove the patch once the upstream implementation handles this lifecycle case.

The homepage heading uses locally hosted variable Manrope (weight 750), with its OFL license in `.vitepress/theme/fonts/OFL.txt`. The heading keeps a fixed 104px inset inside the canvas on desktop (128px including the ruler). Below 1400px it switches to a centered composition. The heading uses 64px on desktop and 48px below 1400px; no fluid type scaling is used. Its three phrases use separate block spans in both locales.
