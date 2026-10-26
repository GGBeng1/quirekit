import type { Graph } from "@antv/x6";
import type { FlowchartDrawingStyle } from "@quirekit/flowchart";
import type { FlowchartAppearance, FlowchartEditorOptions } from "../types";
/** Internal state owned by one controller; never exported from the public entry. */
export interface FlowRuntime {
  /** Optional fixed-scene viewport owner; returns true when public fit was handled. */ presentationFit?: () => boolean;
  /** Instance interface language, independent of portable content. */ locale: string;
  /** Mounted native controls only; callbacks cannot read or mutate graph content. */ readonly localeListeners: Set<() => void>;
  /** Isolated graph instance. */ readonly graph: Graph;
  /** Instance keyboard and overlay boundary. */ readonly mount: HTMLDivElement;
  /** Host callbacks and initial revision. */ readonly options: FlowchartEditorOptions;
  /** Current display-only theme. */ appearance: FlowchartAppearance;
  /** Session tool preference for newly created cells. */ drawing: FlowchartDrawingStyle;
  /** Effective host permission. */ readOnly: boolean;
  /** Whether a transient run currently blocks authoring while allowing navigation/output. */ presenting: boolean;
  /** Whether lifetime has ended. */ destroyed: boolean;
  /** Whether an export currently freezes mutation. */ exporting: boolean;
  /** Whether an atomic whole-source replacement owns the model. */ replacing: boolean;
  /** Whether the pointer owns an unfinished gesture. */ dragging: boolean;
  /** Source invalidation sequence. */ changes: number;
  /** Refreshes opted-in crossing geometry at command/export boundaries. */ refreshCrossings(): void;
  /** Notifies lightweight state without serializing the source. */ notify(): void;
  /** @param error - Recoverable input error. */ fail(error: unknown): void;
}
/** Native text editor lifetime. */
export interface FlowTextInput {
  /** @param id - Selected node/edge. */ open(id: string): void;
  /** @returns Whether native composition is active. */ isComposing(): boolean;
  /** Commits native text or rejects while composing. */ commit(): void;
  /** Closes input without committing. */ cancel(): void;
  /** Releases native listeners. */ destroy(): void;
}
