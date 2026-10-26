import { h, type Component, type VNodeChild } from "vue";
import type { SyntaxNode } from "@lezer/common";
import { QuireProseImage, QuireProseSource, QuireProseTable } from "@quirekit/ui/vue";
import type { MarkdownComponents } from "../types";

const defaults: MarkdownComponents = { img: QuireProseImage, pre: QuireProseSource, table: QuireProseTable };

/** @param component - Trusted renderer. @returns Whether metadata is explicitly consumed instead of falling through to DOM. */
function acceptsNode(component: Component): boolean {
  const props = (component as { props?: readonly string[] | Record<string, unknown> }).props;
  return !!props && (Array.isArray(props) ? props.includes("node") : Object.hasOwn(props, "node"));
}

/** @param components - Local replacements. @param node - Source owner. @param tag - Semantic element.
 * @param attributes - Validated semantic properties. @param children - Already-projected content.
 * @returns A native element or explicitly registered component, never compiled source HTML. */
export function renderElement(components: MarkdownComponents | undefined, node: SyntaxNode, tag: string,
  attributes: Record<string, unknown> = {}, children: VNodeChild = []): VNodeChild {
  const component = components?.[tag] ?? defaults[tag] ?? tag;
  if (typeof component === "string") {
    const props = { ...attributes };
    for (const name of ["code", "language", "node"]) delete props[name];
    return h(component, props, [children]);
  }
  const metadata = acceptsNode(component) ? { node: Object.freeze({ type: node.name, from: node.from, to: node.to }) } : {};
  return h(component, { ...attributes, ...metadata }, { default: () => children });
}
