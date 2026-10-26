import {
  Extension,
  textblockTypeInputRule,
  type CommandSpec,
  type CommandProps,
  type AnyCommands
} from "@quirekit/core";
import { canSplit, TextSelection } from "@quirekit/pm";
import {
  defaultWordHeadingStyleId,
  defaultWordParagraphFormatting,
  resolveWordHeadingLevel,
  resolveWordParagraphFormatting,
  type WordHeadingLevel
} from "./model";
import { collectSelectedWordParagraphs } from "./selection/collect";

/** Options for Word heading paragraph presets and authoring shortcuts. */
export interface WordHeadingOptions {
  /** Canonical paragraph node type used for newly authored headings. */
  readonly paragraphType: string;
  /** Legacy paragraph-like node types normalized by heading commands. */
  readonly types: readonly string[];
  /** Heading levels exposed by commands, shortcuts, and input rules. */
  readonly levels: readonly WordHeadingLevel[];
  /** Paragraph style identifiers associated with heading levels. */
  readonly styles: Readonly<Partial<Record<WordHeadingLevel, string>>>;
  /** Whether Enter at the end of a heading should continue the heading. */
  readonly keepHeadingOnEnter: boolean;
}

/** Attributes accepted by Word heading commands. */
export interface WordHeadingAttributes {
  /** Heading level to apply or toggle. */
  readonly level: WordHeadingLevel;
}

/** Word-compatible paragraph-heading preset extension. */
export const WordHeading = Extension.create<WordHeadingOptions>({
  name: "wordHeading",
  keyboardShortcutPriority: 110,

  addOptions() {
    const levels: readonly WordHeadingLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    return {
      paragraphType: "paragraph",
      types: ["paragraph", "heading"],
      levels,
      styles: Object.fromEntries(
        levels.map((level) => [level, defaultWordHeadingStyleId(level)])
      ),
      keepHeadingOnEnter: false
    };
  },

  addGlobalAttributes() {
    return [{
      types: [...this.options.types],
      attributes: {
        wordParagraph: { default: null, rendered: false }
      }
    }];
  },

  addCommands() {
    return createWordHeadingCommands(this.options);
  },

  addKeyboardShortcuts() {
    const shortcuts = this.options.levels.reduce<Record<string, () => boolean>>(
      (shortcuts, level) => ({
        ...shortcuts,
        [`Mod-Alt-${level}`]: () =>
          this.editor?.commands.toggleWordHeading({ level }) ?? false
      }),
      {}
    );
    if (!this.options.keepHeadingOnEnter) {
      shortcuts.Enter = () =>
        this.editor?.commands.exitWordHeadingAtEnd() ?? false;
    }
    return shortcuts;
  },

  addInputRules() {
    return this.options.levels.map((level) => textblockTypeInputRule({
      find: new RegExp(`^(#{${level}})\\s$`),
      type: this.options.paragraphType,
      getAttributes: {
        wordParagraph: {
          ...defaultWordParagraphFormatting,
          styleId: resolveHeadingStyleId(this.options, level),
          outlineLevel: level - 1
        }
      }
    }));
  }
});

/**
 * Creates paragraph-style heading commands for one configured preset set.
 *
 * @param options - Resolved Word heading options.
 * @returns Set and toggle commands backed by ordinary paragraph nodes.
 */
function createWordHeadingCommands(
  options: WordHeadingOptions
): AnyCommands {
  return {
    setWordHeading: createWordHeadingCommand(options, false),
    toggleWordHeading: createWordHeadingCommand(options, true),
    exitWordHeadingAtEnd: createExitWordHeadingAtEndCommand(options)
  };
}

/**
 * Creates the Word-style heading exit command used by the Enter shortcut.
 *
 * @param options - Resolved Word heading options.
 * @returns Command that creates one body paragraph after a heading.
 */
function createExitWordHeadingAtEndCommand(
  options: WordHeadingOptions
): CommandSpec {
  return () => (context) => {
    const { selection } = context.tr;
    const { $from, $to } = selection;
    const paragraphType = context.state.schema.nodes[options.paragraphType];
    if (
      !(selection instanceof TextSelection)
      || !selection.empty
      || paragraphType === undefined
      || $from.parent.type !== paragraphType
      || $to.parentOffset !== $to.parent.content.size
      || resolveWordHeadingLevel(
        resolveWordParagraphFormatting($from.parent.attrs.wordParagraph)
      ) === null
    ) {
      return false;
    }

    const formatting = resolveWordParagraphFormatting(
      $from.parent.attrs.wordParagraph
    );
    const nextAttrs = {
      ...$from.parent.attrs,
      wordParagraph: {
        ...formatting,
        styleId: null,
        outlineLevel: null
      }
    };
    const splitTypes = [{ type: paragraphType, attrs: nextAttrs }];
    if (!canSplit(context.tr.doc, $from.pos, 1, splitTypes)) return false;

    // The node split and next-style application are one transformation so
    // history never exposes an intermediate second heading.
    context.tr.split($from.pos, 1, splitTypes);
    const marks = context.state.storedMarks
      ?? ($from.parentOffset ? $from.marks() : null);
    if (marks) {
      context.tr.ensureMarks(marks.filter((mark) =>
        context.editor.extensionManager.splittableMarks.includes(mark.type.name)
      ));
    }
    context.dispatch?.(context.tr.scrollIntoView());
    return true;
  };
}

/**
 * Creates one set-or-toggle Word heading command.
 *
 * @param options - Resolved Word heading options.
 * @param toggle - Whether matching selections return to body paragraphs.
 * @returns Selection-aware heading command.
 */
function createWordHeadingCommand(
  options: WordHeadingOptions,
  toggle: boolean
): CommandSpec {
  return (value) => (context) => {
    if (!isWordHeadingAttributes(value, options.levels)) return false;
    const targets = collectSelectedWordParagraphs(context.state, options.types);
    if (targets.length === 0) return false;
    const shouldClear = toggle && targets.every(({ node }) => (
      resolveWordHeadingLevel(
        resolveWordParagraphFormatting(node.attrs.wordParagraph)
      ) === value.level
    ));
    return updateHeadings(context, options, targets, value.level, shouldClear);
  };
}

/**
 * Applies or clears a Word heading preset on selected paragraph-like nodes.
 *
 * Legacy generic heading nodes are normalized to the configured paragraph type
 * in the same transaction, keeping one canonical Word textblock representation.
 *
 * @param context - Active editor command context.
 * @param options - Resolved Word heading options.
 * @param targets - Selected paragraph-like nodes in document order.
 * @param level - Requested heading level.
 * @param clear - Whether to return the targets to inherited body styling.
 * @returns Whether a changed transaction was dispatched.
 */
function updateHeadings(
  context: CommandProps,
  options: WordHeadingOptions,
  targets: ReturnType<typeof collectSelectedWordParagraphs>,
  level: WordHeadingLevel,
  clear: boolean
): boolean {
  const paragraphType = context.state.schema.nodes[options.paragraphType];
  if (paragraphType === undefined || !paragraphType.isTextblock) return false;
  let changed = false;

  for (const target of targets) {
    const formatting = resolveWordParagraphFormatting(
      target.node.attrs.wordParagraph
    );
    const nextFormatting = {
      ...formatting,
      styleId: clear ? null : resolveHeadingStyleId(options, level),
      outlineLevel: clear ? null : level - 1
    };
    if (
      target.node.type === paragraphType
      && JSON.stringify(nextFormatting) === JSON.stringify(formatting)
    ) {
      continue;
    }
    const nextAttrs = { ...target.node.attrs };
    delete nextAttrs.level;
    context.tr.setNodeMarkup(target.position, paragraphType, {
      ...nextAttrs,
      wordParagraph: nextFormatting
    });
    changed = true;
  }

  if (!changed) return false;
  context.dispatch?.(context.tr.scrollIntoView());
  return true;
}

/**
 * Resolves a configured style identifier with a built-in Word fallback.
 *
 * @param options - Resolved Word heading options.
 * @param level - Requested heading level.
 * @returns Paragraph style identifier for the level.
 */
function resolveHeadingStyleId(
  options: WordHeadingOptions,
  level: WordHeadingLevel
): string {
  return options.styles[level] ?? defaultWordHeadingStyleId(level);
}

/**
 * Validates heading command input against the configured level set.
 *
 * @param value - Candidate command argument.
 * @param levels - Enabled heading levels.
 * @returns Whether the command argument contains one enabled level.
 */
function isWordHeadingAttributes(
  value: unknown,
  levels: readonly WordHeadingLevel[]
): value is WordHeadingAttributes {
  if (value === null || typeof value !== "object") return false;
  const level = (value as { readonly level?: unknown }).level;
  return typeof level === "number"
    && levels.includes(level as WordHeadingLevel);
}
