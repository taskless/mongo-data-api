/** Describes a Mongo Data API Error */
export class MongoDataAPIError extends Error {
  /** The HTTP error code from the Mongo Data API */
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}
