# ADR-007 Notes as markdown with sanitization

> Status: Proposal, pending approval. Source of truth: Phase 2 PRD and Phase 1 docs.

## Status

Proposed. TipTap was a candidate and is not adopted for the MVP.

## Context

Notes are markdown (FR-100) rendered with sanitization (FR-101) and must contain no executable script, event handlers or unsafe links, with 0 failures on an XSS payload corpus (NFR-015, risk R6). Notes autosave (FR-102), unsaved content survives a failed save (NFR-054), and a version conflict shows both versions with keep mine, keep theirs or copy both (FR-103, EC-020, U-8). Bundle size matters for LCP (NFR-001).

## Decision

1. Edit with a plain markdown textarea; show a preview.
2. Render through a remark/rehype pipeline with an allow-list sanitizer (rehype-sanitize) on the server. Stored content is never trusted: sanitization runs at render time, not only at save time.
3. Allow-list: headings, emphasis, lists, code blocks, links with safe schemes (http, https, mailto), images only if later required and then from allowed sources. Scripts, event handler attributes, inline styles and unsafe URL schemes are removed. External links get safe `rel` attributes.
4. Enforce a strict Content-Security-Policy as a second layer (NFR-014).
5. Notes carry a version; a stale save is rejected and the conflict view offers both versions (NFR-094).
6. A payload corpus test runs in CI.
7. TipTap is recorded as a Phase 2+ option: stored data stays markdown, with a markdown serializer in the editor.

## Consequences

- Smallest bundle and attack surface; stored format equals edit format; no lossy conversion.
- Users who do not know markdown get less convenience; the preview and help text mitigate this.
- Override path: switching to TipTap affects this ADR and FR-100..103 only.
- The sanitization policy is a security artefact and changes need review.

## Alternatives

- TipTap: rejected for MVP (bundle size, document-tree model needs markdown serialization with possible loss, larger sanitization surface).
- Lexical or Slate: same trade-offs, less turnkey.
- CodeMirror markdown editor: lighter than TipTap, still heavier than needed.
- Storing HTML: rejected because the requirement says markdown and HTML storage enlarges the XSS risk.
