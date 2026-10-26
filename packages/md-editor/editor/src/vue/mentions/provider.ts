import { isSafeDestination } from "@quirekit/msfe-core";
import type { MdMention, MdMentionRequest, MdMentionSource } from "../../commands/types";

/** @param source - Host contacts or query provider. @param request - Current query and cancellation. @returns At most fifty valid, uniquely identified results. */
export async function resolveMdMentions(source: MdMentionSource, request: MdMentionRequest): Promise<readonly MdMention[]> {
  const value = typeof source === "function" ? await source(request) : source.filter(item =>
    `${item.label} ${item.description ?? ""} ${item.id}`.toLocaleLowerCase().includes(request.query.trim().toLocaleLowerCase()));
  if (request.signal.aborted) return [];
  const seen = new Set<string>();
  return value.filter(item => {
    if (!item.id || seen.has(item.id) || !item.label.trim() || !item.url.trim()
      || /[\r\n]/u.test(item.label + item.url) || !isSafeDestination(item.url, false)) return false;
    seen.add(item.id); return true;
  }).slice(0, 50);
}
