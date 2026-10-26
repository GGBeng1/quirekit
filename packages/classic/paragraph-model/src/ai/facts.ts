import type { QuireAiCapability, QuireAiFormatApplyContext, QuireAiFormatPresentation, QuireAiJsonSchema } from "@quirekit/ai-contract";
import { resolveWordHeadingStyleLevel, resolveWordParagraphFormatting } from "../model";
import type { WordParagraphFormatting } from "../types";
import { wordParagraphDirectionAiCapability } from "./direction";
import { wordParagraphPaginationAiCapabilities } from "./pagination";
import { patchWordParagraphAiValue, readWordParagraphAiValue, wordParagraphAiValues, type WordParagraphAiValueName } from "./values";

/**
 * Reads the resolved properties of the paragraph at the start of an apply range.
 * @param context - Apply context.
 * @returns Resolved Word paragraph properties.
 */
function currentFormatting(context: QuireAiFormatApplyContext): WordParagraphFormatting {
  return resolveWordParagraphFormatting(context.tr.doc.resolve(context.from).parent.attrs.wordParagraph);
}

/**
 * Declares one paragraph format read from and written to Word paragraph properties.
 * @param name - Format name.
 * @param description - Meaning and value range.
 * @param schema - JSON Schema of accepted values.
 * @param read - Reads the value from resolved properties.
 * @param apply - Runs the owning command for the selected paragraphs.
 * @param present - People-facing name and values.
 * @returns Paragraph format capability.
 */
function paragraphFormat(
  name: string,
  description: string,
  schema: QuireAiJsonSchema,
  read: (formatting: WordParagraphFormatting) => unknown,
  apply: (context: QuireAiFormatApplyContext, value: unknown) => boolean,
  present: QuireAiFormatPresentation
): QuireAiCapability {
  return {
    kind: "format", name, level: "paragraph", description, schema, present,
    read: target => target.level === "paragraph" && target.node.attrs.wordParagraph !== undefined
      ? read(resolveWordParagraphFormatting(target.node.attrs.wordParagraph))
      : undefined,
    apply
  };
}

const alignLabels: Readonly<Record<string, string>> = { start: "左对齐", center: "居中", end: "右对齐", justify: "两端对齐", distribute: "分散对齐" };

/** @param value - Length such as "12pt", "2char" or "0.5line". @returns "12 磅", "2 字符" or "0.5 行". */
function presentLength(value: unknown): string {
  return String(value).replace(/pt$/u, " 磅").replace(/char$/u, " 字符").replace(/line$/u, " 行");
}

/** @param value - Multiple, "18pt" or ">=18pt". @returns "1.5 倍", "固定 18 磅" or "最小 18 磅". */
function presentLineSpacing(value: unknown): string {
  if (typeof value === "number") return `${value} 倍`;
  const text = String(value);
  return text.startsWith(">=") ? `最小 ${presentLength(text.slice(2))}` : `固定 ${presentLength(text)}`;
}


/** People-facing names and values of the shared paragraph values. */
const presentations: Readonly<Record<WordParagraphAiValueName, QuireAiFormatPresentation>> = {
  align: { label: "对齐", value: value => alignLabels[String(value)] ?? String(value) },
  lineSpacing: { label: "行距", value: presentLineSpacing },
  spaceBefore: { label: "段前间距", value: presentLength },
  spaceAfter: { label: "段后间距", value: presentLength },
  indent: { label: "左缩进", value: presentLength },
  firstLineIndent: { label: "首行缩进", value: value => String(value).startsWith("-") ? `悬挂 ${presentLength(String(value).slice(1))}` : presentLength(value) }
};

/**
 * Applies one shared value through the owning paragraph command.
 * @param context - Apply context with the paragraphs selected.
 * @param name - Value name.
 * @param value - Schema-valid value, or null.
 * @returns Whether the command accepted the change.
 */
function applyValue(context: QuireAiFormatApplyContext, name: WordParagraphAiValueName, value: unknown): boolean {
  const patch = patchWordParagraphAiValue(currentFormatting(context), name, value);
  const { commands } = context;
  if (patch.alignment !== undefined) return commands.setWordParagraphProperties({ properties: { alignment: patch.alignment } });
  if (patch.indentation !== undefined) return commands.setWordParagraphIndentation({ indentation: patch.indentation });
  if (name === "lineSpacing") return commands.setWordParagraphLineSpacing({ line: patch.spacing!.line });
  return commands.setWordParagraphSpacing({ spacing: patch.spacing! });
}

/** Paragraph formats exposed by Word paragraph properties, page-boundary switches and direction. */
export const wordParagraphAiCapabilities: readonly QuireAiCapability[] = [
  paragraphFormat("heading", "Heading level 1-9.", { type: "integer", minimum: 1, maximum: 9 },
    formatting => resolveWordHeadingStyleLevel(formatting) ?? undefined,
    ({ commands }, value) => typeof value === "number"
      ? commands.setWordHeading({ level: value as 1 })
      : commands.setWordParagraphProperties({ properties: { styleId: null, outlineLevel: null } }),
    { label: "标题级别", value: value => `标题 ${String(value)}` }),
  ...(["align", "lineSpacing", "spaceBefore", "spaceAfter", "indent", "firstLineIndent"] as const).map(name => paragraphFormat(
    name, wordParagraphAiValues[name].description, wordParagraphAiValues[name].schema,
    formatting => readWordParagraphAiValue(formatting, name),
    (context, value) => applyValue(context, name, value),
    presentations[name]
  )),
  ...wordParagraphPaginationAiCapabilities,
  wordParagraphDirectionAiCapability
];
