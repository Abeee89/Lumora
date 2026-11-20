/**
 * MODULE-BOUNDARIES section 6: a resource that belongs to somebody else answers exactly
 * as a missing one. Every owner-scoped endpoint is exercised through this helper, so the
 * contract is asserted once instead of once per endpoint.
 */
import { expect } from "vitest";

import { call, parseBody, signInListSchema, type TestUser } from "./api";

export interface OwnershipCase {
  label: string;
  method: string;
  path: string;
  body?: unknown;
}

/** Calls another user's resource as `actor` and expects the answer a missing one gets. */
export async function expectHiddenFromOtherUser(actor: TestUser, testCase: OwnershipCase): Promise<void> {
  const response = await call(testCase.path, {
    method: testCase.method,
    body: testCase.body,
    cookie: actor.cookie,
  });
  expect(response.status, `${testCase.label} must hide another user's resource`).toBe(404);
  expect(response.body).toMatchObject({ code: "not_found" });
}

/** The ids of the sign-ins the given session can see. */
export async function signInIds(user: TestUser): Promise<string[]> {
  const response = await call("/api/app/auth/sign-ins", { cookie: user.cookie });
  expect(response.status).toBe(200);
  return parseBody(signInListSchema, response, "/api/app/auth/sign-ins").data.map((row) => row.id);
}
