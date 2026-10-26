import { quireKitEn } from "./packs/en";
import { quireKitZhCN } from "./packs/zh-cn";
import type { QuireKitLocale, QuireKitLocalePack, QuireKitMessages, QuireKitMessageScope } from "./types";

/** Languages shipped with the component library. */
export const quireKitBuiltInLocales: readonly QuireKitLocale[] = [quireKitZhCN, quireKitEn];

/** Language used when nothing else matches. */
export const quireKitDefaultLocale = quireKitZhCN;

/**
 * Declares an added or adjusted language with type checking.
 * @param pack - Language tag, optional fallback and partial messages.
 * @returns The same pack.
 */
export function defineQuireKitLocale(pack: QuireKitLocalePack): QuireKitLocalePack {
  return pack;
}

/** @param code - BCP 47 tag. @param candidates - Known language tags. @returns Exact match, then base language, else undefined. */
function matchCode(code: string, candidates: readonly string[]): string | undefined {
  const lower = code.toLowerCase();
  const base = lower.split("-")[0];
  return candidates.find(candidate => candidate.toLowerCase() === lower)
    ?? candidates.find(candidate => candidate.toLowerCase() === base);
}

/**
 * Resolves a language tag to complete messages. Added packs are layered over their fallback
 * language one component at a time, so a partial pack never leaves a component without text.
 * @param code - Requested BCP 47 tag.
 * @param packs - Added or adjusted languages, consulted before the built-in ones.
 * @returns The resolved language with complete messages; its code is the requested tag.
 */
export function resolveQuireKitLocale(code: string, packs: readonly QuireKitLocalePack[] = []): QuireKitLocale {
  const builtIn = new Map(quireKitBuiltInLocales.map(locale => [locale.code, locale]));
  const added = new Map(packs.map(pack => [pack.code, pack]));
  /** @param tag - Tag to resolve. @param seen - Tags already on the fallback chain, guarding cycles. @returns Complete messages. */
  const messagesFor = (tag: string, seen: ReadonlySet<string>): QuireKitMessages => {
    const addedCode = matchCode(tag, [...added.keys()]);
    if (addedCode !== undefined && !seen.has(addedCode)) {
      const pack = added.get(addedCode)!;
      const base = messagesFor(pack.fallback ?? quireKitEn.code, new Set([...seen, addedCode]));
      const merged = { ...base } as Record<QuireKitMessageScope, unknown>;
      for (const scope of Object.keys(base) as QuireKitMessageScope[]) merged[scope] = { ...base[scope], ...pack.messages[scope] };
      return merged as unknown as QuireKitMessages;
    }
    const builtInCode = matchCode(tag, [...builtIn.keys()]);
    return (builtInCode === undefined ? quireKitDefaultLocale : builtIn.get(builtInCode)!).messages;
  };
  return { code, messages: messagesFor(code, new Set()) };
}
