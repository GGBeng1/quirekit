import type { QuireKitChatInputQuery, QuireKitChatInputToken } from '../../../components/chat/rich-input/types';

/** Compare semantic identities and ranges without relying on array ownership.
 * @param left - First token set.
 * @param right - Second token set.
 * @returns Whether both sets represent the same references.
 */
export function equalChatInputTokens(left: readonly QuireKitChatInputToken[], right: readonly QuireKitChatInputToken[]): boolean {
  return left.length === right.length && left.every((token, index) => {
    const other = right[index];
    return other?.id === token.id && other.key === token.key && other.kind === token.kind
      && other.from === token.from && other.to === token.to && other.text === token.text;
  });
}

/** Locate a collapsed @ or / query immediately before the caret.
 * @param text - Literal draft.
 * @param caret - UTF-16 caret offset.
 * @param tokens - Resolved tokens whose content is no longer a candidate query.
 * @returns Active query, if any.
 */
export function findChatInputQuery(text: string, caret: number, tokens: readonly QuireKitChatInputToken[]): QuireKitChatInputQuery | null {
  if (caret < 1 || caret > text.length || tokens.some(token => token.from < caret && caret <= token.to)) return null;
  let from = caret - 1;
  while (from >= 0 && !/\s/u.test(text[from]!)) from--;
  from++;
  const fragment = text.slice(from, caret);
  if (fragment.length > 65 || !/^[@/][^@/\s]*$/u.test(fragment)) return null;
  return { kind: fragment[0] === '@' ? 'mention' : 'command', search: fragment.slice(1), from, to: caret };
}

/** Preserve tokens outside one contiguous edit and invalidate every touched token.
 * @param before - Previous text.
 * @param after - New text.
 * @param tokens - Previous valid tokens.
 * @param editedRange - Known pre-edit selection, used to disambiguate repeated text.
 * @returns Tokens rebased into the new text.
 */
export function rebaseChatInputTokens(before: string, after: string, tokens: readonly QuireKitChatInputToken[],
  editedRange?: { from: number; to: number }): QuireKitChatInputToken[] {
  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  let suffix = 0;
  while (suffix < before.length - prefix && suffix < after.length - prefix
    && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  let oldEnd = before.length - suffix;
  if (editedRange && editedRange.from >= 0 && editedRange.to >= editedRange.from && editedRange.to <= before.length
    && before.slice(0, editedRange.from) === after.slice(0, editedRange.from)
    && before.slice(editedRange.to) === after.slice(after.length - (before.length - editedRange.to))) {
    prefix = editedRange.from;
    oldEnd = editedRange.to;
  }
  const delta = after.length - before.length;
  return tokens.flatMap(token => {
    if (token.to <= prefix) return [token];
    if (token.from >= oldEnd) return [{ ...token, from: token.from + delta, to: token.to + delta }];
    return [];
  }).filter(token => after.slice(token.from, token.to) === token.text);
}

/** Insert one selected candidate and preserve unrelated tokens.
 * @param text - Current literal draft.
 * @param tokens - Current token list.
 * @param query - Query range to replace.
 * @param key - Candidate identity.
 * @param label - Text to insert after the trigger.
 * @param id - Stable identity for this occurrence.
 * @returns Next text, token list and caret.
 */
export function insertChatInputToken(text: string, tokens: readonly QuireKitChatInputToken[], query: QuireKitChatInputQuery,
  key: string, label: string, id: string): { text: string; tokens: QuireKitChatInputToken[]; caret: number } {
  const tokenText = `${query.kind === 'mention' ? '@' : '/'}${label}`;
  const after = text.slice(query.to);
  const spacer = after === '' || !/^\s/u.test(after) ? ' ' : '';
  const nextText = `${text.slice(0, query.from)}${tokenText}${spacer}${after}`;
  const nextTokens = rebaseChatInputTokens(text, nextText, tokens, query).filter(token => token.to <= query.from || token.from >= query.to);
  nextTokens.push({ id, key, kind: query.kind, from: query.from, to: query.from + tokenText.length, text: tokenText });
  nextTokens.sort((a, b) => a.from - b.from);
  return { text: nextText, tokens: nextTokens, caret: query.from + tokenText.length + spacer.length };
}
