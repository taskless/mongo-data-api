# Changelog

All notable changes to this project will be documented in this file. This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking Changes

### Added

### Fixed

### Changed

### Removed

## [0.3.0]

### Breaking Changes

- Updated minimum node version to `>=18.0.0`
- Package is now ESM-only. One major reason for this change is that TypeScript now understands ESM importing naturally, making it easy to use this package in TypeScript projects without any additional configuration. If you are using CommonJS, you will need to use a bundler such as Webpack or Rollup to use this package, or import the library dynamically using `await import("mongo-data-api")`. The following snippet will provide support for importing your module safely in CommonJS.

```ts
let mongoDataApiClient: MongoClient | undefined;
const createMongoClient = async () => {
  if (mongoDataApiClient) return mongoDataApiClient;

  const { MongoClient } = await import("mongo-data-api");
  mongoDataApiClient = new MongoClient(/*options*/);
  return mongoDataApiClient;
};
```

### Added

- Smart retries via `p-retry` for hard failures such as `ECONNRESET` and `ECONNREFUSED`

### Fixed

- Return type on `insertOne` is now of type `ObjectId` instead of `string`

### Changed

### Removed

## [0.2.2]

### Fixed

- `undefined` values in top level fields (sort, projection, etc) cause `400` from mongo #1

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

[unreleased]: https://github.com/taskless/mongo-data-api/compare/0.3.0...HEAD
[0.3.0]: https://github.com/taskless/mongo-data-api/compare/0.2.2...0.3.0
[0.2.2]: https://github.com/taskless/mongo-data-api/compare/0.2.1...0.2.2
[0.2.1]: https://github.com/taskless/mongo-data-api/compare/0.2.0...0.2.1
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
