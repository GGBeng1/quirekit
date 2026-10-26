import { readFlowchartPageSettings, serializeFlowchart } from "@quirekit/flowchart";
import type { FlowchartEditor } from "../../types";
import { readGraph } from "../../codec/read";
import { readGraphPage } from "../../codec/metadata";
import { requireIdle } from "../commands";
import { requireAuthoring } from "../structure/permissions";
import type { FlowRuntime, FlowTextInput } from "../types";
import { changeGraphPage } from "./metadata";

/** @param runtime - Authoritative graph owner. @param text - Native input lifetime. @returns Explicit page mutation with one source-budget and history boundary. */
export function createPageCommands(runtime: FlowRuntime, text: FlowTextInput): Pick<FlowchartEditor, "setPage"> {
  return {
    /** @param page - Complete physical settings. @param expected - Optional opening settings wrapper, including legacy absence. */
    setPage(page, expected) {
      requireAuthoring(runtime); requireIdle(runtime, text);
      if (expected && JSON.stringify(expected.page) !== JSON.stringify(readGraphPage(runtime.graph))) throw new Error("编辑目标已改变，请重新打开");
      const checked = readFlowchartPageSettings(page), before = readGraph(runtime.graph, runtime.options.document.revision);
      serializeFlowchart({ ...before, page: checked }); changeGraphPage(runtime, checked);
    },
  };
}
