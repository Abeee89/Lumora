import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found · Lumora",
};

/**
 * SY-1. PAGE-SPECIFICATIONS.md specifies one link back to Dashboard or Entry; neither
 * route exists before M02, so the link is omitted until a destination ships. M01
 * evidence records the deviation.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-[560px]">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        We could not find that page
      </h1>
      <p className="mt-3 text-ink-2">The link may be wrong, or the item was removed.</p>
    </div>
  );
}