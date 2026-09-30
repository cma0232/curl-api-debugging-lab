import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/server.js";

let server;
let baseUrl;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("health endpoint works", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("documented export request succeeds", async () => {
  const response = await fetch(`${baseUrl}/api/v1/orders/ord_1001/export`, {
    method: "POST",
    headers: {
      authorization: "Bearer local-dev-token",
      "content-type": "application/json",
      "x-merchant-id": "merchant_demo",
      "idempotency-key": "merchant_demo:ord_1001:export",
      "x-request-id": "req_test_001",
    },
    body: JSON.stringify({ destination: "merchant_order_system" }),
  });

  assert.equal(response.status, 202);
  assert.equal(response.headers.get("x-request-id"), "req_test_001");
});
