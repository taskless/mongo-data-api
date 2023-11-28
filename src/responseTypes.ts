import type { ObjectId } from "bson";
import type { Sort, WithId, Document } from "mongodb";
import { type MongoDataAPIError } from "./errors.js";

/** Describes a typing that may be null */
// eslint-disable-next-line @typescript-eslint/ban-types
type Nullable<T> = T | null;

/** A data API response object */
export type DataAPIResponse<T> = { data?: T; error?: MongoDataAPIError };

export type FindOneRequestOptions = { projection?: Document; sort?: Document };

/** A data API response object */
export type FindOneResponse<TSchema> = Promise<
  DataAPIResponse<Nullable<WithId<TSchema>>>
>;

/** The MongoDB-specific options for this API method */
export type FindRequestOptions = {
  projection?: Document;
  sort?: Sort;
  limit?: number;
  skip?: number;
};

/** A data API response object */
export type FindResponse<TSchema> = Promise<
  DataAPIResponse<Array<WithId<TSchema>>>
>;

/** A data API response object */
export type InsertOneResponse = Promise<
  DataAPIResponse<{ insertedId: ObjectId }>
>;

/** A data API response object */
export type InsertManyResponse = Promise<
  DataAPIResponse<{ insertedIds: string[] }>
>;

/** The MongoDB-specific options for this API method */
export type UpdateOneRequestOptions = { upsert?: boolean };

/** A data API response object */
export type UpdateOneResponse = Promise<
  DataAPIResponse<{
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
  }>
>;

/** The MongoDB-specific options for this API method */
export type UpdateManyRequestOptions = { upsert?: boolean };

/** A data API response object */
export type UpdateManyResponse = Promise<
  DataAPIResponse<{
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
  }>
>;

/** The MongoDB-specific options for this API method */
export type ReplaceOneRequestOptions = { upsert?: boolean };

/** A data API response object */
export type ReplaceOneResponse = Promise<
  DataAPIResponse<{
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
  }>
>;

/** A data API response object */
export type DeleteOneResponse = Promise<
  DataAPIResponse<{ deletedCount: number }>
>;

/** A data API response object */
export type DeleteManyResponse = Promise<
  DataAPIResponse<{ deletedCount: number }>
>;

/** A data API response object */
export type AggregateResponse<TOutput = Document> = Promise<
  DataAPIResponse<TOutput[]>
>;
