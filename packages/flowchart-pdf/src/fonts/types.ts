import type { Font } from "fontkit";
import type { FlowchartPdfFontProvider, FlowchartPdfFontSource } from "../types";

/** One reversible document-scoped resource registration. */
export interface FontRegistration {
  /** Registered provider. */ readonly provider: FlowchartPdfFontProvider;
  /** Previous registration, possibly disposed out of order. */ readonly previous?: FontRegistration | undefined;
  /** Whether the registration may be restored. */ active: boolean;
}
/** One task-local decoded face. */
export interface PdfFontFace {
  /** Approved metadata. */ readonly source: FlowchartPdfFontSource;
  /** Unique task-local SVG/PDF name. */ readonly name: string;
  /** Complete immutable font bytes. */ readonly bytes: Uint8Array<ArrayBuffer>;
  /** Public glyph coverage parser. */ readonly font: Font;
}
/** Typography inherited from static SVG attributes. */
export interface SvgFontStyle {
  /** CSS family list. */ readonly family: string;
  /** Requested bold posture. */ readonly bold: boolean;
  /** Requested italic posture. */ readonly italic: boolean;
}
