<h1 align="center">
  <span style="font-size:24px">🌿🕸️ Mongo Data API</span><br />
  <sub><i>Mongo Client for an HTTPS World. Lambda and edge function friendly</i></sub>
</h1>

> A Mongo-like API for accessing the http-based [Mongo Data API](https://www.mongodb.com/docs/atlas/api/data-api/). Uses [BSON](https://www.npmjs.com/package/bson) to provide access to standard Mongo data types. BYO `fetch()` for maximum portability.

- [Usage](#usage)
  - [Authentication](#authentication)
    - [Using a Data API api key (preferred)](#using-a-data-api-api-key-preferred)
    - [Using Email and Password](#using-email-and-password)
    - [Using a custom JWT](#using-a-custom-jwt)
- [Supported Methods and API](#supported-methods-and-api)
  - [Create a Mongo Client](#create-a-mongo-client)
  - [Select a Database](#select-a-database)
  - [Select a Collection](#select-a-collection)
  - [Collection Methods](#collection-methods)
    - [Return Type](#return-type)
    - [Methods](#methods)
      - [findOne](#findone)
      - [find](#find)
      - [insertOne](#insertone)
      - [insertMany](#insertmany)
      - [updateOne](#updateone)
      - [updateMany](#updatemany)
      - [replaceOne](#replaceone)
      - [deleteOne](#deleteone)
      - [deleteMany](#deletemany)
      - [aggregate](#aggregate)
      - [callApi](#callapi)
- [Errors](#errors)
- [FAQ](#faq)
- [License](#license)

# Usage

```ts
import { MongoClient } from "@taskless/mongo-data-api";

const mc = new MongoClient({
  /** @type URL | string */
  endpoint: new URL(process.env.MONGO_HTTP_URL ?? "[not defined]"),
  /** @type string */
  dataSource: process.env.MONGO_HTTP_DATA_SOURCE ?? "[not defined]",

  /* See "Authentication" below */
  auth: {
    /* ... */
  },
});

await mc.findOne({
  /* good 'ole mongo */
});
```

## Authentication

Authenticating to the Mongo Data API is done with either an API Key, an email/password, or via a JWT string:

### Using a Data API api key (preferred)

```ts
{
  // ...
  auth: {
    /** @type string */
    apiKey: process.env.MONGO_HTTP_API_KEY ?? "[not defined]",
  },
}
```

### Using Email and Password

```ts
{
  // ...
  auth: {
    /** @type string */
    email: process.env.MONGO_EMAIL ?? "",
    /** @type string */
    password: process.env.MONGO_PASSWORD ?? "",
  },
}
```

### Using a custom JWT

```ts
{
  // ...
  auth: {
    /** @type string */
    jwtTokenString: request.headers.get("jwt"),
  },
}
```

# Supported Methods and API

## Create a Mongo Client

```ts
const client = new MongoClient(options);
```

- `options` - MongoClient options
  - `options.endpoint` - `string | URL` an endpoint for sending requests to. Your Data API Endpoint is available at your Mongo Data API UI `https://cloud.mongodb.com/v2/<projectId>#/dataAPI`, where `<projectId>` is your project ID. A single Data API is usable for the entire project, with individual data sources routing to specific atlas instances.
  - `options.dataSource` - `string` the `Data Source` for your Data API. On the Data API UI, this is the "Data Source" column, and usually is either a 1:1 mapping of your cluster name, or the default `mongodb-atlas` if you enabled Data API through the Atlas Admin UI.
  - `options.auth` - `AuthOptions` one of the authentication methods, either api key, email & password, or a custom JWT string. At this time, only [Credential Authentication](https://www.mongodb.com/docs/atlas/api/data-api/#credential-authentication) is supported.

## Select a Database

```ts
const db = client.db(databaseName);
```

- `databaseName` - `string` the name of the database to connect to

## Select a Collection

```ts
const collection = db.collection<TSchema>(collectionName);
```

- `collectionName` - `string` the name of the collection to connect to
- `<TSchema>` - _generic_ A Type or Interface that describes the documents in this collection. Defaults to the generic MongoDB `Document` type

## Collection Methods

The following [Data API resources](https://www.mongodb.com/docs/atlas/api/data-api-resources/) are supported

| resource     | support |
| :----------- | :-----: |
| `findOne`    |   ✅    |
| `find`       |   ✅    |
| `insertOne`  |   ✅    |
| `insertMany` |   ✅    |
| `updateOne`  |   ✅    |
| `updateMany` |   ✅    |
| `replaceOne` |   ✅    |
| `deleteOne`  |   ✅    |
| `deleteMany` |   ✅    |
| `aggregate`  |   ✅    |

Should Data API add support for other resources, the `callApi` method allows you to pass arbitrary JSON to a Data API resource. `mongo-data-api` automatically merges the `dataSource`, `database`, and `collection` parameters in if not specified.

### Return Type

All collection methods return an object containing `data?` and `error?`. This avoids throwing during requests, making it easier to handle the response without nesting try/catch operations.

```ts
interface DataAPIResponse {
  data?: TSchema;
  error?: DataAPIError;
}
```

### Methods

#### findOne

```ts
const { data, error } = await collection.findOne(filter, options);
```

- `filter?` - `Filter<TSchema>` A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/)
- `options?` - Query options
  - `options.projection?` - `Document` A [MongoDB Query Projection](https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/)

#### find

```ts
const { data, error } = await collection.find(filter, options);
```

- `filter?` - `Filter<TSchema>` A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/)
- `options?` Query options
  - `options.projection?` - `Document` A [MongoDB Query Projection](https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/)
  - `options.sort?` - `Sort` A [MongoDB Sort Expression](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/)
  - `options.limit?` - `number` The maximum number of matched documents to include in the returned result set. Each request may return up to 50,000 documents.
  - `options.skip?` - `number` The number of matched documents to skip before adding matched documents to the result set.

#### insertOne

```ts
const { data, error } = await collection.insertOne(document);
```

- `document` - `TSchema` The document to insert

#### insertMany

```ts
const { data, error } = await collection.insertMany(documents);
```

- `documents` - `TSchema[]` The documents to insert

#### updateOne

```ts
const { data, error } = await collection.updateOne(filter, update, options);
```

- `filter` - `Filter<TSchema>` A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/)
- `update` - `UpdateFilter<TSchema> | Partial<TSchema>` A [MongoDB Update Expression](https://www.mongodb.com/docs/manual/tutorial/update-documents/) that specifies how to modify the matched document
- `options?` Query options
  - `options.upsert` - `boolean` The upsert flag only applies if no documents match the specified filter. If true, the updateOne action inserts a new document that matches the filter with the specified update applied to it.

#### updateMany

```ts
const { data, error } = await collection.updateMany(filter, update, options);
```

- `filter` - `Filter<TSchema>` A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/)
- `update` - `UpdateFilter<TSchema> | Partial<TSchema>` A [MongoDB Update Expression](https://www.mongodb.com/docs/manual/tutorial/update-documents/) that specifies how to modify the matched document
- `options?` Query options
  - `options.upsert` - `boolean` The upsert flag only applies if no documents match the specified filter. If true, the updateOne action inserts a new document that matches the filter with the specified update applied to it.

#### replaceOne

```ts
const { data, error } = await collection.replaceOne(
  filter,
  replacement,
  options
);
```

- `filter` - `Filter<TSchema>` A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/)
- `replacement` - `WithoutId<TSchema>` The replacement document, without an `_id` attribute
- `options?` Query options
  - `options.upsert` - `boolean` The upsert flag only applies if no documents match the specified filter. If true, the updateOne action inserts a new document that matches the filter with the specified update applied to it.

#### deleteOne

```ts
const { data, error } = await collection.deleteOne(filter);
```

- `filter` - `Filter<TSchema>` A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/)

#### deleteMany

```ts
const { data, error } = await collection.deleteMany(filter);
```

- `filter` - `Filter<TSchema>` A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/)

#### aggregate

```ts
const { data, error } = await collection.aggregate<TOutput>(pipeline);
```

- `pipeline` - `Document[]` A [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/)
- `<TOutput>` - _generic_ A `Document` like object that describes the output of the aggregation pipeline

#### callApi

```ts
const { data, error } = await collection.callApi<T>(method, body);
```

- `method` - `string` A supported Mongo Data API Request method
- `body` - `Record<string, unknown>` An arbitrary key/value JSON-like data structure representing the body payload sent to the Mongo Data API
- `<T>` - _generic_ Describes the return type of `data` on a successful API call

# Errors

Requests via `fetch()` have their resposne codes checked against the [Data API Error Codes](https://www.mongodb.com/docs/atlas/api/data-api-resources/#error-codes) and on error, set the `error` property of the response to a `MongoDataAPIError`.

- `error.code` - `number` Contains the HTTP error code from the Mongo Data API
- `error.message` - `string` Contains the response status text or error message included from the Data API call

# FAQ

- **Why is `mongodb` in the dependencies?** The short answer is [TypeScript requires it](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html#dependencies). The mongodb dependency is types-only and will not be included in your built lambda when using `tsc`, `rollup`, `webpack`, and other bundling tools. Unfortunately, to re-export the types, it must be included as a regular dependency instead of dev-dependency. You can verify that mongo is not included by looking at the [CommonJS build](./dist/index.cjs).

# License

This library started out as a fork of the excellent [deno atlas_sdk module](https://deno.land/x/atlas_sdk@v1.1.1), optimized for node.js.

MIT
