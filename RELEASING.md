# Releasing using `release-it`

This repository releases code using [release-it](https://github.com/release-it/release-it). New releases can be triggered from the root package via `pnpm yeet` which offers a guided process.

## Common Commands

- Begin a new for the next version `next` with `pnpm yeet <major|minor|patch> --preRelease=next`
- Continue an existing `major`, `minor`, or `patch` pre release with `pnpm yeet`
- Change the pre release tag with a new `--preRelease=` flag
- Ultimately release with `pnpm yeet <major|minor|patch>`
