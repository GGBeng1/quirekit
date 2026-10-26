import type { History } from "@antv/x6";
import { readFlowchart } from "@quirekit/flowchart";
import type { FlowRuntime } from "../types";
import type { PageHistoryEvent } from "../pages/types";
import type { FlowHistoryOptions } from "./types";
import { changeGraphPage, flowPageEvent } from "../pages/metadata";
import { flowReplacementEvent, replayFlowGraph } from "../replacement/commands";
import type { FlowReplacementEvent } from "../replacement/types";

/** @param runtime - Graph lifetime and neutral root metadata. @param HistoryClass - Public vendor plugin constructor. @returns Cell and root history with one shared undo order. */
export function createFlowHistory(runtime: FlowRuntime, HistoryClass: typeof History): History {
  // X6's constructor filters reserved events when eventNames is supplied.
  // Extend the initialized public list instead, retaining all normal cell events.
  const history = new HistoryClass({ stackSize: 100,
    /** @param event - Vendor mutation name. @param args - Public mutation metadata. @returns Whether this change affects portable source. */
    beforeAddCommand(event, args) {
      const options = args && "options" in args ? args.options : undefined;
      const key = args && "key" in args ? String(args.key) : event.slice(12);
      return !runtime.replacing && !options?.qkDerived && (!event.startsWith("cell:change:") || ["angle", "position", "size", "data", "source", "target", "vertices", "labels", "parent", "children", "qkOrder", "zIndex"].includes(key));
    },
    /** @param event - Public custom event. @param args - Adapter-owned metadata payload. @param command - Public mutable history record. */
    afterAddCommand(event, args, command) {
      if (String(event) === flowReplacementEvent) {
        const payload = args as unknown as FlowReplacementEvent;
        command.event = rootHistoryEvent(flowReplacementEvent); command.modelChange = true;
        command.data = { key: "document", prev: { document: payload.before }, next: { document: payload.after } }; return;
      }
      if (String(event) !== flowPageEvent) return;
      const payload = args as unknown as PageHistoryEvent;
      command.event = rootHistoryEvent(flowPageEvent); command.modelChange = true;
      command.data = { key: "page", prev: { page: payload.before }, next: { page: payload.after } };
    },
    /** @param command - Public custom command. @param revert - Undo rather than redo. @param _options - Public replay options. */
    executeCommand(command, revert, _options) {
      if (!("prev" in command.data)) return;
      const data = revert ? command.data.prev : command.data.next;
      if (String(command.event) === flowPageEvent) changeGraphPage(runtime, data.page, false);
      else if (String(command.event) === flowReplacementEvent) replayFlowGraph(runtime, readFlowchart(data.document));
    },
  });
  history.options.eventNames?.push(rootHistoryEvent(flowPageEvent), rootHistoryEvent(flowReplacementEvent));
  return history;
}
/** @param event - One adapter-owned root event. @returns The bridge for the vendor's closed union; registration uses its public custom-event API. */
function rootHistoryEvent(event: typeof flowPageEvent | typeof flowReplacementEvent): NonNullable<FlowHistoryOptions["eventNames"]>[number] {
  return event as NonNullable<FlowHistoryOptions["eventNames"]>[number];
}
