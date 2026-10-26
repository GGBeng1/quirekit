import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { MindMapDocument, MindMapNode } from "../src/model/types";
import { importXmindFile, exportXmindFile } from "../src/xmind";

/** @param name - Committed producer fixture name. @returns Original ZIP bytes, never repacked by the test. */
async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(new URL(`./fixtures/native-xmind/${name}`, import.meta.url)));
}

/** @param node - Canonical tree. @returns Ordered topic text, including collapsed descendants. */
function titles(node: MindMapNode): string[] {
  return [node.text, ...node.children.flatMap(titles)];
}

/** @param document - One portable forest. @returns Topic identities addressed by stable structural paths. */
function topicPaths(document: MindMapDocument): ReadonlyMap<string, string> {
  const paths = new Map<string, string>();
  /** @param node - Current owner. @param path - Position in this forest. */
  function visit(node: MindMapNode, path: string): void {
    paths.set(node.id, path); node.children.forEach((child, index) => visit(child, `${path}.${index}`));
  }
  visit(document.root, "root");
  document.floatingTopics?.forEach((topic, index) => visit(topic.root, `free.${index}`));
  return paths;
}

/** @param node - Imported topic. @param retained - Original text identities in this unique-title fixture. @returns Every persistent field except regenerated local IDs and newly added topics. */
function retainedTree(node: MindMapNode, retained: ReadonlySet<string>): unknown {
  const { id: _id, children, ...fields } = node;
  return { ...fields, children: children.filter(child => retained.has(child.text)).map(child => retainedTree(child, retained)) };
}

/** @param document - Imported forest. @param retained - Original topic text identities. @returns Original fields and annotation endpoints independent of locally regenerated IDs. */
function retainedSource(document: MindMapDocument, retained: ReadonlySet<string>): unknown {
  const paths = topicPaths(document);
  return { ...document, root: retainedTree(document.root, retained),
    floatingTopics: document.floatingTopics?.map(topic => ({ ...topic, root: retainedTree(topic.root, retained) })),
    annotations: document.annotations?.map(annotation => {
      const { id: _id, ...fields } = annotation;
      return annotation.kind === "relation" ? { ...fields, from: paths.get(annotation.from), to: paths.get(annotation.to) }
        : { ...fields, topicIds: annotation.topicIds.map(id => paths.get(id)) };
    }) };
}

describe("native Xmind 26 edit, local save and portable re-import", () => {
  it("retains original forest, every admitted topic field and annotation reference after native changes", async () => {
    // These are actual producer outputs from the documented desktop workflow.
    // No test constructs a lookalike content.json or repairs the saved ZIP.
    const original = await importXmindFile(await fixture("quire-export.xmind"));
    const saved = await importXmindFile(await fixture("xmind-26-resaved.xmind"));
    expect(original.diagnostics).toEqual([]); expect(saved.sheets).toHaveLength(1);
    const before = original.sheets[0]!.document, after = saved.sheets[0]!.document;
    const retained = new Set([...titles(before.root), ...before.floatingTopics!.flatMap(topic => titles(topic.root))]);
    expect(retainedSource(after, retained)).toEqual(retainedSource(before, retained));
    expect(titles(after.root)).toEqual([...titles(before.root), "分支主题 4", "XMind 原生保存验收"]);
    expect(after.root.children[3]!.children[0]!.text).toBe("XMind 原生保存验收");
    expect(after.floatingTopics![0]!.root.details!.image).toEqual(before.floatingTopics![0]!.root.details!.image);
    expect(after.annotations!.map(annotation => annotation.kind)).toEqual(["relation", "summary", "boundary"]);
    expect(saved.diagnostics.map(diagnostic => diagnostic.path)).toEqual([
      "sheets[0].revisionId", "sheets[0].arrangeableLayerOrder", "sheets[0].zones",
      "sheets[0].rootTopic.children.attached[3].titleUnedited",
    ]);
    expect(saved.diagnostics.every(diagnostic => diagnostic.code === "unsupported-field")).toBe(true);

    // Re-export tests our admitted semantic boundary after the native producer
    // changes; it does not replace the independent native-save proof above.
    const exported = await exportXmindFile(after), reopened = await importXmindFile(exported.bytes);
    expect(exported.diagnostics).toEqual([]); expect(reopened.diagnostics).toEqual([]);
    expect(reopened.sheets[0]!.document).toEqual(after);
  });
});
