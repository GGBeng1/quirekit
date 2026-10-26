import type {
  QuireMarkViewConstructor,
  QuireMountedEditorView,
  QuireNodeViewConstructor,
  QuireViewMutationRecord
} from "@quirekit/core";
import { DecorationSet, Schema } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import type { HtmlDescriptorDiagnostic } from "../descriptors";
import {
  createHtmlMarkViewHost,
  createHtmlNodeViewHost
} from "./host";

describe("retained HTML node view host", registerHostTests);

/** Registers framework-neutral node and mark view host behavior. */
function registerHostTests(): void {
  it("owns exact node-view DOM and editable contentDOM", testNodeViewOwnership);
  it("uses mark-view dom as the default content boundary", testMarkViewContentBoundary);
  it("reads live positions and updates one retained component", testLiveUpdate);
  it("routes events and mutations with explicit absent-capability defaults", testRouting);
  it("destroys the factory instance exactly once", testDestroyOnce);
  it("rejects node-view output that aliases the mounted view root", testNodeRootRejection);
  it("rejects mark-view output that aliases the mounted view root", testMarkRootRejection);
}

/** Proves mark views without contentDOM receive document children in their DOM. */
function testMarkViewContentBoundary(): void {
  const fixture = createHostFixture();
  const root = fixture.ownerDocument.createElement("span");
  const mark = fixture.schema.marks.strong!.create();
  const host = createHtmlMarkViewHost({
    descriptorId: "html:mark-content",
    mark,
    view: fixture.view,
    inline: true,
    factory: (() => ({ dom: root })) as QuireMarkViewConstructor,
    diagnostics: fixture.diagnostics
  });

  expect(host?.dom).toBe(root);
  expect(host?.contentDOM).toBe(root);
}

/** Proves the host exposes only factory-owned DOM boundaries. */
function testNodeViewOwnership(): void {
  const fixture = createHostFixture();
  const root = fixture.ownerDocument.createElement("section");
  const content = fixture.ownerDocument.createElement("div");

  root.appendChild(content);
  const host = createHtmlNodeViewHost({
    descriptorId: "html:node-view",
    node: fixture.node,
    view: fixture.view,
    getPos: () => 0,
    decorations: [],
    innerDecorations: DecorationSet.empty,
    factory: (() => ({ dom: root, contentDOM: content })) as unknown as QuireNodeViewConstructor,
    diagnostics: fixture.diagnostics
  });

  expect(host?.dom).toBe(root);
  expect(host?.contentDOM).toBe(content);
  expect(fixture.diagnostics).toEqual([]);
}

/** Proves getPos stays live and compatible updates retain component identity. */
function testLiveUpdate(): void {
  const fixture = createHostFixture();
  const root = fixture.ownerDocument.createElement("section");
  const content = fixture.ownerDocument.createElement("div");
  const update = vi.fn(() => true);
  const component = { dom: root, contentDOM: content, update };
  let position: number | undefined = 2;
  let capturedGetPos: (() => number | undefined) | undefined;
  const factory = vi.fn((_node, _view, getPos) => {
    capturedGetPos = getPos;
    return component;
  }) as unknown as QuireNodeViewConstructor;

  root.appendChild(content);
  const host = createHtmlNodeViewHost({
    descriptorId: "html:live",
    node: fixture.node,
    view: fixture.view,
    getPos: () => position,
    decorations: [],
    innerDecorations: DecorationSet.empty,
    factory,
    diagnostics: fixture.diagnostics
  });
  const changed = fixture.node.type.create({ tone: "changed" }, fixture.node.content);

  expect(capturedGetPos?.()).toBe(2);
  position = 9;
  expect(capturedGetPos?.()).toBe(9);
  position = undefined;
  expect(capturedGetPos?.()).toBeUndefined();
  expect(host?.update({
    node: changed,
    decorations: [],
    innerDecorations: DecorationSet.empty
  })).toBe(true);
  expect(host?.instance).toBe(component);
  expect(factory).toHaveBeenCalledTimes(1);
  expect(update).toHaveBeenCalledOnce();
}

/** Proves canonical methods route exactly and missing methods return false. */
function testRouting(): void {
  const fixture = createHostFixture();
  const event = new Event("mousedown");
  const mutation: QuireViewMutationRecord = {
    type: "selection",
    target: fixture.ownerDocument.createElement("span") as unknown as Node
  };
  const routed = createHtmlNodeViewHost({
    descriptorId: "html:routed",
    node: fixture.node,
    view: fixture.view,
    getPos: () => 0,
    decorations: [],
    innerDecorations: DecorationSet.empty,
    factory: (() => ({
      dom: fixture.ownerDocument.createElement("section"),
      stopEvent: (received: Event) => received === event,
      ignoreMutation: (received: QuireViewMutationRecord) => received === mutation
    })) as unknown as QuireNodeViewConstructor,
    diagnostics: fixture.diagnostics
  });
  const absent = createHtmlNodeViewHost({
    descriptorId: "html:absent",
    node: fixture.node,
    view: fixture.view,
    getPos: () => 0,
    decorations: [],
    innerDecorations: DecorationSet.empty,
    factory: (() => ({
      dom: fixture.ownerDocument.createElement("section")
    })) as unknown as QuireNodeViewConstructor,
    diagnostics: fixture.diagnostics
  });

  expect(routed?.stopEvent(event)).toBe(true);
  expect(routed?.ignoreMutation(mutation)).toBe(true);
  expect(absent?.stopEvent(event)).toBe(false);
  expect(absent?.ignoreMutation(mutation)).toBe(false);
}

/** Proves repeated host cleanup calls one framework unmount hook. */
function testDestroyOnce(): void {
  const fixture = createHostFixture();
  const destroy = vi.fn();
  const host = createHtmlNodeViewHost({
    descriptorId: "html:destroy",
    node: fixture.node,
    view: fixture.view,
    getPos: () => 0,
    decorations: [],
    innerDecorations: DecorationSet.empty,
    factory: (() => ({
      dom: fixture.ownerDocument.createElement("section"),
      destroy
    })) as unknown as QuireNodeViewConstructor,
    diagnostics: fixture.diagnostics
  });

  host?.destroy();
  host?.destroy();
  expect(destroy).toHaveBeenCalledOnce();
}

/** Proves an exact invalid node factory reports a gap instead of aliasing root DOM. */
function testNodeRootRejection(): void {
  const fixture = createHostFixture();
  const host = createHtmlNodeViewHost({
    descriptorId: "html:invalid-node",
    node: fixture.node,
    view: fixture.view,
    getPos: () => 0,
    decorations: [],
    innerDecorations: DecorationSet.empty,
    factory: (() => ({ dom: fixture.view.dom })) as QuireNodeViewConstructor,
    diagnostics: fixture.diagnostics
  });

  expect(host).toBeNull();
  expect(fixture.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
    "html-node-view-dom-invalid"
  ]);
}

/** Proves an exact invalid mark factory reports a gap instead of aliasing root DOM. */
function testMarkRootRejection(): void {
  const fixture = createHostFixture();
  const mark = fixture.schema.marks.strong!.create();
  const host = createHtmlMarkViewHost({
    descriptorId: "html:invalid-mark",
    mark,
    view: fixture.view,
    inline: true,
    factory: (() => ({ dom: fixture.view.dom })) as QuireMarkViewConstructor,
    diagnostics: fixture.diagnostics
  });

  expect(host).toBeNull();
  expect(fixture.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
    "html-mark-view-dom-invalid"
  ]);
}

/**
 * Creates one schema, fake mounted view, node, and diagnostic sink.
 *
 * @returns Complete host fixture.
 */
function createHostFixture() {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      card: {
        attrs: { tone: { default: "plain" } },
        content: "text*",
        group: "block",
        toDOM: () => ["article", 0]
      },
      text: {}
    },
    marks: {
      strong: { toDOM: () => ["strong", 0] }
    }
  });
  const ownerDocument = new FakeSvgMountDocument();
  const mountedRoot = ownerDocument.createElement("div");
  const view = { dom: mountedRoot } as unknown as QuireMountedEditorView;
  const node = schema.node("card", null, schema.text("card"));
  const diagnostics: HtmlDescriptorDiagnostic[] = [];

  return { schema, ownerDocument, view, node, diagnostics };
}
