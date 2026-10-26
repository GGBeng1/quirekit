import type { FlowchartMotionEffect, FlowchartPlaybackState, FlowchartPlaybackTrace } from "@quirekit/flowchart";
import type { FlowchartEditor, FlowchartEditorState } from "@quirekit/flowchart-x6";
/** Shared product control inputs, without vendor models or DOM geometry. */
export interface PlaybackControlsProps {
  /** Exact graph lifetime and its neutral player. */ readonly editor: FlowchartEditor;
  /** Small semantic projection. */ readonly state: FlowchartPlaybackState | undefined;
  /** Session-local preset, used when playback is inactive. */ readonly trace: FlowchartPlaybackTrace;
}
/** One current graph's inspector, also usable in a presentation-only composition. */
export interface PlaybackPanelProps extends PlaybackControlsProps {
  /** Selection/input/permission facts, without reading the source. */ readonly editorState: FlowchartEditorState;
  /** Hide plan authoring in an embedded presentation. */ readonly presentationOnly: boolean;
}
/** Finite authoring presets; continuous line flow differs from a single data transfer. */
export type PlaybackAnimation = "existing" | "none" | "pulse" | "appear" | "halo" | "dot" | "beam" | "token" | "vector" | "flow-dash" | "flow-beam" | "flow-dot";
/** Detached animation intent, consumed only when a user submits a step. */
export interface PlaybackEffectDraft {
  /** Chosen public preset. */ readonly animation: PlaybackAnimation;
  /** Stable captured selection. */ readonly targets: readonly string[];
  /** Exact connector identities within that capture. */ readonly edges: readonly string[];
  /** User-owned plain caption for content-bearing transfer only. */ readonly title: string;
  /** Flow/transfer direction. */ readonly direction: "forward" | "reverse";
  /** Continuous pattern speed in world CSS px/s. */ readonly speed: number;
  /** Milliseconds from the start of the owning step. */ readonly delay: number;
  /** Existing heterogeneous choreography retained unless explicitly replaced. */ readonly existing: readonly FlowchartMotionEffect[] | undefined;
}
/** A bounded inspector summary for effects with identical timing and appearance. */
export interface PlaybackCueGroup {
  /** Stable parameter identity within this detached draft. */ readonly key: string;
  /** Public thumbnail/label preset. */ readonly preset: PlaybackAnimation;
  /** Exact effects represented by this row. */ readonly effects: readonly FlowchartMotionEffect[];
}
/** Captured authoring intent, detached from subsequent selection changes. */
export interface PlaybackStepDraft {
  /** Existing event identity, absent for an additional event. */ readonly id?: string;
  /** Exact target identities. */ readonly targets: readonly string[];
}
