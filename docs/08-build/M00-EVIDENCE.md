# M00 Evidence

> Status: Template created 2026-11-18. No protocol has been executed. Results are recorded only here; commands and code stay on `spike/m00` and are deleted at close.

## Rules

- One section per executed protocol, using the template at the end.
- Paste raw output and the exact command. A summary written later is not evidence.
- Record library, runtime, browser, PostgreSQL and vendor versions.
- Redact secrets, tokens and personal email addresses.
- State pass or fail against the plan criterion. On fail, name the fallback.
- Do not record a conclusion before the data exists.

## Scope mapping

| M00 item | Protocol |
|---|---|
| (a) authentication library | TS-01, TS-02, TS-03 |
| (b) UUIDv7 | TS-04 |
| (c) OpenAPI tooling | TS-05 |
| (d) pg-boss and pooler | TS-06 |
| (e) vendors | TS-09 |
| Email one-time secret | TS-07 |
| Timer calibration, if not deferred | TS-08 |

## Status

| Protocol | Task | State | Result |
|---|---|---|---|
| TS-01 Lockout | M00-T04 | Not started | |
| TS-02 Revocation and expiry | M00-T05 | Not started | |
| TS-03 OAuth and linking | M00-T06 | Not started | |
| TS-04 UUIDv7 | M00-T07 | Not started | |
| TS-05 OpenAPI | M00-T08 | Not started | |
| TS-06 Queue and pooler | M00-T09 | Not started | |
| TS-07 Email and secrets | M00-T10 | Not started | |
| TS-08 Timer calibration | M00-T11 | Not started or deferred | |
| TS-09 Vendor checklist | M00-T03 | Not started | |

## Template

```markdown
### TS-XX Name

- Hypothesis:
- Requirement or decision:
- Environment and versions:
- Preconditions:
- Procedure, exact commands:
- Raw output:
- UTC timestamps and runner:
- Result: PASS or FAIL
- Fallback decision:
- Residual risk and what this does not prove:
```