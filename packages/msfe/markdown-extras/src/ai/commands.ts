import { defineCommand, type CommandProps } from "@quirekit/msfe-core";
import { checkTextFigure } from "./check";

/** Input of the AI text figure commands, prepared by their adapters. */
export interface TextFigureAgentInput {
  /** Fence source to write. */
  readonly fence: string;
  /** Source range to replace; equal ends insert. */
  readonly from: number;
  /** End of the replaced range. */
  readonly to: number;
  /** Whether the fence is a new block that needs separators. */
  readonly insert: "before" | "after" | false;
}

const language = { type: "string", enum: ["mermaid", "plantuml", "dot"], description: "mermaid, plantuml, or dot for Graphviz." };
const source = { type: "string", minLength: 1, maxLength: 30000, description: "Complete diagram source in the chosen language." };

/** @param params - Agent values. @returns Fence of the figure. */
function fenceOf(params: { language: string; source: string }): string {
  const body = params.source.replace(/\r\n?/gu, "\n").replace(/\n+$/u, "");
  const marker = body.includes("```") ? "~~~~" : "```";
  return `${marker}${params.language}\n${body}\n${marker}`;
}

/** @param input - Prepared change. @returns Command writing the fence. */
const writeFigure = (input: TextFigureAgentInput) => ({ tr }: CommandProps) =>
  tr.replace(input.from, input.to, input.insert === "after" ? `\n\n${input.fence}` : input.insert === "before" ? `${input.fence}\n\n` : input.fence);

/**
 * Text figure commands the AI core may run: Mermaid, PlantUML or DOT source, rendered first so a
 * figure with a syntax error is refused with the renderer's message.
 * @returns Command factories for `addCommands`.
 */
export function createTextFigureAgentCommands() {
  return {
    insertTextDiagram: defineCommand({
      description: "Inserts a text diagram after the target block (before it with before:true), drawn from Mermaid, PlantUML or Graphviz DOT source; the document shows its rendered picture. Supply language and complete source. Use it for sequence, state, class, ER, Gantt, pie, xy charts and similar diagrams written as code; a syntax error is reported with the renderer's message.",
      target: "block", category: "figures",
      params: { type: "object", properties: { language, source, before: { type: "boolean" } }, required: ["language", "source"], additionalProperties: false },
      prepare: async (value, ports) => {
        const params = value as { language: string; source: string };
        const problem = await checkTextFigure(params.language, params.source, ports);
        if (problem !== undefined) throw new Error(`the ${params.language} source does not render: ${problem}; correct it and send it again`);
        return fenceOf(params);
      },
      adapt: (value, { block, after, prepared }) => {
        if (block === null || typeof prepared !== "string") return null;
        const before = (value as { before?: boolean }).before === true;
        const at = before ? block.from : after ?? block.to;
        return { fence: prepared, from: at, to: at, insert: before ? "before" : "after" } satisfies TextFigureAgentInput;
      },
      run: (input: TextFigureAgentInput) => writeFigure(input)
    }),
    updateTextDiagram: defineCommand({
      description: "Replaces the source of the target text diagram block with complete new Mermaid, PlantUML or Graphviz DOT source; language changes it. The new source is rendered first and refused with the renderer's message if it does not render.",
      target: "block", kinds: ["code"], category: "figures",
      params: { type: "object", properties: { language, source }, required: ["language", "source"], additionalProperties: false },
      prepare: async (value, ports) => {
        const params = value as { language: string; source: string };
        const problem = await checkTextFigure(params.language, params.source, ports);
        if (problem !== undefined) throw new Error(`the ${params.language} source does not render: ${problem}; correct it and send it again`);
        return fenceOf(params);
      },
      adapt: (_value, { block, prepared }) => block === null || typeof prepared !== "string" ? null
        : { fence: prepared, from: block.from, to: block.to, insert: false } satisfies TextFigureAgentInput,
      run: (input: TextFigureAgentInput) => writeFigure(input)
    })
  };
}
