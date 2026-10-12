<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Design System Kit: development guidelines

These instructions apply throughout the [repository](https://github.com/Flowscape-UI/dsk). Use [ARCHITECTURE.md](ARCHITECTURE.md) for design boundaries and [CONTRIBUTING.md](CONTRIBUTING.md) for setup and verification commands. Package manifests, source exports, and test configurations describe the implemented behavior; update documentation when they change.

## Workspace ownership

- Implement the library in `packages/vanilla/src/`. Its public package name is `@flowscape-ui/dsk`.
- Keep the component playground in `apps/playground` and the VitePress documentation in `apps/docs`.
- Keep library tests in `packages/vanilla/tests/unit`, `tests/browser`, `tests/types`, and `tests/distribution`. Keep documentation browser tests in `apps/docs/tests/e2e`. Do not put workspace-owned tests or Playwright configurations back at the [repository](https://github.com/Flowscape-UI/dsk) root.
- Import sibling packages through their public exports and declare dependencies with `workspace:*`. Do not import another workspace's private source files.
- Add dependencies to the workspace that uses them. Use pnpm and update `pnpm-lock.yaml` alongside manifest changes.
- Do not create placeholder framework packages. React and other engine dependencies used by documentation examples belong to `apps/docs`, not to the component library.

## Implementation

- The library uses strict TypeScript, HTML, and CSS without a runtime UI framework. tsdown emits ESM and a browser IIFE, plus CSS and declarations. Development requires Node.js 24.11+; use the version in `.node-version`. The documentation uses Vue through VitePress; this does not change the library's framework-independent design.
- Write source, configuration, and test code in TypeScript. Use explicit class fields and accessors, narrow DOM types, and avoid `any` or type-check suppression.
- Export public components and types through `packages/vanilla/src/index.ts`. Keep model logic separate from DOM interaction where practical.
- Give each component family an explicit `index.ts` for public exports and element registration. Keep public implementations in its root and internal utilities in `helpers/`; the package entry re-exports family indexes. Every source directory, including helpers, must have an index.ts. Helper indexes re-export internal modules for discovery; they do not expand the public package API. Internal files should import concrete modules, not their own family or helper index, to avoid cycles and preserve lazy loading.
- Prefix public library classes and CSS custom properties with `dsk-`. Do not add a library-wide global reset. Expose supported styling through custom properties and shadow parts.
- Support keyboard input, visible focus, accessible names, and the component's disabled/readonly semantics. Clean up listeners, observers, animation frames, pointer capture/lock, and object URLs on disposal or disconnection as applicable.
- Keep user edits and programmatic assignments distinct. Preserve each component's documented event contract; prevent feedback loops when connecting controls to an editor.
- Import DOM-dependent components and rendering engines only on the client in SSR examples. Dispose mounted examples on navigation and ignore stale asynchronous initialization.

## Documentation and language

- Write [repository](https://github.com/Flowscape-UI/dsk) maintenance documents, code comments, and default library text in English. The documentation website is explicitly bilingual: English pages live under `apps/docs`, and matching Russian pages live under `apps/docs/ru`.
- Update both documentation languages when changing shared public behavior. Preserve localized demo labels. Use short hyphens instead of long dashes in prose.
- Start usage examples with imports and minimal markup. Add event handlers only when the example needs application behavior. Custom elements require explicit closing tags in HTML.
- Reuse `ExamplePanel` for documentation demos; see [the example panel guide](apps/docs/.vitepress/theme/EXAMPLES.md). Keep runnable integration code in `apps/docs/snippets` and synchronize its walkthrough and downloadable project.
- Update the playground, API documentation, public type checks, and relevant behavior tests when changing public APIs.
- Add user-visible changes to the current unreleased version entry in `CHANGELOG.md`. Match the version in `packages/vanilla/package.json`, retain Added/Changed/Fixed sections, and update its ISO 8601 recording timestamp with an explicit timezone offset. A recording timestamp is not a release date. Keep published entries immutable; do not invent releases or change package versions without a release decision.

## Verification and delivery

- Run `pnpm check` before finishing changes. It includes lint, formatting, source/test type checks, unit tests, production builds, and built public declaration checks.
- Browser suites are separate: use `pnpm test:package` after building to verify distribution files; use `pnpm test:browser` for component interactions and `pnpm test:docs` after a build for documentation behavior. Run relevant scenarios for the change; do not imply that `pnpm check` ran browser tests.
- Report actual verification results and unresolved failures. Do not remove assertions or mark tests skipped to hide failures.
- Preserve unrelated working-tree changes. Avoid editing generated `dist`, test reports, or dependency files as source fixes.
- The project uses the existing MIT license. Do not publish packages, enable publication, or change licensing without a separate owner decision.
