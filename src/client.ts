import { EJSON } from "bson";
import type {
  Filter,
  OptionalUnlessRequiredId,
  UpdateFilter,
  WithId,
  WithoutId,
  Document,
} from "mongodb";
import type { AuthOptions } from "./authTypes.js";
import { MongoDataAPIError } from "./errors.js";
import {
  type AggregateResponse,
  type DataAPIResponse,
  type DeleteManyResponse,
  type DeleteOneResponse,
  type FindOneRequestOptions,
  type FindOneResponse,
  type FindRequestOptions,
  type FindResponse,
  type InsertManyResponse,
  type InsertOneResponse,
  type ReplaceOneRequestOptions,
  type ReplaceOneResponse,
  type UpdateManyRequestOptions,
  type UpdateManyResponse,
  type UpdateOneRequestOptions,
  type UpdateOneResponse,
} from "./responseTypes.js";

// reexport bson objects that make working with mongo-data-api easier
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

/**
 * Defines a set of options that affect the request to make to the Atlas Data API. All
 * fields are optional, but must eventually be resolved by the time you execute a query.
 */
export type RequestOptions = {
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
  auth?: AuthOptions;
  /**
   * Provide a compatibility layer with a custom fetch implementation.
   */
  fetch?: typeof fetch;
};

/** Options passed to the callAPI method */
type callAPIOptions = {
  /** Convienence property for setting the x-realm-op-name header */
  operationName?: string;
};

/** Describes a set of resolved connection options, with a normalized headers object and fetch method */
type ConnectionOptions = {
  dataSource?: string;
  endpoint?: string;
  headers: Record<string, string>;
  fetch: typeof fetch;
};

/** Extends the ConnectionOptions to add a database field */
type ConnectionOptionsWithDatabase = ConnectionOptions & {
  database: string;
};

/** Extends the ConnectionsOptionsWithDatabase to add a collection name */
type ConnectionOptionsWithCollection = ConnectionOptionsWithDatabase & {
  collection: string;
};

/**
 * Removes empty keys from an object at the top level. EJSON.stringify does not drop
 * undefined values in serialization, so we need to explicitly remove any keys with
 * null/undefined without recursing further into the object.
 */
const removeEmptyKeys = (object: Record<string, unknown>) => {
  return Object.fromEntries(Object.entries(object).filter(([_, v]) => v));
};

/** Converts a set of request options into connection options */
const normalizeRequestOptions = (
  options?: RequestOptions
): ConnectionOptions => {
  const { endpoint, dataSource, auth, fetch: customFetch } = options ?? {};
  const ftch = customFetch ?? globalThis.fetch;

  const connection: ConnectionOptions = {
    dataSource,
    endpoint: endpoint instanceof URL ? endpoint.toString() : endpoint,
    headers: {},
    fetch: ftch,
  };

  // if auth is defined, it must be checked before being added to headers
  if (auth) {
    if ("apiKey" in auth) {
      connection.headers.apiKey = auth.apiKey;
    } else if ("jwtTokenString" in auth) {
      connection.headers.jwtTokenString = auth.jwtTokenString;
    } else if ("email" in auth && "password" in auth) {
      connection.headers.email = auth.email;
      connection.headers.password = auth.password;
    } else if ("bearerToken" in auth) {
      connection.headers.Authorization = `Bearer ${auth.bearerToken}`;
    } else {
      throw new Error("Invalid auth options");
    }
  }

  return connection;
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
  protected connection: ConnectionOptions;

  constructor(options: RequestOptions) {
    this.connection = normalizeRequestOptions(options);
  }

  /** Select a database from within the data source */
  db(name: string) {
    return new Database(name, this.connection);
  }
}

/**
 * Represents a Mongo Database object. Contains information about the selected
 * database, as well as connection information for performing
 * queries.
 */
export class Database {
  protected connection: ConnectionOptionsWithDatabase;

  constructor(name: string, connection: ConnectionOptions) {
    this.connection = {
      ...connection,
      database: name,
    };
  }

  /**
   * Get a Collection from the Database
   * @param name The collection name
   * @typeParam `T` The type of document stored in the collection
   * @returns A Collection object of type `T`
   */
  collection<TSchema = Document>(name: string) {
    return new Collection<TSchema>(name, this.connection);
  }
}

/**
 * Represents a Mongo Collection object of type `<T>`, providing query
 * methods in a fluent interface.
 */
export class Collection<TSchema = Document> {
  protected connection: ConnectionOptionsWithCollection;

  constructor(name: string, database: ConnectionOptionsWithDatabase) {
    this.connection = {
      ...database,
      collection: name,
    };
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
    operationName: string,
    filter?: Filter<TSchema>,
    options?: FindOneRequestOptions
  ): FindOneResponse<TSchema>;
  async findOne(
    filter?: Filter<TSchema>,
    options?: FindOneRequestOptions
  ): FindOneResponse<TSchema>;
  async findOne(...args: unknown[]): FindOneResponse<TSchema> {
    const [operationName, filter, options] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [string, Filter<TSchema>?, FindOneRequestOptions?];

    const { data, error } = await this.callApi<{ document: WithId<TSchema> }>(
      "findOne",
      {
        filter,
        projection: options?.projection,
        sort: options?.sort,
      },
      { operationName }
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
   * @param operationName The name of the operation to use for the request. This is used to set the `x-realm-op-name` header for tracing requests
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
    operationName: string,
    filter?: Filter<TSchema>,
    options?: FindRequestOptions
  ): FindResponse<TSchema>;
  async find(
    filter?: Filter<TSchema>,
    options?: FindRequestOptions
  ): FindResponse<TSchema>;
  async find(...args: unknown[]): FindResponse<TSchema> {
    const [operationName, filter, options] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [string, Filter<TSchema>?, FindRequestOptions?];

    const { data, error } = await this.callApi<{
      documents: Array<WithId<TSchema>>;
    }>(
      "find",
      {
        filter,
        projection: options?.projection,
        sort: options?.sort,
        limit: options?.limit,
        skip: options?.skip,
      },
      {
        operationName,
      }
    );

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
    operationName: string,
    document: OptionalUnlessRequiredId<TSchema>
  ): InsertOneResponse;
  async insertOne(
    document: OptionalUnlessRequiredId<TSchema>
  ): InsertOneResponse;
  async insertOne(...args: unknown[]): InsertOneResponse {
    const [operationName, document] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [string, OptionalUnlessRequiredId<TSchema>];

    return this.callApi(
      "insertOne",
      {
        document,
      },
      {
        operationName,
      }
    );
  }

  /**
   * Insert several documents into the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#insert-multiple-documents)
   * @param docs An array of documents to insert (of type `T[]`)
   * @returns The insertMany action returns the _id values of all inserted documents as an array of strings in the insertedIds field
   */
  async insertMany(
    operationName: string,
    documents: Array<OptionalUnlessRequiredId<TSchema>>
  ): InsertManyResponse;
  async insertMany(
    documents: Array<OptionalUnlessRequiredId<TSchema>>
  ): InsertManyResponse;
  async insertMany(...args: unknown[]): InsertManyResponse {
    const [operationName, documents] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [string, Array<OptionalUnlessRequiredId<TSchema>>];

    return this.callApi("insertMany", { documents }, { operationName });
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
    operationName: string,
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema> | Partial<TSchema>,
    options?: UpdateOneRequestOptions
  ): UpdateOneResponse;
  async updateOne(
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema> | Partial<TSchema>,
    options?: UpdateOneRequestOptions
  ): UpdateOneResponse;
  async updateOne(...args: unknown[]): UpdateOneResponse {
    const [operationName, filter, update, options] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [
      string,
      Filter<TSchema>,
      UpdateFilter<TSchema> | Partial<TSchema>,
      UpdateOneRequestOptions?,
    ];

    return this.callApi(
      "updateOne",
      {
        filter,
        update,
        upsert: options?.upsert,
      },
      {
        operationName,
      }
    );
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
    operationName: string,
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema>,
    options?: UpdateManyRequestOptions
  ): UpdateManyResponse;
  async updateMany(
    filter: Filter<TSchema>,
    update: UpdateFilter<TSchema>,
    options?: UpdateManyRequestOptions
  ): UpdateManyResponse;
  async updateMany(...args: unknown[]): UpdateManyResponse {
    const [operationName, filter, update, options] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [
      string,
      Filter<TSchema>,
      UpdateFilter<TSchema>,
      UpdateManyRequestOptions?,
    ];

    return this.callApi(
      "updateMany",
      {
        filter,
        update,
        upsert: options?.upsert,
      },
      {
        operationName,
      }
    );
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
    operationName: string,
    filter: Filter<TSchema>,
    replacement: WithoutId<TSchema>,
    options?: ReplaceOneRequestOptions
  ): ReplaceOneResponse;
  async replaceOne(
    filter: Filter<TSchema>,
    replacement: WithoutId<TSchema>,
    options?: ReplaceOneRequestOptions
  ): ReplaceOneResponse;
  async replaceOne(...args: unknown[]): ReplaceOneResponse {
    const [operationName, filter, replacement, options] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [
      string,
      Filter<TSchema>,
      WithoutId<TSchema>,
      ReplaceOneRequestOptions?,
    ];

    return this.callApi(
      "replaceOne",
      {
        filter,
        replacement,
        upsert: options?.upsert,
      },
      {
        operationName,
      }
    );
  }

  /**
   * Delete a single document in the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#delete-a-single-document)
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The deleteOne action deletes the first document in the collection that matches this filter.
   * @returns The deleteOne action returns the number of deleted documents in the deletedCount field
   */
  async deleteOne(
    operationName: string,
    filter: Filter<TSchema>
  ): DeleteOneResponse;
  async deleteOne(filter: Filter<TSchema>): DeleteOneResponse;
  async deleteOne(...args: unknown[]): DeleteOneResponse {
    const [operationName, filter] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [string, Filter<TSchema>];

    return this.callApi(
      "deleteOne",
      {
        filter,
      },
      {
        operationName,
      }
    );
  }

  /**
   * Delete multiple documents from the collection matching a filter. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#delete-multiple-documents)
   * @param filter A [MongoDB Query Filter](https://www.mongodb.com/docs/manual/tutorial/query-documents/). The deleteMany action deletes all documents in the collection that match this filter.
   * @returns The deleteMany action returns the number of deleted documents in the deletedCount field
   */
  async deleteMany(
    operationName: string,
    filter: Filter<TSchema>
  ): DeleteManyResponse;
  async deleteMany(filter: Filter<TSchema>): DeleteManyResponse;
  async deleteMany(...args: unknown[]): DeleteManyResponse {
    const [operationName, filter] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [string, Filter<TSchema>];

    return this.callApi(
      "deleteMany",
      { filter },
      {
        operationName,
      }
    );
  }

  /**
   * Run an aggregation pipeline on the collection. [read more](https://www.mongodb.com/docs/atlas/api/data-api-resources/#aggregate-documents)
   * @param pipeline A [MongoDB Aggregation Pipeline](https://www.mongodb.com/docs/manual/core/aggregation-pipeline/).
   * @returns The aggregate action returns the result set of the final stage of the pipeline as an array of documents, automatically unwrapping the Atlas `documents` field
   */
  async aggregate<TOutput = Document>(
    operationName: string,
    pipeline: Document[]
  ): AggregateResponse<TOutput[]>;
  async aggregate<TOutput = Document>(
    pipeline: Document[]
  ): AggregateResponse<TOutput[]>;
  async aggregate<TOutput = Document>(
    ...args: unknown[]
  ): AggregateResponse<TOutput[]> {
    const [operationName, pipeline] = (
      typeof args[0] === "string" ? args : ["default", ...args]
    ) as [string, Document[]];

    const response = await this.callApi<{ documents: TOutput[] }>(
      "aggregate",
      {
        pipeline,
      },
      {
        operationName,
      }
    );

    // unwrap and repackage
    return (
      response.data
        ? { data: response.data.documents }
        : {
            error: response.error ?? new MongoDataAPIError("Unknown error", -1),
          }
    ) as Awaited<AggregateResponse<TOutput[]>>;
  }

  /**
   * Call a raw Data API resource
   * @param method The Data API resource to call
   * @param body The JSON body to include, merged with the collection, dataSource, and database names
   * @returns The response from the Data API, or a DataAPIError if the request failed
   */
  async callApi<T = unknown>(
    method: string,
    body: Record<string, unknown>,
    requestOptions: callAPIOptions
  ): Promise<DataAPIResponse<T>> {
    // merge all options
    const {
      endpoint,
      dataSource,
      headers: h,
      collection,
      database,
      fetch: ftch,
    } = this.connection;

    const headers = new Headers(h);
    headers.set("content-type", "application/ejson");

    if (requestOptions.operationName) {
      headers.set("x-realm-op-name", requestOptions.operationName);
    }

    const url = `${endpoint}/action/${method}`;

    const response = await ftch(url, {
      method: "POST",
      headers,
      body: EJSON.stringify({
        collection,
        database,
        dataSource,
        ...removeEmptyKeys(body),
      }),
    });

    // interpret response code. Log error for anything outside of 2xx 3xx
    // https://www.mongodb.com/docs/atlas/api/data-api-resources/#error-codes
    if (response.status < 200 || response.status >= 400) {
      let errorText: string | undefined;
      try {
        errorText = ((await response.clone().json()) as { error: string })
          ?.error;
      } catch {
        try {
          errorText = await response.clone().text();
        } catch {
          errorText = undefined;
        }
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
