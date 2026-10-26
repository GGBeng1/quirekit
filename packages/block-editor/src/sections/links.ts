import type { Editor } from "@quirekit/core";
import { readBlockCatalog } from "@quirekit/extensions";
import type { BlockActionTarget } from "../ui/blocks/types";

/** @param href - Candidate location. @param current - Current document URL. @returns Same-document stable block identity, or null. */
export function blockLinkId(href: string, current: string): string | null {
  try {
    const url = new URL(href, current), base = new URL(current);
    if (url.origin !== base.origin || url.pathname !== base.pathname || url.search !== base.search || !url.hash.startsWith("#block=")) return null;
    return decodeURIComponent(url.hash.slice(7)) || null;
  } catch { return null; }
}

/** @param editor - Current source authority. @param target - Captured block. @returns Whether its stable location was written to the system clipboard. */
export async function copyBlockLink(editor: Editor, target: BlockActionTarget): Promise<boolean> {
  const catalog = readBlockCatalog(editor), window = editor.mountedView?.dom.ownerDocument.defaultView;
  if (!window || catalog?.revision !== target.range.expectedDocumentRevision || catalog.rootId !== target.block.rootId) return false;
  const url = new URL(window.location.href); url.hash = `block=${encodeURIComponent(target.block.blockId)}`;
  try { await window.navigator.clipboard.writeText(url.href); return true; } catch { return false; }
}

/** @param editor - Canonical target owner. @param href - Explicit requested URL. @returns Whether a local block was revealed, without opening another tab. */
export function followBlockLink(editor: Editor, href: string): boolean {
  const window = editor.mountedView?.dom.ownerDocument.defaultView;
  const id = window && blockLinkId(href, window.location.href);
  return !!id && !!editor.commands.navigateBlockLink?.(id);
}
