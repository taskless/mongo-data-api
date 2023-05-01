import anyTest, { type TestFn, type ExecutionContext } from "ava";
import fetch, { Request, Response, Headers } from "cross-fetch";
import { type RequestHandler } from "msw";
import { MongoClient, ObjectId } from "../src/client.js";
import { MongoDataAPIError } from "../src/errors.js";
import {
  BASE_URL,
  payloads,
  X_RESPONSE_KEY,
  type TestDocument,
  type TestAggregateDocument,
} from "./mocks/handlers.js";
import { createServer } from "./mocks/server.js";

type TestContext = { msw?: ReturnType<typeof createServer> };

const test = anyTest as TestFn<TestContext>;

/** Closes the MSW instance if it was created */
test.afterEach((t) => {
  if (t.context.msw) {
    t.context.msw.close();
  }
});

/** Add MSW to the test */
const addMsw = (
  t: ExecutionContext<TestContext>,
  handlers?: RequestHandler[]
) => {
  const s = createServer(handlers);
  s.listen();
  t.context.msw = s;
};

const createMongoClient = (headers?: Headers) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { apiKey: "validApiKey" },
    fetch: {
      fetch,
      Request,
      Response,
      Headers,
    },
    headers,
  });
  return c;
};

test("api: findOne", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .findOne({ _id: new ObjectId("6193504e1be4ab27791c8133") });

  t.is(error, undefined);
  // note: we unwrap the document from the response to remove this rough edge and make it more mongo-like
  t.deepEqual(data, payloads.findOne.success.document);
});

test("api: find", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .find({ test: { $eq: "test" } });

  t.is(error, undefined);
  // note: we unwrap the documents from the response to remove this rough edge and make it more mongo-like
  t.deepEqual(data, payloads.find.success.documents);
});

test("api: insertOne", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .insertOne({ test: "test" });

  t.is(error, undefined);
  t.deepEqual(data, payloads.insertOne.success);
});

test("api: insertMany", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .insertMany([{ test: "testA" }, { test: "testB" }]);

  t.is(error, undefined);
  t.deepEqual(data, payloads.insertMany.success);
});

test("api: updateOne", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .updateOne({ test: "test" }, { test: "tested" });

  t.is(error, undefined);
  t.deepEqual(data, payloads.updateOne.success);
});

test("api: updateOne upsert", async (t) => {
  addMsw(t);
  const c = createMongoClient(new Headers({ [X_RESPONSE_KEY]: "upsert" }));
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .updateOne({ test: "test" }, { test: "tested" }, { upsert: true });

  t.is(error, undefined);
  t.deepEqual(data, payloads.updateOne.upsert);
});

test("api: updateMany", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .updateMany({ test: "test" }, { test: "tested" });

  t.is(error, undefined);
  t.deepEqual(data, payloads.updateMany.success);
});

test("api: updateMany upsert", async (t) => {
  addMsw(t);
  const c = createMongoClient(new Headers({ [X_RESPONSE_KEY]: "upsert" }));
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .updateMany({ test: "test" }, { test: "tested" }, { upsert: true });

  t.is(error, undefined);
  t.deepEqual(data, payloads.updateMany.upsert);
});

test("api: replaceOne", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .replaceOne({ test: "test" }, { test: "tested" });

  t.is(error, undefined);
  t.deepEqual(data, payloads.replaceOne.success);
});

test("api: replaceOne upsert", async (t) => {
  addMsw(t);
  const c = createMongoClient(new Headers({ [X_RESPONSE_KEY]: "upsert" }));
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .replaceOne({ test: "test" }, { test: "tested" }, { upsert: true });

  t.is(error, undefined);
  t.deepEqual(data, payloads.replaceOne.upsert);
});

test("api: deleteOne", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .deleteOne({ test: "test" });

  t.is(error, undefined);
  t.deepEqual(data, payloads.deleteOne.success);
});

test("api: deleteMany", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .deleteMany({ test: "test" });

  t.is(error, undefined);
  t.deepEqual(data, payloads.deleteMany.success);
});

test("api: aggregate", async (t) => {
  addMsw(t);
  const c = createMongoClient();
  const { data, error } = await c
    .db("test-db")
    .collection("test-collection")
    .aggregate<TestAggregateDocument>([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          text: { $push: "$text" },
        },
      },
      { $sort: { count: 1 } },
    ]);

  t.is(error, undefined);
  t.deepEqual(data, payloads.aggregate.success.documents);
});

test("auth: disabled data source results in 400 from Mongo", async (t) => {
  addMsw(t);
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource-disabled",
    auth: { apiKey: "validApiKey" },
    fetch: {
      fetch,
      Request,
      Response,
      Headers,
    },
  });
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .findOne({ _id: new ObjectId("6193504e1be4ab27791c8133") });

  t.is(data, undefined);
  t.truthy(error instanceof MongoDataAPIError);
  t.is(error?.code, 400);
});

test("auth: bad auth results in 401 from Mongo", async (t) => {
  addMsw(t);
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { apiKey: "inValidApiKey" },
    fetch: {
      fetch,
      Request,
      Response,
      Headers,
    },
  });
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .findOne({ _id: new ObjectId("6193504e1be4ab27791c8133") });

  t.is(data, undefined);
  t.truthy(error instanceof MongoDataAPIError);
  t.is(error?.code, 401);
});

test("auth: bad client ID results in 404 from Mongo", async (t) => {
  addMsw(t);
  const c = new MongoClient({
    endpoint:
      "https://data.mongodb-api.com/app/invalidClientAppId/endpoint/data/v1",
    dataSource: "test-datasource",
    auth: { apiKey: "validApiKey" },
    fetch: {
      fetch,
      Request,
      Response,
      Headers,
    },
  });
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .findOne({ _id: new ObjectId("6193504e1be4ab27791c8133") });

  t.is(data, undefined);
  t.truthy(error instanceof MongoDataAPIError);
  t.is(error?.code, 404);
});

test("error: Force a 500 error in case Mongo has an internal server error", async (t) => {
  addMsw(t);
  const c = createMongoClient(new Headers({ "x-force-error": "500" }));
  const { data, error } = await c
    .db("test-db")
    .collection<TestDocument>("test-collection")
    .findOne({ _id: new ObjectId("6193504e1be4ab27791c8133") });

  t.is(data, undefined);
  t.truthy(error instanceof MongoDataAPIError);
  t.is(error?.code, 500);
});
