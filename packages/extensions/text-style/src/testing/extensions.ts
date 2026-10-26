import {
  Mark,
  type QuireAnyExtension,
  type CommandProps
} from "@quirekit/core";
import { Document } from "@quirekit/extension-document";
import { Heading } from "@quirekit/extension-heading";
import { Paragraph } from "@quirekit/extension-paragraph";
import { Text } from "@quirekit/extension-text";

/** Minimal semantic bold carrier used by TextStyle owner tests. */
const TestBold = Mark.create({ name: "bold" });

/** Minimal semantic italic carrier used by TextStyle owner tests. */
const TestItalic = Mark.create({ name: "italic" });

/** Minimal semantic strike carrier with the command required by mark-family tests. */
const TestStrike = Mark.create({
  name: "strike",

  /**
   * Installs the only strike command exercised by TextStyle's isolated tests.
   *
   * @returns Command map for applying the semantic strike carrier.
   */
  addCommands() {
    return {
      setStrike: () => ({ commands }: CommandProps) =>
        commands.setMark(this.name)
    };
  }
});

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Test-only semantic strike command. */
    readonly testStrike: {
      setStrike: () => ReturnType;
    };
  }
}

/**
 * Creates the smallest document schema needed by TextStyle tests.
 *
 * Bold and italic are deliberately schema-only here: TextStyle owns the
 * effective direct-emphasis commands under test. This keeps a test dependency
 * from pointing back through StarterKit and turning the package graph cyclic.
 *
 * @returns Fresh ordered extensions for one isolated editor.
 */
export function createTextStyleTestExtensions(): readonly QuireAnyExtension[] {
  return [
    Document,
    Paragraph,
    Heading,
    Text,
    TestBold,
    TestItalic,
    TestStrike
  ];
}
