import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT ?? 4000);
const TOKEN = "local-dev-token";
const MERCHANT_ID = "merchant_demo";

export function createApp() {
  return http.createServer(async (request, response) => {
    const requestId = request.headers["x-request-id"] || `req_${randomUUID().slice(0, 8)}`;
    response.setHeader("content-type", "application/json");
    response.setHeader("x-request-id", requestId);

    const send = (status, body, extraHeaders = {}) => {
      response.writeHead(status, extraHeaders);
      response.end(JSON.stringify(body));
    };

    console.log(JSON.stringify({
      requestId,
      method: request.method,
      path: request.url,
      merchantId: request.headers["x-merchant-id"] ?? null,
    }));

    if (request.method === "GET" && request.url === "/health") {
      return send(200, { ok: true });
    }

    const route = request.url?.match(/^\/api\/v1\/orders\/([^/]+)\/export$/);
    if (request.method !== "POST" || !route) {
      return send(404, {
        error: { code: "route_not_found", message: "No route matches this method and path." },
      });
    }

    if (request.headers.authorization !== `Bearer ${TOKEN}`) {
      return send(401, {
        error: { code: "invalid_token", message: "Use the local development bearer token." },
      }, { "www-authenticate": "Bearer" });
    }

    if (!request.headers["content-type"]?.startsWith("application/json")) {
      return send(415, {
        error: { code: "unsupported_media_type", message: "Send a JSON request body." },
      });
    }

    // Intentional bug for the exercise: Node normalizes incoming header names
    // to lowercase, but this lookup uses the mixed-case spelling.
    const merchantId = request.headers["X-Merchant-ID"];
    if (merchantId !== MERCHANT_ID) {
      return send(403, {
        error: { code: "merchant_forbidden", message: "The merchant header is missing or invalid." },
      });
    }

    if (!request.headers["idempotency-key"]) {
      return send(400, {
        error: { code: "missing_idempotency_key", message: "This write must be safe to retry." },
      });
    }

    let body;
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return send(400, {
        error: { code: "invalid_json", message: "The request body is not valid JSON." },
      });
    }

    if (body.destination !== "merchant_order_system") {
      return send(422, {
        error: {
          code: "invalid_destination",
          message: "destination must be merchant_order_system.",
          field: "destination",
        },
      });
    }

    return send(202, {
      export_id: `exp_${route[1]}`,
      order_id: route[1],
      status: "queued",
    });
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  createApp().listen(PORT, () => {
    console.log(`API debugging lab listening on http://localhost:${PORT}`);
  });
}
