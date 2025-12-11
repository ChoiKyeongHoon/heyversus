import "@testing-library/jest-dom";

import { createElement } from "react";
import { TextDecoder, TextEncoder } from "util";

if (!globalThis.TextDecoder) {
  // @ts-expect-error - Node typings
  globalThis.TextDecoder = TextDecoder;
}
if (!globalThis.TextEncoder) {
  // @ts-expect-error - Node typings
  globalThis.TextEncoder = TextEncoder;
}

// Load undici after TextEncoder/Decoder are available
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetch: nodeFetch, Request: NodeRequest, Response: NodeResponse, Headers: NodeHeaders } = require("undici");

if (!globalThis.fetch) {
  globalThis.fetch = nodeFetch as unknown as typeof fetch;
}
if (!globalThis.Request) {
  globalThis.Request = NodeRequest as unknown as typeof Request;
}
if (!globalThis.Response) {
  globalThis.Response = NodeResponse as unknown as typeof Response;
}
if (!globalThis.Headers) {
  globalThis.Headers = NodeHeaders as unknown as typeof Headers;
}

jest.mock("next/image", () => {
  return function MockedNextImage({ alt, ...props }: { alt: string; [key: string]: unknown }) {
    return createElement("img", { alt, ...props });
  };
});
