import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "This browser is not supported · Lumora",
};

/** SY-3. Static HTML, no client JavaScript (PAGE-SPECIFICATIONS; NFR-082). */
export default function UnsupportedBrowserPage() {
  return (
    <div className="mx-auto max-w-[560px]">
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-9 text-ink outline-none">
        This browser is not supported
      </h1>
      <p className="mt-3 text-ink-2">
        Lumora needs a current browser. These work:
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-ink-2">
        <li>Chrome or Edge, latest two major versions</li>
        <li>Firefox, latest two major versions</li>
        <li>Safari 16 or later, on macOS and iOS</li>
        <li>Chrome on Android, latest two major versions</li>
      </ul>
    </div>
  );
}