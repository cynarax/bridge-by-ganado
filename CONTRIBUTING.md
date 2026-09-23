# Contributing

Start with a reproducible user problem or a narrow bug. Explain the expected behavior, test it on synthetic data and preserve the existing tool, licence and security contracts.

## Local checks

Use a supported Node version and the pinned dependency graph:

```sh
cd agent
npm ci --ignore-scripts
npm run check
npm run selftest
cd ..
node --test tests/public-docs.test.mjs
```

The selftest creates temporary files; it is not a test against somebody else's Mac. Do not attach raw system reports, local paths, credentials or client data to a contribution. Use the private security contact for vulnerabilities.

## Pull requests

Describe the user-visible problem, affected connection route, change, test results and remaining limitations. Include a regression test for a behavior change. Do not weaken consent, SHA checks, schema validation, timeouts or authorization just to make a test pass. Do not alter a submitted tool contract without an explicit version/review plan.

Documentation and metadata must describe the currently delivered build. New features, support claims and release badges require evidence. Preserve the existing logo and MIT copyright notice. There is no CLA or promise of a response time.

## Release discipline

Do not overwrite a released archive or its checksum. `scripts/build-preview.mjs` builds a new artifact from the current source; publishing a replacement build requires a new version and full archive acceptance. Existing public CI runs are linked in [RELEASE_STATUS.md](RELEASE_STATUS.md).

The root Dockerfile is an isolated **local stdio evaluation** recipe, not a Mac emulator or an automatically paired hosted device. Never mount a host filesystem, Docker socket or production credentials into a directory-evaluation container.
