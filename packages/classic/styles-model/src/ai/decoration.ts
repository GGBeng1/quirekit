import type { QuireAiCapability, QuireAiFormatApplyContext, QuireAiFormatTarget } from "@quirekit/ai-contract";
import {
  defaultWordParagraphBorderPen, isWordParagraphBorderEnabled, resolveWordParagraphFormatting,
  type WordParagraphBorder, type WordParagraphBorderPen, type WordParagraphBorderSide, type WordParagraphFormatting
} from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphAppearance, resolveWordParagraphStyleRegistry } from "../model";

/** Sides as the model names them; left and right are the paragraph's start and end. */
type BorderSideName = "top" | "bottom" | "left" | "right";

/** Value of the `border` format, the same space read and written. */
interface BorderValue {
  /** Every side, no side, one side, or a list of sides. */
  readonly sides: "box" | "none" | BorderSideName | readonly BorderSideName[];
  /** Line pattern. */
  readonly style?: WordParagraphBorderPen["style"];
  /** Line color as `#RRGGBB`. */
  readonly color?: string;
  /** Line width such as `"0.75pt"`. */
  readonly width?: string;
}

const sideNames: Readonly<Record<BorderSideName, WordParagraphBorderSide>> = { top: "top", bottom: "bottom", left: "start", right: "end" };
const sideOrder: readonly BorderSideName[] = ["top", "bottom", "left", "right"];
const sideLabels: Readonly<Record<string, string>> = { box: "四周", none: "无", top: "上", bottom: "下", left: "左", right: "右" };
const styleLabels: Readonly<Record<string, string>> = { single: "单线", dotted: "点线", dashed: "虚线", double: "双线" };

/**
 * Resolves a paragraph's appearance through its named style, so style-owned borders and fills count.
 * @param formatting - Direct paragraph properties.
 * @param registry - Raw style registry attribute of the document.
 * @returns Effective paragraph properties.
 */
function effectiveFormatting(formatting: unknown, registry: unknown): WordParagraphFormatting {
  return resolveWordParagraphAppearance(resolveWordParagraphStyleRegistry(registry), resolveWordParagraphFormatting(formatting)).paragraph;
}

/**
 * @param target - Read target.
 * @returns Effective properties of a paragraph target, or undefined for other targets.
 */
function readEffective(target: QuireAiFormatTarget): WordParagraphFormatting | undefined {
  if (target.level !== "paragraph" || target.node.attrs.wordParagraph === undefined) return undefined;
  return effectiveFormatting(target.node.attrs.wordParagraph, target.doc.attrs.wordStyleRegistry);
}

/** @param value - Number of points. @returns Width such as `"0.75pt"`. */
function formatWidth(value: number): string {
  return `${Math.round(value * 100) / 100}pt`;
}

/**
 * Reads visible borders: the sides, and the pen of the first visible side.
 * @param formatting - Effective paragraph properties.
 * @returns Border value, or undefined when no side is visible.
 */
function readBorder(formatting: WordParagraphFormatting): BorderValue | undefined {
  const visible = sideOrder.filter(side => isWordParagraphBorderEnabled(formatting.borders?.[sideNames[side]]));
  const edge = visible.length === 0 ? undefined : formatting.borders![sideNames[visible[0]!]]!;
  if (edge === undefined) return undefined;
  const sides = visible.length === 4 ? "box" : visible.length === 1 ? visible[0]! : visible;
  return {
    sides,
    ...(["single", "dotted", "dashed", "double"].includes(edge.style) ? { style: edge.style as WordParagraphBorderPen["style"] } : {}),
    ...(edge.color !== null && edge.color !== "auto" ? { color: edge.color.toUpperCase() } : {}),
    width: formatWidth((edge.sizeEighthPoints ?? defaultWordParagraphBorderPen.sizeEighthPoints) / 8)
  };
}

/**
 * Builds the pen for new sides: given fields first, then the paragraph's current visible line, then the default.
 * @param value - Requested border.
 * @param current - First visible edge of the paragraph, if any.
 * @returns Complete pen.
 */
function resolvePen(value: BorderValue, current: WordParagraphBorder | undefined): WordParagraphBorderPen {
  const width = value.width === undefined ? undefined : Math.min(96, Math.max(2, Math.round(Number.parseFloat(value.width) * 8)));
  return {
    style: value.style ?? (current && ["single", "dotted", "dashed", "double"].includes(current.style) ? current.style as WordParagraphBorderPen["style"] : defaultWordParagraphBorderPen.style),
    color: value.color?.toUpperCase() ?? (current?.color && current.color !== "auto" ? current.color : defaultWordParagraphBorderPen.color),
    sizeEighthPoints: width ?? current?.sizeEighthPoints ?? defaultWordParagraphBorderPen.sizeEighthPoints,
    spacePoints: current?.spacePoints ?? defaultWordParagraphBorderPen.spacePoints
  };
}

/**
 * Writes borders through the style-aware decoration command: a preset for box, none and
 * one side, or no sides followed by each listed side.
 * @param context - Apply context with the paragraphs selected.
 * @param value - Border value, or null to remove every side.
 * @returns Whether the commands accepted the change.
 */
function applyBorder(context: QuireAiFormatApplyContext, value: unknown): boolean {
  const { commands, tr } = context;
  const paragraph = tr.doc.resolve(context.from).parent;
  const effective = effectiveFormatting(paragraph.attrs.wordParagraph, tr.doc.attrs.wordStyleRegistry);
  const current = sideOrder.map(side => effective.borders?.[sideNames[side]]).find(edge => isWordParagraphBorderEnabled(edge)) ?? undefined;
  if (value === null) return commands.setWordParagraphDecoration({ kind: "preset", preset: "none", pen: resolvePen({ sides: "none" }, current) });
  const border = value as BorderValue;
  const pen = resolvePen(border, current);
  const sides = typeof border.sides === "string" ? border.sides : [...new Set(border.sides)];
  if (typeof sides === "string") {
    return commands.setWordParagraphDecoration({ kind: "preset", preset: sides === "box" || sides === "none" ? sides : sideNames[sides], pen });
  }
  if (sides.length === 4) return commands.setWordParagraphDecoration({ kind: "preset", preset: "box", pen });
  // A list of sides is no sides followed by each listed side, all in this one command chain.
  return commands.setWordParagraphDecoration({ kind: "preset", preset: "none", pen })
    && sides.every(side => commands.setWordParagraphDecoration({ kind: "side", side: sideNames[side], enabled: true, pen }));
}

/** @param value - Border value. @returns People-facing description such as "四周 单线 #C00000 1.5pt". */
function presentBorder(value: unknown): string {
  const border = value as BorderValue;
  const sides = typeof border.sides === "string" ? sideLabels[border.sides] : border.sides.map(side => sideLabels[side]).join("、");
  return [sides, border.style === undefined ? undefined : styleLabels[border.style], border.color, border.width].filter(Boolean).join(" ");
}

/** Paragraph border and fill, resolved and written through the paragraph's named style. */
export const wordParagraphDecorationAiCapabilities: readonly QuireAiCapability[] = [
  {
    kind: "format",
    name: "border",
    level: "paragraph",
    description: "Paragraph border: `sides` is \"box\", \"none\", one of \"top\", \"bottom\", \"left\", \"right\", or a list of them; optional `style` (\"single\", \"dotted\", \"dashed\", \"double\"), `color` \"#RRGGBB\" and `width` such as \"1.5pt\". Fields left out keep the current line.",
    schema: {
      type: "object",
      required: ["sides"],
      properties: {
        sides: {
          anyOf: [
            { enum: ["box", "none", "top", "bottom", "left", "right"] },
            { type: "array", items: { enum: ["top", "bottom", "left", "right"] }, minItems: 1, maxItems: 4 }
          ]
        },
        style: { enum: ["single", "dotted", "dashed", "double"] },
        color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
        width: { type: "string", pattern: "^(0\\.[2-9][0-9]*|[1-9](\\.[0-9]+)?|1[0-2](\\.0+)?)pt$" }
      },
      additionalProperties: false,
      examples: [{ sides: "box" }, { sides: "bottom", style: "double", color: "#C00000", width: "1.5pt" }]
    },
    present: { label: "段落边框", value: presentBorder },
    read: target => {
      const formatting = readEffective(target);
      return formatting === undefined ? undefined : readBorder(formatting);
    },
    apply: applyBorder
  },
  {
    kind: "format",
    name: "shading",
    level: "paragraph",
    description: "Paragraph shading: a fill color \"#RRGGBB\" behind the whole paragraph width. For a color behind the text only, use highlight or backgroundColor.",
    schema: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$", examples: ["#F2F2F2"] },
    present: { label: "段落底纹" },
    read: target => {
      const shading = readEffective(target)?.shading;
      if (shading == null || shading.pattern === "nil" || shading.fill === null || shading.fill === "auto") return undefined;
      return shading.fill.toUpperCase();
    },
    apply: ({ commands }, value) => commands.setWordParagraphDecoration({ kind: "fill", color: value === null ? null : String(value).toUpperCase() })
  }
];
