/**
 * Narrows generated CSS to the rule blocks whose prelude mentions a token.
 *
 * Theme CSS is several hundred kilobytes. Matching it with a global
 * `[^{}]*token[^{}]*\{[^}]*\}` regular expression re-anchors at every offset and
 * costs seconds per call, which is enough to trip the default test timeout once
 * workers contend. This indexes the blocks in one linear pass instead, so tests
 * keep their readable regular expressions while running them on a tiny string.
 *
 * @param css - Generated CSS text.
 * @param tokens - Substrings that must appear somewhere in a rule prelude.
 * @returns Complete matching rule blocks in source order, joined by newlines.
 */
export function collectQuireCssRulesByPrelude(
  css: string,
  tokens: readonly string[]
): string {
  const rules: string[] = [];
  const openBlocks: { preludeStart: number; braceAt: number }[] = [];
  let preludeStart = 0;

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];

    if (character === "{") {
      openBlocks.push({ preludeStart, braceAt: index });
      preludeStart = index + 1;
      continue;
    }

    if (character !== "}" || openBlocks.length === 0) continue;

    // Phase boundary: the prelude is the authority for "which rule is this".
    // Closing a block first so nested at-rule contents stay individually
    // addressable, exactly as the replaced regular expression did.
    const block = openBlocks.pop()!;
    const prelude = css.slice(block.preludeStart, block.braceAt);
    if (tokens.some((token) => prelude.includes(token))) {
      rules.push(css.slice(block.preludeStart, index + 1));
    }
    preludeStart = index + 1;
  }

  return rules.join("\n");
}
