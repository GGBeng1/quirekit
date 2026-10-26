import type { FlowchartDocument } from "@quirekit/flowchart";
import { flowRuntimeText, resolveFlowRuntimeLocale } from "./messages";

/** @param before - Existing content, including literal user text. @param after - Pure structural operation result. @param locale - New-content language. @returns Same transaction with localized defaults only on newly created identities. */
export function localizeCreatedFlowContent(before: FlowchartDocument, after: FlowchartDocument, locale: string): FlowchartDocument {
  if (resolveFlowRuntimeLocale(locale) !== "en") return after;
  const nodes = new Set(before.nodes.map(node => node.id)), edges = new Set(before.edges.map(edge => edge.id));
  return { ...after,
    nodes: after.nodes.map(node => nodes.has(node.id) ? node : { ...node, text: flowRuntimeText(locale, node.text) }),
    edges: after.edges.map(edge => edges.has(edge.id) ? edge : { ...edge, label: flowRuntimeText(locale, edge.label) }),
  };
}
