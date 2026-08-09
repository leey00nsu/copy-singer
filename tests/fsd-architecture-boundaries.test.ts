import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

type ModuleReference = {
  specifier: string;
  runtime: boolean;
};

type SourceInfo = {
  filePath: string;
  sourceFile: ts.SourceFile;
  references: ModuleReference[];
};

type SliceLocation = {
  layer: string;
  slice: string;
  remainder: string[];
};

const projectRoot = process.cwd();
const sourceExtensions = [".ts", ".tsx", ".mts", ".cts"] as const;
const slicedLayers = new Set(["_pages", "widgets", "features", "entities"]);
const sliceSegments = new Set(["api", "model", "ui", "lib", "config"]);
const routeConfigNames = new Set([
  "runtime",
  "preferredRegion",
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "maxDuration",
]);

function importDeclarationRunsAtRuntime(statement: ts.ImportDeclaration) {
  const clause = statement.importClause;
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return true;
  return clause.namedBindings.elements.some((element) => !element.isTypeOnly);
}

function exportDeclarationRunsAtRuntime(statement: ts.ExportDeclaration) {
  if (statement.isTypeOnly) return false;
  if (!statement.exportClause || ts.isNamespaceExport(statement.exportClause)) return true;
  return statement.exportClause.elements.some((element) => !element.isTypeOnly);
}

function collectModuleReferences(sourceFile: ts.SourceFile) {
  const references: ModuleReference[] = [];

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      references.push({
        specifier: node.moduleSpecifier.text,
        runtime: importDeclarationRunsAtRuntime(node),
      });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      references.push({
        specifier: node.moduleSpecifier.text,
        runtime: exportDeclarationRunsAtRuntime(node),
      });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      references.push({ specifier: node.arguments[0].text, runtime: true });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return references;
}

function createSourceInfo(filePath: string, source: string): SourceInfo {
  const normalizedPath = path.resolve(filePath);
  const sourceFile = ts.createSourceFile(
    normalizedPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    normalizedPath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  return { filePath: normalizedPath, sourceFile, references: collectModuleReferences(sourceFile) };
}

function collectSourcePaths(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entryPath === path.join(projectRoot, "src/shared/db/generated")) return [];
      return collectSourcePaths(entryPath);
    }
    if (entry.name.endsWith(".d.ts")) return [];
    return sourceExtensions.some((extension) => entry.name.endsWith(extension)) ? [entryPath] : [];
  });
}

function collectProjectSources() {
  return ["app", "src", "scripts"]
    .flatMap((directory) => collectSourcePaths(path.join(projectRoot, directory)))
    .sort()
    .map((filePath) => createSourceInfo(filePath, readFileSync(filePath, "utf8")));
}

function sourceMap(sources: SourceInfo[]) {
  return new Map(sources.map((source) => [source.filePath, source]));
}

function resolveInternalReference(
  importerPath: string,
  specifier: string,
  root: string,
  sources: Map<string, SourceInfo>,
) {
  let basePath: string;
  if (specifier.startsWith("@/")) {
    basePath = path.join(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(importerPath), specifier);
  } else {
    return undefined;
  }

  const candidates = [
    basePath,
    ...sourceExtensions.map((extension) => `${basePath}${extension}`),
    ...sourceExtensions.map((extension) => path.join(basePath, `index${extension}`)),
  ];
  return candidates.map((candidate) => path.resolve(candidate)).find((candidate) => sources.has(candidate));
}

function sliceLocation(filePath: string, root: string): SliceLocation | undefined {
  const relativePath = path.relative(path.join(root, "src"), filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return undefined;
  const [layer, slice, ...remainder] = relativePath.split(path.sep);
  if (!layer || !slice || !slicedLayers.has(layer)) return undefined;
  return { layer, slice, remainder };
}

function displayPath(filePath: string, root: string) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function findPublicApiViolations(sources: SourceInfo[], root: string) {
  const sourcesByPath = sourceMap(sources);
  const violations: string[] = [];

  for (const importer of sources) {
    const importerSlice = sliceLocation(importer.filePath, root);
    for (const reference of importer.references) {
      const targetPath = resolveInternalReference(importer.filePath, reference.specifier, root, sourcesByPath);
      if (!targetPath) continue;
      const targetSlice = sliceLocation(targetPath, root);
      if (!targetSlice || !sliceSegments.has(targetSlice.remainder[0] ?? "")) continue;
      if (importerSlice && importerSlice.layer === targetSlice.layer && importerSlice.slice === targetSlice.slice) {
        continue;
      }
      violations.push(
        `${displayPath(importer.filePath, root)} imports internal segment ${reference.specifier}; use @/${targetSlice.layer}/${targetSlice.slice} public API`,
      );
    }
  }

  return violations.sort();
}

function hasUseClientDirective(sourceFile: ts.SourceFile) {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) return false;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

function serverModuleReason(source: SourceInfo, root: string) {
  const relativePath = displayPath(source.filePath, root);
  if (/\.server\.(?:[cm]?ts|tsx)$/.test(source.filePath)) return "server entry point";
  if (relativePath.startsWith("src/shared/db/")) return "Shared DB module";
  const serverSpecifier = source.references.find(
    (reference) =>
      reference.runtime &&
      (reference.specifier === "server-only" ||
        reference.specifier === "next/headers" ||
        reference.specifier === "next/server" ||
        reference.specifier === "@/shared/db" ||
        reference.specifier.startsWith("@/shared/db/")),
  );
  return serverSpecifier ? `server marker ${serverSpecifier.specifier}` : undefined;
}

function findClientServerViolations(sources: SourceInfo[], root: string) {
  const sourcesByPath = sourceMap(sources);
  const violations: string[] = [];

  function visit(currentPath: string, chain: string[], visited: Set<string>): string | undefined {
    const current = sourcesByPath.get(currentPath);
    if (!current) return undefined;
    const reason = serverModuleReason(current, root);
    if (reason) {
      return `${chain.map((filePath) => displayPath(filePath, root)).join(" -> ")} reaches ${reason}`;
    }
    if (visited.has(currentPath)) return undefined;
    visited.add(currentPath);

    for (const reference of current.references.filter((candidate) => candidate.runtime)) {
      const targetPath = resolveInternalReference(current.filePath, reference.specifier, root, sourcesByPath);
      if (!targetPath) continue;
      const violation = visit(targetPath, [...chain, targetPath], visited);
      if (violation) return violation;
    }
    return undefined;
  }

  for (const clientRoot of sources.filter((source) => hasUseClientDirective(source.sourceFile))) {
    const violation = visit(clientRoot.filePath, [clientRoot.filePath], new Set());
    if (violation) violations.push(violation);
  }
  return violations.sort();
}

function hasExportModifier(statement: ts.VariableStatement) {
  return statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function isStaticRouteConfigValue(expression: ts.Expression) {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    ts.isNumericLiteral(expression) ||
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return true;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.every((element) => ts.isStringLiteral(element));
  }
  return (
    ts.isPrefixUnaryExpression(expression) &&
    (expression.operator === ts.SyntaxKind.PlusToken || expression.operator === ts.SyntaxKind.MinusToken) &&
    ts.isNumericLiteral(expression.operand)
  );
}

function routeConfigViolation(statement: ts.VariableStatement) {
  if (!hasExportModifier(statement)) return "root App variables must be exported Next.js route config";
  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name) || !routeConfigNames.has(declaration.name.text)) {
      return "root App variables are limited to documented Next.js route config";
    }
    if (!declaration.initializer || !isStaticRouteConfigValue(declaration.initializer)) {
      return `root App route config ${declaration.name.text} must use a static value`;
    }
  }
  return undefined;
}

function isDirectiveStatement(statement: ts.Statement) {
  return ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
}

function isPublicAppTarget(targetPath: string, root: string) {
  const relativePath = displayPath(targetPath, root);
  if (!relativePath.startsWith("src/_app/") && !relativePath.startsWith("src/_pages/")) return false;
  return /^index(?:\.[a-z-]+)*\.(?:[cm]?ts|tsx)$/.test(path.basename(targetPath));
}

function findRootAppAdapterViolations(sources: SourceInfo[], root: string) {
  const sourcesByPath = sourceMap(sources);
  const appRoot = path.join(root, "app");
  const violations: string[] = [];

  for (const source of sources.filter((candidate) => candidate.filePath.startsWith(`${appRoot}${path.sep}`))) {
    for (const reference of source.references) {
      if (!reference.specifier.startsWith("@/") && !reference.specifier.startsWith(".")) continue;
      const targetPath = resolveInternalReference(source.filePath, reference.specifier, root, sourcesByPath);
      if (!targetPath || !isPublicAppTarget(targetPath, root)) {
        violations.push(
          `${displayPath(source.filePath, root)} imports ${reference.specifier}; root App adapters may use only _app/_pages public APIs`,
        );
      }
    }

    for (const statement of source.sourceFile.statements) {
      if (isDirectiveStatement(statement) || ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
        continue;
      }
      if (ts.isVariableStatement(statement)) {
        const violation = routeConfigViolation(statement);
        if (violation) violations.push(`${displayPath(source.filePath, root)}: ${violation}`);
        continue;
      }
      violations.push(
        `${displayPath(source.filePath, root)} contains ${ts.SyntaxKind[statement.kind]}; move implementation behind an FSD public API`,
      );
    }
  }

  return violations.sort();
}

function fixtureSources(root: string, files: Record<string, string>) {
  return Object.entries(files).map(([filePath, source]) => createSourceInfo(path.join(root, filePath), source));
}

test("slice boundary fixtures reject cross-slice segments and allow root public APIs", () => {
  const root = path.resolve("/virtual/copy-singer");
  const sources = fixtureSources(root, {
    "src/_app/api-routes/jobs.ts": [
      'import { schema } from "@/features/analyze/model/contract";',
      'import { publicSchema } from "@/features/public-contract/index.model";',
    ].join("\n"),
    "src/features/analyze/model/contract.ts": "export const schema = true;",
    "src/features/public-contract/index.model.ts": "export const publicSchema = true;",
  });

  const violations = findPublicApiViolations(sources, root);
  assert.equal(violations.length, 1);
  assert.match(violations[0] ?? "", /analyze\/model\/contract/);
  assert.match(violations[0] ?? "", /use @\/features\/analyze public API/);
});

test("client graph fixtures report direct and transitive server imports but ignore type-only imports", () => {
  const root = path.resolve("/virtual/copy-singer");
  const sources = fixtureSources(root, {
    "src/widgets/direct/ui/client.tsx": [
      '"use client";',
      'import { prisma } from "@/shared/db/index.server";',
      "void prisma;",
    ].join("\n"),
    "src/widgets/transitive/ui/client.tsx": ['"use client";', 'import "@/features/authentication";'].join("\n"),
    "src/widgets/type-only/ui/client.tsx": [
      '"use client";',
      'import type { SecretType } from "@/features/type-source/index.server";',
      "export type PublicType = SecretType;",
    ].join("\n"),
    "src/shared/db/index.server.ts": 'import "server-only"; export const prisma = true;',
    "src/features/authentication/index.ts": 'export * from "./model/admin-policy";',
    "src/features/authentication/model/admin-policy.ts": 'import "server-only"; export const policy = true;',
    "src/features/type-source/index.server.ts": 'import "server-only"; export type SecretType = string;',
  });

  const violations = findClientServerViolations(sources, root);
  assert.equal(violations.length, 2);
  assert.match(violations.join("\n"), /widgets\/direct.*server marker @\/shared\/db\/index\.server/);
  assert.match(violations.join("\n"), /widgets\/transitive.*authentication\/index\.ts.*admin-policy/);
  assert.doesNotMatch(violations.join("\n"), /type-only/);
});

test("root App fixtures allow thin adapters and reject implementation or internal segment imports", () => {
  const root = path.resolve("/virtual/copy-singer");
  const sources = fixtureSources(root, {
    "app/api/jobs/route.ts": [
      'export const runtime = "nodejs";',
      'export { GET } from "@/_app/api-routes/jobs/index.server";',
    ].join("\n"),
    "app/profile/page.tsx": [
      'export { ProfilePage as default } from "@/_pages/profile/ui/profile-page";',
      "export function helper() { return 'business logic'; }",
    ].join("\n"),
    "src/_app/api-routes/jobs/index.server.ts": "export const GET = () => new Response();",
    "src/_pages/profile/ui/profile-page.tsx": "export function ProfilePage() { return null; }",
  });

  const violations = findRootAppAdapterViolations(sources, root);
  assert.equal(violations.length, 2);
  assert.match(violations.join("\n"), /only _app\/_pages public APIs/);
  assert.match(violations.join("\n"), /FunctionDeclaration/);
});

test("the project source tree satisfies FSD, client/server, and root App adapter boundaries", () => {
  const sources = collectProjectSources();
  assert.deepEqual(findPublicApiViolations(sources, projectRoot), []);
  assert.deepEqual(findClientServerViolations(sources, projectRoot), []);
  assert.deepEqual(findRootAppAdapterViolations(sources, projectRoot), []);
});
