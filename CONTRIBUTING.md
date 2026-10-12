# Contributing

DSK is a TypeScript component library with a playground and a bilingual documentation website. Start with [ARCHITECTURE.md](ARCHITECTURE.md) for ownership and design decisions. [AGENTS.md](AGENTS.md) contains implementation rules for coding agents working in this [repository](https://github.com/Flowscape-UI/dsk).

## Set up the [repository](https://github.com/Flowscape-UI/dsk)

Use Node.js 24.11+ and pnpm 10.33.2. The versions are recorded in `.node-version` and the root `package.json`.

```sh
npm install --global pnpm@10.33.2
pnpm install
pnpm dev
```

Run these commands from the [repository](https://github.com/Flowscape-UI/dsk) root. The playground opens on port 5173 and documentation on port 5174. Use `pnpm dev:playground` or `pnpm dev:docs` to start only one application. Development resolves the library's source exports, so no initial build is required.

## Find the right place to work

| Change                                  | Primary location                                   |
| --------------------------------------- | -------------------------------------------------- |
| Library behavior, models, and styles    | `packages/vanilla/src/`                            |
| Public component and type exports       | `packages/vanilla/src/index.ts`                    |
| Component playground                    | `apps/playground/`                                 |
| English documentation                   | `apps/docs/guide/`, `components/`, and `examples/` |
| Russian documentation                   | Matching paths under `apps/docs/ru/`               |
| Documentation theme and demo wrappers   | `apps/docs/.vitepress/theme/`                      |
| Runnable examples and engine adapters   | `apps/docs/snippets/`                              |
| Downloadable example project generation | `apps/docs/.vitepress/data/`                       |
| Release notes                           | `CHANGELOG.md`, current unreleased version         |

Keep application behavior in applications. The component library must not depend on the playground, documentation theme, or example engines. Import workspace dependencies through public exports rather than their private source paths.

## Implement a component change

1. Read the existing implementation, public API reference, and related tests.
2. Implement the behavior with strict TypeScript, HTML, and CSS. Keep pure model logic separate from DOM interaction when practical.
3. Preserve keyboard interaction, visible focus, accessible names, cancellation, and cleanup. Check mouse and touch interactions where supported. Do not substitute visual styling for `disabled` or `readonly` behavior.
4. Update public exports and declaration checks when the API changes.
5. Add or adjust meaningful behavior tests in the owning workspace.
6. Update the playground and both documentation languages. Record user-visible changes in the changelog.
7. Run the checks below and report their actual results.

Use CSS custom properties and exposed shadow parts for consumer customization. Do not make application examples depend on private shadow markup. Examples should start with the minimum imports and HTML; event handlers belong in examples that connect controls to application state.

## Documentation conventions

Write maintenance documents, implementation comments, and default library text in English. The website intentionally supports English and Russian: update paired pages and localized demo labels together. Use short hyphens instead of long dashes in prose.

Use `ExamplePanel` for live examples rather than inventing a new card style. Follow [the example panel guide](apps/docs/.vitepress/theme/EXAMPLES.md) and [documentation authoring guide](apps/docs/README.md). Check layout at desktop and mobile widths, keyboard interaction, and navigation cleanup.

Load browser-dependent code after client mounting in SSR examples. Integration walkthroughs, running demos, and downloadable source projects should describe the same implementation. When an adapter or archive generator changes, extract the affected ZIP and verify its documented install/build steps as well as the embedded demo.

Keep changelog entries factual: describe observable additions, changes, and fixes. Group them by the library version in `packages/vanilla/package.json`, newest first, with an explicit status and ISO 8601 recording timestamp including the timezone offset. Update the timestamp when revising an unreleased entry. Its recording date does not imply publication. Preserve published entries and add a new section for the next version after a release decision; do not bump versions solely to edit the changelog or mark planned features as implemented.

## Verify a change

Run the [repository](https://github.com/Flowscape-UI/dsk) checks before finishing:

```sh
pnpm check
```

This runs lint, formatting, source/configuration/test type checks, unit tests, production builds, and built public declaration checks. It does **not** run the browser suites. Documentation tests run against a production build, so changing source requires rebuilding before that suite.

| Command from [repository](https://github.com/Flowscape-UI/dsk) root | Test ownership                         | Build required first?                          |
| ------------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| `pnpm test`                                                         | `packages/vanilla/tests/unit/`         | No                                             |
| `pnpm test:browser`                                                 | `packages/vanilla/tests/browser/`      | No; starts the playground from source          |
| `pnpm test:package`                                                 | `packages/vanilla/tests/distribution/` | Yes; tests built ESM and IIFE outputs directly |
| `pnpm test:types`                                                   | `packages/vanilla/tests/types/`        | Yes; checks generated declarations             |
| `pnpm test:docs`                                                    | `apps/docs/tests/e2e/`                 | Yes; serves the built documentation            |

Unit tests use Node.js's built-in test runner and TypeScript stripping. The package's `test` script lists its unit test files explicitly: add a new file there so the suite actually runs it. Public declaration tests use NodeNext resolution without Vite globals or the source-only `development` condition.

### Browser setup

Windows uses installed Microsoft Edge by default. On Linux and macOS, install Chromium once:

```sh
pnpm --filter @flowscape-ui/dsk exec playwright install chromium
pnpm test:browser
```

To run a focused component scenario or documentation file:

```sh
pnpm test:browser tests/browser/upload.spec.ts
pnpm build
pnpm test:docs tests/e2e/inputs.spec.ts
```

Paths after each command are relative to the owning workspace. Component tests start a dedicated server on port 5183; documentation tests use port 5184. These servers stop after the run and do not reuse development servers on 5173/5174. Keep the test ports available.

The component config supports Firefox through `DSK_TEST_BROWSER=firefox`; install it with `pnpm --filter @flowscape-ui/dsk exec playwright install firefox`. For example, in PowerShell:

```powershell
$env:DSK_TEST_BROWSER = 'firefox'
pnpm test:browser tests/browser/input-pointer-events.spec.ts
Remove-Item Env:DSK_TEST_BROWSER
```

All browser configs accept `DSK_TEST_EXECUTABLE` for a compatible executable path. Documentation tests currently use Chromium/Edge; they do not read `DSK_TEST_BROWSER`.

Failure screenshots and traces are stored in the owning workspace's `test-results/`. For example, open a component trace with `pnpm --filter @flowscape-ui/dsk exec playwright show-trace test-results/<case>/trace.zip`. These generated files are ignored by Git.

### CI and known verification gaps

GitHub Actions installs dependencies with `--frozen-lockfile`, runs `pnpm check`, installs Chromium, and runs `pnpm test:browser` and `pnpm test:package`. It does not currently run `pnpm test:docs`.

The local documentation run on 2026-10-12 passed 47 of 55 tests. Eight scenarios in `documentation.spec.ts`, `homepage.spec.ts`, and `pan-zoom.spec.ts` still need reconciliation with the current homepage navigation, layout, mobile controls, and focus-to-interact behavior. This is a dated observation, not an expected-pass baseline or permission to skip tests. Review each failure against the intended behavior, update this note after verification, and report unresolved failures separately from new regressions.

## Dependencies and builds

Add dependencies to the workspace that uses them:

```sh
pnpm --filter @flowscape-ui/dsk add <package>
pnpm --filter @dsk/docs add -D <package>
```

Use `workspace:*` for local dependencies and include `pnpm-lock.yaml` with manifest changes. Preserve the VitePress patch declared in `pnpm-workspace.yaml` unless an upgrade has been verified to make it unnecessary.

Build and inspect a local package without publishing:

```sh
pnpm build
pnpm --filter @dsk/playground preview
pnpm --filter @flowscape-ui/dsk pack
```

`pack` runs the library's `prepack` build and creates a local `.tgz`. Library distribution includes `dist` and `assets`; applications and tests remain outside the package. MIT is the existing project license. The library is prepared for publication; root and application packages remain private. Publishing or changing licensing requires a separate owner decision.

## GitHub Pages and npm releases

The workflows target the [DSK repository](https://github.com/Flowscape-UI/dsk). They are configuration, not evidence that deployment or publication has occurred.

### Pages

In GitHub Settings > Pages, select **GitHub Actions** as the build source. `deploy-pages.yml` runs on pushes to `main` and manual dispatch. `pnpm pages:build` creates one artifact in `apps/docs/dist` for `https://flowscape-ui.github.io/dsk/`, containing only the documentation. The playground is a local development tool and is never included in Pages. Custom theme links and sidebar images honor that base. Ordinary development and `pnpm build` continue to use `/`.

The Pages build replaces local application outputs with their Pages variants. Run `pnpm build` again before root-path documentation browser tests or previewing the normal site. The workflow uses a separate deployment job and the `github-pages` environment.

### npm

`publish-npm.yml` runs when a non-prerelease GitHub release is published. It requires a tag exactly matching `v<version>` in `packages/vanilla/package.json`, for example `v1.0.0`. It verifies the release metadata, runs repository checks and both library browser suites, creates an archive with `pnpm pack`, validates every exported path, then publishes that exact archive with npm trusted publishing. Always pack with pnpm: it replaces local source exports with the distribution-only `publishConfig.exports`. Do not publish the workspace directory directly with npm.

Before publishing, mark the matching changelog entry `Ready for release` with a valid recording timestamp. This is preparation, not evidence of publication. Only after npm confirms success should it be marked `Released` with a separate actual release timestamp. The workflow also accepts existing `Released` entries.

See [the release guide](.github/RELEASING.md) for first-publish credentials, exact npm Trusted Publisher settings, Pages setup, and the release sequence.

The root and application packages remain private. Local build and test commands never publish or push a release.
