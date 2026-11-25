import { AppError } from "@/kernel/errors";
import { cookieHeader } from "@/kernel/http";
import * as auth from "@/modules/auth/public";
import * as goals from "@/modules/goals/public";
import * as profile from "@/modules/profile/public";
import { container, type Container } from "@/server/container";
import { sessionCookieFor, sessionMaxAgeSeconds } from "@/server/request-context";

function redirect(location: string, cookies: string[] = []): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location,
      "cache-control": "no-store",
      ...(cookies.length > 0 ? { "set-cookie": cookies.join(", ") } : {}),
    },
  });
}

/**
 * PU-6 is the only surface that can finish a Google sign-up whose state did not carry the
 * age confirmation; anything unsigned sends the user back to PU-3.
 */
function ageConfirmationRedirect(c: Container, error: AppError, google: auth.GoogleConfig): Response {
  const details = error.details ?? {};
  const email = details["email"];
  if (typeof email !== "string") return redirect("/login?notice=age");

  const timezone = typeof details["timezone"] === "string" ? details["timezone"] : "UTC";
  const next = typeof details["next"] === "string" ? details["next"] : "/";
  const value = auth.encodePending(google, {
    email,
    timezone,
    next,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  return redirect("/welcome", [
    cookieHeader(auth.GOOGLE_PENDING_COOKIE, value, { secure: c.secureCookies, maxAgeSeconds: 600 }),
  ]);
}

/**
 * ADR-004 places the OAuth callback on a library-owned path; M02 owns the protocol behind
 * `modules/auth/google.ts` instead (that file records why the library is not bound yet).
 * Reached only from AUTH-03.
 */
export async function GET(request: Request): Promise<Response> {
  const c = container();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const google = c.google;

  if (google === null) return redirect("/login?notice=unavailable");

  const stateCookie = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${auth.GOOGLE_STATE_COOKIE}=`))
    ?.slice(auth.GOOGLE_STATE_COOKIE.length + 1);

  // Google echoes our signed state; anything else is a cross-site callback attempt.
  if (code === null || state === null || stateCookie === undefined || state !== stateCookie) {
    return redirect("/login?notice=google");
  }

  const context = {
    ip: request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };

  try {
    const result = await c.database.transaction(async (tx) =>
      auth.completeGoogleSignIn(
        tx,
        google,
        { fetch, now: () => new Date() },
        {
          createSession: (userId, sessionContext, now) =>
            auth.createSession(tx, userId, sessionContext, now),
          createUser: (email, now) => auth.createVerifiedUser(tx, email, now),
          // This port only runs for an account created here (auth/google.ts), so the
          // starting rows for a new user are created together: the profile and, on
          // BR-013, the daily goal row dated by the registration local date.
          ensureProfile: async (input) => {
            await profile.ensureProfile(tx, input);
            await goals.seedDailyGoal(tx, {
              userId: input.userId,
              timezone: input.timezone,
              now: new Date(),
            });
          },
        },
        { code, stateCookie, context },
      ),
    );

    // NAVIGATION-STRUCTURE sends a signed-in user to `/dashboard`, which M04 owns; the
    // only app page M02 ships is the profile section.
    const landing = result.next === "/" ? "/settings/profile" : result.next;
    return redirect(landing, [
      sessionCookieFor(c, result.session.rawToken, sessionMaxAgeSeconds),
      cookieHeader(auth.GOOGLE_PENDING_COOKIE, "", { secure: c.secureCookies, maxAgeSeconds: 0 }),
    ]);
  } catch (error) {
    if (error instanceof AppError && error.code === "age_confirmation_required") {
      return ageConfirmationRedirect(c, error, google);
    }
    return redirect("/login?notice=google");
  }
}