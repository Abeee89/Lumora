/**
 * MODULE-BOUNDARIES.md sections 4 and 8, enforced by tooling rather than review.
 *
 * Rules:
 * 1. A module may import a module of strictly lower rank only.
 * 2. A cross-module import must target `<module>/public`; deep imports are violations.
 * 3. The shared kernel may not import any module.
 * 4. Modules may import the kernel and npm packages freely.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import ts from "typescript";

export const moduleRanks = {
  auth: 1,
  profile: 2,
  subjects: 3,
  topics: 4,
  exams: 5,
  plans: 6,
  sessions: 7,
  timer: 8,
  tasks: 9,
  notes: 10,
  flashcards: 11,
  goals: 12,
  analytics: 13,
  calendar: 14,
  gamification: 15,
  notifications: 16,
  ai: 17,
  groups: 18,
  integrations: 19,
} as const;

export type ModuleName = keyof typeof moduleRanks;

export interface Violation {
  file: string;
  imported: string;
  rule: "upward-import" | "deep-import" | "kernel-imports-module";
  reason: string;
}

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];
export const PUBLIC_INTERFACE = "public";

export async function checkBoundaries(root: string): Promise<Violation[]> {
  const srcDir = join(root, "src");
  const files = await collectSourceFiles(srcDir);
  const violations: Violation[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
    const fileModule = moduleOfPath(srcDir, file);

    for (const specifier of importSpecifiers(sourceFile)) {
      const target = resolveTarget(srcDir, specifier, file);
      if (target === undefined) continue;
      const imported = moduleOfPath(srcDir, target.file);

      if (imported === undefined) continue;
      const displayFile = relative(root, file).split(sep).join("/");

      if (fileModule === undefined) {
        // Rule 3: kernel (and any non-module directory) may not import a module.
        if (isInsideKernel(srcDir, file)) {
          violations.push({
            file: displayFile,
            imported: specifier,
            rule: "kernel-imports-module",
            reason: "the shared kernel may not import a module (MODULE-BOUNDARIES section 8)",
          });
        }
        continue;
      }

      if (imported === fileModule) continue;

      if (!isPublicImport(specifier)) {
        violations.push({
          file: displayFile,
          imported: specifier,
          rule: "deep-import",
          reason: `cross-module imports must target ${imported}/${PUBLIC_INTERFACE}`,
        });
      }

      if (moduleRanks[imported] >= moduleRanks[fileModule]) {
        violations.push({
          file: displayFile,
          imported: specifier,
          rule: "upward-import",
          reason: `rank ${imported}=${moduleRanks[imported]} is not lower than rank ${fileModule}=${moduleRanks[fileModule]}`,
        });
      }
    }
  }

  return violations;
}

export function formatViolations(violations: readonly Violation[]): string {
  return violations
    .map((violation) => `${violation.file}: ${violation.rule} via "${violation.imported}" (${violation.reason})`)
    .join("\n");
}

function isPublicImport(specifier: string): boolean {
  const trimmed = specifier.replace(/\.(ts|tsx|js|jsx)$/, "");
  return trimmed.endsWith(`/${PUBLIC_INTERFACE}`) || trimmed.endsWith(`/${PUBLIC_INTERFACE}/index`);
}

function isInsideKernel(srcDir: string, file: string): boolean {
  const kernel = resolve(srcDir, "kernel");
  return file.startsWith(kernel + sep);
}

function moduleOfPath(srcDir: string, file: string): ModuleName | undefined {
  const modulesRoot = resolve(srcDir, "modules") + sep;
  if (!file.startsWith(modulesRoot)) return undefined;
  const name = relative(modulesRoot, file).split(sep)[0] ?? "";
  return Object.hasOwn(moduleRanks, name) ? (name as ModuleName) : undefined;
}

function resolveTarget(
  srcDir: string,
  specifier: string,
  importer: string,
): { file: string } | undefined {
  let base: string;
  if (specifier.startsWith("@/")) {
    base = join(srcDir, specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    base = resolve(importer, "..", specifier);
  } else {
    return undefined;
  }
  const normalisedBase = base.replace(/\.(ts|tsx|js|jsx)$/, "");
  return { file: normalisedBase };
}

function importSpecifiers(sourceFile: ts.SourceFile): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) found.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node) && node.expression.getText() === "import") {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) found.push(argument.text);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      const literal = node.argument.literal;
      if (ts.isStringLiteral(literal)) found.push(literal.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      files.push(...(await collectSourceFiles(full)));
    } else if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      if (entry.name.includes(".test.") || entry.name.includes(".spec.")) continue;
      files.push(full);
    }
  }
  return files;
}