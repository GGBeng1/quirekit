import type { Node as PMNode } from "@quirekit/pm";
import type { CommandSpec } from "../types";

/** Where an Agent's call of a described command takes effect. */
export type QuireCommandTarget = "document" | "block" | "text";

/**
 * Side effect of a described command, for the policy deciding whether a call needs approval: `policy`
 * changes how the document is protected or reviewed, which the person approves every time.
 */
export type QuireCommandRisk = "read" | "write" | "policy";

/** What an Agent's call knows when its parameters are turned into command options. */
export interface QuireCommandAgentContext {
  /** Document the command will run on, with every earlier change of the same edit applied. */
  readonly doc: PMNode;
  /** Position before the target block, or null for a document-level call. */
  readonly pos: number | null;
  /** Selected range of a `text` target (the block content when no text was named), or null. */
  readonly range: { readonly from: number; readonly to: number } | null;
  /** Exact text a `text` call named, or null. */
  readonly text: string | null;
  /** Identity the product gives the Agent, for authored content such as comments; null when none. */
  readonly author: { readonly id: string; readonly name: string } | null;
  /** What `prepare` returned for these parameters; undefined without `prepare`. */
  readonly prepared: unknown;
}

/** Agent-facing description of one editor command. */
export interface QuireCommandDescriptor {
  /** What the command does and when to use it, in one or two sentences. */
  readonly description: string;
  /** JSON Schema of the command's single options argument; omitted for commands without options. */
  readonly params?: Readonly<Record<string, unknown>> | undefined;
  /**
   * Where the call takes effect: the document (default), a block whose id the caller gives (the selection
   * is placed inside it), or exact text inside that block (the text is selected).
   */
  readonly target?: QuireCommandTarget | undefined;
  /** Node types a `block` or `text` target must have; omitted accepts any block. */
  readonly nodes?: readonly string[] | undefined;
  /**
   * Top-level parameters the command counts from 0 that Agents count from 1, as people and the
   * document view number rows, columns and items; the caller subtracts one before running the command.
   */
  readonly ordinals?: readonly string[] | undefined;
  /** Side effect; default `write`. */
  readonly risk?: QuireCommandRisk | undefined;
  /** Whether the command owns its whole transaction and may only share an edit with other standalone commands. */
  readonly standalone?: boolean | undefined;
  /** Group the command is listed under, such as "表格"; ungrouped commands are listed first. */
  readonly category?: string | undefined;
  /**
   * Turns schema-valid Agent parameters into the command's options: units, defaults, or an object addressed by its number.
   * Replaces `ordinals`. Returns null when the parameters name nothing in the current document.
   */
  readonly adapt?: ((params: unknown, context: QuireCommandAgentContext) => unknown) | undefined;
  /**
   * Prepares what the command needs and cannot get inside the synchronous edit, such as a generated picture.
   * Throws an error whose message names the fix to fail only this call.
   */
  readonly prepare?: ((params: unknown, ports: Readonly<Record<string, unknown>>) => Promise<unknown>) | undefined;
  /** Whether the document already is as requested when the command refuses, such as clearing an absent watermark. */
  readonly satisfied?: ((params: unknown, context: QuireCommandAgentContext) => boolean) | undefined;
}

/** A command with its description, as written in `addCommands()`. */
export type QuireCommandDefinition<Run extends CommandSpec> = QuireCommandDescriptor & {
  /** The Tiptap-shaped command factory. */
  readonly run: Run;
};
