import {
  Extension,
  type AnyCommands,
  type QuireAnyExtension
} from "@quirekit/core";
import {
  DoubleStrike,
  Language,
  LetterSpacing
} from "@quirekit/extension-text-style";
import { getBuiltinClassicEditorText } from "../../localization";
import type { ClassicEditorRibbonGroupContribution } from "../../types";
import type { ClassicEditorFormattingOptions } from "../types";
import { ClassicEditorBold } from "./bold";
import { ClassicEditorItalic } from "./italic";
import { ClassicEditorSubscript, ClassicEditorSuperscript } from "./script-position";
import { ClassicEditorStrike } from "./strike";
import { ClassicEditorUnderline } from "./underline";
import {
  ClassicEditorBackgroundColor,
  ClassicEditorColor,
  ClassicEditorFontFamily,
  ClassicEditorFontSize,
  ClassicEditorHighlight,
  ClassicEditorTextStyle
} from "../typography";

const ClassicEditorTextStyleBold = ClassicEditorBold.extend({
  /**
   * Leaves the inheritance-aware TextStyle command as the only toggle owner.
   *
   * @returns Parent Bold commands without its duplicate toggle factory.
   */
  addCommands() {
    return omitParentCommand(this.parent, "toggleBold");
  }
});
const ClassicEditorTextStyleItalic = ClassicEditorItalic.extend({
  /**
   * Leaves the inheritance-aware TextStyle command as the only toggle owner.
   *
   * @returns Parent Italic commands without its duplicate toggle factory.
   */
  addCommands() {
    return omitParentCommand(this.parent, "toggleItalic");
  }
});

/** Classic formatting assembly that owns the shared group and product-aware typography. */
export const ClassicEditorFormatting = Extension.create<ClassicEditorFormattingOptions>({
  name: "classicEditorFormatting",

  /**
   * Creates enabled-by-default formatting options.
   *
   * @returns Default options for Classic Marks and direct font family.
   */
  addOptions() {
    return {
      bold: {},
      doubleStrike: {},
      italic: {},
      highlight: {},
      underline: {},
      strike: {},
      superscript: {},
      subscript: {},
      textStyle: {},
      fontFamily: {},
      fontSize: {},
      letterSpacing: {},
      language: {},
      color: {},
      backgroundColor: {},
    };
  },

  /**
   * Creates the enabled Classic formatting and typography variants.
   *
   * @returns Ordered formatting Marks and direct-family behavior.
   */
  addExtensions() {
    const extensions: QuireAnyExtension[] = [];
    if (this.options.bold !== false) {
      const bold = this.options.textStyle === false
        ? ClassicEditorBold
        : ClassicEditorTextStyleBold;
      extensions.push(bold.configure(this.options.bold ?? {}));
    }
    if (this.options.doubleStrike !== false) {
      extensions.push(DoubleStrike.configure(this.options.doubleStrike ?? {}));
    }
    if (this.options.italic !== false) {
      const italic = this.options.textStyle === false
        ? ClassicEditorItalic
        : ClassicEditorTextStyleItalic;
      extensions.push(italic.configure(this.options.italic ?? {}));
    }
    if (this.options.highlight !== false) {
      extensions.push(ClassicEditorHighlight.configure(this.options.highlight ?? {}));
    }
    if (this.options.underline !== false) {
      extensions.push(ClassicEditorUnderline.configure(this.options.underline ?? {}));
    }
    if (this.options.strike !== false) {
      extensions.push(ClassicEditorStrike.configure(this.options.strike ?? {}));
    }
    if (this.options.superscript !== false) {
      extensions.push(ClassicEditorSuperscript.configure(this.options.superscript ?? {}));
    }
    if (this.options.subscript !== false) {
      extensions.push(ClassicEditorSubscript.configure(this.options.subscript ?? {}));
    }
    if (this.options.textStyle !== false) {
      extensions.push(ClassicEditorTextStyle.configure(this.options.textStyle ?? {}));
      if (this.options.fontFamily !== false) {
        extensions.push(ClassicEditorFontFamily.configure(this.options.fontFamily ?? {}));
      }
      if (this.options.fontSize !== false) {
        extensions.push(ClassicEditorFontSize.configure(this.options.fontSize ?? {}));
      }
      if (this.options.letterSpacing !== false) {
        extensions.push(LetterSpacing.configure(this.options.letterSpacing ?? {}));
      }
      if (this.options.language !== false) {
        extensions.push(Language.configure(this.options.language ?? {}));
      }
      if (this.options.color !== false) {
        extensions.push(ClassicEditorColor.configure(this.options.color ?? {}));
      }
      if (this.options.backgroundColor !== false) {
        extensions.push(ClassicEditorBackgroundColor.configure(
          this.options.backgroundColor ?? {}
        ));
      }
    }
    return extensions;
  },

  /**
   * Creates the shared formatting group when at least one Mark is enabled.
   *
   * @returns Formatting ribbon group or an empty list.
   */
  addRibbonGroups() {
    if (
      this.options.bold === false
      && this.options.doubleStrike === false
      && this.options.italic === false
      && this.options.highlight === false
      && this.options.underline === false
      && this.options.strike === false
      && this.options.superscript === false
      && this.options.subscript === false
      && (
        this.options.textStyle === false
        || (
          this.options.fontFamily === false
          && this.options.fontSize === false
          && this.options.letterSpacing === false
          && this.options.color === false
          && this.options.backgroundColor === false
        )
      )
    ) {
      return [];
    }
    return [{
      kind: "ribbon-group",
      id: "home-format",
      tabId: "home",
      label: getBuiltinClassicEditorText("text"),
      order: 120
    }] satisfies readonly ClassicEditorRibbonGroupContribution[];
  }
});

/**
 * Removes one duplicate command from an extended semantic mark.
 *
 * Tiptap command aggregation overwrites duplicate keys instead of composing
 * fallbacks, so an assembly that installs TextStyle must expose one owner for
 * each standard toggle name.
 *
 * @param parent - Bound parent `addCommands` factory supplied by extension resolution.
 * @param name - Duplicate command name omitted from the returned map.
 * @returns Remaining parent commands in their original declaration order.
 */
function omitParentCommand(parent: unknown, name: string): AnyCommands {
  const commands = typeof parent === "function"
    ? (parent as () => AnyCommands)()
    : {};
  const { [name]: _omitted, ...remaining } = commands;
  return remaining;
}
