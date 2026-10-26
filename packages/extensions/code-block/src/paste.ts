import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorView
} from "@quirekit/pm";
import type { CommandSpec, Editor } from "@quirekit/core";
import type { VSCodeClipboardData } from "./types";

/** Semantic clipboard payload accepted by the code-block insertion command. */
export interface InsertCodeBlockFromClipboardOptions {
  /** Normalized plain-text code. */
  readonly text: string;
  /** Optional VS Code language identifier. */
  readonly language: string | null;
}

/** Options used to create the VS Code paste plugin. */
export interface CodeBlockPastePluginOptions {
  /** Code block node name. */
  readonly nodeName: string;
  /** Editor whose command surface owns the paste mutation. */
  readonly editor: Editor;
}

/**
 * Creates the VS Code clipboard metadata paste plugin.
 *
 * @param options - Paste plugin options.
 * @returns ProseMirror plugin that pastes VS Code text as a code block.
 */
export function createCodeBlockPastePlugin(
  options: CodeBlockPastePluginOptions
): Plugin {
  return new Plugin({
    key: new PluginKey("codeBlockVSCodeHandler"),
    props: {
      handlePaste: (_view: EditorView, event: ClipboardEvent) =>
        handleVSCodePaste({
          ...options,
          event
        })
    }
  });
}

/**
 * Handles VS Code clipboard metadata by pasting text as a code block.
 *
 * @param options - Paste handler options.
 * @returns Whether the paste was handled.
 */
function handleVSCodePaste(options: CodeBlockPastePluginOptions & {
  /** Native paste event. */
  readonly event: ClipboardEvent;
}): boolean {
  const { editor, event } = options;
  const clipboardData = event.clipboardData;

  if (!clipboardData || editor.isActive(options.nodeName)) {
    return false;
  }

  const text = clipboardData.getData("text/plain");
  const vscode = clipboardData.getData("vscode-editor-data");
  if (!text || !vscode) {
    return false;
  }

  const data = JSON.parse(vscode) as VSCodeClipboardData;
  const language = data.mode;
  const content = text.replace(/\r\n?/g, "\n");
  return editor.commands.insertCodeBlockFromClipboard({
    text: content,
    language: language || null
  });
}

/**
 * Creates the semantic command used by the VS Code clipboard adapter.
 *
 * @param nodeName - Registered code-block node name.
 * @returns Command inserting normalized clipboard content as a code block.
 */
export function createInsertCodeBlockFromClipboardCommand(
  nodeName: string
): CommandSpec {
  return (value) => (context) => {
    const input = readClipboardCommandOptions(value);
    const codeBlockType = context.state.schema.nodes[nodeName];
    if (input === undefined || codeBlockType === undefined) return false;
    const node = codeBlockType.create(
      input.language ? { language: input.language } : null,
      input.text ? context.state.schema.text(input.text) : undefined
    );
    context.tr.replaceSelectionWith(node);
    if (context.tr.selection.$from.parent.type.name !== nodeName) {
      context.tr.setSelection(TextSelection.near(
        context.tr.doc.resolve(Math.max(0, context.tr.selection.from - 2))
      ));
    }
    context.tr.setMeta("paste", true);
    context.dispatch?.(context.tr);
    return true;
  };
}

/**
 * Reads a code-block clipboard command payload.
 *
 * @param value - Candidate command payload.
 * @returns Validated payload, or undefined when malformed.
 */
function readClipboardCommandOptions(
  value: unknown
): InsertCodeBlockFromClipboardOptions | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const candidate = value as Partial<InsertCodeBlockFromClipboardOptions>;
  return typeof candidate.text === "string"
    && (candidate.language === null || typeof candidate.language === "string")
    ? candidate as InsertCodeBlockFromClipboardOptions
    : undefined;
}
