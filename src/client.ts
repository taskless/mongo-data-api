import { type OutgoingHttpHeaders } from "node:http";
import { EJSON } from "bson";
import type {
  Sort,
  Filter,
  OptionalUnlessRequiredId,
  UpdateFilter,
  WithId,
  WithoutId,
  Document,
} from "mongodb";
import type { AuthOptions } from "./authTypes.js";
import { MongoDataAPIError } from "./errors.js";

// reexport bson types
export { EJSON, ObjectId } from "bson";

// reexport relevant mongo types
export type {
  Document,
  Sort,
  Filter,
  OptionalUnlessRequiredId,
  UpdateFilter,
  WithId,
  WithoutId,
} from "mongodb";

// eslint-disable-next-line @typescript-eslint/ban-types
type Nullable<T> = T | null;

/** A data API response object */
type DataAPIResponse<T> = { data?: T; error?: MongoDataAPIError };

export type MongoClientConstructorOptions = {
  /**
   * Your atlas endpoint. Usually in the form of
   * https://data.mongodb-api.com/app/<clientAppId>/endpoint/data/v1
   * and retrievable from the Data API UI in Atlas. `clientAppId` is your Atlas App Service
   * friendly ID (not the hex string `_id` value).
   *
   * Your endpoint information is available at https://cloud.mongodb.com/v2/<projectId>#/dataAPI
   */
  endpoint: URL | string;
  /**
   * The [Atlas Data Source](https://cloud.mongodb.com/v2/<projectId>#/dataAPI). This tells
   * mongo which Cluster you want to run your queries against. The default data source
   * usually mimics your cluster's name, but you can find it in the Atlas UI.
   */
  dataSource: string;
  /**
   * An authentication method to use for your Atlas App Service. Supports API Key,
   * Email/Password, and Custom JWT as authentication methods.
   *
   * Read more: https://www.mongodb.com/docs/atlas/api/data-api/#authenticate-requests
   */
  auth: AuthOptions;
  /**
   * Provide a compatibility layer with a custom fetch implementation.
   */
  fetch?: typeof fetch;
  /**
   * Provide a custom Headers object for the request. In some situations such as testing,
   * this allows you to control the response from the mock server.
   */
  headers?: OutgoingHttpHeaders | Headers;
};

/**
 * Removes empty keys from an object at the top level. EJSON.stringify does not drop
 * undefined values in serialization, so we need to explicitly remove any keys with
 * null/undefined without recursing further into the object.
 */
const removeEmptyKeys = (object: Record<string, unknown>) => {
  return Object.fromEntries(Object.entries(object).filter(([_, v]) => v));
};

/**
 * Create a MongoDB-like client for communicating with the Atlas Data API
 *
 * ref: https://www.mongodb.com/docs/atlas/api/data-api-resources/
 *
 * The Data API client operates over https, which requires an available fetch()
 * implementation, either provided via polyfill, ponyfill, or natively available.
 *
 * To maximize compatibility, the client uses the application/ejson format in all
 * requests, converting mongo-style BSON to JSON and back again.
 */
export class MongoClient {
  dataSource: string;
  endpoint: string;

  fetch: typeof fetch;
  headers: HeadersInit;

  constructor({
    auth,
    dataSource,
    endpoint,
    fetch: customFetch,
    headers,
  }: MongoClientConstructorOptions) {
    this.dataSource = dataSource;
    this.endpoint = endpoint instanceof URL ? endpoint.toString() : endpoint;

    this.fetch = customFetch ?? globalThis.fetch;
    this.headers = {};

    // accept a node-style or whatwg headers object with .keys() and .get()
    if (typeof headers?.keys === "function") {
      for (const key of headers.keys()) {
        this.headers[key] = (
          typeof headers.get === "function" ? headers.get(key) : headers[key]
        ) as string;
      }
    }

    if (!this.fetch || typeof this.fetch !== "function") {
      throw new Error(
        "No viable fetch() found. Please provide a fetch interface"
      );
    }

    this.headers["Content-Type"] = "application/ejson";
    this.headers.Accept = "application/ejson";

    if ("apiKey" in auth) {
      this.headers.apiKey = auth.apiKey;
      return;
    }

    if ("jwtTokenString" in auth) {
      this.headers.jwtTokenString = auth.jwtTokenString;
      return;
    }

    if ("email" in auth && "password" in auth) {
      this.headers.email = auth.email;
      this.headers.password = auth.password;
      return;
    }

    if ("bearerToken" in auth) {
      this.headers.Authorization = `Bearer ${auth.bearerToken}`;
      return;
    }

    throw new Error("Invalid auth options");
  }

  /** Select a database from within the data source */
  db(name: string) {
    return new Database(name, this);
  }
}

/**
 * Represents a Mongo Database object. Contains information about the selected
 * database, as well as connection information for performing
 * queries.
 */
export class Database {
  name: string;
  client: MongoClient;

  constructor(name: string, client: MongoClient) {
    this.name = name;
    this.client = client;
  }

  /**
   * Get a Collection from the Database
   * @param name The collection name
   * @typeParam `T` The type of document stored in the collection
   * @returns A Collection object of type `T`
   */
  collection<TSchema = Document>(name: string) {
    return new Collection<TSchema>(name, this);
  }
}

/**
 * Represents a Mongo Collection object of type `<T>`, providing query
 * methods in a fluent interface.
 */
export class Collection<TSchema = Document> {
  name: string;
  database: Database;
  client: MongoClient;

  constructor(name: string, database: Database) {
    this.name = name;
    this.database = database;
    this.client = database.client;
  }

  /**
   * Find a single document in the collection. **note:** The `findOne()` operation does not provide a sort operation for finding a returning the first record in a set. If you must `findOne` and `sort`, use the `find()` operation instead.
   * [example](https://www.mongodb.com/docs/atlas/api/data-api-resources/#find-a-single-document)
   *
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The findOne action returns the first document in the collection that matches this filter.
   *
   * If you do not specify a filter, the action matches all document in the collection.
   * @param options Query options
   * @param options.projection A [MongoDB Query Projection](https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/). Depending on the projection, the returned document will either omit specific fields or include only specified fields or values.
   * @returns A matching document, or `null` if no document is found
   */
  async findOne(
    filter?: Filter<TSchema>,
    options: { projection?: Document; sort?: Document } = {}
  ): Promise<DataAPIResponse<Nullable<WithId<TSchema>>>> {
    const { data, error } = await this.callApi<{ document: WithId<TSchema> }>(
      "findOne",
      {
        filter,
        projection: options.projection,
        sort: options.sort,
      }
    );

    if (data) {
      return { data: data.document ?? null, error };
    }

    return { data, error };
  }

  /**
   * Find multiple documents in the collection matching a query.
   * [example](https://www.mongodb.com/docs/atlas/api/data-api-resources/#find-multiple-documents)
   *
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The find action returns documents in the collection that match this filter.
   *
   * If you do not specify a `filter`, the action matches all document in the collection.
   *
   * If the filter matches more documents than the specified `limit`, the action only returns a subset of them. You can use `skip` in subsequent queries to return later documents in the result set.
   * @param options Query options
   * @param options.projection A [MongoDB Query Projection](https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/). Depending on the projection, the returned document will either omit specific fields or include only specified fields or values.
   * @param options.sort A [MongoDB Sort Expression](https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/). Matched documents are returned in ascending or descending order of the fields specified in the expression.
   * @param options.limit The maximum number of matched documents to include in the returned result set. Each request may return up to 50,000 documents.
   * @param options.skip The number of matched documents to skip before adding matched documents to the result set.
   * @returns An array of matching documents
   */
  async find(
    filter?: Filter<TSchema>,
    options?: {
      projection?: Document;
      sort?: Sort;
      limit?: number;
      skip?: number;
    }
  ): Promise<DataAPIResponse<WithId<TSchema>[]>> {
    const { data, error } = await this.callApi<{
      documents: WithId<TSchema>[];
    }>("find", {
      filter,
      projection: options?.projection,
      sort: options?.sort,
      limit: options?.limit,
      skip: options?.skip,
    });

    if (data) {
      return { data: data.documents, error };
    }

    return { data, error };
  }

  /**
   * Insert a single document into the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#insert-a-single-document)
   * @param document The document to insert (of type `T`)
   * @returns The insertOne action returns the _id value of the inserted document as a string in the insertedId field
   */
  async insertOne(
    document: OptionalUnlessRequiredId<TSchema>
  ): Promise<DataAPIResponse<{ insertedId: string }>> {
    return this.callApi("insertOne", {
      document,
    });
  }

  /**
   * Insert several documents into the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#insert-multiple-documents)
   * @param docs An array of documents to insert (of type `T[]`)
   * @returns The insertMany action returns the _id values of all inserted documents as an array of strings in the insertedIds field
   */
  async insertMany(
    documents: OptionalUnlessRequiredId<TSchema>[]
  ): Promise<DataAPIResponse<{ insertedIds: string[] }>> {
    return this.callApi("insertMany", { documents });
  }

  /**
   * Update a single matching document in the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#update-a-single-document)
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The updateOne action modifies the first document in the collection that matches this filter.
   * @param update A [MongoDB Update Expression](https://www.mongodb.com/docs/manual/tutorial/update-documents/) that specifies how to modify the matched document.
   * @param options Query options
   * @param options.upsert The upsert flag only applies if no documents match the specified filter. If true, the updateOne action inserts a new document that matches the filter with the specified update applied to it.
   * @returns The updateOne action returns:
   *   - the number of documents that the filter matched in the `matchedCount` field
   *   - the number of matching documents that were updated in the `modifiedCount` field
   *
   * If upsert is set to true and no documents match the filter, the action returns the `_id` value of the inserted document as a string in the `upsertedId` field
   */
  async updateOne(
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema> | Partial<TSchema>,
    options: { upsert?: boolean } = {}
  ): Promise<
    DataAPIResponse<{
      matchedCount: number;
      modifiedCount: number;
      upsertedId?: string;
    }>
  > {
    return this.callApi("updateOne", {
      filter,
      update,
      upsert: options.upsert,
    });
  }

  /**
   * Update multiple documents in the collection matching a criteria. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#update-multiple-documents)
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The updateMany action modifies all documents in the collection that match this filter.
   * @param update A [MongoDB Update Expression](https://www.mongodb.com/docs/manual/tutorial/update-documents/) that specifies how to modify matched documents.
   * @param options Query options
   * @param options.upsert The upsert flag only applies if no documents match the specified filter. If true, the updateMany action inserts a new document that matches the filter with the specified update applied to it.
   * @returns The updateMany action returns:
   *   - the number of documents that the filter matched in the `matchedCount` field
   *   - the number of matching documents that were updated in the `modifiedCount` field
   *
   * If upsert is set to true and no documents match the filter, the action returns the `_id` value of the inserted document as a string in the `upsertedId` field
   */
  async updateMany(
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema>,
    { upsert }: { upsert?: boolean } = {}
  ): Promise<
    DataAPIResponse<{
      matchedCount: number;
      modifiedCount: number;
      upsertedId?: string;
    }>
  > {
    return this.callApi("updateMany", {
      filter,
      update,
      upsert,
    });
  }

  /**
   * Replace a single document in the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#replace-a-single-document)
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The replaceOne action overwrites the first document in the collection that matches this filter.
   * @param replacement The replacement document.
   * @param options Query options
   * @param options.upsert The upsert flag only applies if no documents match the specified filter. If true, the replaceOne action inserts a new document that matches the filter with the specified replacement applied to it.
   * @returns The replaceOne action returns:
   *   - the number of documents that the filter matched in the `matchedCount` field
   *   - the number of matching documents that were updated in the `modifiedCount` field
   *
   * If upsert is set to true and no documents match the filter, the action returns the `_id` value of the inserted document as a string in the `upsertedId` field
   */
  async replaceOne(
    filter: Filter<TSchema>,
    replacement: WithoutId<TSchema>,
    options: { upsert?: boolean } = {}
  ): Promise<
    DataAPIResponse<{
      matchedCount: number;
      modifiedCount: number;
      upsertedId?: string;
    }>
  > {
    return this.callApi("replaceOne", {
      filter,
      replacement,
      upsert: options.upsert,
    });
  }

  /**
   * Delete a single document in the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#delete-a-single-document)
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The deleteOne action deletes the first document in the collection that matches this filter.
   * @returns The deleteOne action returns the number of deleted documents in the deletedCount field
   */
  async deleteOne(
    filter: Filter<TSchema>
  ): Promise<DataAPIResponse<{ deletedCount: number }>> {
    return this.callApi("deleteOne", {
      filter,
    });
  }

  /**
   * Delete multiple documents from the collection matching a filter. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#delete-multiple-documents)
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The deleteMany action deletes all documents in the collection that match this filter.
   * @returns The deleteMany action returns the number of deleted documents in the deletedCount field
   */
  async deleteMany(
    filter: Filter<TSchema>
  ): Promise<DataAPIResponse<{ deletedCount: number }>> {
    return this.callApi("deleteMany", { filter });
  }

  /**
   * Run an aggregation pipeline on the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#aggregate-documents)
   * @param pipeline A [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/).
   * @returns The aggregate action returns the result set of the final stage of the pipeline as an array of documents, automatically unwrapping the Atlas `documents` field
   */
  async aggregate<TOutput = Document>(
    pipeline: Document[]
  ): Promise<DataAPIResponse<TOutput[]>> {
    const response = await this.callApi<{ documents: TOutput[] }>("aggregate", {
      pipeline,
    });

    return response.data
      ? { data: response.data.documents }
      : { error: response.error ?? new MongoDataAPIError("Unknown error", -1) };
  }

  /**
   * Call a raw Data API resource
   * @param method The Data API resource to call
   * @param body The JSON body to include, merged with the collection, dataSource, and database names
   * @returns The response from the Data API, or a DataAPIError if the request failed
   */
  async callApi<T = unknown>(
    method: string,
    body: Record<string, unknown>
  ): Promise<DataAPIResponse<T>> {
    const { endpoint, dataSource, headers } = this.client;
    const url = `${endpoint}/action/${method}`;

    const response = await this.client.fetch(url, {
      method: "POST",
      headers,
      body: EJSON.stringify({
        collection: this.name,
        database: this.database.name,
        dataSource,
        ...removeEmptyKeys(body),
      }),
    });

    // interpret response code. Log error for anything outside of 2xx 3xx
    // https://www.mongodb.com/docs/atlas/api/data-api-resources/#error-codes
    if (response.status < 200 || response.status >= 400) {
      let errorText: string | undefined;
      try {
        errorText = ((await response.json()) as { error: string })?.error;
      } catch {
        /* c8 ignore next */
      }

      const fallbackMessage = {
        400: "Bad Request",
        401: "Unauthorized",
        404: "Not Found",
        500: "Internal Server Error",
      };

      return {
        error: new MongoDataAPIError(
          errorText ??
            response.statusText ??
            fallbackMessage?.[response.status] ??
            "Data API Error",
          response.status
        ),
      };
    }

    const text = await response.text();

    return { data: EJSON.parse(text) as T };
  }
}
