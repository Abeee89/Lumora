import { config } from "@/kernel/config";
import { envelopeOf, statusFor } from "@/kernel/errors";
import { requestLogger } from "@/kernel/logger";

/** SYS-01, NFR-050. Always uncached: an uptime monitor must see the live state. */
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const requestId = request.headers.get(config.http.requestIdHeader) ?? crypto.randomUUID();
  const started = performance.now();
  try {
    const response = Response.json(
      { status: "ok" },
      {
        status: 200,
        headers: {
          "cache-control": "no-store",
          [config.http.requestIdHeader]: requestId,
        },
      },
    );
    requestLogger(requestId, "GET /api/health").info(
      { status: 200, durationMs: Math.round(performance.now() - started) },
      "request.completed",
    );
    return response;
  } catch (error) {
    const log = requestLogger(requestId, "GET /api/health");
    log.error({ err: error }, "request.failed");
    return Response.json(envelopeOf(error, requestId), {
      status: statusFor(error),
      headers: { "cache-control": "no-store", [config.http.requestIdHeader]: requestId },
    });
  }
}