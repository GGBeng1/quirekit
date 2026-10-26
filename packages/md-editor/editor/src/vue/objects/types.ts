import type { MsfeSourceRange, SourceAnchor } from "@quirekit/msfe-core";

/** Diagrams whose envelope carries a saved PNG and opens a graphical editor. */
export type MdNativeDiagramKind = "mindMap" | "flowchart" | "whiteboard";

/** Source-rendered block previews edited through the host's preview dialog. */
export type MdPreviewKind = "mermaid" | "textDiagram" | "math";

/** Opaque document objects that select as a whole instead of placing a caret. */
export type MdObjectKind = MdNativeDiagramKind | MdPreviewKind | "image" | "dataView";

/** Source identity of a clicked object, resolved from its mounted component root. */
export interface MdObjectHit {
  /** Feature owning the component. */ readonly kind: MdObjectKind;
  /** Complete fence for diagrams, or the inline image syntax. */ readonly range: MsfeSourceRange;
}

/** Saved raster shared by the diagram envelopes. */
export interface MdObjectRaster {
  /** PNG data URL saved with the source; absent when the host stored the image. */ readonly dataUrl?: string | undefined;
  /** Address of the PNG stored by the host. */ readonly url?: string | undefined;
  /** Intrinsic width in CSS pixels. */ readonly width: number;
  /** Intrinsic height in CSS pixels. */ readonly height: number;
}

/** Current object facts read from canonical source when the action bar renders. */
export interface MdObjectFacts {
  /** Visible name: diagram title or optional image title; empty when absent. */ readonly title: string;
  /** Accessible description of the preview. */ readonly alt: string;
  /** Image address for preview, or the diagram's saved PNG; null before any preview exists. */ readonly src: string | null;
  /** Whether the preview sits on white paper (diagrams) rather than transparency. */ readonly paper: boolean;
  /** Download format of {@link MdObjectFacts.src}. */ readonly format: "png" | "svg";
}

/** One selected object, mapped through edits until it is removed or released. */
export interface MdObjectSelection {
  /** Feature owning the component. */ readonly kind: MdObjectKind;
  /** Mapped source range of the object. */ readonly anchor: SourceAnchor;
  /** Mounted component root; replaced when the view remounts the widget. */ element: HTMLElement;
}

/** Client-space frame of the selected object. */
export interface MdObjectRect {
  /** Left edge in CSS pixels. */ readonly left: number;
  /** Top edge in CSS pixels. */ readonly top: number;
  /** Rendered width. */ readonly width: number;
  /** Rendered height. */ readonly height: number;
}

/** One preview gallery entry, shaped for the shared image preview. */
export interface MdObjectGalleryItem {
  /** Kind and source position, unique within the document. */ readonly id: string;
  /** Image address or saved diagram PNG. */ readonly src: string;
  /** Accessible description. */ readonly alt: string;
  /** Optional visible title. */ readonly title?: string;
  /** Paper color under transparent diagram previews. */ readonly background?: string;
}

/** A text diagram outside the viewport that the gallery renders on demand. */
export interface MdPendingDiagram {
  /** Gallery item to update. */ readonly id: string;
  /** Text diagram grammar. */ readonly language: string;
  /** Diagram body without fences. */ readonly text: string;
}

/** Document-ordered gallery opened at one object. */
export interface MdObjectGallery {
  /** Every previewable image and diagram. */ readonly items: readonly MdObjectGalleryItem[];
  /** Index of the object that opened the preview. */ readonly index: number;
  /** Placeholders still waiting for a render. */ readonly pending: readonly MdPendingDiagram[];
}
