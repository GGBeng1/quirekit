import type { QuireAiPicturePort } from "@quirekit/ai-contract";
import { defineCommand, type CommandProps } from "@quirekit/msfe-core";

/** Input of the AI picture command, prepared by its adapter. */
export interface PictureAgentInput {
  /** Image Markdown to write, with its caption paragraph when given. */
  readonly markdown: string;
  /** Insertion position. */
  readonly at: number;
  /** Whether the picture goes before the target block. */
  readonly before: boolean;
}

/** Agent parameters of a picture. */
interface PictureParams {
  /** Built-in picture id. */
  readonly asset?: string;
  /** Palette of a built-in picture. */
  readonly palette?: string;
  /** Picture address the user gave. */
  readonly url?: string;
  /** Alternative text. */
  readonly alt: string;
  /** Caption written below the picture. */
  readonly caption?: string;
  /** Whether it goes before the target block. */
  readonly before?: boolean;
}

/** @param text - Alternative text. @returns Text safe inside image brackets. */
function escapeAlt(text: string): string {
  return text.replace(/[\\[\]]/gu, match => `\\${match}`).replace(/\s+/gu, " ").trim();
}

/**
 * Picture command the AI core may run: a built-in picture stored by the host, or an address the user gave.
 * @returns Command factories for `addCommands`.
 */
export function createPictureAgentCommands() {
  return {
    insertPicture: defineCommand({
      description: "Inserts a picture after the target block (before it with before:true), with alternative text and an optional caption paragraph below it. Give asset for a built-in picture (document_help with pictures lists the ids and palettes) or url for an https address the user provided; never invent addresses.",
      target: "block", category: "figures",
      params: {
        type: "object", additionalProperties: false, required: ["alt"],
        properties: {
          asset: { type: "string", minLength: 1, maxLength: 120, description: "Built-in picture id." },
          palette: { type: "string", minLength: 1, maxLength: 40, description: "Palette of the built-in picture; use one palette across a document." },
          url: { type: "string", pattern: "^https://", maxLength: 2000, description: "https address the user provided." },
          alt: { type: "string", minLength: 1, maxLength: 300, description: "What the picture shows, for readers who cannot see it." },
          caption: { type: "string", minLength: 1, maxLength: 300 },
          before: { type: "boolean" }
        }
      },
      prepare: async (value, ports) => {
        const params = value as PictureParams;
        if ((params.asset === undefined) === (params.url === undefined)) throw new Error("give exactly one of asset or url");
        if (params.url !== undefined) return params.url;
        const pictures = ports.pictures as QuireAiPicturePort | undefined;
        if (pictures === undefined) throw new Error("this editor has no built-in pictures; insert a picture by an https url the user gives");
        const prepared = await pictures.prepare({ asset: params.asset!, palette: params.palette });
        if (typeof prepared.source !== "string") throw new Error("the host stored the picture without an address it can show");
        return prepared.source;
      },
      adapt: (value, { block, after, prepared }) => {
        if (block === null || typeof prepared !== "string") return null;
        const params = value as PictureParams;
        const address = /[\s()<>]/u.test(prepared) ? `<${prepared.replace(/[<>]/gu, encodeURIComponent)}>` : prepared;
        const caption = params.caption === undefined ? "" : `\n\n${params.caption.trim()}`;
        return { markdown: `![${escapeAlt(params.alt)}](${address})${caption}`, at: params.before === true ? block.from : after ?? block.to, before: params.before === true } satisfies PictureAgentInput;
      },
      run: (input: PictureAgentInput) => ({ tr }: CommandProps) => tr.replace(input.at, input.at, input.before ? `${input.markdown}\n\n` : `\n\n${input.markdown}`)
    })
  };
}
