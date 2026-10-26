import {
  DOMSerializer,
  type DOMOutputSpec,
  type Mark,
  type Node as ProseMirrorNode
} from "@quirekit/pm";
import type { HtmlNodeDescriptorRuntime } from "./runtime";
import type {
  HtmlDescriptorDiagnostic,
  HtmlDescriptorMount
} from "./types";

/** Internal PM renderSpec signature that preserves block-array node attributes. */
type RenderHtmlSchemaSpec = (
  document: Document,
  structure: DOMOutputSpec,
  xmlNamespace: string | null,
  blockArraysIn: Record<string, unknown>
) => { readonly dom: HTMLElement; readonly contentDOM?: HTMLElement | undefined };

/** PM schema-shell renderer including its node-attribute block-array input. */
const renderHtmlSchemaSpec = DOMSerializer.renderSpec as RenderHtmlSchemaSpec;

/**
 * Creates a schema-owned node shell without serializing its descendants.
 *
 * @param descriptorId - Stable identity that receives any diagnostic.
 * @param node - ProseMirror node whose schema shell should be rendered.
 * @param ownerDocument - Browser document used to create DOM.
 * @param diagnostics - Mutable diagnostic output for the construction request.
 * @returns Detachable schema shell, or null when the contract is unavailable.
 */
export function createHtmlSchemaNodeMount(
  descriptorId: string,
  node: ProseMirrorNode,
  ownerDocument: Document,
  diagnostics: HtmlDescriptorDiagnostic[]
): HtmlDescriptorMount | null {
  return createSchemaMount(descriptorId, node, "node", ownerDocument, diagnostics);
}

/**
 * Creates a schema-owned mark shell without serializing its text descendant.
 *
 * @param descriptorId - Stable mark descriptor identity.
 * @param mark - ProseMirror mark whose schema shell should be rendered.
 * @param ownerDocument - Browser document used to create DOM.
 * @param diagnostics - Mutable diagnostic output for the construction request.
 * @returns Detachable mark shell, or null when the mark DOM contract is
 * unavailable or invalid.
 */
export function createHtmlSchemaMarkMount(
  descriptorId: string,
  mark: Mark,
  ownerDocument: Document,
  diagnostics: HtmlDescriptorDiagnostic[]
): HtmlDescriptorMount | null {
  return createSchemaMount(descriptorId, mark, "mark", ownerDocument, diagnostics);
}

/**
 * Renders one node or mark shell with identical validation and diagnostic ownership.
 * @param descriptorId - Retained owner of the shell.
 * @param value - Canonical node or mark supplying toDOM and attributes.
 * @param kind - Schema owner determining the editable content-hole fallback.
 * @param ownerDocument - DOM allocation owner.
 * @param diagnostics - Mutable output receiving a missing or invalid schema contract.
 * @returns Validated shell, or null without a usable schema renderer.
 */
function createSchemaMount(
  descriptorId: string,
  value: ProseMirrorNode | Mark,
  kind: "node" | "mark",
  ownerDocument: Document,
  diagnostics: HtmlDescriptorDiagnostic[]
): HtmlDescriptorMount | null {
  if (!value.type.spec.toDOM) {
    diagnostics.push(createDiagnostic(
      `html-${kind}-to-dom-missing`, descriptorId, value.type.name,
      `Schema ${kind} "${value.type.name}" does not declare toDOM.`
    ));
    return null;
  }
  try {
    const spec = kind === "node"
      ? (value as ProseMirrorNode).type.spec.toDOM!(value as ProseMirrorNode)
      : (value as Mark).type.spec.toDOM!(value as Mark, true) as DOMOutputSpec;
    const rendered = renderHtmlSchemaSpec(ownerDocument, spec, null, value.attrs);
    // A blank textblock reserves the same CSS line height as typed content and
    // placeholder text, without adding synthetic characters to the document.
    if (kind === "node" && (value as ProseMirrorNode).isTextblock) rendered.dom.style.minHeight = "1lh";
    return { dom: rendered.dom, contentDOM: rendered.contentDOM ?? (kind === "mark" ? rendered.dom : null) };
  } catch (error) {
    diagnostics.push(createDiagnostic(
      `html-${kind}-to-dom-invalid`, descriptorId, value.type.name,
      error instanceof Error ? error.message : `Schema ${kind} toDOM failed.`
    ));
    return null;
  }
}

/**
 * Validates whether a node shell's content hole matches its document shape.
 *
 * @param descriptor - Retained schema node descriptor to validate.
 * @returns Stable content-hole diagnostic, or null for a valid shell.
 */
export function createHtmlNodeContentHoleDiagnostic(
  descriptor: HtmlNodeDescriptorRuntime
): HtmlDescriptorDiagnostic | null {
  if (descriptor.node.childCount > 0 && descriptor.mount?.contentDOM === null) {
    return createDiagnostic(
      "html-node-content-hole-missing",
      descriptor.id,
      descriptor.node.type.name,
      `Schema DOM for "${descriptor.node.type.name}" cannot host its document children.`
    );
  }
  if (descriptor.node.isLeaf && descriptor.mount?.contentDOM) {
    return createDiagnostic(
      "html-node-content-hole-invalid",
      descriptor.id,
      descriptor.node.type.name,
      `Leaf schema node "${descriptor.node.type.name}" exposes a content hole.`
    );
  }
  return null;
}

/**
 * Creates one stable descriptor diagnostic.
 *
 * @param code - Stable diagnostic code.
 * @param descriptorId - Descriptor that owns the schema gap.
 * @param typeName - ProseMirror node or mark type.
 * @param message - Human-readable gap detail.
 * @returns Immutable diagnostic record.
 */
function createDiagnostic(
  code: HtmlDescriptorDiagnostic["code"],
  descriptorId: string,
  typeName: string,
  message: string
): HtmlDescriptorDiagnostic {
  return { code, descriptorId, typeName, message };
}
