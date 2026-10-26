import type { QuireViewMutationRecord } from "@quirekit/core";
import type { HtmlMarkViewInstance, HtmlNodeViewInstance } from "./types";

/**
 * Routes an event through an exact node view capability.
 *
 * @param instance - Validated node view instance.
 * @param event - DOM event to route.
 * @returns Instance decision, or false when no capability exists.
 */
export function routeHtmlNodeViewEvent(
  instance: HtmlNodeViewInstance,
  event: Event
): boolean {
  return instance.stopEvent?.(event) === true;
}

/**
 * Routes a mutation through an exact node view capability.
 *
 * @param instance - Validated node view instance.
 * @param record - Mutation or selection record to route.
 * @returns Instance decision, or false when no capability exists.
 */
export function routeHtmlNodeViewMutation(
  instance: HtmlNodeViewInstance,
  record: QuireViewMutationRecord
): boolean {
  return instance.ignoreMutation?.(record) === true;
}

/**
 * Routes a mutation through an exact mark view capability.
 *
 * @param instance - Validated mark view instance.
 * @param record - Mutation or selection record to route.
 * @returns Instance decision, or false when no capability exists.
 */
export function routeHtmlMarkViewMutation(
  instance: HtmlMarkViewInstance,
  record: QuireViewMutationRecord
): boolean {
  return instance.ignoreMutation?.(record) === true;
}
