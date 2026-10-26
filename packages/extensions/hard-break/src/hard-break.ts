import type {} from "@quirekit/accessibility-contract";
import {
  mergeAttributes,
  Node,
  type CommandProps
} from "@quirekit/core";
import type { Mark as PMMark } from "@quirekit/pm";
import "@quirekit/classic-revision-contract";
import { hardBreakDocxCodec } from "./docx";

/** Options for the hard break node extension. */
export interface HardBreakOptions {
  /** Whether marks should be kept after the hard break. */
  readonly keepMarks: boolean;
  /** HTML attributes added when the hard break serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
}

/** Hard break inline node extension. */
export const HardBreak = Node.create<HardBreakOptions>({
  name: "hardBreak",

  /** @returns Semantic facts consumed only by an installed accessibility engine. */
  addAccessibility() {
    return [{ kind: "node", name: this.name,
      /** @returns Native semantics owned by this extension. */
      describe: () => ({ kind: "break" }) }];
  },

  markdownTokenName: "br",

  addOptions() {
    return {
      keepMarks: true,
      HTMLAttributes: {}
    };
  },

  inline: true,

  group: "inline",

  selectable: false,

  linebreakReplacement: true,

  parseHTML() {
    return [{ tag: "br" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["br", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  renderText() {
    return "\n";
  },

  renderMarkdown: () => "  \n",

  parseMarkdown: () => ({
    type: "hardBreak"
  }),

  addDocx() {
    return hardBreakDocxCodec;
  },

  /** @returns Shared mark strategy with the owner-proven DOCX projection. */
  addWordRevisions() {
    return [{
      id: "extension.hard-break.revision",
      nodePolicies: [{
        nodeType: this.name,
        insertion: "mark",
        deletion: "mark",
        docx: "projected"
      }]
    }];
  },

  addCommands() {
    const setHardBreak = () => (
      { commands, chain, state, editor }: CommandProps
    ) => {
      return commands.first([
        () => commands.exitCode(),
        () =>
          commands.command(() => {
            const { selection, storedMarks } = state;

            if (selection.$from.parent.type.spec.isolating) {
              return false;
            }

            const { keepMarks } = this.options;
            const { splittableMarks } = editor.extensionManager;
            const marks: readonly PMMark[] | null =
              storedMarks ??
              (selection.$to.parentOffset ? selection.$from.marks() : null);

            return chain()
              .insertContent({ type: this.name })
              .command(({ tr, dispatch }: CommandProps) => {
                if (dispatch && marks && keepMarks) {
                  const filteredMarks = marks.filter((mark) =>
                    splittableMarks.includes(mark.type.name)
                  );

                  tr.ensureMarks(filteredMarks);
                }

                return true;
              })
              .run();
          })
      ]);
    };

    return {
      setHardBreak
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () => this.editor?.commands.setHardBreak() ?? false,
      "Shift-Enter": () => this.editor?.commands.setHardBreak() ?? false
    };
  }
});

/** Public hard-break command methods. */
type HardBreakCommandMethods<ReturnType> = {
  setHardBreak: () => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the HardBreak extension. */
    readonly hardBreak: HardBreakCommandMethods<ReturnType>;
  }
}
