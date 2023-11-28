import { rest } from "msw";

export const BASE_URL =
  "https://data.mongodb-api.com/app/validClientAppId/endpoint/data/v1";

// sub: ok
// alg: HS256
// typ: JWT
// secret=secret
export const validJWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvayJ9.81MkrTCiDj9S3gS4Lx4uKqg-E484SJ1TzynporI4kSQ";

export type TestDocument = {
  test: string;
};

export type TestAggregateDocument = {
  _id: string;
  count: number;
  text: string[];
};

/** Payloads are structured as [action].[behavior] */
export const payloads: Record<string, Record<string, any>> = {
  findOne: {
    success: { document: { _id: "6193504e1be4ab27791c8133", test: "foo" } },
  },
  find: {
    success: {
      documents: [
        { _id: "6193504e1be4ab27791c8133", test: "foo" },
        { _id: "6194604e1d38dc33792d8257", test: "bar" },
      ],
    },
  },
  insertOne: {
    success: { insertedId: "6193504e1be4ab27791c8133" },
  },
  insertMany: {
    success: {
      insertedIds: ["61935189ec53247016a623c9", "61935189ec53247016a623ca"],
    },
  },
  updateOne: {
    success: { matchedCount: 1, modifiedCount: 1 },
    upsert: {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedId: "619353593821e5ec5b0f8944",
    },
  },
  updateMany: {
    success: { matchedCount: 12, modifiedCount: 12 },
    upsert: {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedId: "619353593821e5ec5b0f8944",
    },
  },
  replaceOne: {
    success: { matchedCount: 1, modifiedCount: 1 },
    upsert: {
      matchedCount: 0,
      modifiedCount: 0,
      upsertedId: "619353593821e5ec5b0f8944",
    },
  },
  deleteOne: {
    success: { deletedCount: 1 },
  },
  deleteMany: {
    success: { deletedCount: 42 },
  },
  aggregate: {
    success: {
      documents: [
        {
          _id: "open",
          count: 1,
          text: ["foo", "bar"],
        },
        {
          _id: "closed",
          count: 12,
          text: ["many", "few"],
        },
      ],
    },
    error: null,
  },
};

/** Errors as observed from Mongo DB's Data API */
export const errors: Record<string, { error: string }> = {
  "400": {
    error: "The data source 'test-datasource' is disabled or does not exist",
  },
  "404": { error: "Cannot find app using Client App ID 'clientAppId'" },
  "401": {
    error: "Unauthorized",
  },
  "500": {
    error:
      "The Data API encountered an internal error and could not complete the request.",
  },
};

/** Helper function to forcefully cast something to an array */
function asArray<T>(
  value: (T | undefined) | Array<T | undefined> | ReadonlyArray<T | undefined>
): Array<T | undefined> {
  return (Array.isArray(value) ? value : [value]) as T[];
}

function first<T>(value: T | T[] | readonly T[]) {
  return asArray(value)[0];
}

const cannotBeNull: Record<string, string[]> = {
  find: ["filter", "projection"],
  findOne: ["filter", "projection", "sort", "limit", "skip"],
  insertOne: [],
  insertMany: [],
  updateOne: ["upsert"],
  updateMany: ["upsert"],
  replaceOne: ["upsert"],
  deleteOne: [],
  deleteMany: [],
  aggregate: [],
};

export const handlers = [
  rest.post(`${BASE_URL}/action/:action`, async (request, response, ctx) => {
    const body: {
      dataSource?: string;
      database?: string;
      collection?: string;
    } & Record<string, unknown> = await request.json();

    // disabled data source
    if (body.dataSource?.match(/.+?-disabled/)) {
      return response(ctx.status(400), ctx.json(errors["400"]));
    }

    // incorrect auth results in a 401 from mongo
    let auth = false;
    if (request.headers.get("authorization") === `Bearer ${validJWT}`) {
      auth = true;
    } else if (request.headers.get("apiKey") === "validApiKey") {
      auth = true;
    } else if (
      request.headers.get("email") === "valid@email.com" &&
      request.headers.get("password") === "validPassword"
    ) {
      auth = true;
    } else if (request.headers.get("jwtTokenString") === validJWT) {
      auth = true;
    }

    if (!auth) {
      return response(ctx.status(401), ctx.json(errors["401"]));
    }

    const u = new URL(
      "http://localhost?" + request.headers.get("x-realm-op-name")
    );
    const operation = u.searchParams;

    const forceError = operation.get("error");
    if (forceError && errors[forceError]) {
      return response(
        ctx.status(Number(forceError)),
        ctx.json(errors[forceError])
      );
    }

    // attempting to pass "null" for an optional top level field results in a 400 from mongo
    const nonNullables =
      cannotBeNull[request.params.action as keyof typeof cannotBeNull] ?? [];
    for (const key of nonNullables) {
      if (body[key] === null) {
        return response(ctx.status(400), ctx.json({ error: "Bad Request" }));
      }
    }

    // find payload for use case
    const action = first(request.params?.action) ?? "";
    const conditions = payloads[action];

    if (!conditions) {
      throw new Error(`Unhandled test action ${action}`);
    }

    const condition = operation.get("condition") ?? "success";
    const payload = conditions[condition] as unknown;

    if (condition === "raw") {
      console.warn("Returning raw response from upstream");
      return undefined;
    }

    if (!payload && payload !== null) {
      throw new Error(
        `Unhandled test action + condition: ${action} + ${condition}`
      );
    }

    return response(ctx.status(200), ctx.json(payload));
  }),

  // fall through for other client app ids, resulting in a 404 from Mongo
  rest.post(
    `${BASE_URL.replace("validClientAppId", ":clientAppId")}/action/:action`,
    async (request, response, ctx) => {
      return response(ctx.status(404), ctx.json(errors["404"]));
    }
  ),
];
