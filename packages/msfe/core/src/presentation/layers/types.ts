import type { EditorSelection } from "@quirekit/cm-state";
import type { DecorationSet } from "@quirekit/cm-view";
import type { SourceDocument } from "../../source/authoring/types";
import type { SourceQuery } from "../../source/semantics/types";
import type { StateSlot } from "../../state/authoring/types";
import type { MsfeSourceRange } from "../../views/types";
import type { ComponentView } from "../../views/component/types";
import type { MsfeMode } from "../../state/types";

/** Source-first declarations; range offsets always refer to the current canonical document. */
export type ProjectionDecoration =
  | { readonly type: "mark"; readonly from: number; readonly to: number; readonly class: string }
  | { readonly type: "line"; readonly from: number; readonly class: string }
  | { readonly type: "widget"; readonly from: number; readonly key: string; readonly view: ComponentView; readonly side?: -1 | 1 }
  | ProjectionReplacement;

/** A source-preserving replacement; structural layers may also normalize inline line breaks. */
export interface ProjectionReplacement extends MsfeSourceRange {
  /** Replacement discriminator. */
  readonly type: "replace";
  /** Stable identity within the layer. */
  readonly key: string;
  /** Optional non-editable component presentation. */
  readonly view?: ComponentView;
  /** Plain text alternative to a component, never interpreted as HTML. */
  readonly text?: string;
  /** False keeps a direct structural replacement in inline flow; defaults to the layer's placement. */
  readonly block?: boolean;
  /** Confirmed source owner whose selection reveals this replacement; defaults to the replaced range. */
  readonly revealRange?: MsfeSourceRange;
  /** Atomic ranges opt out of automatic source reveal. */
  readonly interaction?: "reveal" | "atomic";
}

/** Bounded projection inputs, with semantic queries and typed state access. */
export interface ProjectionInput extends MsfeSourceRange {
  /** Lazy canonical source. */
  readonly document: SourceDocument;
  /** Directed selection; declare selection dependency when using it to build descriptions. */
  readonly selection: EditorSelection;
  /** Effective presentation. */
  readonly mode: MsfeMode;
  /** Host permission or locked mode. */
  readonly readOnly: boolean;
  /** @param name - Semantic type. @returns Source matches within this pass, including intersecting ancestors. */
  query(name: string): SourceQuery;
  /** @param slot - Declared state dependency. @returns Current value. */
  getState<T>(slot: StateSlot<T>): T;
}

/** Composable layer; block output is provided before CM computes the viewport. */
export interface ProjectionLayer {
  /** Unique capability name; collisions fail before mount. */
  readonly key: string;
  /** Inline visits only visible source; block may emit vertically structural widgets/replacements. */
  readonly placement: "inline" | "block";
  /** Allowed presentations, default live and locked. */
  readonly modes?: readonly MsfeMode[];
  /** Extra selection dependency, default false. Reveal behavior is handled separately by the runtime. */
  readonly selection?: boolean;
  /** Typed state dependencies compared by identity before rebuilding. */
  readonly states?: readonly StateSlot<unknown>[];
  /** Suppress only output intersecting IME's selection; default true. Hidden-syntax presentation stays projected. */
  readonly suppressDuringComposition?: boolean;
  /** Opt into block-local source dependencies. Builds may receive only changed complete syntax blocks.
   * Output and reveal ranges must stay within those blocks. Coordinate-bearing component props require componentView's mapper.
   * Unspecified layers keep conservative full builds. */
  readonly incremental?: boolean;
  /** Incremental output also depends on global Markdown reference definitions; definition changes rebuild the layer. */
  readonly references?: boolean;
  /** @param input - Canonical bounded inputs. @returns Declarative decoration descriptions. */
  readonly build: (input: ProjectionInput) => readonly ProjectionDecoration[];
}

/** Per-layer immutable cache; block rebuild counts belong to state, including speculative drafts. */
export interface LayerCache {
  /** Layer-owned source descriptions. */
  readonly descriptions: readonly ProjectionDecoration[];
  /** Explicit build count along this state lineage. */
  readonly builds: number;
  /** Source-mapped component identities for explicitly incremental layers; never persisted in Markdown. */
  readonly identities?: ReadonlyMap<ProjectionDecoration, string>;
}

/** Materialized backend values and explicit replacement conflict diagnostics. */
export interface LayerOutput {
  /** Sorted visual decorations. */
  readonly decorations: DecorationSet;
  /** Ranges that explicitly opt into atomic navigation. */
  readonly atomic: DecorationSet;
  /** Admitted whole block components; syntax normalization fragments are excluded. */
  readonly objects: DecorationSet;
  /** Replacement owners, used when composing inline layers with direct block output. */
  readonly replacements: readonly MsfeSourceRange[];
  /** Lower-priority replacements that fell back to source. */
  readonly conflicts: number;
}
