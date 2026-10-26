import {
  Fragment,
  Plugin,
  TextSelection,
  type EditorState as PMEditorState,
  type EditorView,
  type Node as PMNode
} from "@quirekit/pm";
import { QuireCommandManager } from "./CommandManager";
import type { QuireEditor } from "./Editor";
import { createChainableState } from "./helpers/createChainableState";
import { getHTMLFromFragment } from "./helpers/getHTMLFromFragment";
import { getTextContentFromNodes } from "./helpers/getTextContentFromNodes";
import type {
  CanCommands,
  ChainedCommands,
  QuireRange,
  SingleCommands
} from "./types";
import { isRegExp } from "./utilities/isRegExp";

/** Match object returned by function-based input rule finders. */
export interface InputRuleMatch {
  /** Start index of the matched text inside the scanned input text. */
  readonly index: number;
  /** Full text matched by the finder. */
  readonly text: string;
  /** Optional replacement text that should appear as the second capture. */
  readonly replaceWith?: string;
  /** Optional native regexp match associated with this match. */
  readonly match?: RegExpMatchArray;
  /** Optional extension-owned metadata carried to the handler. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Input rule finder compatible with Tiptap regexp and function finders. */
export type InputRuleFinder = RegExp | ((text: string) => InputRuleMatch | null);

/** RegExp match array with optional extension-owned metadata. */
export interface ExtendedRegExpMatchArray extends RegExpMatchArray {
  /** Optional extension-owned metadata attached by function finders. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Props passed to an input rule handler. */
export interface InputRuleHandlerProps {
  /** ProseMirror editor state used for the rule execution. */
  readonly state: PMEditorState;
  /** Document range covered by the matched input. */
  readonly range: QuireRange;
  /** Match produced by the input rule finder. */
  readonly match: ExtendedRegExpMatchArray;
  /** Single command helpers available to the rule. */
  readonly commands: SingleCommands;
  /** Creates a chainable command runner. */
  readonly chain: () => ChainedCommands;
  /** Creates command availability helpers. */
  readonly can: () => CanCommands;
}

/** Configuration object accepted by {@link InputRule}. */
export interface InputRuleConfig {
  /** Finder used to detect typed text that should trigger the rule. */
  readonly find: InputRuleFinder;
  /**
   * Handler called when the input rule matches.
   *
   * @param props - Rule execution context.
   * @returns `null` to cancel the rule, otherwise void.
   */
  readonly handler: (props: InputRuleHandlerProps) => void | null;
  /** Whether the rule can be undone by undo-input-rule commands. */
  readonly undoable?: boolean;
}

/** Tiptap-compatible input rule definition. */
export class InputRule {
  /** Finder used to detect typed text that should trigger the rule. */
  readonly find: InputRuleFinder;

  /** Handler called when the input rule matches. */
  readonly handler: InputRuleConfig["handler"];

  /** Whether the rule can be undone by undo-input-rule commands. */
  readonly undoable: boolean;

  /**
   * Creates an input rule.
   *
   * @param config - Finder, handler, and undo behavior for the rule.
   */
  constructor(config: InputRuleConfig) {
    this.find = config.find;
    this.handler = config.handler;
    this.undoable = config.undoable ?? true;
  }
}

/**
 * Creates a ProseMirror plugin that runs QuireKit input rules.
 *
 * @param options - Editor and rule list to bind.
 * @returns ProseMirror plugin that bridges typed text into rule handlers.
 */
export function inputRulesPlugin(options: {
  /** Editor that owns the input rule command surface. */
  readonly editor: QuireEditor;
  /** Input rules collected from installed extensions. */
  readonly rules: readonly InputRule[];
}): Plugin {
  const { editor, rules } = options;
  const plugin: Plugin = new Plugin({
    state: {
      /**
       * Creates the initial undo-input-rule state.
       *
       * @returns Empty input-rule undo state.
       */
      init() {
        return null;
      },
      /**
       * Stores the latest undoable input-rule transform.
       *
       * @param transaction - Transaction being applied.
       * @param previousValue - Previous plugin state.
       * @returns Stored undo metadata or null when a document change clears it.
       */
      apply(transaction, previousValue) {
        const stored = transaction.getMeta(plugin);

        if (stored) {
          return stored;
        }

        return transaction.selectionSet || transaction.docChanged ? null : previousValue;
      }
    },
    props: {
      /**
       * Runs extension-owned input rules before view fallbacks insert text.
       *
       * @param view - Mounted editor view proxy.
       * @param from - Start position of the typed range.
       * @param to - End position of the typed range.
       * @param text - Text inserted by the browser input event.
       * @returns Whether an input rule handled the text.
       */
      handleTextInput(view, from, to, text) {
        return runInputRules({ editor, view, from, to, text, rules, plugin });
      },
      handleDOMEvents: {
        /**
         * Re-checks rules after IME composition commits.
         *
         * @param view - Mounted editor view proxy.
         * @returns Always false so normal composition flow can continue.
         */
        compositionend(view) {
          setTimeout(() => {
            const { $cursor } = view.state.selection as TextSelection;

            if ($cursor) {
              runInputRules({
                editor,
                view,
                from: $cursor.pos,
                to: $cursor.pos,
                text: "",
                rules,
                plugin
              });
            }
          });

          return false;
        }
      },
      /**
       * Lets rules opt into Enter-triggered transforms such as code blocks.
       *
       * @param view - Mounted editor view proxy.
       * @param event - Keyboard event to inspect.
       * @returns Whether an input rule handled Enter.
       */
      handleKeyDown(view, event): boolean {
        if (event.key !== "Enter") {
          return false;
        }

        const { $cursor } = view.state.selection as TextSelection;

        return $cursor
          ? runInputRules({
            editor,
            view,
            from: $cursor.pos,
            to: $cursor.pos,
            text: "\n",
            rules,
            plugin
          })
          : false;
      }
    },
    isInputRules: true
  });

  return plugin;
}

/**
 * Runs the first matching input rule for a text insertion.
 *
 * @param options - Input rule execution options.
 * @returns Whether a rule handled the text insertion.
 */
function runInputRules(options: {
  /** Editor that owns commands exposed to rule handlers. */
  readonly editor: QuireEditor;
  /** Mounted view proxy that received the input. */
  readonly view: EditorView & { readonly composing?: boolean };
  /** Start position of the inserted text. */
  readonly from: number;
  /** End position of the inserted text. */
  readonly to: number;
  /** Inserted text. */
  readonly text: string;
  /** Rules to inspect in priority order. */
  readonly rules: readonly InputRule[];
  /** Plugin used to store undo metadata. */
  readonly plugin: Plugin;
}): boolean {
  const { editor, view, from, to, text, rules, plugin } = options;

  if (view.composing) {
    return false;
  }

  const $from = view.state.doc.resolve(from);

  if (isCodeInputPosition(view.state, from)) {
    return false;
  }

  const textBefore = `${getTextContentFromNodes($from)}${text}`;

  for (const rule of rules) {
    const match = inputRuleMatcherHandler(textBefore, rule.find);

    if (!match || match[0].length < text.length) {
      continue;
    }

    const transaction = view.state.tr;
    const state = createChainableState({ state: view.state, transaction });
    const commandManager = new QuireCommandManager({ editor, state });
    const range = {
      from: from - (match[0].length - text.length),
      to
    };
    const result = rule.handler({
      state,
      range,
      match,
      commands: commandManager.commands,
      chain: commandManager.chain,
      can: commandManager.can
    });

    if (result === null || transaction.steps.length === 0) {
      continue;
    }

    if (rule.undoable) {
      transaction.setMeta(plugin, { transform: transaction, from, to, text });
    }

    view.dispatch(transaction);
    return true;
  }

  return false;
}

/**
 * Matches text using a Tiptap-compatible input rule finder.
 *
 * @param text - Text immediately before the insertion point.
 * @param find - RegExp or function finder.
 * @returns RegExp-like match array, or null when the finder did not match.
 */
function inputRuleMatcherHandler(
  text: string,
  find: InputRuleFinder
): ExtendedRegExpMatchArray | null {
  if (isRegExp(find)) {
    return find.exec(text) as ExtendedRegExpMatchArray | null;
  }

  const inputRuleMatch = find(text);

  if (!inputRuleMatch) {
    return null;
  }

  const result = [inputRuleMatch.text] as ExtendedRegExpMatchArray;
  result.index = inputRuleMatch.index;
  result.input = text;

  if (inputRuleMatch.data) {
    Object.defineProperty(result, "data", { value: inputRuleMatch.data });
  }

  if (inputRuleMatch.replaceWith) {
    if (!inputRuleMatch.text.includes(inputRuleMatch.replaceWith)) {
      console.warn(
        '[quirekit warn]: "inputRuleMatch.replaceWith" must be part of "inputRuleMatch.text".'
      );
    }

    result.push(inputRuleMatch.replaceWith);
  }

  return result;
}

/**
 * Reports whether an input rule should skip a position inside code content.
 *
 * @param state - Editor state being edited.
 * @param position - Input position.
 * @returns Whether the position is inside a code node or code mark.
 */
function isCodeInputPosition(state: PMEditorState, position: number): boolean {
  const $from = state.doc.resolve(position);

  if ($from.parent.type.spec.code) {
    return true;
  }

  return Boolean(
    ($from.nodeBefore ?? $from.nodeAfter)?.marks.some((mark) => mark.type.spec.code)
  );
}

/**
 * Serializes simulated input content to text used by rule matching.
 *
 * @param content - Simulated content provided by insert commands.
 * @param state - State whose schema should serialize nodes.
 * @returns Text or HTML-like text for matching.
 */
export function serializeInputRuleContent(
  content: string | PMNode | Fragment,
  state: PMEditorState
): string {
  return typeof content === "string"
    ? content
    : getHTMLFromFragment(Fragment.from(content), state.schema);
}
