/** Token produced by indented block parsing. */
export interface ParsedBlock {
  /** Token type. */
  readonly type: string;
  /** Raw Markdown represented by the token. */
  readonly raw: string;
  /** Main line content. */
  readonly mainContent: string;
  /** Indentation level in source characters. */
  readonly indentLevel: number;
  /** Optional nested raw content. */
  readonly nestedContent?: string | undefined;
  /** Optional nested tokens. */
  readonly nestedTokens?: readonly unknown[] | undefined;
  /** Additional token fields. */
  readonly [key: string]: unknown;
}

/** Configuration for parsing indented Markdown blocks. */
export interface BlockParserConfig {
  /** Pattern that identifies one item line. */
  readonly itemPattern: RegExp;
  /**
   * Extracts item data from a matched line.
   *
   * @param match - Regex match for the current line.
   * @returns Item data used by `createToken`.
   */
  readonly extractItemData: (match: RegExpMatchArray) => {
    /** Main line content. */
    readonly mainContent: string;
    /** Indentation level in source characters. */
    readonly indentLevel: number;
    /** Additional item data. */
    readonly [key: string]: unknown;
  };
  /**
   * Creates a parsed block token.
   *
   * @param data - Extracted item data.
   * @param nestedTokens - Tokens parsed from nested content.
   * @returns Parsed block token.
   */
  readonly createToken: (
    data: Readonly<Record<string, unknown>>,
    nestedTokens?: readonly unknown[] | undefined
  ) => ParsedBlock;
  /** Base indentation stripped from nested content. */
  readonly baseIndentSize?: number | undefined;
  /**
   * Parses nested content when default block parsing is not enough.
   *
   * @param dedentedContent - Nested content after indentation stripping.
   * @returns Nested tokens.
   */
  readonly customNestedParser?: ((dedentedContent: string) => readonly unknown[] | undefined) | undefined;
}

/** Minimal lexer contract required by indented block parsing. */
export interface IndentedBlockLexer {
  /**
   * Parses inline Markdown tokens.
   *
   * @param source - Markdown source.
   * @returns Inline tokens.
   */
  readonly inlineTokens: (source: string) => readonly unknown[];
  /**
   * Parses block Markdown tokens.
   *
   * @param source - Markdown source.
   * @returns Block tokens.
   */
  readonly blockTokens: (source: string) => readonly unknown[];
}

/**
 * Parses hierarchical Markdown blocks whose nesting is represented by indentation.
 *
 * @param source - Markdown source text.
 * @param config - Parser configuration.
 * @param lexer - Lexer used for nested content.
 * @returns Parsed items and raw source, or undefined when the source does not match.
 */
export function parseIndentedBlocks(
  source: string,
  config: BlockParserConfig,
  lexer: IndentedBlockLexer
): { readonly items: readonly ParsedBlock[]; readonly raw: string } | undefined {
  const lines = source.split("\n");
  const items: ParsedBlock[] = [];
  let raw = "";
  let index = 0;
  const baseIndentSize = config.baseIndentSize ?? 2;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const match = line.match(config.itemPattern);

    if (!match) {
      if (items.length > 0) {
        break;
      }

      if (line.trim() === "") {
        raw += `${line}\n`;
        index += 1;
        continue;
      }

      return undefined;
    }

    const data = config.extractItemData(match);
    const nestedLines: string[] = [];
    raw += `${line}\n`;
    index += 1;

    while (index < lines.length && isNestedLine(lines, index, data.indentLevel)) {
      const nestedLine = lines[index] ?? "";
      nestedLines.push(nestedLine);
      raw += `${nestedLine}\n`;
      index += 1;
    }

    const nestedTokens = parseNestedLines(
      nestedLines,
      data.indentLevel + baseIndentSize,
      config,
      lexer
    );

    items.push(config.createToken(data, nestedTokens));
  }

  return items.length === 0
    ? undefined
    : { items, raw };
}

/**
 * Checks whether the current line belongs to the previous item.
 *
 * @param lines - All source lines.
 * @param index - Current line index.
 * @param parentIndent - Parent indentation level.
 * @returns Whether the current line is nested under the parent.
 */
function isNestedLine(
  lines: readonly string[],
  index: number,
  parentIndent: number
): boolean {
  const line = lines[index] ?? "";

  if (line.trim() === "") {
    const next = lines.slice(index + 1).find((candidate) => candidate.trim() !== "");

    return next ? getIndent(next) > parentIndent : false;
  }

  return getIndent(line) > parentIndent;
}

/**
 * Returns indentation size for a line.
 *
 * @param line - Source line.
 * @returns Indentation size.
 */
function getIndent(line: string): number {
  return line.match(/^(\s*)/)?.[1]?.length ?? 0;
}

/**
 * Parses nested lines with either a custom parser or the lexer.
 *
 * @param lines - Nested source lines.
 * @param stripSize - Number of characters to strip from each line.
 * @param config - Parser configuration.
 * @param lexer - Markdown lexer.
 * @returns Nested tokens, or undefined for empty content.
 */
function parseNestedLines(
  lines: readonly string[],
  stripSize: number,
  config: BlockParserConfig,
  lexer: IndentedBlockLexer
): readonly unknown[] | undefined {
  const nestedContent = lines
    .map((line) => line.slice(stripSize))
    .join("\n");

  if (!nestedContent.trim()) {
    return undefined;
  }

  return config.customNestedParser
    ? config.customNestedParser(nestedContent)
    : lexer.blockTokens(nestedContent);
}
