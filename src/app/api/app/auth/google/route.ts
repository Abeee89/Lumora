import { config } from "@/kernel/config";
import { AppError } from "@/kernel/errors";
import { cookieHeader, handleRoute } from "@/kernel/http";
import { assertIanaZone } from "@/kernel/time";
import * as auth from "@/modules/auth/public";
import { container } from "@/server/container";
import { requestContext } from "@/server/request-context";

/**
 * AUTH-03 GET /api/app/auth/google (FR-003). Redirects to Google with state and PKCE;
 * the session is created by the callback, so this call changes no application data.
 */
export async function GET(request: Request): Promise<Response> {
  return handleRoute(async (requestId) => {
    const c = container();
    const url = new URL(request.url);
    const timezone = url.searchParams.get("timezone");
    if (timezone !== null) {
      try {
        assertIanaZone(timezone);
      } catch {
        throw new AppError("invalid_timezone", { details: { timezone } });
      }
    }

    const google = c.google;
    // Without GOOGLE_* the button reports that the provider is unavailable instead of
    // failing a navigation (PU-3 notice `unavailable`).
    if (google === null) {
      return new Response(null, {
        status: 302,
        headers: {
          location: "/login?notice=unavailable",
          "cache-control": "no-store",
          "x-request-id": requestId,
        },
      });
    }

    const rate = await c.authDeps.limiter.consume(
      `signin:${requestContext(request, c).ip ?? "unknown"}`,
      config.rateLimit.signInPerIpPerMinute,
      config.rateLimit.windowSeconds,
    );
    if (!rate.allowed) throw new AppError("rate_limited", { retryAfter: rate.resetSeconds });

    const state = auth.createStateCookie(google, {
      next: url.searchParams.get("next"),
      ageConfirmed: url.searchParams.get("ageConfirmed") === "true",
      timezone,
      now: new Date(),
    });

    return new Response(null, {
      status: 302,
      headers: {
        location: auth.authorizeUrl(google, state.cookieValue, auth.codeChallenge(state.codeVerifier)),
        "cache-control": "no-store",
        "x-request-id": requestId,
        "set-cookie": cookieHeader(auth.GOOGLE_STATE_COOKIE, state.cookieValue, {
          secure: c.secureCookies,
          maxAgeSeconds: 300,
        }),
      },
    });
  });
}