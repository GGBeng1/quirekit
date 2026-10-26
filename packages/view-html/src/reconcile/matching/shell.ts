import type {
  HtmlDescriptorDiagnostic,
  HtmlDescriptorMount
} from "../../descriptors";
import {
  createHtmlSchemaMarkMount,
  createHtmlSchemaNodeMount
} from "../../descriptors/schema";
import type { HtmlTargetDescriptor } from "../types";

/**
 * Renders candidate schema shells before descriptor identity is selected.
 *
 * @param targets - Desired direct children in next-document order.
 * @param ownerDocument - Browser document used to render candidate shells.
 * @returns Targets carrying candidate mounts for topology and attribute checks.
 */
export function createHtmlCandidateShellTargets(
  targets: readonly HtmlTargetDescriptor[],
  ownerDocument: Document
): HtmlTargetDescriptor[] {
  const ignoredCandidateDiagnostics: HtmlDescriptorDiagnostic[] = [];

  return targets.map((target, index) => {
    if (target.kind === "node") {
      return {
        ...target,
        candidateMount: createHtmlSchemaNodeMount(
          `html:candidate:node:${index}`,
          target.node,
          ownerDocument,
          ignoredCandidateDiagnostics
        )
      };
    }
    if (target.kind === "mark" && target.mark && !target.markViewFactory) {
      return {
        ...target,
        candidateMount: createHtmlSchemaMarkMount(
          `html:candidate:mark:${index}`,
          target.mark,
          ownerDocument,
          ignoredCandidateDiagnostics
        )
      };
    }
    return target;
  });
}

/**
 * Compares schema shell topology while ignoring patchable attributes.
 *
 * @param current - Existing retained shell mount.
 * @param candidate - Candidate shell rendered from the next schema node or mark.
 * @returns Whether tag, namespace, content hole, and static wrappers match.
 */
export function hasCompatibleHtmlShellTopology(
  current: HtmlDescriptorMount | null,
  candidate: HtmlDescriptorMount | null | undefined
): boolean {
  if (!current || !candidate) {
    return current === candidate;
  }
  return describeShellNode(current.dom, current.contentDOM, true) ===
    describeShellNode(candidate.dom, candidate.contentDOM, true);
}

/**
 * Serializes topology without reading patchable attributes or dynamic content.
 *
 * @param node - Current static shell node.
 * @param contentDOM - Content hole whose descendants are dynamic.
 * @param root - Whether this node is the patchable shell root.
 * @returns Stable structured topology description.
 */
function describeShellNode(
  node: Node,
  contentDOM: HTMLElement | null,
  root: boolean
): string {
  const hole = node === contentDOM;
  const name = readNodeName(node);
  const namespace = readNodeNamespace(node);
  const attributes = root ? [] : readNodeAttributes(node);
  const text = node.nodeType === 3 ? node.nodeValue ?? "" : "";
  const children = hole
    ? []
    : Array.from<Node>(node.childNodes).map((child) => (
        describeShellNode(child, contentDOM, false)
      ));

  return JSON.stringify({
    nodeType: node.nodeType,
    name,
    namespace,
    attributes,
    hole,
    text,
    children
  });
}

/**
 * Reads sorted attributes for one non-root static shell element.
 *
 * @param node - Static shell node whose attributes participate in identity.
 * @returns Stable attribute name/value pairs, including class and style.
 */
function readNodeAttributes(node: Node): readonly (readonly [string, string | null])[] {
  if (node.nodeType !== 1) {
    return [];
  }
  const element = node as Element;
  const names = typeof element.getAttributeNames === "function"
    ? element.getAttributeNames()
    : Array.from(element.attributes, (attribute) => attribute.name);
  const attributes = new Map(names.map((name) => [name, element.getAttribute(name)]));
  const reflectedClass = readReflectedClass(element);
  const reflectedStyle = readReflectedStyle(element);

  if (!attributes.has("class") && reflectedClass) {
    attributes.set("class", reflectedClass);
  }
  if (!attributes.has("style") && reflectedStyle) {
    attributes.set("style", reflectedStyle);
  }
  return [...attributes].sort(([left], [right]) => left.localeCompare(right));
}

/**
 * Reads browser or fake-DOM reflected class content.
 *
 * @param element - Static shell element to inspect.
 * @returns Reflected class text, or an empty string.
 */
function readReflectedClass(element: Element): string {
  const className = (element as unknown as {
    readonly className?: string | { readonly baseVal?: string | undefined };
  }).className;

  return typeof className === "string" ? className : className?.baseVal ?? "";
}

/**
 * Reads browser or fake-DOM reflected inline style content.
 *
 * @param element - Static shell element to inspect.
 * @returns Reflected CSS text, or an empty string.
 */
function readReflectedStyle(element: Element): string {
  const style = (element as Element & {
    readonly style?: { readonly cssText?: string | undefined };
  }).style;

  return style?.cssText ?? "";
}

/**
 * Reads browser or fake-DOM node names consistently.
 *
 * @param node - Shell node to inspect.
 * @returns Lowercase node name used by topology comparison.
 */
function readNodeName(node: Node): string {
  const compatible = node as Node & { readonly tagName?: string | undefined };

  return (node.nodeName || compatible.tagName || "").toLowerCase();
}

/**
 * Reads browser or fake-DOM namespace identity consistently.
 *
 * @param node - Shell node to inspect.
 * @returns Namespace URI or empty string for ordinary HTML nodes.
 */
function readNodeNamespace(node: Node): string {
  const compatible = node as Node & {
    readonly namespace?: string | undefined;
    readonly namespaceURI?: string | null | undefined;
  };

  return compatible.namespaceURI ?? compatible.namespace ?? "";
}
