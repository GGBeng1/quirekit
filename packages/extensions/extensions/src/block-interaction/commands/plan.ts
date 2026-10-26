import { Transform, ReplaceStep, Slice } from "@quirekit/pm";
import type { CommandProps } from "@quirekit/core";
import { blockCatalogKey } from "../identity";
import { createBlockCatalog, resolveBlockRange, resolveBlockRef } from "../scope";
import type { BlockInteractionOptions, BlockMoveRequest } from "../types";

/**
 * Builds a detached strict move without touching the shared command transaction.
 * @param context - Canonical current command context.
 * @param options - Explicit feature policy.
 * @param request - Captured identities and destination.
 * @returns Validated steps and landed range, or null.
 */
export function planBlockMove(context: CommandProps, options: BlockInteractionOptions, request: BlockMoveRequest) {
  if (!context.editor.isEditable) return null;
  const stored = blockCatalogKey.getState(context.state);
  if (!stored || request.destination.expectedDocumentRevision !== stored.revision) return null;
  const catalog = stored.doc === context.tr.doc ? stored : createBlockCatalog(context.tr.doc, options, stored.rootId, stored.revision);
  const source = resolveBlockRange(catalog, request.source);
  const target = resolveBlockRef(catalog, request.destination.target);
  const first = source?.[0], last = source?.at(-1);
  if (!source || !first || !last || !target || target.scopeId !== first.scopeId) return null;
  const position = request.destination.side === "before" ? target.from : target.to;
  if (position >= first.from && position <= last.to) return null;
  if (options.admit({ editor: context.editor, doc: context.tr.doc, source, target, position })) return null;
  // Standard closed-slice steps preserve every mark, anchor and resource. A
  // detached transform proves schema validity before a chain can be mutated.
  const transform = new Transform(context.tr.doc);
  const slice = context.tr.doc.slice(first.from, last.to);
  const landed = position > last.to ? position - (last.to - first.from) : position;
  try {
    transform.step(new ReplaceStep(first.from, last.to, Slice.empty));
    transform.step(new ReplaceStep(landed, landed, slice));
  } catch { return null; }
  return { transform, from: landed, to: landed + slice.size };
}
