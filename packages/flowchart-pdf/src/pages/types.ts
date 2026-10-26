/** Placement of the one reusable vector form on a physical PDF page. */
export interface PdfPagePlacement {
  /** Bottom-left X in PDF points. */ readonly x: number;
  /** Bottom-left Y in PDF points. */ readonly y: number;
  /** Whole graph width in PDF points. */ readonly width: number;
  /** Whole graph height in PDF points. */ readonly height: number;
}
