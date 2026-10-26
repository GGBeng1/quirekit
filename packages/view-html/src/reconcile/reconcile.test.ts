import { getChangedRanges } from "@quirekit/core";
import { EditorState, Mapping, Schema, StepMap } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlDocumentDescriptor } from "../descriptors";
import { createHtmlRetainedDocumentView } from "../document";
import { matchHtmlDescriptorChildren } from "./match";
import { mapHtmlDescriptorTree } from "./map";
import { createHtmlCandidateShellTargets } from "./matching/shell";
import { reconcileHtmlDescriptorTree } from "./reconcile";

describe("retained HTML reconciliation", registerReconcileTests);

/** Registers retained reconciliation behavior. */
function registerReconcileTests(): void {
  it("retains unaffected DOM and writes only edited text", testMinimalTextWrite);
  it("inserts one retained block without replacing siblings", testBlockInsertion);
  it("deletes one retained block without moving the tail", testBlockDeletion);
  it("splits a block while retaining the opening block", testBlockSplit);
  it("joins blocks with explicit replacement of deleted boundaries", testBlockJoin);
  it("adds and removes mark wrappers with bounded structure writes", testMarkChanges);
  it("does not reuse an invalid nearby move without source authority", testNodeMove);
  it("moves same-type nodes by explicit source through real mappings", testExplicitSourceMove);
  it("patches node attributes without replacing retained DOM", testAttributePatch);
  it("replaces shells when attribute-driven topology changes", testShellTopologyChanges);
  it("replaces shells when a nested static class changes", testNestedStaticClassChange);
  it("replaces shells when a nested static style changes", testNestedStaticStyleChange);
  it("replaces shells when a nested static attribute changes", testNestedStaticAttributeChange);
  it("destroys same-size same-type replacements with invalid ownership", testInvalidReplacement);
  it("rejects structural reuse when explicit source changes or disappears", testSourceChanges);
  it("diagnoses duplicate target sources without double adoption", testDuplicateTargetSources);
  it("limits nearby sibling matching to exactly five candidates", testBoundedLookahead);
  it("allocates new descendant ids monotonically without changing retained ids", testMonotonicIds);
  it("keeps descriptor position readers live across mapped updates", testLivePositionReader);
  it("maps outer and inline ownership with the required associations", testRangeMapping);
  it("increments geometry epochs for direct retained DOM writes", testGeometryEpochs);
  it("derives root replacement tracing from actual mount identity", testRootReplacementTrace);
}

/** Proves an ordinary text insertion preserves retained DOM identity. */
function testMinimalTextWrite(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["alpha", "beta", "gamma"]);
  const state = EditorState.create({ schema, doc: documentNode });
  const transaction = state.tr.insertText("!", 3);
  const created = createHtmlDocumentDescriptor({
    id: "html:document",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:body" }
  });
  const rootDOM = created.descriptor.mount?.dom;
  const firstParagraph = created.descriptor.children[0];
  const siblingParagraph = created.descriptor.children[1];
  const affectedText = firstParagraph?.kind === "node"
    ? firstParagraph.children[0]
    : undefined;

  const result = reconcileHtmlDescriptorTree({
    root: created.descriptor,
    documentNode: transaction.doc,
    mapping: transaction.mapping,
    changedRanges: getChangedRanges(transaction),
    ownerDocument: created.descriptor.mount?.dom.ownerDocument as Document,
    allocateId: createAllocator("html:document")
  });

  expect(result.root).toBe(created.descriptor);
  expect(result.root.mount?.dom).toBe(rootDOM);
  expect(result.root.children[0]).toBe(firstParagraph);
  expect(result.root.children[1]).toBe(siblingParagraph);
  expect(result.root.children[1]?.mount?.dom).toBe(siblingParagraph?.mount?.dom);
  expect(result.trace.textWrites).toEqual([affectedText?.id]);
  expect(result.trace.attributeWrites).toEqual([]);
  expect(result.trace.structureWrites).toEqual([]);
  expect(result.trace.rootReplacements).toBe(0);
}

/** Proves a structural insertion creates only the new retained block. */
function testBlockInsertion(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["a", "b", "c"]);
  const state = EditorState.create({ schema, doc: documentNode });
  const view = createView(documentNode);
  const before = [...view.root.children];
  const inserted = schema.node("paragraph", null, schema.text("new"));
  const transaction = state.tr.insert(documentNode.child(0).nodeSize, inserted);

  const result = view.update(updateFrom(transaction));

  expect(view.root.children.map((descriptor) => descriptor.id)).toEqual([
    before[0]?.id,
    view.root.children[1]?.id,
    before[1]?.id,
    before[2]?.id
  ]);
  expect(result.trace.structureWrites).toEqual([{
    operation: "insert",
    descriptorId: view.root.children[1]?.id,
    parentId: view.root.id,
    index: 1
  }]);
  expect(result.trace.rootReplacements).toBe(0);
}

/** Proves deleting a block emits one remove and retains the mapped tail. */
function testBlockDeletion(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["a", "b", "c"]);
  const state = EditorState.create({ schema, doc: documentNode });
  const view = createView(documentNode);
  const before = [...view.root.children];
  const from = documentNode.child(0).nodeSize;
  const transaction = state.tr.delete(from, from + documentNode.child(1).nodeSize);

  const result = view.update(updateFrom(transaction));

  expect(view.root.children.map((descriptor) => descriptor.id)).toEqual([
    before[0]?.id,
    before[2]?.id
  ]);
  expect(before[1]?.destroyed).toBe(true);
  expect(result.trace.structureWrites).toEqual([{
    operation: "remove",
    descriptorId: before[1]?.id,
    parentId: view.root.id,
    index: 1
  }]);
}

/** Proves splitting a paragraph keeps the original opening-side descriptor. */
function testBlockSplit(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["abcd"]);
  const state = EditorState.create({ schema, doc: documentNode });
  const view = createView(documentNode);
  const paragraph = view.root.children[0];
  const paragraphDOM = paragraph?.mount?.dom;
  const transaction = state.tr.split(3);

  const result = view.update(updateFrom(transaction));

  expect(view.root.children).toHaveLength(2);
  expect(view.root.children[0]).toBe(paragraph);
  expect(view.root.children[0]?.mount?.dom).toBe(paragraphDOM);
  expect(result.trace.rootReplacements).toBe(0);
}

/** Proves joining deleted node boundaries does not retain invalid ownership. */
function testBlockJoin(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["ab", "cd"]);
  const state = EditorState.create({ schema, doc: documentNode });
  const view = createView(documentNode);
  const before = [...view.root.children];
  const transaction = state.tr.join(documentNode.child(0).nodeSize);

  const result = view.update(updateFrom(transaction));

  expect(view.root.children).toHaveLength(1);
  expect(before.every((descriptor) => descriptor.destroyed)).toBe(true);
  expect(result.trace.structureWrites.map((write) => write.operation)).toEqual([
    "remove",
    "remove",
    "insert"
  ]);
  expect(result.trace.rootReplacements).toBe(0);
}

/** Proves mark add/remove uses explicit wrappers without replacing the root. */
function testMarkChanges(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["marked"]);
  const view = createView(documentNode);
  const addState = EditorState.create({ schema, doc: documentNode });
  const add = addState.tr.addMark(1, 7, schema.marks.strong!.create());
  const added = view.update(updateFrom(add));
  const mark = view.root.children[0]?.kind === "node"
    ? view.root.children[0].children[0]
    : undefined;

  expect(mark?.kind).toBe("mark");
  expect(added.trace.structureWrites.map((write) => write.operation)).toEqual([
    "remove",
    "insert"
  ]);

  const removeState = EditorState.create({ schema, doc: add.doc });
  const remove = removeState.tr.removeMark(1, 7, schema.marks.strong);
  const removed = view.update(updateFrom(remove));
  const text = view.root.children[0]?.kind === "node"
    ? view.root.children[0].children[0]
    : undefined;

  expect(text?.kind).toBe("text");
  expect(removed.trace.structureWrites.map((write) => write.operation)).toEqual([
    "remove",
    "insert"
  ]);
  expect(removed.trace.rootReplacements).toBe(0);
}

/** Proves an invalid real move cannot be recovered by nearby structural matching. */
function testNodeMove(): void {
  const schema = createSchema();
  const paragraph = schema.node("paragraph", null, schema.text("paragraph"));
  const heading = schema.node("heading", null, schema.text("heading"));
  const tail = schema.node("paragraph", null, schema.text("tail"));
  const documentNode = schema.node("doc", null, [paragraph, heading, tail]);
  const view = createView(documentNode);
  const before = [...view.root.children];
  const transaction = moveSecondBlockToFront(schema, documentNode);

  const result = view.update(updateFrom(transaction));

  expect(transaction.mapping.maps.length).toBeGreaterThan(1);
  expect(before[1]?.destroyed).toBe(true);
  expect(view.root.children[0]).not.toBe(before[1]);
  expect(view.root.children[1]).toBe(before[0]);
  expect(view.root.children[2]).toBe(before[2]);
  expect(result.trace.structureWrites.map((write) => write.operation)).toEqual([
    "remove",
    "insert"
  ]);
}

/** Proves explicit source authority can recover an invalid real mapped move. */
function testExplicitSourceMove(): void {
  const schema = createSchema();
  const first = createSourceParagraph(schema, "block:a");
  const second = createSourceParagraph(schema, "block:b");
  const tail = createSourceParagraph(schema, "block:c");
  const documentNode = schema.node("doc", null, [first, second, tail]);
  const view = createHtmlRetainedDocumentView({
    id: "html:sources",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:body" },
    resolveSource: (node, inherited) => node.attrs.sourceId
      ? { sourceId: String(node.attrs.sourceId) }
      : inherited
  });
  const before = [...view.root.children];
  const transaction = moveSecondBlockToFront(schema, documentNode);

  const result = view.update(updateFrom(transaction));

  expect(transaction.mapping.maps.length).toBeGreaterThan(1);
  expect(view.root.children.map((descriptor) => descriptor.id)).toEqual([
    before[1]?.id,
    before[0]?.id,
    before[2]?.id
  ]);
  expect(before[1]?.destroyed).toBe(false);
  expect(result.trace.structureWrites).toEqual([{
    operation: "move",
    descriptorId: before[1]?.id,
    parentId: view.root.id,
    index: 0
  }]);
}

/** Proves compatible schema shells receive direct attribute patches. */
function testAttributePatch(): void {
  const schema = createSchema();
  const paragraph = schema.node("paragraph", { tone: "plain" }, schema.text("attrs"));
  const documentNode = schema.node("doc", null, [paragraph]);
  const state = EditorState.create({ schema, doc: documentNode });
  const view = createView(documentNode);
  const retained = view.root.children[0];
  const retainedDOM = retained?.mount?.dom;
  const transaction = state.tr.setNodeAttribute(0, "tone", "callout");

  const result = view.update({
    documentNode: transaction.doc,
    mapping: transaction.mapping,
    changedRanges: [{
      oldRange: { from: 0, to: paragraph.nodeSize },
      newRange: { from: 0, to: paragraph.nodeSize }
    }]
  });

  expect(view.root.children[0]?.id).toBe(retained?.id);
  expect(view.root.children[0]?.mount?.dom).toBe(retainedDOM);
  expect(result.trace.attributeWrites).toEqual([{
    descriptorId: retained?.id,
    name: "data-tone",
    value: "callout"
  }]);
  expect(result.trace.structureWrites).toEqual([]);
}

/** Proves tag, content-hole path, and static wrapper changes replace shells. */
function testShellTopologyChanges(): void {
  const schema = createSchema();

  assertShellTopologyReplacement(schema, "tag-div", "tag-section");
  assertShellTopologyReplacement(schema, "hole-direct", "hole-nested");
  assertShellTopologyReplacement(schema, "wrapper-aside", "wrapper-section");
}

/** Proves a changed class on a static nested wrapper cannot retain stale DOM. */
function testNestedStaticClassChange(): void {
  assertShellTopologyReplacement(createSchema(), "nested-class-a", "nested-class-b");
}

/** Proves a changed style on a static nested wrapper cannot retain stale DOM. */
function testNestedStaticStyleChange(): void {
  assertShellTopologyReplacement(createSchema(), "nested-style-a", "nested-style-b");
}

/** Proves an ordinary changed attribute on a static wrapper forces replacement. */
function testNestedStaticAttributeChange(): void {
  assertShellTopologyReplacement(createSchema(), "nested-attr-a", "nested-attr-b");
}

/** Proves equal-size replacement mappings cannot retain invalid structural identity. */
function testInvalidReplacement(): void {
  const schema = createSchema();
  const original = schema.node("paragraph", null, schema.text("aa"));
  const replacement = schema.node("paragraph", null, schema.text("bb"));
  const documentNode = schema.node("doc", null, [original]);
  const state = EditorState.create({ schema, doc: documentNode });
  const view = createView(documentNode);
  const retained = view.root.children[0]!;
  const transaction = state.tr.replaceWith(0, original.nodeSize, replacement);

  view.update(updateFrom(transaction));

  expect(original.nodeSize).toBe(replacement.nodeSize);
  expect(retained.destroyed).toBe(true);
  expect(view.root.children[0]).not.toBe(retained);
}

/** Proves explicit source removal or mutation breaks structural reuse authority. */
function testSourceChanges(): void {
  const schema = createSchema();
  const original = createSourceParagraph(schema, "block:a");
  const documentNode = schema.node("doc", null, [original]);
  const view = createSourceView(documentNode);
  const firstDescriptor = view.root.children[0]!;
  const firstState = EditorState.create({ schema, doc: documentNode });
  const changed = firstState.tr.setNodeAttribute(0, "sourceId", "block:b");

  view.update(attributeUpdate(changed, original.nodeSize));
  const secondDescriptor = view.root.children[0]!;

  expect(firstDescriptor.destroyed).toBe(true);
  expect(secondDescriptor).not.toBe(firstDescriptor);

  const secondState = EditorState.create({ schema, doc: changed.doc });
  const disappeared = secondState.tr.setNodeAttribute(0, "sourceId", null);

  view.update(attributeUpdate(disappeared, original.nodeSize));
  expect(secondDescriptor.destroyed).toBe(true);
  expect(view.root.children[0]).not.toBe(secondDescriptor);
}

/** Proves duplicate target source ids report a gap and cannot double-adopt. */
function testDuplicateTargetSources(): void {
  const schema = createSchema();
  const first = createSourceParagraph(schema, "block:a");
  const second = createSourceParagraph(schema, "block:b");
  const documentNode = schema.node("doc", null, [first, second]);
  const view = createSourceView(documentNode);
  const before = [...view.root.children];
  const state = EditorState.create({ schema, doc: documentNode });
  const duplicate = state.tr.setNodeAttribute(first.nodeSize, "sourceId", "block:a");

  const result = view.update({
    documentNode: duplicate.doc,
    mapping: duplicate.mapping,
    changedRanges: [{
      oldRange: { from: 0, to: documentNode.content.size },
      newRange: { from: 0, to: duplicate.doc.content.size }
    }]
  });

  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
    "html-source-identity-duplicate"
  );
  expect(new Set(view.root.children.map((descriptor) => descriptor.id)).size).toBe(2);
  expect(view.root.children.every((descriptor) => !before.includes(descriptor))).toBe(true);
}

/** Proves nearby matching inspects indices one through five but never index six. */
function testBoundedLookahead(): void {
  const schema = createSchema();
  const within = createMixedDocument(schema, 5);
  const beyond = createMixedDocument(schema, 6);
  const withinRoot = createDescriptorRoot(within);
  const beyondRoot = createDescriptorRoot(beyond);
  const targetNode = schema.node("heading", null, schema.text("target"));
  const target = {
    kind: "node" as const,
    node: targetNode,
    range: { from: 100, to: 100 + targetNode.nodeSize },
    source: withinRoot.source
  };

  const withinTargets = createHtmlCandidateShellTargets(
    [target],
    withinRoot.mount?.dom.ownerDocument as Document
  );
  const beyondTargets = createHtmlCandidateShellTargets(
    [{ ...target, source: beyondRoot.source }],
    beyondRoot.mount?.dom.ownerDocument as Document
  );
  const withinMatch = matchHtmlDescriptorChildren(withinRoot, withinTargets);
  const beyondMatch = matchHtmlDescriptorChildren(beyondRoot, beyondTargets);

  expect(withinMatch.matches[0]).toBe(withinRoot.children[5]);
  expect(beyondMatch.matches[0]).toBeNull();
}

/** Proves descriptor allocation never reuses ids after structural removal. */
function testMonotonicIds(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["a", "b"]);
  const view = createView(documentNode);
  const retainedIds = view.root.children.map((descriptor) => descriptor.id);
  const firstState = EditorState.create({ schema, doc: documentNode });
  const insertionPos = documentNode.child(0).nodeSize;
  const insert = firstState.tr.insert(
    insertionPos,
    schema.node("paragraph", null, schema.text("x"))
  );

  view.update(updateFrom(insert));
  const firstInsertedId = view.root.children[1]!.id;
  const secondState = EditorState.create({ schema, doc: insert.doc });
  const remove = secondState.tr.delete(
    insertionPos,
    insertionPos + insert.doc.child(1).nodeSize
  );

  view.update(updateFrom(remove));
  const thirdState = EditorState.create({ schema, doc: remove.doc });
  const insertAgain = thirdState.tr.insert(
    insertionPos,
    schema.node("paragraph", null, schema.text("y"))
  );

  view.update(updateFrom(insertAgain));
  const secondInsertedId = view.root.children[1]!.id;

  expect(view.root.children[0]?.id).toBe(retainedIds[0]);
  expect(view.root.children[2]?.id).toBe(retainedIds[1]);
  expect(readNumericId(secondInsertedId)).toBeGreaterThan(readNumericId(firstInsertedId));
}

/** Proves a getPos-shaped closure reads the descriptor's current mapped range. */
function testLivePositionReader(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["a", "b"]);
  const view = createView(documentNode);
  const retained = view.root.children[1]!;
  const getPos = (): number => retained.range.from;
  const state = EditorState.create({ schema, doc: documentNode });
  const inserted = schema.node("paragraph", null, schema.text("before"));
  const transaction = state.tr.insert(documentNode.child(0).nodeSize, inserted);

  expect(getPos()).toBe(documentNode.child(0).nodeSize);
  view.update(updateFrom(transaction));
  expect(getPos()).toBe(documentNode.child(0).nodeSize + inserted.nodeSize);
}

/** Proves document, outer-node, and inline spans use their binding map biases. */
function testRangeMapping(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["x"]);
  const openingRoot = createDescriptorRoot(documentNode);
  const closingRoot = createDescriptorRoot(documentNode);
  const insertionRoot = createDescriptorRoot(documentNode);
  const inlineRoot = createDescriptorRoot(documentNode);
  const opening = openingRoot.children[0]!;
  const closing = closingRoot.children[0]!;
  const insertion = insertionRoot.children[0]!;
  const inline = inlineRoot.children[0]?.kind === "node"
    ? inlineRoot.children[0].children[0]!
    : undefined;

  const openingResult = mapHtmlDescriptorTree({
    root: openingRoot,
    mapping: new Mapping([new StepMap([0, 1, 0])]),
    documentSize: documentNode.content.size - 1,
    changedRanges: []
  });
  const closingResult = mapHtmlDescriptorTree({
    root: closingRoot,
    mapping: new Mapping([new StepMap([2, 1, 0])]),
    documentSize: documentNode.content.size - 1,
    changedRanges: []
  });
  const insertionResult = mapHtmlDescriptorTree({
    root: insertionRoot,
    mapping: new Mapping([new StepMap([0, 0, 2])]),
    documentSize: documentNode.content.size + 2,
    changedRanges: []
  });
  const inlineResult = mapHtmlDescriptorTree({
    root: inlineRoot,
    mapping: new Mapping([new StepMap([1, 1, 0])]),
    documentSize: documentNode.content.size - 1,
    changedRanges: []
  });

  expect(openingResult.invalidDescriptors.has(opening)).toBe(true);
  expect(closingResult.invalidDescriptors.has(closing)).toBe(true);
  expect(insertionResult.invalidDescriptors.has(insertion)).toBe(false);
  expect(inlineResult.invalidDescriptors.has(inline!)).toBe(true);
  expect(inlineResult.invalidDescriptors.has(inlineRoot)).toBe(false);
  expect(inlineRoot.range).toEqual({ from: 0, to: documentNode.content.size - 1 });
}

/** Proves text, attribute, insert, and move writes advance geometry epochs. */
function testGeometryEpochs(): void {
  const schema = createSchema();
  const textDocument = createDocument(schema, ["aa"]);
  const textView = createView(textDocument);
  const textOwner = readFirstTextDescriptor(textView.root.children[0]!);
  const textState = EditorState.create({ schema, doc: textDocument });
  const textReplace = textState.tr.insertText("z", 1, 2);
  const textEpoch = textOwner.geometryEpoch;

  textView.update(updateFrom(textReplace));
  expect(textOwner.geometryEpoch).toBeGreaterThan(textEpoch);

  const attrDocument = createDocument(schema, ["attrs"]);
  const attrView = createView(attrDocument);
  const attrOwner = attrView.root.children[0]!;
  const attrState = EditorState.create({ schema, doc: attrDocument });
  const attrChange = attrState.tr.setNodeAttribute(0, "tone", "callout");
  const attrEpoch = attrOwner.geometryEpoch;

  attrView.update(attributeUpdate(attrChange, attrDocument.child(0).nodeSize));
  expect(attrOwner.geometryEpoch).toBeGreaterThan(attrEpoch);

  const insertDocument = createDocument(schema, ["a"]);
  const insertView = createView(insertDocument);
  const insertState = EditorState.create({ schema, doc: insertDocument });
  const rootEpoch = insertView.root.geometryEpoch;
  const insert = insertState.tr.insert(
    insertDocument.content.size,
    schema.node("paragraph", null, schema.text("b"))
  );

  insertView.update(updateFrom(insert));
  expect(insertView.root.geometryEpoch).toBeGreaterThan(rootEpoch);
  expect(insertView.root.children[1]!.geometryEpoch).toBeGreaterThan(0);

  const first = createSourceParagraph(schema, "block:a");
  const second = createSourceParagraph(schema, "block:b");
  const moveDocument = schema.node("doc", null, [first, second]);
  const moveView = createSourceView(moveDocument);
  const moved = moveView.root.children[1]!;
  const moveRootEpoch = moveView.root.geometryEpoch;
  const moveEpoch = moved.geometryEpoch;

  moveView.update(updateFrom(moveSecondBlockToFront(schema, moveDocument)));
  expect(moveView.root.geometryEpoch).toBeGreaterThan(moveRootEpoch);
  expect(moved.geometryEpoch).toBeGreaterThan(moveEpoch);
}

/** Proves root replacement count observes a real root mount identity change. */
function testRootReplacementTrace(): void {
  const schema = createSchema();
  const documentNode = createDocument(schema, ["a"]);
  const ownerDocument = new FakeSvgMountDocument() as unknown as Document;
  const created = createHtmlDocumentDescriptor({
    id: "html:instrumented-root",
    documentNode,
    ownerDocument,
    source: { sourceId: "doc:body" }
  });
  const state = EditorState.create({ schema, doc: documentNode });
  const inserted = schema.node("paragraph", null, schema.text("b"));
  const transaction = state.tr.insert(documentNode.content.size, inserted);
  let switchedRoot = false;
  let nextId = 0;

  const result = reconcileHtmlDescriptorTree({
    root: created.descriptor,
    documentNode: transaction.doc,
    mapping: transaction.mapping,
    changedRanges: getChangedRanges(transaction),
    ownerDocument,
    allocateId: () => {
      if (!switchedRoot) {
        const nextRoot = ownerDocument.createElement("div");

        created.descriptor.attachMount({ dom: nextRoot, contentDOM: nextRoot });
        switchedRoot = true;
      }
      nextId += 1;
      return `html:instrumented-root:desc:${nextId}`;
    }
  });

  expect(result.trace.rootReplacements).toBe(1);
}

/**
 * Creates the compact schema used by reconciliation tests.
 *
 * @returns Schema with document, paragraph, text, and strong nodes.
 */
function createSchema(): Schema {
  return new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: {
        attrs: {
          tone: { default: "plain" },
          sourceId: { default: null }
        },
        content: "inline*",
        group: "block",
        toDOM: (node) => ["p", { "data-tone": node.attrs.tone }, 0]
      },
      heading: { content: "inline*", group: "block", toDOM: () => ["h2", 0] },
      dynamicBlock: {
        attrs: { shape: { default: "tag-div" } },
        content: "inline*",
        group: "block",
        toDOM: renderDynamicBlock
      },
      text: { group: "inline" }
    },
    marks: {
      strong: { toDOM: () => ["strong", 0] }
    }
  });
}

/**
 * Creates a persistent facade for a document fixture.
 *
 * @param documentNode - Initial canonical document.
 * @returns Retained document facade.
 */
function createView(documentNode: ReturnType<typeof createDocument>) {
  return createHtmlRetainedDocumentView({
    id: "html:document",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:body" }
  });
}

/**
 * Creates a retained facade whose nodes may supply explicit source identity.
 *
 * @param documentNode - Initial canonical document.
 * @returns Source-aware retained document facade.
 */
function createSourceView(documentNode: ReturnType<typeof createDocument>) {
  return createHtmlRetainedDocumentView({
    id: "html:sources",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:body" },
    resolveSource: resolveFixtureSource
  });
}

/**
 * Converts a transaction into retained document update options.
 *
 * @param transaction - ProseMirror transaction to apply.
 * @returns Next document, mapping, and typed changed ranges.
 */
function updateFrom(transaction: EditorState["tr"]) {
  return {
    documentNode: transaction.doc,
    mapping: transaction.mapping,
    changedRanges: getChangedRanges(transaction)
  };
}

/**
 * Creates typed changed ranges for an attribute-only transaction.
 *
 * @param transaction - Attribute transaction with an empty step map.
 * @param nodeSize - Outer size of the changed node.
 * @returns Retained update inputs with an explicit changed range.
 */
function attributeUpdate(transaction: EditorState["tr"], nodeSize: number) {
  return {
    documentNode: transaction.doc,
    mapping: transaction.mapping,
    changedRanges: [{
      oldRange: { from: 0, to: nodeSize },
      newRange: { from: 0, to: nodeSize }
    }]
  };
}

/**
 * Moves the second block before the first through real delete and insert maps.
 *
 * @param schema - Schema that owns the moved block.
 * @param documentNode - Document whose second block is moved.
 * @returns Transaction carrying delete and insert step maps.
 */
function moveSecondBlockToFront(
  schema: Schema,
  documentNode: ReturnType<typeof createDocument>
) {
  const state = EditorState.create({ schema, doc: documentNode });
  const firstSize = documentNode.child(0).nodeSize;
  const moved = documentNode.child(1);

  return state.tr.delete(firstSize, firstSize + moved.nodeSize).insert(0, moved);
}

/**
 * Creates a document with one heading at the requested sibling index.
 *
 * @param schema - Fixture schema.
 * @param headingIndex - Index at which the heading appears.
 * @returns Mixed block document.
 */
function createMixedDocument(schema: Schema, headingIndex: number) {
  return schema.node("doc", null, Array.from({ length: 8 }, (_, index) => (
    index === headingIndex
      ? schema.node("heading", null, schema.text("target"))
      : schema.node("paragraph", null, schema.text(`p${index}`))
  )));
}

/**
 * Creates a paragraph carrying one explicit source identity attribute.
 *
 * @param schema - Fixture schema.
 * @param sourceId - Stable source identity supplied by the fixture node.
 * @returns Paragraph node carrying the source identity.
 */
function createSourceParagraph(schema: Schema, sourceId: string) {
  return schema.node(
    "paragraph",
    { tone: "plain", sourceId },
    schema.text(sourceId)
  );
}

/**
 * Resolves fixture source identity only when the node explicitly supplies one.
 *
 * @param node - Fixture node being represented.
 * @param inherited - Parent source used when the node has no source id.
 * @returns Explicit or inherited retained source identity.
 */
function resolveFixtureSource(
  node: ReturnType<Schema["node"]>,
  inherited: { readonly sourceId: string }
) {
  return node.attrs.sourceId
    ? { sourceId: String(node.attrs.sourceId) }
    : inherited;
}

/**
 * Asserts one attribute-dependent shell topology transition replaces identity.
 *
 * @param schema - Fixture schema.
 * @param fromShape - Initial schema shell shape.
 * @param toShape - Next schema shell shape.
 */
function assertShellTopologyReplacement(
  schema: Schema,
  fromShape: string,
  toShape: string
): void {
  const node = schema.node("dynamicBlock", { shape: fromShape }, schema.text("x"));
  const documentNode = schema.node("doc", null, [node]);
  const view = createView(documentNode);
  const retained = view.root.children[0]!;
  const retainedDOM = retained.mount?.dom;
  const staleNestedDOM = retainedDOM?.childNodes[0];
  const state = EditorState.create({ schema, doc: documentNode });
  const changed = state.tr.setNodeAttribute(0, "shape", toShape);

  const result = view.update(attributeUpdate(changed, node.nodeSize));

  expect(retained.destroyed).toBe(true);
  expect(view.root.children[0]).not.toBe(retained);
  expect(view.root.children[0]?.mount?.dom).not.toBe(retainedDOM);
  if (staleNestedDOM) {
    const nextNestedDOM = view.root.children[0]?.mount?.dom.childNodes[0];

    expect(nextNestedDOM).toBeDefined();
    expect(nextNestedDOM).not.toBe(staleNestedDOM);
  }
  expect(result.trace.attributeWrites).toEqual([]);
  expect(result.trace.structureWrites.map((write) => write.operation)).toEqual([
    "remove",
    "insert"
  ]);
}

/**
 * Renders attribute-dependent schema shell topology fixtures.
 *
 * @param node - Dynamic block whose shape attribute selects the shell.
 * @returns ProseMirror DOM output specification.
 */
function renderDynamicBlock(node: ReturnType<Schema["node"]>) {
  switch (node.attrs.shape) {
    case "tag-section":
      return ["section", 0] as const;
    case "hole-nested":
      return ["div", ["span", 0]] as const;
    case "wrapper-aside":
      return ["div", ["aside", ["span", 0]]] as const;
    case "wrapper-section":
      return ["div", ["section", ["span", 0]]] as const;
    case "nested-class-a":
      return ["div", ["span", { class: "static-a" }, ["em", 0]]] as const;
    case "nested-class-b":
      return ["div", ["span", { class: "static-b" }, ["em", 0]]] as const;
    case "nested-style-a":
      return ["div", ["span", { style: "color: red" }, ["em", 0]]] as const;
    case "nested-style-b":
      return ["div", ["span", { style: "color: blue" }, ["em", 0]]] as const;
    case "nested-attr-a":
      return ["div", ["span", { "data-static": "a" }, ["em", 0]]] as const;
    case "nested-attr-b":
      return ["div", ["span", { "data-static": "b" }, ["em", 0]]] as const;
    default:
      return ["div", 0] as const;
  }
}

/**
 * Reads the direct text owner beneath one paragraph descriptor.
 *
 * @param descriptor - Paragraph descriptor expected to own direct text.
 * @returns Direct text descriptor.
 */
function readFirstTextDescriptor(descriptor: ReturnType<typeof createDescriptorRoot>["children"][number]) {
  if (descriptor.kind !== "node" || descriptor.children[0]?.kind !== "text") {
    throw new RangeError("Expected a direct retained text descriptor.");
  }
  return descriptor.children[0];
}

/**
 * Creates a standalone descriptor root for direct matcher tests.
 *
 * @param documentNode - Document represented by the descriptor root.
 * @returns Retained descriptor root.
 */
function createDescriptorRoot(documentNode: ReturnType<typeof createMixedDocument>) {
  return createHtmlDocumentDescriptor({
    id: "html:matcher",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:body" }
  }).descriptor;
}

/**
 * Creates a document containing one paragraph per text value.
 *
 * @param schema - Schema that owns the nodes.
 * @param paragraphs - Paragraph text in document order.
 * @returns ProseMirror document fixture.
 */
function createDocument(schema: Schema, paragraphs: readonly string[]) {
  return schema.node("doc", null, paragraphs.map((text) => (
    schema.node("paragraph", null, text ? schema.text(text) : undefined)
  )));
}

/**
 * Creates a monotonic descriptor id allocator.
 *
 * @param rootId - Root identity used as the allocation prefix.
 * @returns Function that allocates one new descriptor id per call.
 */
function createAllocator(rootId: string): () => string {
  let nextId = 0;

  return () => `${rootId}:retained:${++nextId}`;
}

/**
 * Reads the monotonic numeric suffix of a retained descriptor id.
 *
 * @param id - Descriptor id ending in a numeric allocation segment.
 * @returns Parsed allocation number.
 */
function readNumericId(id: string): number {
  return Number(id.split(":").at(-1));
}
