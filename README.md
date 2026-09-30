# Debug an API Call with `curl`

A small, intentionally broken API lab for practicing how to diagnose an integration request from the command line. No Postman and no third-party packages are required.

## Scenario

A merchant reports that exporting order `ord_1001` always fails. The API documentation says the request below should queue an export, but the client receives an error.

Your job is to:

1. Reproduce the failure with `curl`.
2. Use the HTTP status, response headers, response body, request ID, and server log to narrow down the cause.
3. Decide whether each failure belongs to the caller or the server.
4. Fix the server bug without weakening authentication or validation.
5. Prove the fix with both `curl` and the automated test.

## Run locally

```bash
git clone https://github.com/cma0232/curl-api-debugging-lab.git
cd curl-api-debugging-lab
npm start
```

Open a second terminal for the `curl` commands. Confirm the server is alive:

```bash
curl -i http://localhost:4000/health
```

## API contract

`POST /api/v1/orders/{orderId}/export`

Required headers:

| Header | Local value | Purpose |
|---|---|---|
| `Authorization` | `Bearer local-dev-token` | Authenticates the caller |
| `Content-Type` | `application/json` | Declares the body format |
| `X-Merchant-ID` | `merchant_demo` | Selects the merchant tenant |
| `Idempotency-Key` | Any stable unique value | Makes retries safe |
| `X-Request-ID` | Any traceable value | Correlates the response with server logs |

Request body:

```json
{
  "destination": "merchant_order_system"
}
```

Expected success: `202 Accepted` with an export ID and `status: "queued"`.

## Exercise

Start small. Do not paste the final request immediately.

### Step 1: Inspect the route

Send a `POST` request with no headers or body. Use `-i` so the response status and headers are visible.

Questions:

- What status code do you receive?
- Which response header describes the authentication scheme?
- Is this a client error or a server error?

### Step 2: Add one requirement at a time

Add the bearer token, then the content type, then the merchant ID. After each attempt, record:

- HTTP status
- Machine-readable error code
- Human-readable message
- `X-Request-ID`

Use `curl -v` once to inspect exactly what was sent over the wire. Remember that `-v` writes diagnostic output to stderr.

### Step 3: Investigate the surprising `403`

Even when the documented merchant header is present, the API returns `403 merchant_forbidden`.

- Give the request an explicit `X-Request-ID`.
- Find the same ID in the server log.
- Confirm whether the server received the merchant ID.
- Inspect `src/server.js`. What does Node do to incoming header names?
- Make the smallest correct fix.

Do not remove the merchant check and do not hard-code a successful response.

### Step 4: Finish the valid request

After fixing the server bug, add the idempotency key and valid JSON body. Confirm that the API returns `202`.

Then run:

```bash
npm test
```

## Useful `curl` options

| Option | Meaning |
|---|---|
| `-i` | Include response headers |
| `-v` | Show request and connection details |
| `-X POST` | Set the HTTP method |
| `-H 'Name: value'` | Add a request header |
| `--data '{...}'` | Send a request body |
| `--fail-with-body` | Return a non-zero exit code while preserving an error body |

## Success criteria

- The documented request returns `202 Accepted`.
- The response `X-Request-ID` matches the request.
- A repeated logical operation uses the same idempotency key.
- `npm test` passes.
- Authentication and tenant validation still exist.

## Hints

<details>
<summary>Hint 1</summary>

HTTP header names are case-insensitive, but a runtime may normalize how they are represented in code.

</details>

<details>
<summary>Hint 2</summary>

Compare the merchant header shown in the structured server log with the exact lookup used later in `src/server.js`.

</details>

<details>
<summary>Reference curl command</summary>

```bash
curl -i --fail-with-body \
  -X POST http://localhost:4000/api/v1/orders/ord_1001/export \
  -H 'Authorization: Bearer local-dev-token' \
  -H 'Content-Type: application/json' \
  -H 'X-Merchant-ID: merchant_demo' \
  -H 'Idempotency-Key: merchant_demo:ord_1001:export' \
  -H 'X-Request-ID: req_lab_001' \
  --data '{"destination":"merchant_order_system"}'
```

</details>

The fixed implementation is available on the `solution` branch after you complete the exercise.
