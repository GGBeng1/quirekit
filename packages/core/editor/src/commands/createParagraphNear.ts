import { createParagraphNear as pmCreateParagraphNear } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Creates a paragraph near the current block selection.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror created a nearby paragraph.
 */
export const createParagraphNear: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmCreateParagraphNear);
