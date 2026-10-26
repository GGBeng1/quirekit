import type { QuireNodeViewMap } from "@quirekit/core";
import { Decoration, DecorationSet, Schema } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import { FakeSvgMountDocument, FakeSvgMountElement } from "@quirekit/view/test-support/svg-mount";
import type { QuireMountedEditorView } from "@quirekit/view/mounted-backend";
import { createHtmlRetainedDocumentView } from "./runtime";
import { createHtmlMutationBoundary } from "./mutations";

describe("retained HTML mutation boundary", () => {
  it("drains observer records produced by authorized writes", () => {
    const fixture = createFixture();
    const takeRecords = vi.fn(() => [createRecord("characterData", fixture.textDOM)]);
    const boundary = createHtmlMutationBoundary({
      contentSurface: fixture.contentSurface,
      root: fixture.view.root,
      observerFactory: () => ({ observe: vi.fn(), disconnect: vi.fn(), takeRecords })
    });

    boundary.drainOwnedWrites();

    expect(takeRecords).toHaveBeenCalledOnce();
    expect(boundary.getDiagnostics().ownedRecordsDrained).toBe(1);
    expect(boundary.getDiagnostics().recoveries).toBe(0);
  });

  it("restores only the smallest unauthorized owner scope", () => {
    const fixture = createFixture();
    const sibling = fixture.view.root.children[1]?.mount?.dom;
    const boundary = createHtmlMutationBoundary({
      contentSurface: fixture.contentSurface,
      root: fixture.view.root
    });

    fixture.textDOM.nodeValue = "browser edit";
    boundary.process([createRecord("characterData", fixture.textDOM)]);

    expect(fixture.textDOM.nodeValue).toBe("first");
    expect(fixture.view.root.children[1]?.mount?.dom).toBe(sibling);
    expect(boundary.getDiagnostics().recoveries).toBe(1);
  });

  it("offers NodeView-owned mutations to ignoreMutation", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const schema = createSchema("card");
    const ignored = vi.fn(() => true);
    const factory = (() => {
      const dom = ownerDocument.createElement("article");
      return { dom, ignoreMutation: ignored };
    }) as unknown as QuireNodeViewMap[string];
    const view = createHtmlRetainedDocumentView({
      id: "mutation:node-view",
      documentNode: schema.node("doc", null, [schema.node("card")]),
      ownerDocument: ownerDocument as unknown as Document,
      source: { sourceId: "mutation:node-view" },
      nodeViewEnvironment: {
        view: { dom: ownerDocument.createElement("main") } as unknown as QuireMountedEditorView,
        nodeViews: { card: factory },
        markViews: {},
        getDecorations: () => DecorationSet.empty
      }
    });
    const contentSurface = ownerDocument.createElement("div");
    const nodeViewDOM = view.root.children[0]!.mount!.dom;
    contentSurface.appendChild(view.root.mount!.dom as unknown as FakeSvgMountElement);
    const boundary = createHtmlMutationBoundary({
      contentSurface: contentSurface as unknown as HTMLElement,
      root: view.root
    });

    boundary.process([createRecord("attributes", nodeViewDOM)]);

    expect(ignored).toHaveBeenCalledOnce();
    expect(boundary.getDiagnostics().ignoredNodeViewRecords).toBe(1);
    expect(boundary.getDiagnostics().recoveries).toBe(0);
  });

  it("preserves widget chrome updates while its parent retains placement and prose authority", () => {
    const fixture = createFixture(true);
    const widget = fixture.widgetDOM!;
    const boundary = createHtmlMutationBoundary({ contentSurface: fixture.contentSurface, root: fixture.view.root });
    widget.setAttribute("aria-label", "Collapse section");
    const child = widget.ownerDocument.createElement("span");
    widget.appendChild(child);
    boundary.process([createRecord("attributes", widget as unknown as Node), createRecord("childList", widget as unknown as Node)]);
    expect(widget.getAttribute("aria-label")).toBe("Collapse section");
    expect(widget.childNodes).toContain(child);
    expect(boundary.getDiagnostics().ignoredWidgetRecords).toBe(2);
    expect(boundary.getDiagnostics().recoveries).toBe(0);

    const parent = widget.parentNode!;
    parent.removeChild(widget);
    boundary.process([createRecord("childList", parent as unknown as Node)]);
    expect(widget.parentNode).toBe(parent);
    fixture.textDOM.nodeValue = "unauthorized edit";
    boundary.process([createRecord("characterData", fixture.textDOM)]);
    expect(fixture.textDOM.nodeValue).toBe("first");
    expect(boundary.getDiagnostics().recoveries).toBe(2);
  });

  it("restores an externally replaced immortal root and bounds retries", () => {
    const fixture = createFixture();
    const boundary = createHtmlMutationBoundary({
      contentSurface: fixture.contentSurface,
      root: fixture.view.root,
      maxRecoveriesPerOwner: 2
    });
    const rootDOM = fixture.view.root.mount!.dom;

    fixture.contentSurface.removeChild(rootDOM);
    boundary.process([createRecord("childList", fixture.contentSurface)]);
    expect(fixture.contentSurface.childNodes[0]).toBe(rootDOM);

    fixture.textDOM.nodeValue = "one";
    boundary.process([createRecord("characterData", fixture.textDOM)]);
    fixture.textDOM.nodeValue = "two";
    boundary.process([createRecord("characterData", fixture.textDOM)]);
    fixture.textDOM.nodeValue = "three";
    boundary.process([createRecord("characterData", fixture.textDOM)]);

    expect(boundary.getDiagnostics().rootReplacements).toBe(1);
    expect(boundary.getDiagnostics().recoveryLimitHits).toBe(1);
  });
});

/** @param withWidget - Includes a control owned by a keyed widget. @returns A two-block retained document fixture. */
function createFixture(withWidget = false) {
  const ownerDocument = new FakeSvgMountDocument();
  const schema = createSchema("paragraph");
  const documentNode = schema.node("doc", null, [
    schema.node("paragraph", null, schema.text("first")),
    schema.node("paragraph", null, schema.text("second"))
  ]);
  const widgetDOM = withWidget ? ownerDocument.createElement("button") : undefined;
  widgetDOM?.setAttribute("aria-label", "折叠章节");
  const view = createHtmlRetainedDocumentView({
    id: "mutation:document",
    documentNode,
    ownerDocument: ownerDocument as unknown as Document,
    source: { sourceId: "mutation:document" },
    ...(widgetDOM ? { nodeViewEnvironment: {
      view: { dom: ownerDocument.createElement("main") } as unknown as QuireMountedEditorView,
      nodeViews: {}, markViews: {},
      getDecorations: () => DecorationSet.create(documentNode, [Decoration.widget(1, widgetDOM as unknown as HTMLElement, { key: "control" })])
    } } : {})
  });
  const contentSurface = ownerDocument.createElement("div");
  contentSurface.appendChild(view.root.mount!.dom as unknown as FakeSvgMountElement);
  const first = view.root.children[0]!;
  const textDOM = first.kind === "node" ? first.children.find(child => child.kind === "text")!.mount!.dom : null;
  if (!textDOM) {
    throw new Error("Expected retained text DOM.");
  }
  return { view, contentSurface: contentSurface as unknown as HTMLElement, textDOM, widgetDOM };
}

/** Creates a schema with one named block node. */
function createSchema(nodeName: "paragraph" | "card"): Schema {
  if (nodeName === "card") {
    return new Schema({
      nodes: {
        doc: { content: "block+" },
        card: { group: "block", toDOM: () => ["article"] },
        text: {}
      }
    });
  }
  return new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: {
        content: "text*",
        group: "block",
        toDOM: () => ["p", 0]
      },
      text: {}
    }
  });
}

/** Creates the narrow MutationRecord facts consumed by the boundary. */
function createRecord(type: MutationRecordType, target: Node): MutationRecord {
  return { type, target } as MutationRecord;
}
