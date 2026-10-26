import type { FlowchartPageSettings } from "@quirekit/flowchart";
import { readGraphPage, writeGraphPage } from "../../codec/metadata";
import type { FlowRuntime } from "../types";

/** One adapter-owned model event registered through the public History hooks. */
export const flowPageEvent = "quirekit:page-settings";
/** @param runtime - Authoritative source owner. @param page - Admitted root metadata. @param record - Whether this explicit change should enter the shared cell history. */
export function changeGraphPage(runtime: FlowRuntime, page: FlowchartPageSettings | undefined, record = true): void {
  const before = readGraphPage(runtime.graph);
  if (JSON.stringify(before) === JSON.stringify(page)) return;
  writeGraphPage(runtime.graph, page);
  // Root metadata uses the same vendor history as cells. Undo replay writes
  // quietly to avoid creating another command while still invalidating source.
  if (record) runtime.graph.model.notify(flowPageEvent, { cell: runtime.graph.model, before, after: page });
  runtime.changes++; runtime.options.onChange?.(runtime.changes); runtime.notify();
}
