import { find } from "linkifyjs";
import { normalizeLinkHref } from "../href";

/**
 * Completes user-entered addresses without rewriting imported relative targets.
 * @param value - Address typed into an authoring form.
 * @returns Safe explicit target, or null for ambiguous/invalid input.
 */
export function normalizeLinkAuthoringHref(value: unknown): string | null {
  const href = normalizeLinkHref(value);
  if (href === null) return null;
  if (/^(?:\.\.?\/|\/|#)/u.test(href)) return href;
  if (/^(?:https?|mailto|tel):/iu.test(href)) {
    try {
      const url = new URL(href);
      return /^(?:http|https):$/u.test(url.protocol)
        ? url.hostname ? href : null
        : url.pathname ? href : null;
    } catch { return null; }
  }
  const matches = find(href, { defaultProtocol: "https" });
  const match = matches[0];
  return matches.length === 1 && match?.start === 0 && match.end === href.length
    && (match.type === "url" || match.type === "email")
    ? normalizeLinkHref(match.href) : null;
}
