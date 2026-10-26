import { getChangedRanges } from "@quirekit/core";
import type {
  QuireMarkViewMap,
  QuireMountedEditorView,
  QuireNodeViewGetPos,
  QuireNodeViewMap
} from "@quirekit/core";
import { Decoration, DecorationSet, EditorState, Mapping, Schema } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlDocumentDescriptor } from "../descriptors";
import { createHtmlRetainedDocumentView } from "../document";
import { composeHtmlScheduledTransactions } from "../scheduling/transactions";
import type { HtmlNodeViewEnvironment } from "./types";

describe("retained HTML node view integration", registerIntegrationTests);

/** Registers retained descriptor and reconciliation integration behavior. */
function registerIntegrationTests(): void {
  it("gives an exact node factory DOM and editable child ownership", testEditableNodeView);
  it("keeps a node view without contentDOM opaque", testOpaqueNodeView);
  it("diagnoses invalid exact factory output without schema fallback", testInvalidFactory);
  it("retains descriptor host DOM and component after compatible update", testCompatibleUpdate);
  it("retains update-less editable node views for same-markup content updates", testUpdateLessNodeView);
  it("retains one multiType host across node types owned by the same factory", testMultiTypeNodeView);
  it("replaces update-false hosts and destroys the old instance once", testFalseUpdate);
  it("preserves descriptor host component and live getPos across a real move", testMoveAndGetPos);
  it("uses an exact mark factory as the retained inline wrapper", testMarkView);
  it("uses mark-view dom as contentDOM when the factory omits contentDOM", testMarkViewDefaultContent);
  it("passes node-local outer and inner decoration sources", testNodeLocalDecorations);
  it("applies and reverses node decoration attributes in place", testNodeDecorations);
  it("preserves and reverses an inline-decorated mark wrapper", testInlineDecorations);
  it("retains keyed widget DOM and destroys it on removal", testKeyedWidget);
  it("retains keyed widgets at nested and inline content boundaries", testNestedInlineWidgets);
  it("supports framework-neutral mount updateProps and unmount lifecycle", testFrameworkLifecycle);
}

/** Proves editable descendants attach only below factory contentDOM. */
function testEditableNodeView(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const root = fixture.ownerDocument.createElement("section");
  const contentDOM = fixture.ownerDocument.createElement("div");
  const factory = vi.fn(() => {
    root.appendChild(contentDOM);
    return { dom: root, contentDOM };
  });
  const created = createHtmlDocumentDescriptor({
    id: "html:editable",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: asNodeViewFactory(factory)
    })
  });
  const descriptor = created.descriptor.children[0];

  expect(descriptor?.kind).toBe("node-view");
  if (descriptor?.kind !== "node-view") {
    throw new RangeError("Expected retained NodeView descriptor.");
  }
  expect(descriptor?.mount?.dom).toBe(root);
  expect(descriptor?.mount?.contentDOM).toBe(contentDOM);
  expect(descriptor?.children).toHaveLength(1);
  expect(descriptor?.children[0]?.mount?.dom.parentNode).toBe(contentDOM);
  expect(root.tagName).toBe("section");
  expect(factory).toHaveBeenCalledOnce();
}

/** Proves opaque NodeViews own internal DOM and zero document descendants. */
function testOpaqueNodeView(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const root = fixture.ownerDocument.createElement("section");
  const internal = fixture.ownerDocument.createElement("button");

  root.appendChild(internal);
  const created = createHtmlDocumentDescriptor({
    id: "html:opaque",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: asNodeViewFactory(() => ({ dom: root }))
    })
  });
  const descriptor = created.descriptor.children[0];

  expect(descriptor?.kind).toBe("node-view");
  if (descriptor?.kind !== "node-view") {
    throw new RangeError("Expected opaque NodeView descriptor.");
  }
  expect(descriptor?.children).toEqual([]);
  expect(root.childNodes).toEqual([internal]);
}

/** Proves an invalid exact factory blocks schema rendering and reports a gap. */
function testInvalidFactory(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const invalidFactory = (() => ({ kind: "invalid" })) as unknown as QuireNodeViewMap[string];
  const created = createHtmlDocumentDescriptor({
    id: "html:invalid",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: invalidFactory
    })
  });
  const descriptor = created.descriptor.children[0];

  expect(descriptor?.kind).toBe("node-view");
  if (descriptor?.kind !== "node-view") {
    throw new RangeError("Expected invalid NodeView descriptor.");
  }
  expect(descriptor?.mount).toBeNull();
  expect(descriptor?.children).toEqual([]);
  expect(created.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
    "html-node-view-dom-invalid"
  ]);
}

/** Proves accepted updates retain descriptor host DOM and component identity. */
function testCompatibleUpdate(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const root = fixture.ownerDocument.createElement("section");
  const update = vi.fn((_node: ReturnType<Schema["node"]>) => true);
  const component = { dom: root, update };
  const factory = vi.fn(() => component);
  const view = createHtmlRetainedDocumentView({
    id: "html:compatible",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: asNodeViewFactory(factory)
    })
  });
  const descriptor = view.root.children[0];
  const host = descriptor?.kind === "node-view" ? descriptor.host : null;
  const state = EditorState.create({ schema: fixture.schema, doc: fixture.documentNode });
  const transaction = state.tr.setNodeAttribute(0, "tone", "changed");

  view.update(composeHtmlScheduledTransactions([transaction]));

  expect(view.root.children[0]).toBe(descriptor);
  expect(view.root.children[0]?.mount?.dom).toBe(root);
  expect(view.root.children[0]?.kind === "node-view" && view.root.children[0].host).toBe(host);
  expect(host?.instance).toBe(component);
  expect(factory).toHaveBeenCalledOnce();
  expect(update).toHaveBeenCalledOnce();
}

/** Proves PM-compatible fallback updates retain editable hosts without update hooks. */
function testUpdateLessNodeView(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const root = fixture.ownerDocument.createElement("section");
  const contentDOM = fixture.ownerDocument.createElement("div");
  const factory = vi.fn(() => ({ dom: root, contentDOM }));

  root.appendChild(contentDOM);
  const view = createHtmlRetainedDocumentView({
    id: "html:update-less",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: asNodeViewFactory(factory)
    })
  });
  const descriptor = view.root.children[0];
  const state = EditorState.create({ schema: fixture.schema, doc: fixture.documentNode });
  const transaction = state.tr.insertText("!", 2);

  view.update(updateFrom(transaction));

  expect(view.root.children[0]).toBe(descriptor);
  expect(view.root.children[0]?.mount?.dom).toBe(root);
  expect(factory).toHaveBeenCalledOnce();
}

/** Proves one exact multiType factory retains its descriptor, DOM, and instance. */
function testMultiTypeNodeView(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const dom = fixture.ownerDocument.createElement("section");
  const update = vi.fn((_node: ReturnType<Schema["node"]>) => true);
  const destroy = vi.fn();
  const instance = { dom, multiType: true, update, destroy };
  const factory = vi.fn(() => instance);
  const exactFactory = asNodeViewFactory(factory);
  const view = createHtmlRetainedDocumentView({
    id: "html:multi-type",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    resolveSource: resolveCardSource,
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: exactFactory,
      panel: exactFactory
    })
  });
  const descriptor = view.root.children[0];
  const host = descriptor?.kind === "node-view" ? descriptor.host : null;
  const state = EditorState.create({ schema: fixture.schema, doc: fixture.documentNode });
  const transaction = state.tr.setNodeMarkup(0, fixture.schema.nodes.panel, {
    sourceId: "a",
    tone: "plain"
  });

  view.update(updateFrom(transaction));

  expect(view.root.children[0]).toBe(descriptor);
  expect(view.root.children[0]?.mount?.dom).toBe(dom);
  expect(view.root.children[0]?.kind === "node-view" && view.root.children[0].host).toBe(host);
  expect(host?.instance).toBe(instance);
  expect(view.root.children[0]?.kind === "node-view" && view.root.children[0].node.type).toBe(
    fixture.schema.nodes.panel
  );
  expect(factory).toHaveBeenCalledOnce();
  expect(update).toHaveBeenCalledOnce();
  expect(update.mock.calls[0]?.[0].type).toBe(fixture.schema.nodes.panel);
  expect(destroy).not.toHaveBeenCalled();
}

/** Proves a false update replaces once and destroys only the rejected host. */
function testFalseUpdate(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const destroyed: ReturnType<typeof vi.fn>[] = [];
  const factory = vi.fn(() => {
    const destroy = vi.fn();

    destroyed.push(destroy);
    return {
      dom: fixture.ownerDocument.createElement("section"),
      update: () => false,
      destroy
    };
  });
  const view = createHtmlRetainedDocumentView({
    id: "html:false-update",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: asNodeViewFactory(factory)
    })
  });
  const descriptor = view.root.children[0]!;
  const state = EditorState.create({ schema: fixture.schema, doc: fixture.documentNode });
  const transaction = state.tr.setNodeAttribute(0, "tone", "changed");
  const result = view.update(attributeUpdate(
    transaction,
    fixture.documentNode.child(0).nodeSize
  ));

  expect(view.root.children[0]).not.toBe(descriptor);
  expect(descriptor.destroyed).toBe(true);
  expect(factory).toHaveBeenCalledTimes(2);
  expect(destroyed[0]).toHaveBeenCalledOnce();
  expect(destroyed[1]).not.toHaveBeenCalled();
  expect(result.trace.structureWrites.map((write) => write.operation)).toEqual([
    "remove",
    "insert"
  ]);
}

/** Proves a source-owned real move preserves all retained NodeView identities. */
function testMoveAndGetPos(): void {
  const fixture = createNodeViewFixture([
    ["a", "alpha"],
    ["b", "beta"],
    ["c", "gamma"]
  ]);
  const getPositions = new Map<string, QuireNodeViewGetPos>();
  const components = new Map<string, object>();
  const destroys = new Map<string, ReturnType<typeof vi.fn>>();
  const factory = vi.fn((node, _view, getPos) => {
    const sourceId = String(node.attrs.sourceId);
    const destroy = vi.fn();
    const component = {
      dom: fixture.ownerDocument.createElement("section"),
      update: () => true,
      destroy
    };

    getPositions.set(sourceId, getPos);
    components.set(sourceId, component);
    destroys.set(sourceId, destroy);
    return component;
  });
  const view = createHtmlRetainedDocumentView({
    id: "html:move",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    resolveSource: resolveCardSource,
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: asNodeViewFactory(factory)
    })
  });
  const movedDescriptor = view.root.children[1];
  const movedHost = movedDescriptor?.kind === "node-view" ? movedDescriptor.host : null;
  const movedComponent = components.get("b");
  const transaction = moveSecondCardToFront(fixture.schema, fixture.documentNode);

  view.update(updateFrom(transaction));

  expect(view.root.children[0]).toBe(movedDescriptor);
  expect(view.root.children[0]?.kind === "node-view" && view.root.children[0].host).toBe(movedHost);
  expect(movedHost?.instance).toBe(movedComponent);
  expect(getPositions.get("b")?.()).toBe(0);
  expect(factory).toHaveBeenCalledTimes(3);

  const movedState = EditorState.create({ schema: fixture.schema, doc: transaction.doc });
  const removal = movedState.tr.delete(0, transaction.doc.child(0).nodeSize);

  view.update(updateFrom(removal));
  expect(getPositions.get("b")?.()).toBeUndefined();
  expect(destroys.get("b")).toHaveBeenCalledOnce();
}

/** Proves exact mark factories own retained inline wrapper DOM and content. */
function testMarkView(): void {
  const fixture = createMarkedFixture();
  const root = fixture.ownerDocument.createElement("span");
  const contentDOM = fixture.ownerDocument.createElement("em");
  const factory = vi.fn(() => {
    root.appendChild(contentDOM);
    return { dom: root, contentDOM };
  });
  const created = createHtmlDocumentDescriptor({
    id: "html:mark-view",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {}, {
      strong: asMarkViewFactory(factory)
    })
  });
  const paragraph = created.descriptor.children[0];
  const mark = paragraph?.kind === "node" ? paragraph.children[0] : undefined;

  expect(mark?.kind).toBe("mark");
  if (mark?.kind !== "mark") {
    throw new RangeError("Expected retained mark-view descriptor.");
  }
  expect(mark?.kind === "mark" && mark.host?.dom).toBe(root);
  expect(mark?.children[0]?.mount?.dom.parentNode).toBe(contentDOM);
  expect(factory).toHaveBeenCalledOnce();
}

/** Proves a mark factory's DOM is the established default child boundary. */
function testMarkViewDefaultContent(): void {
  const fixture = createMarkedFixture();
  const root = fixture.ownerDocument.createElement("span");
  const created = createHtmlDocumentDescriptor({
    id: "html:mark-default-content",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {}, {
      strong: asMarkViewFactory(() => ({ dom: root }))
    })
  });
  const paragraph = created.descriptor.children[0];
  const mark = paragraph?.kind === "node" ? paragraph.children[0] : undefined;

  expect(mark?.kind).toBe("mark");
  expect(mark?.kind === "mark" && mark.host?.contentDOM).toBe(root);
  expect(mark?.kind === "mark" && mark.children[0]?.mount?.dom.parentNode).toBe(root);
}

/** Proves nested factories receive parent-local outer and child-local inner decorations. */
function testNodeLocalDecorations(): void {
  const fixture = createNestedFixture();
  const card = fixture.documentNode.child(0).child(0);
  const outer = Decoration.node(1, 1 + card.nodeSize, { class: "active" });
  const inner = Decoration.inline(2, 2 + card.content.size, { class: "inside" });
  let source = DecorationSet.create(fixture.documentNode, [outer, inner]);
  const wrapperSource = source.forChild(0, fixture.documentNode.child(0));
  const receivedOuter: Array<readonly Decoration[]> = [];
  const receivedInner: Array<ReturnType<DecorationSet["forChild"]>> = [];

  expect(wrapperSource.locals(fixture.documentNode.child(0)).map((decoration) => [
    decoration.from,
    decoration.to
  ])).toEqual([[0, card.nodeSize]]);

  const view = createHtmlRetainedDocumentView({
    id: "html:local-decorations",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(
      fixture.ownerDocument,
      {
        card: asNodeViewFactory((node: { readonly textContent: string }, _view: unknown, _getPos: unknown, decorations: readonly Decoration[], innerDecorations: ReturnType<DecorationSet["forChild"]>) => {
          if (node.textContent === "alpha") {
            receivedOuter.push(decorations);
            receivedInner.push(innerDecorations);
          }
          return {
            dom: fixture.ownerDocument.createElement("article"),
            update(nextNode: { readonly textContent: string }, nextDecorations: readonly Decoration[], nextInnerDecorations: ReturnType<DecorationSet["forChild"]>) {
              if (nextNode.textContent === "alpha") {
                receivedOuter.push(nextDecorations);
                receivedInner.push(nextInnerDecorations);
              }
              return true;
            }
          };
        })
      },
      {},
      () => source
    )
  });
  const innerDecorations: Decoration[] = [];

  receivedInner[0]!.forEachSet((set) => innerDecorations.push(...set.find()));
  expect(receivedOuter[0]!.map((decoration) => [decoration.from, decoration.to])).toEqual([
    [0, card.nodeSize]
  ]);
  expect(innerDecorations.map((decoration) => [decoration.from, decoration.to])).toEqual([
    [0, card.content.size]
  ]);
  source = DecorationSet.empty;
  view.update(unchangedUpdate(fixture.documentNode));
  expect(receivedOuter).toHaveLength(2);
  expect(receivedOuter[1]).toEqual([]);
  const updatedInner: Decoration[] = [];

  receivedInner[1]!.forEachSet((set) => updatedInner.push(...set.find()));
  expect(updatedInner).toEqual([]);
}

/** Proves node decoration attributes are reversible without shell replacement. */
function testNodeDecorations(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const root = fixture.ownerDocument.createElement("article");
  const contentDOM = fixture.ownerDocument.createElement("div");

  root.setAttribute("style", "color: red");
  root.appendChild(contentDOM);
  const decoration = Decoration.node(
    0,
    fixture.documentNode.child(0).nodeSize,
    {
      class: "selected",
      style: "background: blue",
      "data-state": "active"
    }
  );
  let source = DecorationSet.create(fixture.documentNode, [decoration]);
  const view = createHtmlRetainedDocumentView({
    id: "html:node-decoration",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(
      fixture.ownerDocument,
      {
        card: asNodeViewFactory(() => ({
          dom: root,
          contentDOM,
          update: () => true
        }))
      },
      {},
      () => source
    )
  });
  const descriptor = view.root.children[0]!;
  const dom = descriptor.mount?.dom as unknown as Element;

  expect(dom.getAttribute("class")).toBe("selected");
  expect(dom.getAttribute("style")).toBe("color: red; background: blue");
  expect(dom.getAttribute("data-state")).toBe("active");
  source = DecorationSet.empty;
  view.update(unchangedUpdate(fixture.documentNode));
  expect(view.root.children[0]).toBe(descriptor);
  expect(dom.getAttribute("class")).toBeNull();
  expect(dom.getAttribute("style")).toBe("color: red");
  expect(dom.getAttribute("data-state")).toBeNull();
}

/** Proves inline decoration state reuses and restores an existing mark wrapper. */
function testInlineDecorations(): void {
  const fixture = createMarkedFixture();
  let source = DecorationSet.create(fixture.documentNode, [
    Decoration.inline(1, 7, { class: "search-hit" })
  ]);
  const view = createHtmlRetainedDocumentView({
    id: "html:inline-decoration",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(
      fixture.ownerDocument,
      {},
      {},
      () => source
    )
  });
  const paragraph = view.root.children[0];
  const mark = paragraph?.kind === "node" ? paragraph.children[0] : undefined;
  const markDOM = mark?.mount?.dom as unknown as Element;

  expect(mark?.kind).toBe("mark");
  expect(markDOM.getAttribute("class")).toBe("search-hit");
  source = DecorationSet.empty;
  view.update(unchangedUpdate(fixture.documentNode));
  expect(paragraph?.kind === "node" && paragraph.children[0]).toBe(mark);
  expect(markDOM.getAttribute("class")).toBeNull();
}

/** Proves regenerated keyed widgets retain DOM and destroy exactly on removal. */
function testKeyedWidget(): void {
  const fixture = createNodeViewFixture([["a", "alpha"], ["b", "beta"]]);
  const position = fixture.documentNode.child(0).nodeSize;
  const initialDOM = fixture.ownerDocument.createElement("span");
  const control = fixture.ownerDocument.createElement("input");
  initialDOM.appendChild(control);
  const createInitial = vi.fn(() => initialDOM);
  const createReplacement = vi.fn(() => fixture.ownerDocument.createElement("span"));
  const destroy = vi.fn();
  const stopEvent = vi.fn((event: Event) => event.type === "click");
  let source = DecorationSet.create(fixture.documentNode, [
    Decoration.widget(position, createInitial, { key: "cursor", destroy, stopEvent })
  ]);
  const view = createHtmlRetainedDocumentView({
    id: "html:widget-decoration",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(
      fixture.ownerDocument,
      {},
      {},
      () => source
    )
  });
  const widget = view.root.children.find((child) => child.kind === "widget");

  expect(widget?.mount?.dom).toBe(initialDOM);
  expect(createInitial).toHaveBeenCalledOnce();
  const click = { target: control, type: "click" } as unknown as Event;
  expect(view.stopEvent(click)).toBe(true);
  expect(view.stopEvent({ target: initialDOM, type: "click" } as unknown as Event)).toBe(true);
  expect(view.stopEvent({ target: control, type: "keydown" } as unknown as Event)).toBe(false);
  expect(stopEvent).toHaveBeenCalledTimes(3);
  source = DecorationSet.create(fixture.documentNode, [
    Decoration.widget(position, createReplacement, { key: "cursor" })
  ]);
  view.update(unchangedUpdate(fixture.documentNode));
  const retained = view.root.children.find((child) => child.kind === "widget");

  expect(retained).toBe(widget);
  expect(retained?.mount?.dom).toBe(initialDOM);
  expect(createReplacement).not.toHaveBeenCalled();
  expect(view.stopEvent(click)).toBe(true);
  expect(stopEvent).toHaveBeenCalledTimes(4);
  source = DecorationSet.empty;
  view.update(unchangedUpdate(fixture.documentNode));
  expect(view.root.children.some((child) => child.kind === "widget")).toBe(false);
  expect(destroy).toHaveBeenCalledOnce();
  expect(view.stopEvent(click)).toBe(false);
}

/** Proves keyed widget identity is retained below nested blocks and inside text. */
function testNestedInlineWidgets(): void {
  const fixture = createNestedFixture();
  const nestedBoundary = 1 + fixture.documentNode.child(0).child(0).nodeSize;
  const inlineBoundary = 3;
  const nestedDOM = fixture.ownerDocument.createElement("span");
  const inlineDOM = fixture.ownerDocument.createElement("span");
  const nestedFactory = vi.fn(() => nestedDOM);
  const inlineFactory = vi.fn(() => inlineDOM);
  let source = DecorationSet.create(fixture.documentNode, [
    Decoration.widget(nestedBoundary, nestedFactory, { key: "nested" }),
    Decoration.widget(inlineBoundary, inlineFactory, { key: "inline" })
  ]);
  const view = createHtmlRetainedDocumentView({
    id: "html:nested-widgets",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {}, {}, () => source)
  });
  const initialWidgets = collectWidgetDescriptors(view.root);

  expect(initialWidgets.map((widget) => widget.key)).toEqual(["inline", "nested"]);
  expect(initialWidgets.map((widget) => widget.mount?.dom)).toEqual([inlineDOM, nestedDOM]);
  source = DecorationSet.create(fixture.documentNode, [
    Decoration.widget(nestedBoundary, () => fixture.ownerDocument.createElement("i"), { key: "nested" }),
    Decoration.widget(inlineBoundary, () => fixture.ownerDocument.createElement("i"), { key: "inline" })
  ]);
  view.update(unchangedUpdate(fixture.documentNode));

  expect(collectWidgetDescriptors(view.root)).toEqual(initialWidgets);
  expect(nestedFactory).toHaveBeenCalledOnce();
  expect(inlineFactory).toHaveBeenCalledOnce();
}

/** Proves a framework adapter can map the canonical host to three lifecycle hooks. */
function testFrameworkLifecycle(): void {
  const fixture = createNodeViewFixture([["a", "alpha"]]);
  const root = fixture.ownerDocument.createElement("section");
  const contentDOM = fixture.ownerDocument.createElement("div");
  const renderer = {
    mount: vi.fn((_node: unknown) => ({ dom: root, contentDOM })),
    updateProps: vi.fn(),
    unmount: vi.fn()
  };

  root.appendChild(contentDOM);
  const view = createHtmlRetainedDocumentView({
    id: "html:framework-fixture",
    documentNode: fixture.documentNode,
    ownerDocument: fixture.ownerDocument as unknown as Document,
    source: { sourceId: "doc:body" },
    nodeViewEnvironment: createEnvironment(fixture.ownerDocument, {
      card: asNodeViewFactory((node: unknown) => {
        const mounted = renderer.mount(node);

        return {
          ...mounted,
          update(nextNode: unknown, decorations: unknown, innerDecorations: unknown) {
            renderer.updateProps({ node: nextNode, decorations, innerDecorations });
            return true;
          },
          destroy: renderer.unmount
        };
      })
    })
  });
  const state = EditorState.create({ schema: fixture.schema, doc: fixture.documentNode });
  const transaction = state.tr.insertText("!", 2);

  view.update(updateFrom(transaction));
  view.destroy();

  expect(renderer.mount).toHaveBeenCalledOnce();
  expect(renderer.updateProps).toHaveBeenCalledOnce();
  expect(renderer.unmount).toHaveBeenCalledOnce();
}

/** @returns Nested wrapper/cards fixture used by decoration and widget tests. */
function createNestedFixture() {
  const schema = new Schema({
    nodes: {
      doc: { content: "wrapper" },
      wrapper: { content: "card+", toDOM: () => ["section", 0] },
      card: { content: "text*", toDOM: () => ["article", 0] },
      text: {}
    }
  });
  const documentNode = schema.node("doc", null, [
    schema.node("wrapper", null, [
      schema.node("card", null, schema.text("alpha")),
      schema.node("card", null, schema.text("beta"))
    ])
  ]);
  const ownerDocument = new FakeSvgMountDocument();

  return { schema, documentNode, ownerDocument };
}

/**
 * Collects keyed widgets recursively in document order.
 *
 * @param descriptor - Retained subtree root.
 * @returns Recursive widget descriptors.
 */
function collectWidgetDescriptors(descriptor: ReturnType<typeof createHtmlRetainedDocumentView>["root"]) {
  const widgets: Array<Extract<(typeof descriptor.children)[number], { kind: "widget" }>> = [];
  const visit = (current: typeof descriptor | (typeof descriptor.children)[number]): void => {
    if (current.kind === "widget") {
      widgets.push(current);
      return;
    }
    if ("children" in current) {
      current.children.forEach(visit);
    }
  };

  visit(descriptor);
  return widgets;
}

/**
 * Creates one node-view schema and canonical document.
 *
 * @param cards - Source/text pairs for cards in the document.
 * @returns Schema, document, and fake DOM owner.
 */
function createNodeViewFixture(cards: readonly (readonly [string, string])[]) {
  const schema = createCardSchema();
  const documentNode = schema.node("doc", null, cards.map(([sourceId, text]) => (
    createCard(schema, sourceId, text)
  )));
  const ownerDocument = new FakeSvgMountDocument();

  return { schema, documentNode, ownerDocument };
}

/**
 * Creates one source-owned card node.
 *
 * @param schema - Card schema.
 * @param sourceId - Explicit card source identity.
 * @param text - Card text content.
 * @returns Card node.
 */
function createCard(schema: Schema, sourceId: string, text: string) {
  return schema.node("card", { sourceId, tone: "plain" }, schema.text(text));
}

/** @returns Schema used by retained NodeView fixtures. */
function createCardSchema(): Schema {
  return new Schema({
    nodes: {
      doc: { content: "block+" },
      card: {
        attrs: {
          sourceId: { default: null },
          tone: { default: "plain" }
        },
        content: "text*",
        group: "block",
        toDOM: () => ["article", { "data-schema-fallback": "true" }, 0]
      },
      panel: {
        attrs: {
          sourceId: { default: null },
          tone: { default: "plain" }
        },
        content: "text*",
        group: "block",
        toDOM: () => ["section", { "data-schema-fallback": "true" }, 0]
      },
      text: {}
    }
  });
}

/** @returns Marked paragraph fixture with fake DOM owner. */
function createMarkedFixture() {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { content: "text*", group: "block", toDOM: () => ["p", 0] },
      text: {}
    },
    marks: {
      strong: { toDOM: () => ["strong", 0] }
    }
  });
  const strong = schema.marks.strong!.create();
  const documentNode = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("marked", [strong]))
  ]);
  const ownerDocument = new FakeSvgMountDocument();

  return { schema, documentNode, ownerDocument };
}

/**
 * Creates an internal exact-factory environment.
 *
 * @param ownerDocument - Fake DOM owner for the mounted root.
 * @param nodeViews - Exact node factories by schema type.
 * @param markViews - Exact mark factories by schema type.
 * @param getDecorations - Live decoration source reader.
 * @returns NodeView integration environment.
 */
function createEnvironment(
  ownerDocument: FakeSvgMountDocument,
  nodeViews: QuireNodeViewMap,
  markViews: QuireMarkViewMap = {},
  getDecorations: () => DecorationSet = () => DecorationSet.empty
): HtmlNodeViewEnvironment {
  return {
    view: {
      dom: ownerDocument.createElement("div")
    } as unknown as QuireMountedEditorView,
    nodeViews,
    markViews,
    getDecorations
  };
}

/**
 * Casts a fake-DOM factory through the explicit production constructor contract.
 *
 * @param factory - Test factory returning fake browser elements.
 * @returns Structurally typed node view constructor.
 */
function asNodeViewFactory(factory: unknown): QuireNodeViewMap[string] {
  return factory as QuireNodeViewMap[string];
}

/**
 * Casts a fake-DOM factory through the explicit production constructor contract.
 *
 * @param factory - Test factory returning fake browser elements.
 * @returns Structurally typed mark view constructor.
 */
function asMarkViewFactory(factory: unknown): QuireMarkViewMap[string] {
  return factory as QuireMarkViewMap[string];
}

/**
 * Resolves card source identity without inventing ids.
 *
 * @param node - Card node to inspect.
 * @param inherited - Parent source fallback.
 * @returns Explicit card source or inherited source.
 */
function resolveCardSource(
  node: ReturnType<Schema["node"]>,
  inherited: { readonly sourceId: string }
) {
  return node.attrs.sourceId
    ? { sourceId: String(node.attrs.sourceId) }
    : inherited;
}

/**
 * Converts a transaction into retained update inputs.
 *
 * @param transaction - Transaction to apply.
 * @returns Mapped retained document update.
 */
function updateFrom(transaction: EditorState["tr"]) {
  return {
    documentNode: transaction.doc,
    mapping: transaction.mapping,
    changedRanges: getChangedRanges(transaction)
  };
}

/**
 * Creates retained update inputs for one attribute-only node transaction.
 *
 * @param transaction - Attribute transaction to apply.
 * @param nodeSize - Unchanged outer node size.
 * @returns Explicit dirty-range retained update.
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
 * Creates a decoration-only retained update for an unchanged document.
 *
 * @param documentNode - Unchanged canonical document.
 * @returns Empty mapping and changed-range update.
 */
function unchangedUpdate(documentNode: ReturnType<typeof createNodeViewFixture>["documentNode"]) {
  return {
    documentNode,
    mapping: new Mapping(),
    changedRanges: []
  };
}

/**
 * Moves the second card before the first through delete and insert maps.
 *
 * @param schema - Card schema.
 * @param documentNode - Document whose second card moves.
 * @returns Real mapped transaction.
 */
function moveSecondCardToFront(
  schema: Schema,
  documentNode: ReturnType<typeof createNodeViewFixture>["documentNode"]
) {
  const state = EditorState.create({ schema, doc: documentNode });
  const firstSize = documentNode.child(0).nodeSize;
  const moved = documentNode.child(1);

  return state.tr.delete(firstSize, firstSize + moved.nodeSize).insert(0, moved);
}
