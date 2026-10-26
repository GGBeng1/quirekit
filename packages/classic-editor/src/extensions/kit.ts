import { Extension, type QuireAnyExtension } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { BlockInteraction } from "@quirekit/extensions";
import { ClassicEditorClipboard } from "./clipboard";
import { ClassicEditorFormatting } from "./formatting";
import { ClassicEditorFormattingTools } from "./formatting-tools";
import { ClassicEditorHistoryControls, ClassicEditorUndoRedo } from "./history";
import { ClassicEditorHorizontalRule } from "./horizontal-rule";
import { ClassicEditorSearch } from "./search";
import { ClassicEditorTextCase } from "./text-case";
import type { ClassicEditorKitOptions } from "./types";

/** Product-aware generic capability assembly for Classic Editor presets. */
export const ClassicEditorKit = Extension.create<ClassicEditorKitOptions>({
  name: "classicEditorKit",

  /**
   * Creates default options compatible with StarterKit.
   *
   * @returns Empty overrides; StarterKit defaults remain authoritative.
   */
  addOptions() {
    return {};
  },

  /**
   * Composes product-neutral StarterKit children with Classic-aware replacements.
   *
   * @returns Ordered generic capability and product-adapter extensions.
   */
  addExtensions() {
    const extensions: QuireAnyExtension[] = [StarterKit.configure({
      ...this.options,
      bold: false,
      horizontalRule: false,
      italic: false,
      strike: false,
      underline: false,
      undoRedo: false
    })];

    if (
      this.options.bold !== false
      || this.options.doubleStrike !== false
      || this.options.highlight !== false
      || this.options.italic !== false
      || this.options.strike !== false
      || this.options.underline !== false
      || this.options.superscript !== false
      || this.options.subscript !== false
      || this.options.textStyle !== false
    ) {
      extensions.push(ClassicEditorFormatting.configure({
        bold: this.options.bold ?? {},
        doubleStrike: this.options.doubleStrike ?? {},
        italic: this.options.italic ?? {},
        highlight: this.options.highlight ?? {},
        strike: this.options.strike ?? {},
        underline: this.options.underline ?? {},
        superscript: this.options.superscript ?? {},
        subscript: this.options.subscript ?? {},
        textStyle: this.options.textStyle ?? {},
        fontFamily: this.options.textStyle === false
          ? false
          : (this.options.fontFamily ?? {}),
        fontSize: this.options.textStyle === false
          ? false
          : (this.options.fontSize ?? {}),
        letterSpacing: this.options.textStyle === false
          ? false
          : (this.options.letterSpacing ?? {}),
        language: this.options.textStyle === false
          ? false
          : (this.options.language ?? {}),
        color: this.options.textStyle === false
          ? false
          : (this.options.color ?? {}),
        backgroundColor: this.options.textStyle === false
          ? false
          : (this.options.backgroundColor ?? {})
      }));
    }
    if (this.options.formatting !== false) {
      extensions.push(ClassicEditorFormattingTools.configure(
        this.options.formatting ?? {}
      ));
    }
    if (this.options.horizontalRule !== false) {
      extensions.push(ClassicEditorHorizontalRule.configure(
        this.options.horizontalRule ?? {}
      ));
    }
    if (this.options.search !== false) {
      extensions.push(ClassicEditorSearch.configure(this.options.search ?? {}));
    }
    if (this.options.historyExtension) {
      extensions.push(this.options.historyExtension, ClassicEditorHistoryControls);
    } else if (this.options.undoRedo !== false) {
      extensions.push(ClassicEditorUndoRedo.configure(this.options.undoRedo ?? {}));
    }
    if (this.options.textCase !== false) {
      extensions.push(ClassicEditorTextCase.configure(this.options.textCase ?? {}));
    }
    if (this.options.clipboard !== false) {
      extensions.push(ClassicEditorClipboard.configure(this.options.clipboard ?? {}));
    }
    if (this.options.blockInteraction !== false) extensions.push(BlockInteraction.configure(this.options.blockInteraction ?? {}));
    return extensions;
  }
});
