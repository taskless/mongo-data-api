import type { ObjectId } from "bson";
import type { Sort, WithId, Document } from "mongodb";
import { type MongoDataAPIError } from "./errors.js";

/** Describes a typing that may be null */
// eslint-disable-next-line @typescript-eslint/ban-types
type Nullable<T> = T | null;

/** A generic data API response object */
export type DataAPIResponse<T> = { data?: T; error?: MongoDataAPIError };

export type FindOneRequestOptions = { projection?: Document; sort?: Document };

/** A data API response object */
export type FindOneResponse<TSchema> = Promise<
  DataAPIResponse<Nullable<WithId<TSchema>>>
>;

/** The MongoDB-specific options for the find() method */
export type FindRequestOptions = {
  projection?: Document;
  sort?: Sort;
  limit?: number;
  skip?: number;
};

/** A data API response object for the find() method */
export type FindResponse<TSchema> = Promise<
  DataAPIResponse<Array<WithId<TSchema>>>
>;

/** A data API response object for the insertOne() method */
export type InsertOneResponse = Promise<
  DataAPIResponse<{ insertedId: ObjectId }>
>;

/** A data API response object for the insertMany() method */
export type InsertManyResponse = Promise<
  DataAPIResponse<{ insertedIds: string[] }>
>;

/** The MongoDB-specific options for the updateOne() method */
export type UpdateOneRequestOptions = { upsert?: boolean };

/** A data API response object for the updateOne() method */
export type UpdateOneResponse = Promise<
  DataAPIResponse<{
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
  }>
>;

/** The MongoDB-specific options for the updateMany() method */
export type UpdateManyRequestOptions = { upsert?: boolean };

/** A data API response object for the updateMany() method */
export type UpdateManyResponse = Promise<
  DataAPIResponse<{
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
  }>
>;

/** The MongoDB-specific options for the replaceOne() method */
export type ReplaceOneRequestOptions = { upsert?: boolean };

/** A data API response object for the replaceOne() method */
export type ReplaceOneResponse = Promise<
  DataAPIResponse<{
    matchedCount: number;
    modifiedCount: number;
    upsertedId?: string;
  }>
>;

/** A data API response object for the deleteOne() method */
export type DeleteOneResponse = Promise<
  DataAPIResponse<{ deletedCount: number }>
>;

/** A data API response object for the deleteMany() method */
export type DeleteManyResponse = Promise<
  DataAPIResponse<{ deletedCount: number }>
>;

/** A data API response object for the aggregate() method */
export type AggregateResponse<TOutput = Document> = Promise<
  DataAPIResponse<TOutput[]>
>;
