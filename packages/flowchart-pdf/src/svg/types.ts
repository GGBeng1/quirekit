/** Safe link bounds on the normalized intermediate vector page. */
export interface PdfSvgLink {
  /** Approved absolute target. */ readonly url: string;
  /** Left X under PDF's bottom-left origin. */ readonly x: number;
  /** Bottom Y under PDF's bottom-left origin. */ readonly y: number;
  /** Visible link width. */ readonly width: number;
  /** Visible link height. */ readonly height: number;
}
