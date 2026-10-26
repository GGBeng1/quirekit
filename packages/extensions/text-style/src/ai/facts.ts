import { readTextScale } from "../text-scale/value";
import type { QuireAiCapability } from "@quirekit/ai-contract";
import type { TextStyleAttributeExtensionConfig } from "../attribute-extension";

/**
 * Declares direct bold or italic stored as a textStyle override.
 * @param field - Direct emphasis field.
 * @returns Character format capability.
 */
function directEmphasis(field: "bold" | "italic"): QuireAiCapability {
  return {
    kind: "format", name: field, level: "character",
    description: field === "bold" ? "Bold text." : "Italic text.",
    present: { label: field === "bold" ? "加粗" : "倾斜" },
    read: target => target.level === "character"
      && target.marks.find(mark => mark.type.name === "textStyle")?.attrs[field] === true ? true : undefined,
    schema: { type: "boolean" },
    // Direct state overrides style inheritance, so false keeps a bold heading run plain.
    applyPriority: 10,
    apply: ({ commands }, value) => {
      const state = value === true ? true : value === false ? false : null;
      return field === "bold" ? commands.setDirectBoldState(state) : commands.setDirectItalicState(state);
    }
  };
}

/**
 * Declares a case style stored as a textStyle flag; all caps and small caps exclude each other.
 * @param field - Case style field.
 * @returns Character format capability.
 */
function caseStyle(field: "allCaps" | "smallCaps"): QuireAiCapability {
  return {
    kind: "format", name: field, level: "character",
    description: field === "allCaps" ? "All capitals." : "Small capitals.",
    present: { label: field === "allCaps" ? "全部大写" : "小型大写" },
    read: target => target.level === "character"
      && target.marks.find(mark => mark.type.name === "textStyle")?.attrs[field] === true ? true : undefined,
    schema: { type: "boolean" },
    apply: ({ commands }, value) => field === "allCaps"
      ? (value === true ? commands.setAllCaps() : commands.unsetAllCaps())
      : (value === true ? commands.setSmallCaps() : commands.unsetSmallCaps())
  };
}

/** East Asian emphasis marks a run can carry. */
const emphasisMarks = ["dot", "comma", "circle", "underDot"] as const;

/** East Asian emphasis mark stored on textStyle. */
const emphasisMark: QuireAiCapability = {
  kind: "format", name: "emphasisMark", level: "character",
  description: "East Asian emphasis mark: \"dot\", \"comma\", \"circle\" or \"underDot\".",
  present: { label: "着重号" },
  read: target => {
    if (target.level !== "character") return undefined;
    const value = target.marks.find(mark => mark.type.name === "textStyle")?.attrs.emphasisMark;
    return (emphasisMarks as readonly unknown[]).includes(value) ? value : undefined;
  },
  schema: { enum: [...emphasisMarks] },
  apply: ({ commands }, value) => value === null ? commands.unsetEmphasisMark() : commands.setEmphasisMark(value as typeof emphasisMarks[number])
};

/** Direct bold, italic, case styles and emphasis marks stored on textStyle. */
export const textStyleAiCapabilities: readonly QuireAiCapability[] = [
  directEmphasis("bold"), directEmphasis("italic"), caseStyle("allCaps"), caseStyle("smallCaps"), emphasisMark,
  { kind: "format", name: "textScale", level: "character",
    description: "Glyph width as an integer percentage from 1 to 600; 100 is normal width. Does not change font height or character spacing.",
    present: { label: "字符缩放", value: value => `${String(value)}%` },
    schema: { type: "integer", minimum: 1, maximum: 600 },
    read: target => target.level === "character" ? readTextScale(target.marks.find(mark => mark.type.name === "textStyle")?.attrs ?? {}) : undefined,
    apply: ({ commands }, value) => value === null ? commands.unsetTextScale() : commands.setTextScale(value as number)
  }
];

/** Mark-backed character format that is either on or off. */
export interface QuireAiMarkFlagFormat {
  /** Mark type name. */
  readonly mark: string;
  /** Format name the AI sees. */
  readonly name: string;
  /** One-line description. */
  readonly description: string;
  /** Label for people. */
  readonly label: string;
  /**
   * Turns the format on or off over the selected range.
   * @param commands - Command runner of the edit.
   * @param on - Whether to turn it on.
   * @returns Whether the command applied.
   */
  readonly apply: (commands: Parameters<NonNullable<Extract<QuireAiCapability, { kind: "format" }>["apply"]>>[0]["commands"], on: boolean) => boolean;
}

/**
 * Declares a character format backed by the presence of one mark.
 * @param format - Mark, naming and command binding.
 * @returns Character format capability.
 */
export function createMarkFlagAiCapability(format: QuireAiMarkFlagFormat): QuireAiCapability {
  return {
    kind: "format", name: format.name, level: "character", description: format.description,
    present: { label: format.label },
    read: target => target.level === "character" && target.marks.some(mark => mark.type.name === format.mark) ? true : undefined,
    schema: { type: "boolean" },
    apply: ({ commands }, value) => format.apply(commands, value === true)
  };
}

/**
 * Declares the character format of one textStyle attribute extension.
 * @param config - Attribute extension configuration with optional AI naming.
 * @returns Format capability, or none when the attribute stays out of the AI view.
 */
export function createTextStyleAttributeAiCapabilities(config: TextStyleAttributeExtensionConfig): readonly QuireAiCapability[] {
  const ai = config.ai;
  if (ai === undefined) return [];
  return [{
    kind: "format", name: ai.name, level: "character", description: ai.description,
    ...(ai.present === undefined ? {} : { present: ai.present }),
    read: target => target.level === "character"
      ? target.marks.find(mark => mark.type.name === "textStyle")?.attrs[config.attributeName] ?? undefined
      : undefined,
    schema: ai.schema,
    apply: ({ commands }, value) => {
      const run = commands as unknown as Readonly<Record<string, (value?: unknown) => boolean>>;
      return value === null ? run[config.unsetCommandName]!() : run[config.setCommandName]!(value);
    }
  }];
}
