import type {
  QuireSelectionCommandRoute,
  QuireSelectionCommandRouteOptions,
  QuireSelectionCommandRouteContext,
  QuireGenericEditCommandRoute,
  QuireGenericEditCommandRouteContext,
  QuireGenericEditCommandRouteOptions
} from "./types";

/**
 * Resolves the command route owned by the active selection command domain.
 *
 * @param options - Active scope and selection intent to classify by command target.
 * @returns Selection-domain command route.
 */
export function resolveQuireSelectionCommandRoute(
  options: QuireSelectionCommandRouteOptions
): QuireSelectionCommandRoute {
  const context = createQuireSelectionCommandRouteContext(options);

  switch (options.scope.targetKind) {
    case "editable-text":
      return { ...context, kind: "editable-text", targetKind: "editable-text" };
    case "readonly-text":
      return { ...context, kind: "readonly-text", targetKind: "readonly-text" };
    case "table-cells":
      return { ...context, kind: "table-cells", targetKind: "table-cells" };
    case "node":
      return { ...context, kind: "node", targetKind: "node" };
    case "object":
    case "media":
    case "embed":
      return { ...context, kind: "object", targetKind: options.scope.targetKind };
    case "field":
      return { ...context, kind: "field", targetKind: "field" };
    case "content-control":
    case "widget":
    case "control":
      return { ...context, kind: "control", targetKind: options.scope.targetKind };
    case "document":
      return { ...context, kind: "document", targetKind: "document" };
    default:
      return { ...context, kind: "unknown", targetKind: options.scope.targetKind };
  }
}

/**
 * Creates the context shared by every selection command route.
 *
 * @param options - Active scope to expose on the route.
 * @returns Selection command route context.
 */
function createQuireSelectionCommandRouteContext(
  options: QuireSelectionCommandRouteOptions
): QuireSelectionCommandRouteContext {
  return {
    intent: options.intent,
    selection: options.scope.selection,
    selectionDomain: options.scope.selectionDomain,
    interactionTarget: options.scope.interactionTarget,
    activeRoot: options.scope.activeRoot,
    activeRegion: options.scope.activeRegion,
    activeSource: options.scope.activeSource,
    activeCapabilities: options.scope.activeCapabilities,
    activeQueryOwner: options.scope.activeQueryOwner
  };
}

/**
 * Resolves how a generic edit command should behave in the active command scope.
 *
 * @param options - Active scope and generic edit intent to route.
 * @returns Route that the input controller should apply.
 */
export function resolveQuireGenericEditCommandRoute(
  options: QuireGenericEditCommandRouteOptions
): QuireGenericEditCommandRoute {
  const { intent, scope } = options;
  const commandRoute =
    options.selectionRoute ?? resolveQuireSelectionCommandRoute({ scope, intent });
  const context = createQuireGenericEditCommandRouteContext(options, commandRoute);

  if (commandRoute.kind === "editable-text") {
    return { ...context, kind: "allow-text-mutation" };
  }

  if (commandRoute.kind === "readonly-text" && intent === "cut") {
    return { ...context, kind: "copy-only" };
  }

  return { ...context, kind: "block" };
}

/**
 * Creates the context shared by every generic edit command route.
 *
 * @param commandRoute - Selection command route that generic editing considered.
 * @returns Generic edit command route context.
 */
function createQuireGenericEditCommandRouteContext(
  options: QuireGenericEditCommandRouteOptions,
  commandRoute: QuireSelectionCommandRoute
): QuireGenericEditCommandRouteContext {
  return {
    selection: commandRoute.selection,
    intent: options.intent,
    selectionRouteKind: commandRoute.kind,
    selectionDomain: commandRoute.selectionDomain,
    targetKind: commandRoute.targetKind,
    interactionTarget: commandRoute.interactionTarget,
    activeRoot: commandRoute.activeRoot,
    activeRegion: commandRoute.activeRegion,
    activeSource: commandRoute.activeSource,
    activeCapabilities: commandRoute.activeCapabilities,
    activeQueryOwner: commandRoute.activeQueryOwner
  };
}
