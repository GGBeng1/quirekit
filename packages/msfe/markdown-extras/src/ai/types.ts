import type {} from "@quirekit/msfe-core";
import type { TextFigureAgentInput } from "./commands";

/** Text figure commands the AI core runs. */
declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** AI text figure commands. */
    textFigures: {
      /** @param input - Prepared AI insertion. @returns The caller's result or pending chain. */
      insertTextDiagram(input: TextFigureAgentInput): ReturnType;
      /** @param input - Prepared AI change. @returns The caller's result or pending chain. */
      updateTextDiagram(input: TextFigureAgentInput): ReturnType;
    };
  }
}
