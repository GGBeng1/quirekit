import type { QuireEditorContent } from "@quirekit/core";
import { defineClassicEditorPlugin } from "../../plugin";
import { builtinClassicEditorContributions } from "./contributions";

/** Built-in product plugin shared by the default preset. */
export const classicEditorBuiltinPlugin = defineClassicEditorPlugin({
  id: "classic.builtin",
  audience: "user",
  contributions: builtinClassicEditorContributions,
  services: [
    {
      id: "json",
      label: { "zh-CN": "QuireKit JSON", en: "QuireKit JSON" },
      format: {
        id: "json",
        extensions: [".json"],
        mimeTypes: ["application/json"]
      },
      import: (context, input) => {
        const text = typeof input.data === "string"
          ? input.data
          : new TextDecoder().decode(input.data);
        const content = JSON.parse(text) as QuireEditorContent;
        context.commit(() => context.editor.commands.replaceDocument(content, { errorOnInvalidContent: true }));
      },
      export(context) {
        return {
          data: JSON.stringify(context.editor.getJSON(), null, 2),
          fileName: "document.quirekit.json",
          mimeType: "application/json"
        };
      }
    }
  ]
});
