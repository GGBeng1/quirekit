import { Facet, type EditorState } from "@quirekit/cm-state";
import { isSafeDestination } from "@quirekit/msfe-core";
import type { LinkOptions } from "./types";

/** Link navigation policy shared by projected text and product controls. */
export const linkOpeningPolicy = Facet.define<NonNullable<LinkOptions["openLink"]>>();

/**
 * Opens a safe destination through this editor's host policy or its owning window.
 * @param state - Link feature configuration.
 * @param document - Owner realm for the fallback navigation.
 * @param url - Decoded Markdown destination.
 * @returns Whether navigation was accepted; host failures propagate to the caller.
 */
export function openLinkDestination(state: EditorState, document: Document, url: string): boolean {
  if (!isSafeDestination(url)) return false;
  const open = state.facet(linkOpeningPolicy)[0];
  if (open) { open(url); return true; }
  const win = document.defaultView;
  if (!win) return false;
  // noopener may return null even after a successful open; it is not a failure signal.
  win.open(url, "_blank", "noopener,noreferrer");
  return true;
}
