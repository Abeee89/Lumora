# Lumora OpenAPI Plan

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

This document plans the machine-readable contract for the public API only (FR-220..226, Phase 3). It specifies what is documented, where the source of truth lives, how the document is generated and checked, and how it is governed. No OpenAPI file is created in Phase 6. Endpoint contracts are in [API-ENDPOINTS.md](API-ENDPOINTS.md) (PUB-01..37), schemas in [API-SCHEMAS.md](API-SCHEMAS.md) (`Public*` DTOs), wire rules in [API-CONVENTIONS.md](API-CONVENTIONS.md), error codes in [API-ERRORS.md](API-ERRORS.md), security in [API-SECURITY.md](API-SECURITY.md), and the strategy in [API-STRATEGY.md](API-STRATEGY.md).

## 1. Scope

| Item | Decision | Source |
|---|---|---|
| Documented surface | `/v1` only: PUB-01..37 (37 inventory rows, 39 operations) | FR-220, FR-223 |
| Format | OpenAPI 3.1 | Plan decision |
| Served at | `GET /v1/openapi.json` (PUB-37), no authentication, rate class RL-DOC (60 per minute per IP) | [API-CONVENTIONS.md](API-CONVENTIONS.md) section 10 |
| Internal API | No document. `/api/app` has no stability promise and is not documented externally | NFR-060 |
| Generated client SDKs | Not planned | |

## 2. Source of truth

1. A route registry module (`public-api/registry`) declares, for each `/v1` route: method, path, tags, required scope (`resource:read|write`), request and response Zod schemas (the `Public*` DTOs, never internal schemas), and the error codes it can return.
2. The registry is the single input to both the route wiring tests and the generator. A route absent from the registry is not allowed to exist.
3. A generator script emits `openapi/v1.json`, which is committed to the repository. The served document is that file, not a runtime recomputation.
4. CI regenerates the file and fails on any diff against the committed copy.
5. A second CI test validates the file against the OpenAPI 3.1 schema and compares registry routes to the Next.js route files under the public directory: no undocumented `/v1` route, no documented route without a handler.

## 3. Generator library

| Option | Role | Status |
|---|---|---|
| `@asteasolutions/zod-to-openapi` | Default: registers Zod schemas and routes, emits OpenAPI 3.1 | Observed compatible with zod 4.6.7: emitted valid OpenAPI 3.1.0; two runs were byte-identical. The repository must pin the same Zod major. |
| Native Zod JSON Schema export for `components.schemas` plus paths assembled by hand from the registry | Fallback if the default is incompatible | Not exercised in M00; remains the fallback. |

The M00 spike used `@asteasolutions/zod-to-openapi` 9.1.0 with zod 4.6.7 and generated a valid document (see [M00-EVIDENCE](../08-build/M00-EVIDENCE.md)). This is a sample result, not a production version pin: the repository must pin the same Zod major or re-run the compatibility check.

## 4. Document structure

| Section | Content |
|---|---|
| `info` | Title, description, `version` = contract version `1.0.0` (date-stamped in the changelog entry), link to the deprecation policy |
| `servers` | One entry with the variable `{baseUrl}` (production URL is not fixed yet; deployment vendor open, U-A1) |
| `tags` | One per resource: subjects, topics, sessions, plan entries, to-dos, notes, exams, plus a documentation tag |
| `components.securitySchemes.bearerAuth` | HTTP bearer; description states the `lum_` key format and that cookies are never accepted ([API-SECURITY.md](API-SECURITY.md) sections 1, 2) |
| `components.schemas` | The `Public*` schemas, `PublicErrorEnvelope`, `PageInfo` |
| `components.parameters` | `Cursor`, `Limit` (default 50, 1 to 100, FR-224), `IfMatch`, `IdempotencyKey` (1..100 characters, `^[A-Za-z0-9_-]+$`) |
| `components.headers` | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`, `X-Request-Id`, `ETag`, `Idempotent-Replay`, `Deprecation`, `Sunset` |
| `components.responses` | One reusable response per public error code with an example body: `validation_failed`, `invalid_page_size`, `invalid_cursor`, `invalid_date_range`, `idempotency_key_required`, `version_required`, `api_key_invalid`, `api_key_revoked`, `scope_missing`, `not_found`, `unsupported_api_version`, `stale_version`, `idempotency_key_reused`, `request_in_progress`, `name_conflict`, `subject_archived`, `overlap_confirmation_required`, `exam_date_warning_confirmation_required`, `rate_limited`, `internal_error` (all defined in [API-ERRORS.md](API-ERRORS.md)) |
| Each operation | `operationId` = camelCase of the endpoint name (`listSubjects`), `x-required-scope` extension (for example `subjects:read`), description, request example, response examples, and responses for 400, 401, 403, 404, 409 and 429 where applicable |

Operation rules that follow from the contract:

| Rule | Source |
|---|---|
| Every operation lists the `RateLimit-*` headers on its responses | FR-222, EC-026 |
| Every list operation documents `limit`, `cursor`, and the `page` object | FR-224 |
| `PATCH` and `DELETE` on versioned resources document `If-Match` as required | ADR-011 |
| PUB-13 (`POST /v1/sessions`) documents `Idempotency-Key` as required; other creates as optional | [API-CONVENTIONS.md](API-CONVENTIONS.md) section 7 |
| PUB-25 documents `done` in the body, noting that internal completion uses a different route | [API-ENDPOINTS.md](API-ENDPOINTS.md) public section |
| PUB-37 has no security requirement and documents RL-DOC | |
| Sessions: `source` is read-only and created sessions are `manual` | [API-SCHEMAS.md](API-SCHEMAS.md) |
| Notes return raw markdown only | [API-SCHEMAS.md](API-SCHEMAS.md) |

## 5. Curation rules

1. Every operation and every field has a human-written description. Generated text alone is not accepted in review.
2. Every request body and response has at least one example.
3. Each operation declares an `enum` of the error `code` values it can return, taken from the registry.
4. Deprecation uses `deprecated: true` on the operation plus the `Deprecation` and `Sunset` headers, with at least 90 days notice (AC-FR-223-4, [API-CONVENTIONS.md](API-CONVENTIONS.md) section 13).
5. Descriptions never include real keys, real user data, or internal table names.

## 6. Publishing

| Item | Decision |
|---|---|
| Machine-readable document | `GET /v1/openapi.json` |
| Human-readable reference page | M00 decision for the MVP: none, because the MVP has no public API. Phase 3: Scalar is the first candidate and Redoc is the fallback. No renderer was exercised. |
| Client SDK generation | Not planned |

## 7. Governance

| Control | Rule |
|---|---|
| Additive changes (new optional response field, new endpoint, new optional request field) | Allowed within `/v1`; changelog entry required |
| Breaking changes (remove, rename, retype, change semantics) | Require `/v2`; `/v1` stays available for the notice period (FR-223) |
| Breaking-change check | oasdiff 1.39.0 with `--fail-on ERR`, between the committed document and the base branch in CI. The default exit code is 0 even when a breaking change is found, so CI must pass the flag. |
| Changelog | One entry per contract change, with contract version and date |
| Review | A change to the registry, `Public*` schemas, or `openapi/v1.json` needs a reviewer who checks the breaking-change list |
| Parity | Every PUB row in [API-ENDPOINTS.md](API-ENDPOINTS.md) has exactly one registry route per operation; PUB-05 and PUB-10 produce two operations each |

## 8. Open items and M00 results

| Item | M00 result | Remaining |
|---|---|---|
| Zod major version versus generator library | PASS for zod 4.6.7 with `@asteasolutions/zod-to-openapi` 9.1.0; valid OpenAPI 3.1.0 and deterministic output | Pin the same Zod major in the product, or re-run the check |
| Diff tool for contract checks | oasdiff 1.39.0 chosen; `response-required-property-removed` detected; `--fail-on ERR` exits 1 | Add the CI step and the base-branch comparison |
| Human reference page | None for the MVP; Scalar first candidate for Phase 3; Redoc fallback | Render and review before the Phase 3 public API ships |
| Contract coverage | One path and two schemas only | Route parity, the 39-operation public surface, error catalog and spec-to-server validation |
