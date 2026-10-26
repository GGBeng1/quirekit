import { find } from "linkifyjs";
import { normalizeLinkHref } from "../href";

/** @param text - Local source text. @returns Explicit safe URL spans with unchanged UTF-16 offsets. */
export function findAutomaticLinkMatches(text: string) {
  const searchable = text.replace(/[，。；！？、（）【】《》“”‘’]/gu, " ");
  return find(searchable, { defaultProtocol: "https" }).filter(match => (
    match.type === "url" && /^(?:https?:\/\/|www\.)/iu.test(match.value)
    && normalizeLinkHref(match.href) !== null
    && !/[\w:/\\@]/u.test(searchable[match.start - 1] ?? "")
  ));
}
