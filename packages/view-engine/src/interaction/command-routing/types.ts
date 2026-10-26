import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { Selection } from "@quirekit/pm";

import type {
  QuireActiveSelectionCommandTargetKind,
  QuireActiveSelectionContext,
  QuireActiveSelectionDomain,
  QuireInteractionSelectionTarget,
} from "../selection";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef,
  QuireLayoutRootId,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";

/** Selection domain used by command routing. */
export type QuireCommandSelectionDomain = QuireActiveSelectionDomain;

/** Command target class derived from the active selection. */
export type QuireCommandTargetKind = QuireActiveSelectionCommandTargetKind;

/** Options used to resolve the active command routing scope. */
export interface QuireCommandRoutingScopeOptions {
  /** Current ProseMirror selection to classify. */
  readonly selection: Selection;
  /** Optional pre-resolved active selection context that wins over raw facts. */
  readonly selectionContext?: QuireActiveSelectionContext | undefined;
  /** Optional interaction target that should route commands before PM fallback. */
  readonly interactionTarget?: QuireInteractionSelectionTarget | undefined;
}

/** Active scope consumed by command routing. */
export interface QuireCommandRoutingScope {
  /** Selection domain that should interpret editor commands. */
  readonly selectionDomain: QuireCommandSelectionDomain;
  /** Command target class for this selection domain. */
  readonly targetKind: QuireCommandTargetKind;
  /** Original ProseMirror selection represented by this routing scope. */
  readonly selection: Selection;
  /** Retained root that owns the active command target, when known. */
  readonly activeRoot?: QuireLayoutRootId | undefined;
  /** Retained region that owns the active interaction target, when known. */
  readonly activeRegion?: QuireLayoutRegionRef | undefined;
  /** Source document identity represented by the active interaction target, when known. */
  readonly activeSource?: QuireLayoutSourceRef | undefined;
  /** Capabilities active for the active interaction target, when known. */
  readonly activeCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Query-product owner that produced the active command target, when known. */
  readonly activeQueryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Interaction target that produced this routing scope, when available. */
  readonly interactionTarget?: QuireInteractionSelectionTarget | undefined;
}

/** Generic edit intent that must be routed before falling back to text commands. */
export type QuireGenericEditCommandIntent =
  | "text-mutation"
  | "cut"
  | "paste";

/** Selection-domain command intent represented before domain dispatch. */
export type QuireSelectionCommandIntent =
  | QuireGenericEditCommandIntent
  | "copy"
  | "delete";

/** Options used to route commands to the active selection command domain. */
export interface QuireSelectionCommandRouteOptions {
  /** Active command routing scope. */
  readonly scope: QuireCommandRoutingScope;
  /** Selection-domain command intent being routed. */
  readonly intent: QuireSelectionCommandIntent;
}

/** Shared context carried by every selection command route. */
export interface QuireSelectionCommandRouteContext {
  /** Selection-domain command intent represented by this route. */
  readonly intent: QuireSelectionCommandIntent;
  /** Original ProseMirror selection represented by this command route. */
  readonly selection: Selection;
  /** Selection domain that should interpret the routed command. */
  readonly selectionDomain: QuireCommandSelectionDomain;
  /** Interaction target that produced this route, when available. */
  readonly interactionTarget?: QuireInteractionSelectionTarget | undefined;
  /** Retained root that owns the active command target, when known. */
  readonly activeRoot?: QuireLayoutRootId | undefined;
  /** Retained region that owns the active command target, when known. */
  readonly activeRegion?: QuireLayoutRegionRef | undefined;
  /** Source document identity represented by the active command target, when known. */
  readonly activeSource?: QuireLayoutSourceRef | undefined;
  /** Capabilities active for the active command target, when known. */
  readonly activeCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Query-product owner that produced the active command target, when known. */
  readonly activeQueryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/** Command route for editable text commands. */
export interface QuireEditableTextSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "editable-text";
  /** Command target class that can receive editable text commands. */
  readonly targetKind: "editable-text";
}

/** Command route for readonly text commands. */
export interface QuireReadonlyTextSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "readonly-text";
  /** Command target class that can receive readonly text commands. */
  readonly targetKind: "readonly-text";
}

/** Command route for table-cell commands. */
export interface QuireTableCellsSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "table-cells";
  /** Command target class that can receive table-cell commands. */
  readonly targetKind: "table-cells";
}

/** Command route for structural node commands. */
export interface QuireNodeSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "node";
  /** Command target class that can receive structural node commands. */
  readonly targetKind: "node";
}

/** Object-like command target classes. */
export type QuireObjectSelectionCommandTargetKind =
  | "object"
  | "media"
  | "embed";

/** Command route for object-like commands. */
export interface QuireObjectSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "object";
  /** Command target class that can receive object-like commands. */
  readonly targetKind: QuireObjectSelectionCommandTargetKind;
}

/** Command route for field commands. */
export interface QuireFieldSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "field";
  /** Command target class that can receive field commands. */
  readonly targetKind: "field";
}

/** Control-like command target classes. */
export type QuireControlSelectionCommandTargetKind =
  | "content-control"
  | "widget"
  | "control";

/** Command route for control-like commands. */
export interface QuireControlSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "control";
  /** Command target class that can receive control-like commands. */
  readonly targetKind: QuireControlSelectionCommandTargetKind;
}

/** Command route for document-level commands. */
export interface QuireDocumentSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "document";
  /** Command target class that can receive document-level commands. */
  readonly targetKind: "document";
}

/** Command route used when no known selection command domain exists. */
export interface QuireUnknownSelectionCommandRoute
  extends QuireSelectionCommandRouteContext {
  /** Route family selected for the active command scope. */
  readonly kind: "unknown";
  /** Command target class that could not be routed to a known domain. */
  readonly targetKind: QuireCommandTargetKind;
}

/** Route selected for commands that should dispatch by selection command domain. */
export type QuireSelectionCommandRoute =
  | QuireEditableTextSelectionCommandRoute
  | QuireReadonlyTextSelectionCommandRoute
  | QuireTableCellsSelectionCommandRoute
  | QuireNodeSelectionCommandRoute
  | QuireObjectSelectionCommandRoute
  | QuireFieldSelectionCommandRoute
  | QuireControlSelectionCommandRoute
  | QuireDocumentSelectionCommandRoute
  | QuireUnknownSelectionCommandRoute;

/** Options used to route a generic edit command through an active scope. */
export interface QuireGenericEditCommandRouteOptions {
  /** Active command routing scope. */
  readonly scope: QuireCommandRoutingScope;
  /** Pre-resolved selection command route for the same active scope. */
  readonly selectionRoute?: QuireSelectionCommandRoute | undefined;
  /** Generic edit command intent being routed. */
  readonly intent: QuireGenericEditCommandIntent;
}

/** Shared context carried by every generic edit command route. */
export interface QuireGenericEditCommandRouteContext
  extends QuireSelectionCommandRouteContext {
  /** Generic edit intent represented by this route. */
  readonly intent: QuireGenericEditCommandIntent;
  /** Selection command route family considered before generic edit fallback. */
  readonly selectionRouteKind: QuireSelectionCommandRoute["kind"];
  /** Command target class that owns this generic edit route. */
  readonly targetKind: QuireCommandTargetKind;
}

/** Route selected for a generic edit command. */
export type QuireGenericEditCommandRoute =
  | (QuireGenericEditCommandRouteContext & { readonly kind: "allow-text-mutation" })
  | (QuireGenericEditCommandRouteContext & { readonly kind: "copy-only" })
  | (QuireGenericEditCommandRouteContext & { readonly kind: "block" });
