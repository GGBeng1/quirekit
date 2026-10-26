import type { QuireTableModelProfile } from "../../document-profile/types";
import type {
  QuireLayoutOwnerFacts,
  QuireLayoutQueryProductOwner
} from "@quirekit/layout/products";
import type {
  Node as ProseMirrorNode,
  ResolvedPos,
  Selection
} from "@quirekit/pm";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout/types";
import type { QuireLayoutBox } from "../../layout/engine/types";
import type { QuireRetainedRegionSelectionPolicyKind } from "../../layout";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import type {
  QuireHitTestResult,
  QuireTableCellSelectionHit
} from "../types";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef,
  QuireLayoutRootId,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit,
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../../view-graph";
import type {
  QuireSelectionStructureIntervalIndex
} from "./structure";

/** Selection domain produced by interaction selection semantics. */
export type QuireSelectionDomain =
  | "text"
  | "cell"
  | "node"
  | "object"
  | "readonly-text"
  | "boundary-caret"
  | "control"
  | "unknown";

/** Command target class produced from interaction selection semantics. */
export type QuireInteractionSelectionCommandTargetKind =
  | "editable-text"
  | "table-cells"
  | "node"
  | "object"
  | "readonly-text"
  | "field"
  | "media"
  | "embed"
  | "content-control"
  | "widget"
  | "control"
  | "unknown";

/** Selection domain represented by the active editor selection context. */
export type QuireActiveSelectionDomain =
  | QuireSelectionDomain
  | "document";

/** Command target class represented by the active editor selection context. */
export type QuireActiveSelectionCommandTargetKind =
  | QuireInteractionSelectionCommandTargetKind
  | "document";

/** Target kind represented by selection semantics over interaction hit facts. */
export type QuireInteractionSelectionHitKind =
  | "position"
  | QuireViewInteractionHit["kind"];

/** Expanded text selection gesture currently supported by text semantics. */
export type QuireTextExpandedSelectionKind = "word" | "textblock";

/** PM-compatible hook used to customize text range selections. */
export type QuireCreateTextSelectionBetween = (
  anchor: ResolvedPos,
  head: ResolvedPos
) => Selection | null;

/** Selection semantics result with an explicit domain. */
export interface QuireSelectionSemanticsResult {
  /** Selection domain that owns the resulting editor selection. */
  readonly domain: QuireSelectionDomain;
  /** ProseMirror selection to apply for this domain. */
  readonly selection: Selection;
}

/** Required explicit fact kinds for interaction ownership. */
export type QuireInteractionOwnerFactKind =
  | "region"
  | "source"
  | "capabilities";

/** Exact owner facts carried by one interaction hit before routing. */
export interface QuireExplicitInteractionOwnerFactsOptions {
  /** Retained region carried by the exact hit. */
  readonly region?: QuireLayoutRegionRef | undefined;
  /** Source identity carried by the exact hit. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Capabilities carried by the exact hit. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
}

/** Gap produced when an interaction hit lacks complete owner facts. */
export interface QuireInteractionOwnerFactGap {
  /** Stable gap classification. */
  readonly code: "missing-owner-facts";
  /** Owner facts absent from the exact interaction hit. */
  readonly missing: readonly QuireInteractionOwnerFactKind[];
  /** Region carried by the hit when only source or capabilities are absent. */
  readonly region?: QuireLayoutRegionRef | undefined;
}

/** Complete owner facts or a gap that prevents interaction routing. */
export type QuireExplicitInteractionOwnerFactsResult =
  | {
      /** Complete-owner discriminator. */
      readonly kind: "owned";
      /** Explicit retained region. */
      readonly region: QuireLayoutRegionRef;
      /** Explicit source identity. */
      readonly source: QuireLayoutSourceRef;
      /** Explicit active capabilities. */
      readonly capabilities: QuireLayoutCapabilitySet;
    }
  | {
      /** Incomplete-owner discriminator. */
      readonly kind: "gap";
      /** Missing owner facts that prevent routing. */
      readonly gap: QuireInteractionOwnerFactGap;
    };

/** Options used to resolve selection semantics from a retained hit-test result. */
export interface QuireHitTestSelectionTargetOptions {
  /** Hit-test result carrying optional retained interaction facts. */
  readonly hitTestResult: QuireHitTestResult;
}

/** Selection and command target facts derived from one interaction hit. */
export interface QuireInteractionSelectionTarget {
  /** Selection domain that should interpret the hit. */
  readonly domain: QuireSelectionDomain;
  /** Command target class that should receive commands for this hit. */
  readonly commandTarget: QuireInteractionSelectionCommandTargetKind;
  /** Concrete interaction hit kind that produced this target. */
  readonly hitKind: QuireInteractionSelectionHitKind;
  /** Retained region that produced the hit, when available. */
  readonly region?: QuireLayoutRegionRef | undefined;
  /** Source document identity represented by the hit, when available. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Capabilities active for this hit target, when available. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Layout query-product owner that produced the hit, when available. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Enclosing story owner that gates interaction without replacing the exact target owner. */
  readonly interactionScope?: QuireLayoutOwnerFacts | undefined;
  /** Document-space rectangle that produced the hit, when available. */
  readonly referenceRect?: QuireRect | undefined;
  /** Retained layer that produced the hit, when available. */
  readonly layer?: QuireViewLayerRef | undefined;
  /** Pointer policy declared by the retained hit or layer, when available. */
  readonly pointerPolicy?: QuireViewPointerPolicy | undefined;
  /** Retained interaction hit fact, when the geometry query produced one. */
  readonly interactionHit?: QuireViewInteractionHit | undefined;
  /** Structural table-cell identity retained beside a text-position hit. */
  readonly tableCell?: QuireTableCellSelectionHit | undefined;
  /** Region-owned policy that selected this domain and command target. */
  readonly selectionPolicy?: QuireRetainedRegionSelectionPolicyKind | undefined;
}

/** Options used to resolve the active selection context for command routing. */
export interface QuireActiveSelectionContextOptions {
  /** ProseMirror selection active in the editor state. */
  readonly selection: Selection;
  /** Optional retained interaction target that owns commands before PM fallback. */
  readonly interactionTarget?: QuireInteractionSelectionTarget | undefined;
}

/** Active selection facts shared by input, command routing, and diagnostics. */
export interface QuireActiveSelectionContext {
  /** ProseMirror selection represented by this active context. */
  readonly selection: Selection;
  /** Selection domain that should interpret commands for this context. */
  readonly selectionDomain: QuireActiveSelectionDomain;
  /** Command target class that should receive commands for this context. */
  readonly commandTarget: QuireActiveSelectionCommandTargetKind;
  /** Retained root that owns the active interaction target, when known. */
  readonly activeRoot?: QuireLayoutRootId | undefined;
  /** Retained region that owns the active interaction target, when known. */
  readonly activeRegion?: QuireLayoutRegionRef | undefined;
  /** Source document identity represented by the active interaction target, when known. */
  readonly activeSource?: QuireLayoutSourceRef | undefined;
  /** Capabilities active for the active interaction target, when known. */
  readonly activeCapabilities?: QuireLayoutCapabilitySet | undefined;
  /** Query-product owner that produced the active interaction target, when known. */
  readonly activeQueryOwner?: QuireLayoutQueryProductOwner | undefined;
  /** Document-space rectangle that produced the active interaction target, when known. */
  readonly activeReferenceRect?: QuireRect | undefined;
  /** Interaction target that produced this context, when available. */
  readonly interactionTarget?: QuireInteractionSelectionTarget | undefined;
}

/** Options used to resolve a text caret selection from a pointer hit. */
export interface QuireTextCaretSelectionSemanticsOptions {
  /** ProseMirror document that should own the selection. */
  readonly doc: ProseMirrorNode;
  /** Hit-test result produced by interaction geometry. */
  readonly hitTestResult: QuireHitTestResult;
}

/** Options used to resolve pointer selection through its retained interaction domain. */
export interface QuirePointerHitSelectionSemanticsOptions
  extends QuireTextCaretSelectionSemanticsOptions {
  /** Retained interaction target that owns the pointer hit, when one was resolved. */
  readonly interactionTarget: QuireInteractionSelectionTarget | null;
}

/** Options used to extend text selection from an existing anchor. */
export interface QuireTextAnchorSelectionSemanticsOptions {
  /** ProseMirror document that should own the selection. */
  readonly doc: ProseMirrorNode;
  /** Existing selection anchor position. */
  readonly anchor: number;
  /** Hit-test result produced by interaction geometry for the new head. */
  readonly hitTestResult: QuireHitTestResult;
  /** Optional PM-compatible hook used to customize the range selection. */
  readonly createSelectionBetween?: QuireCreateTextSelectionBetween | undefined;
}

/** Options used to resolve a text drag range selection. */
export interface QuireTextRangeSelectionSemanticsOptions {
  /** ProseMirror document that should own the selection. */
  readonly doc: ProseMirrorNode;
  /** Hit-test result produced by interaction geometry for the anchor point. */
  readonly anchorHitTestResult: QuireHitTestResult;
  /** Hit-test result produced by interaction geometry for the head point. */
  readonly headHitTestResult: QuireHitTestResult;
  /** Snapshot-owned structure facts used to normalize cross-owner ranges. */
  readonly structureIndex?:
    QuireSelectionStructureIntervalIndex | undefined;
  /** Optional PM-compatible hook used to customize the range selection. */
  readonly createSelectionBetween?: QuireCreateTextSelectionBetween | undefined;
  /** Table model creating cell selections; without one, drags stay text ranges. */
  readonly tableModel?: QuireTableModelProfile | undefined;
}

/** Options used to resolve an expanded word or textblock selection. */
export interface QuireTextExpandedSelectionSemanticsOptions {
  /** ProseMirror document that should own the selection. */
  readonly doc: ProseMirrorNode;
  /** Layout snapshot whose measured fragments define word ranges. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Hit-test result produced by interaction geometry. */
  readonly hitTestResult: QuireHitTestResult;
  /** Expanded selection kind requested by the gesture. */
  readonly kind: QuireTextExpandedSelectionKind;
}

/** Inputs for proving the active selection textblock has exact geometry. */
export interface QuireSelectionMaterializationOptions {
  /** Retained snapshot whose text fragments provide the evidence. */
  readonly snapshot: {
    /** Canonical or adapted source geometry used to prove text measurement. */
    readonly root: QuireSelectionMaterializationNode;
  };
  /** Current selection, including its directional head. */
  readonly selection: Selection;
}

/** Source-range geometry shared by canonical layout and adapted snapshots. */
export interface QuireSelectionMaterializationNode {
  /** Source interval owned by this measured subtree. */
  readonly range: QuireLayoutNode["range"];
  /** Measured fragments before or after viewport projection. */
  readonly textFragments?: QuireLayoutNode["textFragments"] | undefined;
  /** Nested source geometry participating in materialization proof. */
  readonly children?: readonly QuireSelectionMaterializationNode[] | undefined;
  /** Accepted provider fragments retaining exact measured child source boxes. */
  readonly subLayoutFragments?: QuireLayoutBox["subLayoutFragments"] | undefined;
}
