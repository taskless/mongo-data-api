# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

### Added

### Fixed

### Changed

### Removed

## [0.2.1] - 2023-05-02

### Fixed

- Updated typescript documentation for `fetch?`

## [0.2.0] - 2023-05-02

### Breaking Changes

##### `fetch` is now a standard fetch function, and no longer an object requiring `Request`, `Response`, and `Headers`

When providing a custom `fetch()` function, it's no longer required to also pass the other elements such as `Request`, `Response` and `Headers`. This increases the number of libraries you can use with fetch.

```ts
// OLD
const c = new MongoClient({
  endpoint: BASE_URL,
  dataSource: "test-datasource",
  auth: { apiKey: "validApiKey" },
  fetch: {
    // fetch interface
  },
});

// NEW
const c = new MongoClient({
  endpoint: BASE_URL,
  dataSource: "test-datasource",
  auth: { apiKey: "validApiKey" },
  fetch: ponyfillFetch, // "as typeof fetch" may be required for some fetch libraries
});
```

### Added

- Created a `CHANGELOG.md` for changelog tracking
- Enabled support for plain JS objects in `headers`

### Fixed

### Changed

- Removed requirement for `Request` and `Response` in the custom fetch interface

### Removed

- Dropped `node-fetch` for `cross-fetch` in tests to minimze type assertions

## [0.1.2] - 2023-05-01

### Added

- Mongo Data API (all methods)
- Mongo Data API Auth
- Documentation
- Tests
- Standardized Release Process

## Older Releases

Older releases are available via github releases: https://github.com/taskless/mongo-data-api/releases

<!-- Releases -->

[unreleased]: https://github.com/taskless/mongo-data-api/compare/0.1.2...HEAD
[0.2.0]: https://github.com/taskless/mongo-data-api/compare/0.1.2...0.2.0
[0.1.2]: https://github.com/taskless/mongo-data-api/compare/320744af834ca94e450e2a129283e5c7500b763d...0.1.2

<!--
Template:

### Breaking Changes
### Added
### Fixed
### Changed
### Removed
-->
