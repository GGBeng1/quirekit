import type { BoldOptions } from "@quirekit/extension-bold";
import type { BlockquoteOptions } from "@quirekit/extension-blockquote";
import type { CodeOptions } from "@quirekit/extension-code";
import type { CodeBlockOptions } from "@quirekit/extension-code-block";
import type { HardBreakOptions } from "@quirekit/extension-hard-break";
import type { HeadingOptions } from "@quirekit/extension-heading";
import type { HorizontalRuleOptions } from "@quirekit/extension-horizontal-rule";
import type { ItalicOptions } from "@quirekit/extension-italic";
import type {
  BulletListOptions,
  ListItemOptions,
  ListKeymapOptions,
  OrderedListOptions
} from "@quirekit/extension-list";
import type { ParagraphOptions } from "@quirekit/extension-paragraph";
import type { StrikeOptions } from "@quirekit/extension-strike";
import type { UnderlineOptions } from "@quirekit/extension-underline";
import type { TrailingNodeOptions, UndoRedoOptions } from "@quirekit/extensions";

/** Starter-kit extension option: pass options to configure or false to omit. */
export type StarterKitExtensionOption<Options extends object = object> =
  | Partial<Options>
  | false;

/** Options used to compose the starter extension set. */
export interface StarterKitOptions {
  /** Document extension options, or false to omit the extension. */
  readonly document?: StarterKitExtensionOption;
  /** Paragraph extension options, or false to omit the extension. */
  readonly paragraph?: StarterKitExtensionOption<ParagraphOptions>;
  /** Text extension options, or false to omit the extension. */
  readonly text?: StarterKitExtensionOption;
  /** Blockquote extension options, or false to omit the extension. */
  readonly blockquote?: StarterKitExtensionOption<BlockquoteOptions>;
  /** Hard break extension options, or false to omit the extension. */
  readonly hardBreak?: StarterKitExtensionOption<HardBreakOptions>;
  /** Heading extension options, or false to omit the extension. */
  readonly heading?: StarterKitExtensionOption<HeadingOptions>;
  /** Horizontal rule extension options, or false to omit the extension. */
  readonly horizontalRule?: StarterKitExtensionOption<HorizontalRuleOptions>;
  /** Bold mark extension options, or false to omit the extension. */
  readonly bold?: StarterKitExtensionOption<BoldOptions>;
  /** Code mark extension options, or false to omit the extension. */
  readonly code?: StarterKitExtensionOption<CodeOptions>;
  /** Code block node extension options, or false to omit the extension. */
  readonly codeBlock?: StarterKitExtensionOption<CodeBlockOptions>;
  /** Bullet list node extension options, or false to omit the extension. */
  readonly bulletList?: StarterKitExtensionOption<BulletListOptions>;
  /** List item node extension options, or false to omit the extension. */
  readonly listItem?: StarterKitExtensionOption<ListItemOptions>;
  /** List keymap extension options, or false to omit the extension. */
  readonly listKeymap?: StarterKitExtensionOption<ListKeymapOptions>;
  /** Ordered list node extension options, or false to omit the extension. */
  readonly orderedList?: StarterKitExtensionOption<OrderedListOptions>;
  /** Italic mark extension options, or false to omit the extension. */
  readonly italic?: StarterKitExtensionOption<ItalicOptions>;
  /** Strike mark extension options, or false to omit the extension. */
  readonly strike?: StarterKitExtensionOption<StrikeOptions>;
  /** Underline mark extension options, or false to omit the extension. */
  readonly underline?: StarterKitExtensionOption<UnderlineOptions>;
  /** Gap cursor extension options, or false to omit the extension. */
  readonly gapcursor?: StarterKitExtensionOption;
  /** Trailing node extension options, or false to omit the extension. */
  readonly trailingNode?: StarterKitExtensionOption<TrailingNodeOptions>;
  /** Whether to include the base keymap extension. */
  readonly baseKeymap?: boolean;
  /** Undo-redo extension options, or false to omit the extension. */
  readonly undoRedo?: StarterKitExtensionOption<UndoRedoOptions>;
}
