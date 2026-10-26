import type { DocxSemanticIntent } from "../products/index.js";

/**
 * Creates one model-neutral semantic compiler intent.
 *
 * @param key - Stable intent key.
 * @param type - Semantic intent family.
 * @param payload - Immutable model-neutral payload.
 * @returns Frozen semantic intent.
 */
export function docxSemanticIntent(
  key: string,
  type: string,
  payload: Readonly<Record<string, unknown>>
): DocxSemanticIntent {
  if (key.trim().length === 0 || type.trim().length === 0) {
    throw new TypeError("DOCX semantic intent key and type must be non-empty.");
  }
  return Object.freeze({
    key,
    type,
    payload: Object.freeze({ ...payload })
  });
}

/**
 * Creates a portable paragraph intent for simple extension projections.
 *
 * @param key - Stable intent key.
 * @param children - Child semantic intent keys.
 * @param properties - Optional paragraph properties.
 * @returns Frozen paragraph intent.
 */
export function docxParagraphIntent(
  key: string,
  children: readonly string[],
  properties: Readonly<Record<string, unknown>> = {}
): DocxSemanticIntent {
  return docxSemanticIntent(key, "paragraph", {
    children: Object.freeze([...children]),
    properties: Object.freeze({ ...properties })
  });
}

/**
 * Creates a portable text intent for simple extension projections.
 *
 * @param key - Stable intent key.
 * @param text - Text content.
 * @param marks - Model-neutral mark plans.
 * @returns Frozen text intent.
 */
export function docxTextIntent(
  key: string,
  text: string,
  marks: readonly Readonly<Record<string, unknown>>[] = []
): DocxSemanticIntent {
  return docxSemanticIntent(key, "text", {
    text,
    marks: Object.freeze(marks.map((mark) => Object.freeze({ ...mark })))
  });
}

/**
 * Creates a reversible tagged-container intent with portable fallback content.
 *
 * @param key - Stable intent key.
 * @param tag - Stable extension-defined tag.
 * @param children - Portable fallback child intent keys.
 * @param metadata - JSON-safe extension metadata.
 * @returns Frozen tagged-container intent.
 */
export function docxTaggedContainerIntent(
  key: string,
  tag: string,
  children: readonly string[],
  metadata: Readonly<Record<string, unknown>> = {}
): DocxSemanticIntent {
  if (tag.trim().length === 0) {
    throw new TypeError("DOCX tagged container requires a non-empty tag.");
  }
  return docxSemanticIntent(key, "tagged-container", {
    tag,
    children: Object.freeze([...children]),
    metadata: Object.freeze({ ...metadata })
  });
}
