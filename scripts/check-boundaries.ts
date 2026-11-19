/**
 * CI stage 2: fails on a module-boundary violation (MODULE-BOUNDARIES section 8).
 */
import { checkBoundaries, formatViolations } from "../tools/boundaries.ts";

const root = process.argv[2] ?? ".";
const violations = await checkBoundaries(root);

if (violations.length > 0) {
  console.error(formatViolations(violations));
  console.error(`\n${violations.length} boundary violation(s).`);
  process.exit(1);
}

console.log("Boundary check passed.");