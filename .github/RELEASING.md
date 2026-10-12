# Releasing DSK 1.0.0

This is the owner-operated release guide for [Flowscape-UI/dsk](https://github.com/Flowscape-UI/dsk). Preparing these files does not publish a package, create a GitHub release, or deploy a site.

## GitHub setup

1. Push the reviewed project to the public `Flowscape-UI/dsk` repository on `main`, including the lockfile and `.github/workflows/`. GitHub Actions must be enabled and allowed to run the actions used in these workflows. A public repository is required for this workflow's npm provenance.
2. Open Settings > Pages > Build and deployment and choose **GitHub Actions** as Source. The `github-pages` environment must permit deployment from `main`.
3. Run **Deploy Pages** from Actions, or push to `main`. It deploys only the documentation to `https://flowscape-ui.github.io/dsk/`. Playground is local only. No npm credential is needed for Pages.
4. Wait for CI and Pages to succeed before announcing the release.

## npm setup and first publication

Your npm account must own or have publishing rights in the `@flowscape-ui` scope. The GitHub organization does not automatically create an npm organization. Create or join `flowscape-ui` on npm and enable account 2FA.

If the package already has a Trusted Publisher, use the OIDC configuration below. If it does not yet have a package settings page, bootstrap its first publication with a short-lived granular access token:

- In npm Access Tokens, create a token with **Read and write (publish and stage)** for the `@flowscape-ui` scope and **Bypass two-factor authentication** for unattended publication. Select only that scope and a short expiry. Organization-management permissions alone do not grant package publication rights.
- Save it in GitHub Settings > Secrets and variables > Actions > New repository secret, named **NPM_TOKEN**. Never commit the token. Only the publish step receives it.
- After the first successful release, revoke this token and delete the GitHub secret. Configure OIDC near the next release.

See [npm token permissions](https://docs.npmjs.com/creating-and-viewing-access-tokens/).

## Publish 1.0.0

1. Verify `packages/vanilla/package.json` says `1.0.0` and the matching changelog entry says `Ready for release`. The library has no private flag; root and applications stay private.
2. Run `pnpm check`, `pnpm test:browser`, and `pnpm test:package`. Review documentation separately: `pnpm check` does not run its browser suite. CONTRIBUTING.md records previously unresolved documentation scenarios; reconcile them before declaring all documentation tests green.
3. In GitHub Releases, draft a release titled **DSK 1.0.0**, create tag **v1.0.0** at the reviewed commit, and copy the release notes below. Keep it a draft until the npm credential is ready.
4. Click **Publish release**, with prerelease unchecked. This explicitly triggers `publish-npm.yml`, which validates metadata, checks and builds the project, packs using pnpm, verifies the archive, and publishes that same archive to npm.
5. Confirm `npm view @flowscape-ui/dsk@1.0.0 version` returns `1.0.0`. Then mark the changelog entry `Released` and add the actual **Released at** timestamp. Do not invent a release timestamp before publication succeeds.

Do not run `npm publish` on the workspace directory: pnpm packing replaces source-only exports with distribution paths. If a run fails after npm already accepted the version, inspect the registry before retrying; npm versions cannot be overwritten.

## OIDC for subsequent releases

In npm's package Settings > Trusted publishing, add GitHub Actions:

| Field                | Value                       |
| -------------------- | --------------------------- |
| Organization or user | `Flowscape-UI`              |
| Repository           | `dsk`                       |
| Workflow filename    | `publish-npm.yml`           |
| Environment          | Leave empty                 |
| Allowed actions      | Enable direct `npm publish` |

The workflow already grants `id-token: write` and uses a compatible npm runtime. It does not use a GitHub environment for npm; `github-pages` belongs only to the site deployment. Newly configured trusted publishers currently require a successful first publish within two days, so create this configuration near the next release. If it expires, recreate it. See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

## Release notes to paste

DSK 1.0.0 is the first stable release of Design System Kit: framework-independent Web Components for creative tools and editors.

- 19 custom elements for numeric, HEX, color and file inputs, groups, color controls and eyedroppers, angles, curves, layer trees, pan/zoom, rulers, and canvas markers.
- Typed events and APIs, keyboard interaction, CSS custom properties, and shadow parts.
- ESM and standalone browser builds, TypeScript declarations, and shared styles.
- English and Russian documentation with interactive demos and downloadable integrations for tldraw, Excalidraw, React Flow, Three.js, Konva.js, and Fabric.js.
- MIT license.

Install: `npm i @flowscape-ui/dsk`

Documentation: https://flowscape-ui.github.io/dsk/
