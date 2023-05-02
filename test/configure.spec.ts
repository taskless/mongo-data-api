import test from "ava";
import fetch, { Request, Response, Headers } from "cross-fetch";
import { MongoClient } from "../src/client.js";
import { BASE_URL } from "./mocks/handlers.js";

const fetchInterface = { fetch, Request, Response, Headers };

test("requires a fetch interface", (t) => {
  t.throws(() => {
    const c = new MongoClient({
      endpoint: BASE_URL,
      dataSource: "test-datasource",
      auth: { apiKey: "validApiKey" },
      // @ts-expect-error intentionally knocking out the fetch interface
      fetch: "not a fetch interface",
    });
  });
});

test("requires a valid auth method", (t) => {
  t.throws(() => {
    const c = new MongoClient({
      endpoint: BASE_URL,
      dataSource: "test-datasource",
      // @ts-expect-error bypassing type check to throw error on bad auth method
      auth: { notValid: "not a valid auth method" },
      fetch: fetchInterface,
    });
  });
});

test("accepts an api key for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { apiKey: "validApiKey" },
    fetch: fetchInterface,
  });
  t.pass();
});

test("accepts a jwt token for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { jwtTokenString: "passed through to mongo api" },
    fetch: fetchInterface,
  });
  t.pass();
});

test("accepts an email and password for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { email: "valid@email.com", password: "validPassword" },
    fetch: fetchInterface,
  });
  t.pass();
});

test("accepts a bearer token for auth", (t) => {
  const c = new MongoClient({
    endpoint: BASE_URL,
    dataSource: "test-datasource",
    auth: { bearerToken: "passed through to mongo api" },
    fetch: fetchInterface,
  });
  t.pass();
});
