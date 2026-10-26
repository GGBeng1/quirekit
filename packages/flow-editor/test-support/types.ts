import type { FlowchartDocument, FlowchartPlaybackTrace } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowEditorOptions } from "@quirekit/flow-editor";
/** Verification host access; absent from published components. */
export interface FlowFixture {
  /** @param kind - Verification-only sample. @param locale - Sample content language. @returns Explicit consumer load; production UI has no sample actions. */ loadExample(kind: "reference" | "attention" | "residual", locale?: string): Promise<void>;
  /** @param locale - Reactive host language preference for lifecycle verification. */ setLocale(locale: string): void;
  /** @returns The live neutral controller. */ editor(): FlowchartEditor;
  /** @returns Last host commit. */ committed(): FlowchartDocument;
  /** @returns Content invalidation count. */ invalidations(): number;
  /** @param options - Independent mount fixture. @returns New neutral controller. */ create(options: FlowEditorOptions): Promise<FlowchartEditor>;
  /** @param document - Canonical source. @param trace - Explicit host steps. @returns Independent public Vue presentation consumer. */ mountPresentation(document: FlowchartDocument, trace: FlowchartPlaybackTrace): Promise<FlowchartEditor>;
  /** Unmounts only the independent presentation consumer. */ disposePresentation(): void;
}
declare global {
  interface Window {
    /** Test-host bridge for source and lifecycle assertions. */ flowFixture: FlowFixture;
  }
}
