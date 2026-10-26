import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { createWordTableStyleRegistrySignature, resolveWordTableStyleRegistry } from "./registry";
import type { WordTableStyleRegistry } from "../types";

/**
 * Reads the active table-style registry only when the document schema declares it.
 *
 * @param documentNode - ProseMirror document node.
 * @returns Valid registry, or undefined outside Word table documents.
 */
export function readWordTableDocumentStyleRegistry(
  documentNode: ProseMirrorNode
): WordTableStyleRegistry | undefined {
  if (!Object.prototype.hasOwnProperty.call(documentNode.attrs, "wordTableStyleRegistry")) {
    return undefined;
  }
  return resolveWordTableStyleRegistry(documentNode.attrs.wordTableStyleRegistry);
}

/**
 * Creates cache identity for the document's table-style registry.
 *
 * @param documentNode - ProseMirror document node.
 * @returns Registry signature, or undefined when the document declares no styles.
 */
export function createWordTableDocumentStyleSignature(
  documentNode: ProseMirrorNode
): string | undefined {
  const registry = readWordTableDocumentStyleRegistry(documentNode);
  return registry === undefined || Object.keys(registry.styles).length === 0
    ? undefined
    : createWordTableStyleRegistrySignature(registry);
}
