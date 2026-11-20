/**
 * FR-010: the palette key becomes a 12 px dot beside the printed name. COLOR-TYPOGRAPHY
 * section 6 fixes the ten colours as `--subject-*` tokens; this map is the only place the
 * key becomes a class name, because Tailwind needs literal class strings.
 */
const dotColour: Readonly<Record<string, string>> = {
  teal: "bg-subject-teal",
  red: "bg-subject-red",
  blue: "bg-subject-blue",
  brown: "bg-subject-brown",
  violet: "bg-subject-violet",
  green: "bg-subject-green",
  plum: "bg-subject-plum",
  slate: "bg-subject-slate",
  rust: "bg-subject-rust",
  cyan: "bg-subject-cyan",
};

export function subjectDotClass(colour: string): string {
  return dotColour[colour] ?? "bg-muted";
}

/** Decorative: the name beside it always carries the meaning (NFR-043). */
export function SubjectDot({ colour, className = "" }: { colour: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-3 shrink-0 rounded-full ${subjectDotClass(colour)} ${className}`}
    />
  );
}
