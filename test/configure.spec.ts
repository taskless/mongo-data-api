import test from "ava";
import fetch from "cross-fetch";
import { MongoClient } from "../src/client.js";
import { BASE_URL } from "./mocks/handlers.js";

test("requires a valid fetch interface", async (t) => {
  await t.throwsAsync(async () => {
    const c = new MongoClient({
      endpoint: BASE_URL,
      dataSource: "test-datasource",
      auth: { apiKey: "validApiKey" },
      // @ts-expect-error intentionally knocking out the fetch interface
      fetch: "not a fetch interface",
    });
    await c.db("any").collection("any").find();
  });
});

test("requires a valid auth method", (t) => {
  t.throws(() => {
    const c = new MongoClient({
      endpoint: BASE_URL,
      dataSource: "test-datasource",
      // @ts-expect-error bypassing type check to throw error on bad auth method
      auth: { notValid: "not a valid auth method" },
      fetch,
    });
  });
});

test("accepts an api key for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { apiKey: "validApiKey" },
    fetch,
  });
  t.pass();
});

test("accepts a jwt token for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { jwtTokenString: "passed through to mongo api" },
    fetch,
  });
  t.pass();
});

test("accepts an email and password for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { email: "valid@email.com", password: "validPassword" },
    fetch,
  });
  t.pass();
});

test("accepts a bearer token for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { bearerToken: "passed through to mongo api" },
    fetch,
  });
  t.pass();
});
