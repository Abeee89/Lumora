/**
 * Throwaway: reports SQL statements whose parameter list and placeholders disagree.
 * Deleted after the M02 checks.
 */
import { readFileSync } from "node:fs";

const files = [
  "src/modules/auth/service.ts",
  "src/modules/auth/sessions.ts",
  "src/modules/auth/audit.ts",
  "src/modules/auth/google.ts",
  "src/modules/auth/cleanup.ts",
  "src/modules/profile/service.ts",
  "src/kernel/rate-limit.ts",
  "src/kernel/idempotency.ts",
];

let problems = 0;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const statement = /`([^`]*)`\s*,\s*\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = statement.exec(text)) !== null) {
    const sql = match[1] ?? "";
    const params = match[2] ?? "";
    if (!sql.includes("$1") && !sql.includes("$2")) continue;
    const used = new Set([...sql.matchAll(/\$(\d+)/g)].map((entry) => Number(entry[1])));
    const count = params.split(",").filter((part) => part.trim() !== "").length;
    for (let index = 1; index <= count; index += 1) {
      if (!used.has(index)) {
        problems += 1;
        console.log("UNUSED", `${file}:${index}`, JSON.stringify(sql.trim().slice(0, 70)));
      }
    }
    for (const index of used) {
      if (index > count) {
        problems += 1;
        console.log("NO_ARGUMENT", `${file}:$${index}`, JSON.stringify(sql.trim().slice(0, 70)));
      }
    }
  }
}

console.log(problems === 0 ? "parameter audit clean" : `${problems} problem(s)`);
