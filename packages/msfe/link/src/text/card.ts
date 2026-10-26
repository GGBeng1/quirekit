import { Facet, type EditorState } from "@quirekit/cm-state";
import type { TextLinkCard } from "../types";

/** One installed rule's card loader, keyed by the rule id carried on presented links. */
export interface TextLinkCardSource {
  /** Rule id, equal to `data-msfe-text-link`. */ readonly id: string;
  /** Cached loader; see {@link TextLinkOptions.card}. */ readonly load: (text: string, signal: AbortSignal) => Promise<TextLinkCard | null>;
  /** Reverse mapping from ordinary link destinations; see {@link TextLinkOptions.fromHref}. */ readonly fromHref?: (url: string) => string | null;
}

/** Card loaders contributed by installed text-link rules. */
export const textLinkCardSources = Facet.define<TextLinkCardSource>();

/**
 * Loads the hover card of one presented text link.
 * @param state - Editor state containing the installed rules.
 * @param id - Rule id from `data-msfe-text-link`.
 * @param text - Linked text.
 * @param signal - Cancellation for this hover.
 * @returns Card content; null when the rule has no card or the host returns none.
 */
export function loadTextLinkCard(state: EditorState, id: string, text: string, signal: AbortSignal): Promise<TextLinkCard | null> {
  const source = state.facet(textLinkCardSources).find(item => item.id === id);
  return source ? source.load(text, signal) : Promise.resolve(null);
}

/**
 * Finds the rule whose destinations include an ordinary link, so its card can be shown for that link.
 * @param state - Editor state containing the installed rules.
 * @param url - Destination of an ordinary Markdown link.
 * @returns Rule id and candidate text, or null when no rule claims the destination.
 */
export function matchTextLinkUrl(state: EditorState, url: string): { readonly id: string; readonly text: string } | null {
  for (const source of state.facet(textLinkCardSources)) {
    const text = source.fromHref?.(url);
    if (text) return { id: source.id, text };
  }
  return null;
}

/**
 * Caches a host card loader by text, keeping failures uncached so a later hover retries.
 * @param load - Host loader.
 * @returns Cached loader.
 */
export function cachedCardLoader(load: (text: string, signal: AbortSignal) => Promise<TextLinkCard | null>): TextLinkCardSource["load"] {
  const cards = new Map<string, Promise<TextLinkCard | null>>();
  return (text, signal) => {
    let card = cards.get(text);
    if (!card) {
      card = load(text, signal);
      cards.set(text, card);
      card.catch(() => { if (cards.get(text) === card) cards.delete(text); });
    }
    return card;
  };
}
