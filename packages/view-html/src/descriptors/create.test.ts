import { Schema, type DOMOutputSpec } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import {
  FakeSvgMountDocument,
  type FakeSvgMountElement
} from "@quirekit/view/test-support/svg-mount";
import {
  createHtmlDocumentDescriptor,
  createHtmlNodeDescriptor
} from "./create";
import type { HtmlContainerDesc, HtmlDescriptor } from "./types";

describe("retained HTML descriptor creation", registerDescriptorCreationTests);

/** Registers retained descriptor creation behavior. */
function registerDescriptorCreationTests(): void {
  it("creates schema shells with direct text ownership", testSchemaShellCreation);
  it("keeps empty textblocks measurable without synthetic document children", testEmptyTextblockBox);
  it("represents nested marks as retained descriptors", testNestedMarkDescriptors);
  it("reports missing and invalid schema DOM without fallback", testSchemaDiagnostics);
  it("keeps mountless authority-gap descendants detached", testMountAuthorityIsolation);
  it("rejects invalid mark DOM and detaches descendants", testInvalidMarkAuthorityIsolation);
  it("keeps semantic identity across detach, remount, and destroy", testMountLifecycle);
}

/** Proves an empty textblock retains one clickable browser line box. */
function testEmptyTextblockBox(): void {
  const schema = createFixtureSchema();
  const documentNode = schema.nodeFromJSON({
    type: "doc",
    content: [{ type: "paragraph" }]
  });
  const result = createHtmlDocumentDescriptor({
    id: "html:empty-textblock",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:empty-textblock" }
  });
  const paragraph = result.descriptor.children[0];
  const paragraphDOM = paragraph?.mount?.dom as unknown as FakeSvgMountElement;

  expect(paragraph?.kind).toBe("node");
  if (paragraph?.kind !== "node") {
    throw new RangeError("Empty textblock fixture requires a node descriptor.");
  }
  expect(paragraph.children).toEqual([]);
  expect(paragraphDOM.childNodes).toHaveLength(0);
  expect(paragraphDOM.style.minHeight).toBe("1lh");
}

/** Proves a document owns schema-rendered shells rather than an opaque subtree. */
function testSchemaShellCreation(): void {
  const schema = createFixtureSchema();
  const documentNode = schema.nodeFromJSON({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "hello" }] }]
  });
  const ownerDocument = new FakeSvgMountDocument();
  const source = { sourceId: "doc:body", range: { from: 0, to: documentNode.content.size } };
  const result = createHtmlDocumentDescriptor({
    id: "html:document",
    documentNode,
    ownerDocument: ownerDocument as unknown as Document,
    source
  });
  const paragraph = result.descriptor.children[0];
  const text = readChild(paragraph, 0);

  expect(result.diagnostics).toEqual([]);
  expect(result.descriptor.mount?.dom).toBe(result.descriptor.mount?.contentDOM);
  expect(paragraph?.kind).toBe("node");
  expect(paragraph?.mount?.contentDOM).toBe(paragraph?.mount?.dom);
  expect(text.kind).toBe("text");
  expect(text.mount?.dom.nodeType).toBe(3);
  expect(text.mount?.dom.textContent).toBe("hello");
  expect(text.parent).toBe(paragraph);
  expect(text.source).toBe(source);
  expect(paragraph?.range).toEqual({ from: 0, to: 7 });
  expect(text.range).toEqual({ from: 1, to: 6 });

  if (text.kind === "text") {
    text.updateText(schema.text("updated"), { from: 1, to: 8 });
  }

  expect(text.mount?.dom.textContent).toBe("updated");
  expect(text.range).toEqual({ from: 1, to: 8 });

  if (text.kind === "text") {
    const originalNode = text.node;
    const originalRange = text.range;
    const originalDOM = text.mount?.dom;

    expect(() => text.updateText(schema.text("drift"), { from: 1, to: 8 })).toThrow(
      'HtmlTextDesc.updateText range length must match text node size for "html:document:child:0:child:0:text".'
    );
    expect(text.node).toBe(originalNode);
    expect(text.range).toBe(originalRange);
    expect(text.mount?.dom).toBe(originalDOM);
    expect(text.mount?.dom.textContent).toBe("updated");
  }
}

/** Proves mark wrappers remain independently addressable retained owners. */
function testNestedMarkDescriptors(): void {
  const schema = createFixtureSchema();
  const documentNode = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "marked",
            marks: [{ type: "strong" }, { type: "em" }]
          }
        ]
      }
    ]
  });
  const source = { sourceId: "doc:marked" };
  const result = createHtmlDocumentDescriptor({
    id: "html:marked",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source
  });
  const paragraph = result.descriptor.children[0];
  const strong = readChild(paragraph, 0);
  const emphasis = readChild(strong, 0);
  const text = readChild(emphasis, 0);

  expect(strong.kind).toBe("mark");
  expect((strong.mount?.dom as unknown as FakeSvgMountElement).tagName).toBe("strong");
  expect(emphasis.kind).toBe("mark");
  expect((emphasis.mount?.dom as unknown as FakeSvgMountElement).tagName).toBe("em");
  expect(text.kind).toBe("text");
  expect(strong.range).toEqual(text.range);
  expect(emphasis.range).toEqual(text.range);
  expect(collectDescriptors(result.descriptor).every((item) => item.source === source)).toBe(
    true
  );
}

/** Proves invalid schema contracts surface named gaps instead of fallback DOM. */
function testSchemaDiagnostics(): void {
  const schema = createFixtureSchema();
  const ownerDocument = new FakeSvgMountDocument() as unknown as Document;
  const source = { sourceId: "doc:gaps" };
  const missing = createHtmlNodeDescriptor({
    id: "html:missing",
    node: schema.node("missingBlock"),
    ownerDocument,
    parent: null,
    range: { from: 0, to: 2 },
    source
  });
  const invalid = createHtmlNodeDescriptor({
    id: "html:invalid",
    node: schema.node("invalidBlock"),
    ownerDocument,
    parent: null,
    range: { from: 2, to: 4 },
    source
  });
  const missingHole = createHtmlNodeDescriptor({
    id: "html:no-hole",
    node: schema.node("noHoleBlock", null, schema.text("child")),
    ownerDocument,
    parent: null,
    range: { from: 4, to: 11 },
    source
  });
  const invalidHole = createHtmlNodeDescriptor({
    id: "html:leaf-hole",
    node: schema.node("leafHole"),
    ownerDocument,
    parent: null,
    range: { from: 11, to: 12 },
    source
  });

  expect(missing.descriptor.mount).toBeNull();
  expect(missing.diagnostics.map((item) => item.code)).toEqual([
    "html-node-to-dom-missing"
  ]);
  expect(invalid.descriptor.mount).toBeNull();
  expect(invalid.diagnostics.map((item) => item.code)).toEqual([
    "html-node-to-dom-invalid"
  ]);
  expect(missingHole.diagnostics.map((item) => item.code)).toContain(
    "html-node-content-hole-missing"
  );
  expect(missingHole.descriptor.children[0]?.mount?.dom.parentNode).toBeNull();
  expect(invalidHole.descriptor.mount).toBeNull();
  expect(invalidHole.diagnostics.map((item) => item.code)).toEqual([
    "html-node-content-hole-invalid"
  ]);
}

/** Proves authority failures do not expose retained descendants through ancestors. */
function testMountAuthorityIsolation(): void {
  const schema = createFixtureSchema();
  const documentNode = schema.nodeFromJSON({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "visible" }]
      },
      {
        type: "missingBlock",
        content: [{
          type: "text",
          text: "missing",
          marks: [{ type: "missingMark" }]
        }]
      },
      {
        type: "invalidBlock",
        content: [{
          type: "text",
          text: "invalid",
          marks: [{ type: "missingMark" }]
        }]
      }
    ]
  });
  const result = createHtmlDocumentDescriptor({
    id: "html:authority-gaps",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:authority-gaps" }
  });
  const missing = result.descriptor.children[1];
  const invalid = result.descriptor.children[2];
  const missingMark = readChild(missing, 0);
  const invalidMark = readChild(invalid, 0);
  const missingText = readChild(missingMark, 0);
  const invalidText = readChild(invalidMark, 0);

  expect(result.diagnostics.map((item) => item.code)).toEqual([
    "html-node-to-dom-missing",
    "html-mark-to-dom-missing",
    "html-node-to-dom-invalid",
    "html-mark-to-dom-missing"
  ]);
  expect(result.diagnostics.filter((item) => item.code === "html-mark-to-dom-missing")).toEqual([
    {
      code: "html-mark-to-dom-missing",
      descriptorId: "html:authority-gaps:child:1:child:0:mark:0:missingMark",
      typeName: "missingMark",
      message: 'Schema mark "missingMark" does not declare toDOM.'
    },
    {
      code: "html-mark-to-dom-missing",
      descriptorId: "html:authority-gaps:child:2:child:0:mark:0:missingMark",
      typeName: "missingMark",
      message: 'Schema mark "missingMark" does not declare toDOM.'
    }
  ]);
  expect(missing?.mount).toBeNull();
  expect(invalid?.mount).toBeNull();
  expect(missingMark.mount).toBeNull();
  expect(invalidMark.mount).toBeNull();
  expect(missingText.mount?.dom.parentNode).toBeNull();
  expect(invalidText.mount?.dom.parentNode).toBeNull();
}

/** Proves invalid mark schema DOM reports a gap without exposing its text. */
function testInvalidMarkAuthorityIsolation(): void {
  const schema = createFixtureSchema();
  const documentNode = schema.nodeFromJSON({
    type: "doc",
    content: [{
      type: "paragraph",
      content: [{
        type: "text",
        text: "invalid-mark",
        marks: [{ type: "invalidMark" }]
      }]
    }]
  });
  const result = createHtmlDocumentDescriptor({
    id: "html:invalid-mark",
    documentNode,
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    source: { sourceId: "doc:invalid-mark" }
  });
  const paragraph = result.descriptor.children[0];
  const invalidMark = readChild(paragraph, 0);
  const text = readChild(invalidMark, 0);

  expect(result.diagnostics).toEqual([{
    code: "html-mark-to-dom-invalid",
    descriptorId: "html:invalid-mark:child:0:child:0:mark:0:invalidMark",
    typeName: "invalidMark",
    message: "Content hole must be the only child of its parent node"
  }]);
  expect(invalidMark.mount).toBeNull();
  expect(text.mount?.dom.parentNode).toBeNull();
}

/** Proves DOM mounting is detachable while descriptor ownership remains stable. */
function testMountLifecycle(): void {
  const schema = createFixtureSchema();
  const result = createHtmlNodeDescriptor({
    id: "html:paragraph",
    node: schema.node("paragraph", null, schema.text("stable")),
    ownerDocument: new FakeSvgMountDocument() as unknown as Document,
    parent: null,
    range: { from: 4, to: 12 },
    source: { sourceId: "doc:stable" }
  });
  const descriptor = result.descriptor;
  const child = descriptor.children[0];
  const mount = descriptor.detachMount();

  expect(mount).not.toBeNull();
  expect(descriptor.mount).toBeNull();
  expect(descriptor.id).toBe("html:paragraph");

  if (mount) {
    descriptor.attachMount(mount);
  }

  expect(descriptor.mount).toBe(mount);
  descriptor.destroy();
  descriptor.destroy();
  expect(descriptor.destroyed).toBe(true);
  expect(descriptor.mount).toBeNull();
  expect(child?.destroyed).toBe(true);
}

/**
 * Creates the schema used by retained descriptor contract tests.
 *
 * @returns Schema containing valid and intentionally invalid DOM contracts.
 */
function createFixtureSchema(): Schema {
  return new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: {
        content: "inline*",
        group: "block",
        /** @returns Paragraph shell and its child content hole. */
        toDOM(): DOMOutputSpec {
          return ["p", 0];
        }
      },
      invalidBlock: {
        content: "inline*",
        group: "block",
        /** @returns Invalid output spec with siblings beside the content hole. */
        toDOM(): DOMOutputSpec {
          return ["div", 0, ["span"]];
        }
      },
      missingBlock: {
        content: "inline*",
        group: "block"
      },
      noHoleBlock: {
        content: "inline*",
        group: "block",
        /** @returns Shell that cannot host its document children. */
        toDOM(): DOMOutputSpec {
          return ["div"];
        }
      },
      leafHole: {
        atom: true,
        group: "block",
        /** @returns Invalid leaf shell that exposes a content hole. */
        toDOM(): DOMOutputSpec {
          return ["span", 0];
        }
      },
      text: { group: "inline" }
    },
    marks: {
      strong: {
        /** @returns Strong mark shell. */
        toDOM(): DOMOutputSpec {
          return ["strong", 0];
        }
      },
      em: {
        /** @returns Emphasis mark shell. */
        toDOM(): DOMOutputSpec {
          return ["em", 0];
        }
      },
      missingMark: {},
      invalidMark: {
        /** @returns Invalid mark output spec with a non-exclusive content hole. */
        toDOM(): DOMOutputSpec {
          return ["span", 0, ["em"]];
        }
      }
    }
  });
}

/**
 * Reads one child from a descriptor that must own children.
 *
 * @param descriptor - Descriptor expected to own retained children.
 * @param index - Child index to read.
 * @returns Required retained child descriptor.
 */
function readChild(
  descriptor: HtmlDescriptor | undefined,
  index: number
): HtmlDescriptor {
  expect(descriptor).toBeDefined();
  expect("children" in (descriptor as HtmlDescriptor)).toBe(true);

  const child = (descriptor as HtmlContainerDesc).children[index];

  expect(child).toBeDefined();
  return child as HtmlDescriptor;
}

/**
 * Collects a retained descriptor subtree in depth-first order.
 *
 * @param descriptor - Root descriptor to traverse.
 * @returns Root and all retained descendants.
 */
function collectDescriptors(descriptor: HtmlDescriptor): HtmlDescriptor[] {
  const result = [descriptor];

  if ("children" in descriptor) {
    for (const child of descriptor.children) {
      result.push(...collectDescriptors(child));
    }
  }
  return result;
}
