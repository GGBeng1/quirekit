import {
  createMountedWidgetEventRuntime,
  registerMountedWidgetViewEventHandlers
} from "../widget-events";
import type {
  CreateMountedWidgetEventsOptions,
  MountedWidgetEventSetup
} from "./types";

/**
 * Creates one mounted widget event scope and registers extension handlers.
 *
 * @param options - Host identity, handler map, and live mounted-view context.
 * @returns Widget runtime and handler-registration cleanup.
 */
export function createMountedWidgetEvents(
  options: CreateMountedWidgetEventsOptions
): MountedWidgetEventSetup {
  const widgetEvents = createMountedWidgetEventRuntime<unknown>({
    getContext: options.getContext
  });

  widgetEvents.setHost(options.host);

  return {
    widgetEvents,
    cleanup: registerMountedWidgetViewEventHandlers({
      scope: widgetEvents.scope,
      eventHandlers: options.eventHandlers,
      getContext: options.getContext
    })
  };
}
