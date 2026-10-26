import { Extension, mergeAttributes, type QuireAnyExtension, type QuireNodeHTMLSerializationTransformMap } from "@quirekit/core";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import type { BlockParagraphFeature } from "./types";
import { paragraphCommands } from "./commands";
import { paragraphCSS, readParagraphValues } from "./projection";
const types = ["paragraph", "heading"];
const BlockParagraph = Extension.create<Record<string, never>, BlockParagraphFeature>({
  name: "blockParagraph",
  /** @returns Schema-neutral selection facts. */
  addStorage() { return { read: readParagraphValues }; },
  /** @returns Typed delegates to canonical formatting commands. */
  addCommands() { return paragraphCommands(); },
  /** @returns Direct CSS applied by the shared schema serializer and HTML view. */
  addNodeHTMLSerializationTransforms() {
    const transform: QuireNodeHTMLSerializationTransformMap[string] = (node, output) => {
      if (!Array.isArray(output)) return output;
      const css = paragraphCSS(node);
      if (!css) return output;
      const attrs = output[1] && typeof output[1] === "object" && !Array.isArray(output[1]) ? output[1] : {};
      return [output[0], mergeAttributes(attrs, { style: css }), ...output.slice(attrs === output[1] ? 2 : 1)] as import("@quirekit/pm").DOMOutputSpec;
    };
    return Object.fromEntries(types.map(type => [type, transform]));
  }
});
/** @returns Canonical paragraph formatting adapted to continuous HTML, without Word page schemas. */
export function createBlockParagraphExtensions(): readonly QuireAnyExtension[] {
  return [WordParagraph.extend({
    /** @returns Continuous documents do not install page/column break schemas. */
    addExtensions() { return []; },
    /** @returns Existing Block list and table keyboard policies remain authoritative. */
    addKeyboardShortcuts() { return {}; }
  }).configure({ types }), BlockParagraph.configure({})];
}
