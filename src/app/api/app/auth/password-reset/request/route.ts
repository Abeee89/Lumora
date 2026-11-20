import { after } from "next/server";

import * as auth from "@/modules/auth/public";
import { assertSameOrigin, handleRoute, jsonResponse, readJson } from "@/kernel/http";
import { logger } from "@/kernel/logger";
import { container } from "@/server/container";
import {
  passwordResetRequestSchema,
  requestContext,
} from "@/server/request-context";

/**
 * AUTH-05 POST /api/app/auth/password-reset/request (FR-005).
 * The body is `{}` for a known and an unknown address alike; the message goes out after
 * the response, so neither body nor timing enumerates accounts and a slow provider cannot
 * delay the reply.
 */
export async function POST(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    assertSameOrigin(request, c.appOrigin);
    const input = await readJson(request, passwordResetRequestSchema);
    const context = requestContext(request, c);

    const delivery = await c.database.transaction(async (tx) =>
      auth.requestPasswordReset(tx, c.authDeps, input.email, context),
    );

    const sender = c.authDeps.sender;
    if (delivery !== null && sender !== null) {
      await sendOutsideResponse(sender, delivery.message, requestId);
    }

    return jsonResponse(202, {}, requestId);
  });
}

/**
 * `after` exists only inside a Next request scope. Behind Next the message leaves after
 * the response, so a slow provider cannot delay the reply and the timing of a known and
 * an unknown address stays identical. A caller that is not Next (the worker, an
 * integration test) has no response boundary to defer past, so it simply waits.
 */
async function sendOutsideResponse(
  sender: NonNullable<auth.AuthDeps["sender"]>,
  message: auth.EmailMessage,
  requestId: string,
): Promise<void> {
  const deliver = async (): Promise<void> => {
    try {
      await sender.send(message);
    } catch (error) {
      // FR-005: a delivery failure never changes the response (email_delivery_failed
      // belongs to the job retry path, not to this request).
      logger.warn({ err: error, requestId }, "email.delivery_failed");
    }
  };
  try {
    after(deliver);
  } catch {
    await deliver();
  }
}
