# Releasing DSK

This is the owner-operated release guide for [Flowscape-UI/dsk](https://github.com/Flowscape-UI/dsk). Preparing these files does not publish a package, create a GitHub release, or deploy a site.

## GitHub setup

1. Push the reviewed project to the public `Flowscape-UI/dsk` repository on `main`, including the lockfile and `.github/workflows/`. GitHub Actions must be enabled and allowed to run the actions used in these workflows. A public repository is required for this workflow's npm provenance.
2. Open Settings > Pages > Build and deployment and choose **GitHub Actions** as Source. The `github-pages` environment must permit deployment from `main`.
3. Run **Deploy Pages** from Actions, or push to `main`. It deploys only the documentation to `https://flowscape-ui.github.io/dsk/`. Playground is local only. No npm credential is needed for Pages.
4. Wait for CI and Pages to succeed before announcing the release.

The documentation build requires the repository Actions secret `VITE_TLDRAW_LICENSE_KEY`. Set it under Settings > Secrets and variables > Actions with a tldraw public SDK license key valid for `flowscape-ui.github.io`. The Pages workflow passes it only to the documentation build step and stops if it is empty. Vite embeds it into the browser bundle, where the example passes it to `Tldraw.licenseKey`; this is a public client license, not a server credential. Local development and ordinary CI do not require the production key. Downloadable example projects retain their own empty `.env.example` for the user's key.

## npm setup and first publication

Your npm account must own or have publishing rights in the `@flowscape-ui` scope. The GitHub organization does not automatically create an npm organization. Create or join `flowscape-ui` on npm and enable account 2FA.

If the package already exists, configure OIDC below. For a new package, create its settings through staged publishing using a local npm session (npm 11.15.0 or newer). No `NPM_TOKEN` secret or bypass-2FA token is required.

Run from the repository root after verification:

```sh
npm login
pnpm --filter @flowscape-ui/dsk pack --out dsk-release.tgz
node packages/vanilla/scripts/verify-package.ts packages/vanilla/dsk-release.tgz
npm stage publish ./packages/vanilla/dsk-release.tgz --access public
npm stage list @flowscape-ui/dsk
```

Staging a new package creates a public `0.0.0-stage` placeholder. The submitted `1.0.0` contents remain pending until approved. Configure its Trusted Publisher before proceeding. Staging is not confirmation that `1.0.0` has been released.

A pending version reserves its version number: the release workflow cannot publish `1.0.0` while that same version is staged. To publish the final archive through OIDC, first review and reject the bootstrap stage with `npm stage reject <stage-id>` (requires owner 2FA), then publish the GitHub release. Alternatively, approving the staged archive publishes it directly and means the workflow must not publish the same version again. Do not approve or reject a stage without an explicit release decision.

See [staged publishing](https://docs.npmjs.com/staged-publishing/) and [npm stage](https://docs.npmjs.com/cli/v11/commands/npm-stage/).

## Publish 1.1.0

1. Verify `packages/vanilla/package.json` says `1.1.0` and the matching changelog entry says `Ready for release`. The library has no private flag; root and applications stay private.
2. Run `pnpm check`, `pnpm test:browser`, and `pnpm test:package`. Review documentation separately: `pnpm check` does not run its browser suite. Run the relevant documentation scenarios and report their results separately.
3. In GitHub Releases, draft a release titled **DSK 1.1.0**, create tag **v1.1.0** at the reviewed commit, and copy the release notes below. Keep it a draft until CI passes, the Trusted Publisher is configured, and no pending stage reserves `1.1.0`.
4. Click **Publish release**, with prerelease unchecked. This explicitly triggers `publish-npm.yml`, which validates metadata, checks and builds the project, packs using pnpm, verifies the archive, and publishes that same archive to npm.
5. Confirm `npm view @flowscape-ui/dsk@1.1.0 version` returns `1.1.0`. Then mark the changelog entry `Released` and add the actual **Released at** timestamp. Do not invent a release timestamp before publication succeeds.

Do not run `npm publish` on the workspace directory: pnpm packing replaces source-only exports with distribution paths. If a run fails after npm already accepted the version, inspect the registry before retrying; npm versions cannot be overwritten.

## OIDC configuration

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

DSK 1.1.0 adds consistent keyboard history to editor controls and configurable angle snapping.

- Undo/redo with Ctrl+Z / Ctrl+Shift+Z (Cmd on macOS) for angles, color controls, curves, ruler guides, pan/zoom cameras, linked fields, and layer edits.
- Shift-drag angle snapping in 5-degree increments by default, configurable with `snap-angle` or `snapAngle`.
- Shared bounded history implementation, with grouped pointer gestures and programmatic updates kept separate from user edits.
- Linked field undo restores each field's original value; uploaded files are excluded from history.
- Updated English and Russian API documentation and playground controls.
- Fixed homepage ruler touch gestures and focus transfers preserving canvas activation.

Install after publication: `npm i @flowscape-ui/dsk@1.1.0`

Documentation: https://flowscape-ui.github.io/dsk/
