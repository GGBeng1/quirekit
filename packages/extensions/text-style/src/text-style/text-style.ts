import { createTextScaleCommand } from "../text-scale";
import { resolveTextStyleCanvasStyle } from "./canvas-style";
import { declareQuireLayoutDependency } from "@quirekit/core";
import {
  Mark,
  mergeAttributes,
  setMark,
  toggleMark,
  type CommandProps,
  type CommandSpec,
  type QuireAnyExtension,
} from "@quirekit/core";
import {
  hasTextStyleAttributes,
  isTextStyleEmphasisMark,
  omitTextStyleSchemaAttributes,
  parseTextStyleAttributes,
  renderTextStyleAttributes,
  type TextStyleAttributes,
  type TextStyleEmphasisMark
} from "../style-attributes";
import { textStyleDocxCodec } from "../docx";
import { unsetTextStyleAttributeCommand } from "../attribute-extension";
import {
  applyDirectEmphasisStateToRanges,
  createDirectEmphasisTogglePlan,
  readDirectEmphasisState,
  type DirectEmphasisField,
  type DirectEmphasisState
} from "./direct-emphasis";
import type { HighlightAttributes } from "../highlight";
import type { RunLanguageSlots } from "../language";
import { createApplyTextStyleFieldUpdatesCommand } from "./field-update-command";
import type { TextStyleResolvedFieldUpdate } from "./types";
import { textStyleAiCapabilities } from "../ai/facts";

/** Mark type resolved from a command context schema. */
type TextStyleMarkType = NonNullable<CommandProps["state"]["schema"]["marks"][string]>;

/** Options for the textStyle mark extension. */
export interface TextStyleOptions {
  /** HTML attributes added to serialized span elements. */
  readonly HTMLAttributes: Record<string, unknown>;
  /** Whether nested span styles should be merged before parsing. */
  readonly mergeNestedSpanStyles: boolean;
}

/** Maximum depth used when searching nested span elements. */
const maxFindChildSpanDepth = 20;

/** TextStyle mark extension. */
export const TextStyle = Mark.create<TextStyleOptions>({
  name: "textStyle",

  addAiCapabilities() {
    return textStyleAiCapabilities;
  },
  priority: 101,
  addDocx() {
    return textStyleDocxCodec;
  },
  addOptions() {
    return {
      HTMLAttributes: {},
      mergeNestedSpanStyles: true
    };
  },
  addAttributes() {
    return {
      fontFamily: { default: null },
      fontFamilyLatin: { default: null },
      fontFamilyEastAsia: { default: null },
      fontFamilyComplexScript: { default: null },
      color: { default: null },
      backgroundColor: { default: null },
      fontSize: { default: null },
      fontSizeComplexScript: { default: null },
      letterSpacing: { default: null },
      characterGrid: { default: null },
      textScale: { default: null },
      bold: { default: null },
      italic: { default: null },
      allCaps: { default: null },
      smallCaps: { default: null },
      boldCs: { default: null },
      italicCs: { default: null },
      rightToLeft: { default: null },
      hidden: { default: null },
      outline: { default: null },
      shadow: { default: null },
      emboss: { default: null },
      imprint: { default: null },
      emphasisMark: { default: null },
      languageLatin: { default: null },
      languageEastAsia: { default: null },
      languageComplexScript: { default: null },
      litAstTextStylePreservation: { default: null, rendered: false }
    };
  },
  parseHTML() {
    return [
      {
        tag: "span",
        consuming: false,
        getAttrs: (element) => parseTextStyleSpan(element as HTMLElement, this.options)
      }
    ];
  },
  renderHTML({ mark, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        this.options.HTMLAttributes,
        omitTextStyleSchemaAttributes(HTMLAttributes),
        renderTextStyleAttributes(mark.attrs)
      ),
      0
    ];
  },
  canvasStyle: resolveTextStyleCanvasStyle,
  addCommands() {
    return {
      toggleTextStyle: toggleTextStyleCommand(this.name),
      removeEmptyTextStyle: removeEmptyTextStyleCommand(this.name),
      setTextScale: createTextScaleCommand(),
      unsetTextScale: createTextScaleCommand(true),
      setAllCaps: setCaseStyleCommand("allCaps", "smallCaps"),
      unsetAllCaps: unsetTextStyleAttributeCommand("allCaps"),
      setSmallCaps: setCaseStyleCommand("smallCaps", "allCaps"),
      unsetSmallCaps: unsetTextStyleAttributeCommand("smallCaps"),
      toggleBold: toggleEffectiveDirectEmphasisStateCommand("bold"),
      toggleItalic: toggleEffectiveDirectEmphasisStateCommand("italic"),
      setDirectBoldState: setDirectEmphasisStateCommand("bold"),
      setDirectItalicState: setDirectEmphasisStateCommand("italic"),
      setComplexScriptBold: setBooleanTextStyleCommand("boldCs"),
      unsetComplexScriptBold: unsetTextStyleAttributeCommand("boldCs"),
      setComplexScriptItalic: setBooleanTextStyleCommand("italicCs"),
      unsetComplexScriptItalic: unsetTextStyleAttributeCommand("italicCs"),
      setRunRightToLeft: setBooleanTextStyleCommand("rightToLeft"),
      unsetRunRightToLeft: unsetTextStyleAttributeCommand("rightToLeft"),
      setHiddenText: setBooleanTextStyleCommand("hidden"),
      unsetHiddenText: unsetTextStyleAttributeCommand("hidden"),
      setTextOutline: setBooleanTextStyleCommand("outline"),
      unsetTextOutline: unsetTextStyleAttributeCommand("outline"),
      setTextShadow: setBooleanTextStyleCommand("shadow"),
      unsetTextShadow: unsetTextStyleAttributeCommand("shadow"),
      setTextEmboss: setExclusiveEffectCommand("emboss", "imprint"),
      unsetTextEmboss: unsetTextStyleAttributeCommand("emboss"),
      setTextImprint: setExclusiveEffectCommand("imprint", "emboss"),
      unsetTextImprint: unsetTextStyleAttributeCommand("imprint"),
      setEmphasisMark: setEmphasisMarkCommand(),
      unsetEmphasisMark: unsetTextStyleAttributeCommand("emphasisMark"),
      applyTextStyleFieldUpdates: createApplyTextStyleFieldUpdatesCommand()
    };
  }
});

/** Public command methods installed by the text-style extension family. */
type TextStyleCommandMethods<ReturnType> = {
  setColor: (color: string) => ReturnType;
  unsetColor: () => ReturnType;
  setBackgroundColor: (color: string) => ReturnType;
  unsetBackgroundColor: () => ReturnType;
  setFontFamily: (fontFamily: string) => ReturnType;
  unsetFontFamily: () => ReturnType;
  setLatinFontFamily: (fontFamily: string) => ReturnType;
  unsetLatinFontFamily: () => ReturnType;
  setEastAsiaFontFamily: (fontFamily: string) => ReturnType;
  unsetEastAsiaFontFamily: () => ReturnType;
  setComplexScriptFontFamily: (fontFamily: string) => ReturnType;
  unsetComplexScriptFontFamily: () => ReturnType;
  setFontSize: (fontSize: string | number) => ReturnType;
  unsetFontSize: () => ReturnType;
  setComplexScriptFontSize: (fontSize: string | number) => ReturnType;
  unsetComplexScriptFontSize: () => ReturnType;
  increaseFontSize: () => ReturnType;
  decreaseFontSize: () => ReturnType;
  /**
   * Applies width scaling without changing font size or character spacing.
   * @param percentage - Integer from 1 to 600; 100 overrides inherited scaling.
   * @returns Command result.
   */
  setTextScale: (percentage: number) => ReturnType;
  /**
   * Restores the inherited character width.
   * @returns Command result.
   */
  unsetTextScale: () => ReturnType;
  setLetterSpacing: (letterSpacing: string | number) => ReturnType;
  unsetLetterSpacing: () => ReturnType;
  setLanguage: (language: string) => ReturnType;
  setLanguageSlots: (languages: RunLanguageSlots) => ReturnType;
  unsetLanguage: () => ReturnType;
  setLatinLanguage: (language: string) => ReturnType;
  unsetLatinLanguage: () => ReturnType;
  setEastAsiaLanguage: (language: string) => ReturnType;
  unsetEastAsiaLanguage: () => ReturnType;
  setComplexScriptLanguage: (language: string) => ReturnType;
  unsetComplexScriptLanguage: () => ReturnType;
  setHighlight: (attributes?: HighlightAttributes) => ReturnType;
  toggleHighlight: (attributes?: HighlightAttributes) => ReturnType;
  unsetHighlight: () => ReturnType;
  startHighlighterPen: (color: string | null) => ReturnType;
  stopHighlighterPen: () => ReturnType;
  applyHighlighterPen: () => ReturnType;
  setSuperscript: () => ReturnType;
  toggleSuperscript: () => ReturnType;
  unsetSuperscript: () => ReturnType;
  setSubscript: () => ReturnType;
  toggleSubscript: () => ReturnType;
  unsetSubscript: () => ReturnType;
  setDoubleStrike: () => ReturnType;
  toggleDoubleStrike: () => ReturnType;
  unsetDoubleStrike: () => ReturnType;
  toggleTextStyle: () => ReturnType;
  removeEmptyTextStyle: () => ReturnType;
  setAllCaps: () => ReturnType;
  unsetAllCaps: () => ReturnType;
  setSmallCaps: () => ReturnType;
  unsetSmallCaps: () => ReturnType;
  toggleBold: () => ReturnType;
  toggleItalic: () => ReturnType;
  setDirectBoldState: (value: DirectEmphasisState) => ReturnType;
  setDirectItalicState: (value: DirectEmphasisState) => ReturnType;
  setComplexScriptBold: (value: boolean) => ReturnType;
  unsetComplexScriptBold: () => ReturnType;
  setComplexScriptItalic: (value: boolean) => ReturnType;
  unsetComplexScriptItalic: () => ReturnType;
  setRunRightToLeft: (value: boolean) => ReturnType;
  unsetRunRightToLeft: () => ReturnType;
  setHiddenText: (value: boolean) => ReturnType;
  unsetHiddenText: () => ReturnType;
  setTextOutline: (value: boolean) => ReturnType;
  unsetTextOutline: () => ReturnType;
  setTextShadow: (value: boolean) => ReturnType;
  unsetTextShadow: () => ReturnType;
  setTextEmboss: (value: boolean) => ReturnType;
  unsetTextEmboss: () => ReturnType;
  setTextImprint: (value: boolean) => ReturnType;
  unsetTextImprint: () => ReturnType;
  setEmphasisMark: (value: TextStyleEmphasisMark) => ReturnType;
  unsetEmphasisMark: () => ReturnType;
  setLineHeight: (lineHeight: string | number) => ReturnType;
  unsetLineHeight: () => ReturnType;
  applyTextStyleFieldUpdates: (
    updates: readonly TextStyleResolvedFieldUpdate[]
  ) => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the text-style extension family. */
    readonly textStyle: TextStyleCommandMethods<ReturnType>;
  }
}

/**
 * Creates the default textStyle mark extension.
 *
 * @param options - Optional textStyle extension options.
 * @returns Extension that contributes the textStyle mark.
 */
export function textStyleExtension(options: Partial<TextStyleOptions> = {}): QuireAnyExtension {
  return TextStyle.configure(options);
}

/**
 * Creates an atomic Word case-style command.
 *
 * Word declares all capitals and small capitals as mutually exclusive direct
 * run properties. The command therefore enables one field and clears the
 * sibling in the same root transaction so tracking records one reversible
 * semantic formatting action.
 *
 * @param disabledName - Mutually exclusive sibling field to clear.
 * @returns Command handler that applies one canonical case style.
 */
function setCaseStyleCommand(
  enabledName: "allCaps" | "smallCaps",
  disabledName: "allCaps" | "smallCaps"
): CommandSpec {
  return () => (context) => setMark("textStyle", {
    [enabledName]: true,
    [disabledName]: null
  })(context);
}

/**
 * Creates an atomic nullable direct bold/italic state command.
 *
 * @param field - Ordinary emphasis field controlled by the command.
 * @returns Command accepting null, true, or false.
 */
function setDirectEmphasisStateCommand(field: DirectEmphasisField): CommandSpec {
  return (value) => (context) => {
    if (!isDirectEmphasisState(value)) return false;
    const semanticMarkType = context.state.schema.marks[field];
    const textStyleMarkType = context.state.schema.marks.textStyle;
    if (semanticMarkType === undefined || textStyleMarkType === undefined) return false;

    if (context.tr.selection.empty) {
      const marks = context.tr.storedMarks
        ?? context.state.storedMarks
        ?? context.tr.selection.$from.marks();
      if (readDirectEmphasisState(marks, field) === undefined) return false;
      const textStyle = marks.find((mark) => mark.type === textStyleMarkType);
      const attributes = { ...(textStyle?.attrs ?? {}), [field]: null };
      context.tr.removeStoredMark(semanticMarkType);
      context.tr.removeStoredMark(textStyleMarkType);
      if (value === true) {
        context.tr.addStoredMark(semanticMarkType.create());
      } else if (value === false) {
        attributes[field] = false;
      }
      if (hasTextStyleAttributes(attributes)) {
        context.tr.addStoredMark(textStyleMarkType.create(attributes));
      }
    } else if (!applyDirectEmphasisStateToRanges(
      context.tr,
      context.tr.selection.ranges.map((range) => ({
        from: range.$from.pos,
        to: range.$to.pos
      })),
      field,
      value,
      semanticMarkType,
      textStyleMarkType
    )) {
      return false;
    }
    context.dispatch?.(context.tr.scrollIntoView());
    return true;
  };
}

/**
 * Creates the high-priority effective bold/italic toggle used whenever
 * TextStyle and the semantic mark are installed together.
 *
 * The command deliberately owns the standard toggle name. Product assemblies
 * that install the semantic Bold/Italic commands alongside TextStyle must omit
 * those two duplicate toggle factories so toolbar, keyboard, API, and revision
 * tracking all execute this inheritance-aware atomic transaction. If either
 * schema mark is absent this command returns false.
 *
 * @param field - Ordinary emphasis field controlled by the command.
 * @returns Inheritance-aware effective toggle command.
 */
function toggleEffectiveDirectEmphasisStateCommand(
  field: DirectEmphasisField
): CommandSpec {
  return () => (context) => {
    const semanticMarkType = context.state.schema.marks[field];
    const textStyleMarkType = context.state.schema.marks.textStyle;
    if (semanticMarkType === undefined || textStyleMarkType === undefined) return false;
    const plan = createDirectEmphasisTogglePlan({
      ...context.editor.state,
      pm: context.state,
      doc: context.state.doc
    }, field);
    if (plan === undefined) return false;

    if (context.tr.selection.empty) {
      if (plan.pointValue === undefined) return false;
      if (!applyStoredDirectEmphasisState(
        context,
        field,
        plan.pointValue,
        semanticMarkType,
        textStyleMarkType
      )) {
        return false;
      }
    } else {
      for (const value of [null, true, false] as const) {
        const ranges = plan.ranges.filter((range) => range.value === value);
        if (ranges.length > 0 && !applyDirectEmphasisStateToRanges(
          context.tr,
          ranges,
          field,
          value,
          semanticMarkType,
          textStyleMarkType
        )) {
          return false;
        }
      }
    }

    context.dispatch?.(context.tr.scrollIntoView());
    return true;
  };
}

/**
 * Applies one direct emphasis value to stored marks at a collapsed selection.
 *
 * @param context - Active root command context.
 * @param field - Ordinary emphasis field being updated.
 * @param value - Canonical direct state to store.
 * @param semanticMarkType - Bold or italic semantic mark type.
 * @param textStyleMarkType - Text-style mark carrying explicit false.
 * @returns Whether current marks were canonical and the update was applied.
 */
function applyStoredDirectEmphasisState(
  context: CommandProps,
  field: DirectEmphasisField,
  value: DirectEmphasisState,
  semanticMarkType: TextStyleMarkType,
  textStyleMarkType: TextStyleMarkType
): boolean {
  const marks = context.tr.storedMarks
    ?? context.state.storedMarks
    ?? context.tr.selection.$from.marks();
  if (readDirectEmphasisState(marks, field) === undefined) return false;
  const textStyle = marks.find((mark) => mark.type === textStyleMarkType);
  const attributes = { ...(textStyle?.attrs ?? {}), [field]: null };
  context.tr.removeStoredMark(semanticMarkType);
  context.tr.removeStoredMark(textStyleMarkType);
  if (value === true) {
    context.tr.addStoredMark(semanticMarkType.create());
  } else if (value === false) {
    attributes[field] = false;
  }
  if (hasTextStyleAttributes(attributes)) {
    context.tr.addStoredMark(textStyleMarkType.create(attributes));
  }
  return true;
}

/**
 * Checks an unknown command argument against the direct-emphasis value space.
 *
 * @param value - Candidate command argument.
 * @returns Whether the value is null, true, or false.
 */
function isDirectEmphasisState(value: unknown): value is DirectEmphasisState {
  return value === null || typeof value === "boolean";
}

/**
 * Creates a command for an exact Word complex-script boolean property.
 *
 * @param name - Canonical textStyle field.
 * @returns Command accepting explicit true or false.
 */
function setBooleanTextStyleCommand(
  name: BooleanTextStyleField
): CommandSpec {
  return (value) => (context) => typeof value === "boolean"
    && setMark("textStyle", { [name]: value })(context);
}

/** Canonical textStyle fields with exact boolean direct state. */
type BooleanTextStyleField =
  | "boldCs"
  | "italicCs"
  | "rightToLeft"
  | "hidden"
  | "outline"
  | "shadow"
  | "emboss"
  | "imprint";

/**
 * Creates an authoring command for mutually exclusive emboss/imprint presets.
 *
 * Explicit false remains a first-class direct value. Only enabling one effect
 * clears the sibling; imported producer combinations are never normalized by
 * schema parsing or DOCX conversion.
 *
 * @param enabledName - Effect controlled by the command.
 * @param disabledName - Sibling effect cleared when enabling.
 * @returns Command accepting an exact boolean state.
 */
function setExclusiveEffectCommand(
  enabledName: "emboss" | "imprint",
  disabledName: "emboss" | "imprint"
): CommandSpec {
  return (value) => (context) => {
    if (typeof value !== "boolean") return false;
    return setMark("textStyle", {
      [enabledName]: value,
      ...(value ? { [disabledName]: null } : {})
    })(context);
  };
}

/**
 * Creates a command for the closed Word emphasis-mark value space.
 *
 * `none` is an explicit direct reset and therefore remains distinct from the
 * unset command, which removes the direct property altogether.
 *
 * @returns Command accepting one exact emphasis-mark token.
 */
function setEmphasisMarkCommand(): CommandSpec {
  return (value) => (context) => isTextStyleEmphasisMark(value)
    && setMark("textStyle", { emphasisMark: value })(context);
}

/**
 * Parses one span into textStyle attrs.
 *
 * @param element - Matched span element.
 * @param options - Resolved textStyle options.
 * @returns Parsed attrs, or false when the span carries no style.
 */
function parseTextStyleSpan(
  element: HTMLElement,
  options: Readonly<TextStyleOptions>
): TextStyleAttributes | false {
  if (
    !element.hasAttribute("style")
    && !element.hasAttribute("data-qk-text-scale")
    && !element.hasAttribute("data-qk-character-grid")
    && !element.hasAttribute("data-qk-font-family-latin")
    && !element.hasAttribute("data-qk-font-family-east-asia")
    && !element.hasAttribute("data-qk-font-family-complex-script")
    && !element.hasAttribute("data-qk-font-size-complex-script")
    && !element.hasAttribute("data-qk-bold-complex-script")
    && !element.hasAttribute("data-qk-italic-complex-script")
    && !element.hasAttribute("data-qk-direct-bold")
    && !element.hasAttribute("data-qk-direct-italic")
    && !element.hasAttribute("data-qk-run-right-to-left")
    && !element.hasAttribute("data-qk-hidden-text")
    && !element.hasAttribute("data-qk-text-outline")
    && !element.hasAttribute("data-qk-text-shadow")
    && !element.hasAttribute("data-qk-text-emboss")
    && !element.hasAttribute("data-qk-text-imprint")
    && !element.hasAttribute("data-qk-emphasis-mark")
    && !element.hasAttribute("data-qk-language-latin")
    && !element.hasAttribute("data-qk-language-east-asia")
    && !element.hasAttribute("data-qk-language-complex-script")
    && !element.hasAttribute("lang")
    && element.getAttribute("dir")?.trim().toLowerCase() !== "rtl"
  ) {
    return false;
  }

  if (options.mergeNestedSpanStyles) {
    mergeNestedSpanStyles(element);
  }

  const attributes = parseTextStyleAttributes(element);

  return hasTextStyleAttributes(attributes) ? attributes : false;
}

/**
 * Creates a command that toggles the textStyle mark.
 *
 * @param markName - Schema mark name to toggle.
 * @returns Command handler.
 */
function toggleTextStyleCommand(markName: string): CommandSpec {
  return (attributes = {}) => (context) =>
    toggleMark(markName, attributes as Record<string, unknown>)(context);
}

/**
 * Creates a command that removes empty textStyle marks.
 *
 * @param markName - Schema mark name to clean up.
 * @returns Command handler.
 */
function removeEmptyTextStyleCommand(markName: string): CommandSpec {
  return () => (context) => {
    const markType = context.state.schema.marks[markName];

    if (!markType) {
      return false;
    }

    removeEmptyStoredTextStyleMark(context, markType);
    removeEmptyTextStyleMarksInSelection(context, markType);
    context.dispatch?.(context.tr.scrollIntoView());

    return true;
  };
}

/**
 * Removes an empty stored textStyle mark from a collapsed selection.
 *
 * @param context - Command execution context.
 * @param markType - textStyle mark type.
 */
function removeEmptyStoredTextStyleMark(
  context: CommandProps,
  markType: TextStyleMarkType
): void {
  const storedMarks = context.tr.storedMarks ?? context.state.storedMarks;
  const textStyleMark = storedMarks?.find((mark) => mark.type === markType);

  if (textStyleMark && !hasTextStyleAttributes(textStyleMark.attrs)) {
    context.tr.removeStoredMark(markType);
  }
}

/**
 * Removes empty textStyle marks from inline nodes in the current selection.
 *
 * @param context - Command execution context.
 * @param markType - textStyle mark type.
 */
function removeEmptyTextStyleMarksInSelection(
  context: CommandProps,
  markType: TextStyleMarkType
): void {
  const { selection } = context.tr;

  context.tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (node.isTextblock) {
      return true;
    }

    const mark = node.marks.find((candidate) => candidate.type === markType);

    if (mark && !hasTextStyleAttributes(mark.attrs)) {
      context.tr.removeMark(pos, pos + node.nodeSize, markType);
    }

    return true;
  });
}

/**
 * Finds direct and nested child spans without descending through found spans.
 *
 * @param element - Parent element to inspect.
 * @param depth - Current recursion depth.
 * @returns Child span elements.
 */
function findChildSpans(element: HTMLElement, depth = 0): HTMLElement[] {
  const childSpans: HTMLElement[] = [];

  if (!element.children.length || depth > maxFindChildSpanDepth) {
    return childSpans;
  }

  for (const child of Array.from(element.children)) {
    if (child.tagName === "SPAN") {
      childSpans.push(child as HTMLElement);
    } else if (child.children.length) {
      childSpans.push(...findChildSpans(child as HTMLElement, depth + 1));
    }
  }

  return childSpans;
}

/**
 * Merges parent span styles into nested child spans for paste compatibility.
 *
 * @param element - Span element whose nested children should be normalized.
 */
function mergeNestedSpanStyles(element: HTMLElement): void {
  for (const childSpan of findChildSpans(element)) {
    const childStyle = childSpan.getAttribute("style") ?? "";
    const parentStyle = childSpan.parentElement?.closest("span")?.getAttribute("style") ?? "";

    childSpan.setAttribute("style", `${parentStyle};${childStyle}`);
  }
}

// The declaration belongs to this implementation; overriding the field requires
// its own proof. Engine still validates document, geometry and font inputs.
declareQuireLayoutDependency(TextStyle.config.canvasStyle!, {
  kind: "document"
});
