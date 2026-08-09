import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import ts from "typescript";

async function tsxFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return tsxFiles(target);
      return entry.isFile() && entry.name.endsWith(".tsx") ? [target] : [];
    }),
  );
  return nested.flat();
}

function attribute(node: ts.JsxAttributes, name: string) {
  return node.properties.find(
    (property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

function rendersLink(node: ts.JsxAttributes) {
  const render = attribute(node, "render");
  const expression =
    render?.initializer && ts.isJsxExpression(render.initializer) ? render.initializer.expression : null;
  return expression && ts.isJsxSelfClosingElement(expression) && expression.tagName.getText() === "Link";
}

function declaresNonNativeButton(node: ts.JsxAttributes) {
  const nativeButton = attribute(node, "nativeButton");
  return (
    nativeButton?.initializer &&
    ts.isJsxExpression(nativeButton.initializer) &&
    nativeButton.initializer.expression?.kind === ts.SyntaxKind.FalseKeyword
  );
}

test("every Base UI control that renders a Next.js Link declares non-native semantics", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const files = [...(await tsxFiles(path.join(root, "app"))), ...(await tsxFiles(path.join(root, "src")))];
  let linkControlCount = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const control = node.tagName.getText(sourceFile);
        if (["Button", "DropdownMenuItem", "TabsTrigger"].includes(control) && rendersLink(node.attributes)) {
          linkControlCount += 1;
          assert.equal(
            declaresNonNativeButton(node.attributes),
            true,
            `${path.relative(root, file)} ${control} must set nativeButton={false}`,
          );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  assert.ok(linkControlCount >= 10, "expected the current Link-rendered Base UI controls to be validated");
});
