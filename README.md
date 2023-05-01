<h1 align="center">
  <span style="font-size:24px">🧼 TSoapy</span><br />
  <sub><i>Type-Safe OpenAPI Calls</i></sub>
</h1>

> Create a fully-typed & lightweight client for your [openapi-typescript](https://github.com/drwpow/openapi-typescript) type definitions. Zero dependencies. 2.4k. Optimized for OpenAPI v3.

# Usage

Taken from the [Pet Store Example](https://github.com/jakobo/tsoapy/blob/main/src/examples/petstore.ts)

```ts
import type { paths } from "../__generated__/petstore";
import { tsoapy } from "../";

const client = tsoapy<paths>(new URL("https://example.com/api/petstore"));

// call your api using .path().method() to select the specific endpoint you need
const r1 = await client
  .path("/store/order")
  .method("post")
  // then, include your body, set params, query string, etc
  .body({
    id: 123,
    petId: 456,
    quantity: 1,
    shipDate: "2023-02-25T00:00:00Z",
    status: "placed",
    complete: false,
  })
  // send the request and get a descriminated union as a response
  .send();

if (r1.status === 200) {
  // union is discriminated on .status, and contains a .data property
  r1.data.id; // <= typed from response
}
```

# API

Descriptions here provide a generic type such as `string` for clarity, but use a more complex typing in the codebase

## `tsoapy<paths>(url: URL, ctx?: ExtendedRequestInit)`

Configure the initial value of tsoapy, including the URL base all `path` values are derrived from, and any `RequestInit` options you want to share between all chained methods.

**Returns:** An object containing the single `.path()` method.

| arg | description                                                                                                |
| :-- | :--------------------------------------------------------------------------------------------------------- |
| url | `URL` The endpoint URL for your OpenAPI calls                                                              |
| ctx | Options to persist into `fetch` calls. You may also specify `ctx.fetch` to use a non-global fetch instance |

#### _tsoapy()_`.path(path: string)`

Select a `path` from the tsoapy collection.

**Returns:** An object containing the single `.method()` method.

| arg  | description                                       |
| :--- | :------------------------------------------------ |
| path | `string` A path contained in your `OpenAPI` types |

#### _tsoapy().path()_`.method(method: string, contentType?: string, serialize: Function)`

Select a `method` from the tsoapy collection, constrained to the previously built `path`. Because OpenAPI JSON is top-down desiged (`path => method => params`), you need to have a path before you can select a method. During method selection, you can specify a content type other than the default `application/json`, and set up a custom `serialize` function for converting your request object to a string.

**Returns:** A tsoapy builder object for configuring the request data, containing `params`, `query`, `body`, and `send`

| arg         | description                                                                                                                                                                                                                         |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| method      | `string` A method contained in `OpenAPI[path]`                                                                                                                                                                                      |
| contentType | `string` A supported content type found in `OpenAPI[path][method].requestBody.content`                                                                                                                                              |
| serialize   | `function` A function that takes in the arguments of `OpenAPI[path][method].requestBody.content[contentType]` and returns a `string`. Defaults to `JSON.serialize` for `application/json` and `toString()` for other content types. |

## Tsoapy Builder `Builder`

After chaining `tsoapy().path().method()`, the API opens up in order to configure and send the request. Depending on your OpenAPI endpoint, you may need to set URL parameters, configure query string values, or set the request body. Once configured, you can send the request via `.send()`, returning a promise containing the API result.

#### _tsoapy().path().method()..._`.params(params: object)`

Set URL parameters in a request such as `/pet/{petId}`.

**Returns:** `Builder` object for configuring the request data, containing `params`, `query`, `body`, and `send`

| arg    | description                                                                   |
| :----- | :---------------------------------------------------------------------------- |
| params | `object` Details parameters to substitue into the url, such as `/pet/{petId}` |

#### _tsoapy().path().method()..._`.query(query: object)`

Set query string parameters for the request.

**Returns:** `Builder` object for configuring the request data, containing `params`, `query`, `body`, and `send`

| arg   | description                                                 |
| :---- | :---------------------------------------------------------- |
| query | `object` Details query string values to append onto the url |

#### _tsoapy().path().method()..._`.body(body: object)`

Set the body for the request. Will use `serializer` to conver the object to a suitable string, defaulting to `JSON.stringify()`.

**Returns:** `Builder` object for configuring the request data, containing `params`, `query`, `body`, and `send`

| arg  | description                                                                                                                                                                                               |
| :--- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| body | `object` Operation variables. Will be serialized to a string using the provided `serialize`, and falling back to `JSON.stringify` for the `application/json` content type and `toString()` for all others |

#### _tsoapy().path().method()..._`.send(options?: RequestInit, contentType?: string, deserialize?: Function):Promise`

Send the request via `fetch`.

| arg         | description                                                                                                                                                                                                                                                        |
| :---------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| options     | `RequestInit` Additional fetch options, in addition to any specified in the original `tsoapy` call                                                                                                                                                                 |
| contentType | `string` A supported content type found in `OpenAPI[path][method].responses[*].content`                                                                                                                                                                            |
| deserialize | `function` A function that takes in a `string` and `statusCode`, and returns a value consistent with `OpenAPI[path][method].responses[statusCode].content[contentType]`. Defaults to `JSON.parse` for `application/json` and `toString()` for other content types. |

**Returns:** A tsoapy response as a discriminated union in the following format:

```ts
{
  status: number;
  data: object;
}
```

| property | description                                                       |
| :------- | :---------------------------------------------------------------- |
| status   | `number` Discriminator based on the response code from the server |
| data     | `object` Content from the request                                 |

# Sending Content Types other than `application/json`

Tsoapy uses `application/json` by default for requests & responses. If you need to change this, you can control the input and output handing.

- **input** typing and serialization is controlled when calling `.method()`. In addition to setting the content type (which selects the `responseBody` from OpenAPI), the third parameter `serialize` allows you to pass in a custom serializer function for turning the JSON object into the requested content type, expressed as a string. Because there's a variety of content types, it's beyond Tsoapy to add custom converters for every possible serialization.
- **output** typing and deserialization is controlled when calling `.send()`. Like `method`, you can pass a content type as the second argument which maps to a content type inside of the OpenAPI `responses.[code]` collection. The third parameter `deserialize` can be a function that takes in a string and returns a JSON object conforming to the object schema on OpenAPIs side. Like serialization, adding custom deserialization goes beyond the scope of this library.

> ⚠️ **note** You'll need to specify your content type and serializer/deserializer every time, as OpenAPI is designed in a top-down method of `path => method => requestBody => content => [contentType]` and `path => method => responses => [code] => content => [contentType]`, making it difficult to set these at the top-level `tsoapy()` as you do not know at that time which path & method (and therefore which content types) you are invoking.

## Common Serializer / Deserializers

If JSON isn't sufficient and you do need to serialize / deserialize in order to talk to your OpenAPI endpoint, there are already excellent battle-tested libraries that can be dropped into tsoapy without much effort.

- `application/xml` - [xml2json](https://www.npmjs.com/package/xml2json)
- `application/x-www-form-urlencoded` - [form-urlencoded](https://www.npmjs.com/package/form-urlencoded)

# FAQ

- **Why is it so small?** Tsoapy is 90% type management. The [exported index.js](https://www.unpkg.com/tsoapy@0.0.4/dist/index.js) is the builder API, designed to build the `fetch` call in a way consistent with how you walk the OpenAPI paths object. In 0.0.4, the ESM version is 2.4kb and the CJS version is 3.43kb with the increase being the CommonJS harness provided by tsup.
- **Why not `openapi`?** [openapi](https://www.npmjs.com/package/openapi) is an excellent library, but its types are not as semantically correct as those generated by [openapi-typescript](https://github.com/drwpow/openapi-typescript). By separating type generation from runtime library, you can stop using tsoapy, go back to plain `fetch` and still take advantage of the types generated by `openapi-typescript`. This also means that tsoapy can focus on being a really good `fetch` builder.

# Stuff Still To Do

- Tests (maybe using MSW as the network is at the heart of this)
- There's a coercion of `number` to `ResultCodeOf<T, P, M>` which I can't seem to get right

# License

MIT
