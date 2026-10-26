import { defineCommand, Node } from "@quirekit/core";
import { createDocumentAiCapabilities } from "./ai/facts";
import {
  createSetDocumentFontFamilyCommand,
  createSetDocumentFontThemeCommand,
  createSetDocumentScriptFontFamilyCommand
} from "./commands";
import type { DocumentCommandMethods } from "./commands";

/** Agent-facing schema of one role's script families. */
const fontRoleParams = {
  type: "object",
  properties: {
    eastAsia: { type: "string", minLength: 1, description: "Font for Chinese text, such as \"宋体\"." },
    latin: { type: "string", minLength: 1, description: "Font for Western letters and digits, such as \"Times New Roman\"." }
  },
  minProperties: 1,
  additionalProperties: false
};

/** Top-level document node extension. */
export const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+",

  addAttributes() {
    return {
      fontTheme: {
        default: null,
        rendered: false
      },
      fontTable: {
        default: null,
        rendered: false
      }
    };
  },

  addCommands() {
    return {
      setDocumentFontFamily: createSetDocumentFontFamilyCommand(),
      setDocumentLatinFontFamily:
        createSetDocumentScriptFontFamilyCommand("latin"),
      setDocumentEastAsiaFontFamily:
        createSetDocumentScriptFontFamilyCommand("eastAsia"),
      setDocumentFontTheme: defineCommand({
        description: "Sets the document fonts for body text and headings, separately for Chinese (eastAsia) and Western (latin) text, as shown on the 文档字体 setting line.",
        params: { type: "object", properties: { body: fontRoleParams, heading: fontRoleParams }, minProperties: 1, additionalProperties: false },
        run: createSetDocumentFontThemeCommand()
      })
    };
  },

  addAiCapabilities() {
    return createDocumentAiCapabilities();
  }
});

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the top-level document extension. */
    readonly document: DocumentCommandMethods<ReturnType>;
  }
}
