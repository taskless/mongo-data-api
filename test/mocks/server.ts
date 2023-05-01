import { setupServer } from "msw/node"; // eslint-disable-line n/file-extension-in-import
import { type RequestHandler } from "msw";
import { handlers } from "./handlers.js";

export const createServer = (overrides?: RequestHandler[]) =>
  setupServer(...(overrides ?? []), ...handlers);
