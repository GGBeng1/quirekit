/** Keys of the independently authored diagram icon catalog. */
export type FlowchartIcon = "cloud" | "server" | "database" | "browser" | "mobile" | "user" | "mail" | "shield" | "folder" | "network" | "globe" | "lock";
/** Self-contained image used by a portable image node. */
export interface FlowchartImage {
  /** Embedded PNG or URI-encoded static SVG; never a network/blob URL. */ readonly dataUrl: string;
  /** Intrinsic pixel/viewBox width, independent of node display size. */ readonly width: number;
  /** Intrinsic pixel/viewBox height. */ readonly height: number;
  /** Literal accessible description, up to 200 characters. */ readonly alt: string;
  /** Non-destructive normalized source insets; absent keeps the whole original. */ readonly crop?: FlowchartImageCrop;
  /** How retained source content fits its node frame; absent means contain. */ readonly fit?: "contain" | "cover";
  /** Preserve the current node-frame ratio during direct drag resizing. */ readonly lockAspectRatio?: boolean;
}
/** Fractions removed from each edge of the original image, independent of its frame. */
export interface FlowchartImageCrop {
  /** Removed top fraction. */ readonly top: number;
  /** Removed right fraction. */ readonly right: number;
  /** Removed bottom fraction. */ readonly bottom: number;
  /** Removed left fraction. */ readonly left: number;
}
/** A positive rectangle expressed in the image node's local coordinates. */
export interface FlowchartImageRect {
  /** Left coordinate. */ readonly x: number;
  /** Top coordinate. */ readonly y: number;
  /** Horizontal extent. */ readonly width: number;
  /** Vertical extent. */ readonly height: number;
}
/** One explicit equal-scale projection and its retained clipping surface. */
export interface FlowchartImagePlacement extends FlowchartImageRect {
  /** Intersection of the retained source rectangle and the node frame. */ readonly clip: FlowchartImageRect;
}
/** Validated standalone vector source before URI encoding. */
export interface FlowchartSvg {
  /** Canonical allowlisted XML. */ readonly source: string;
  /** Intrinsic viewBox width. */ readonly width: number;
  /** Intrinsic viewBox height. */ readonly height: number;
}
/** XML parser's private ordered element representation. */
export interface SvgEntry {
  /** Ordered parser children or literal text. */ readonly [name: string]: readonly SvgEntry[] | string | Readonly<Record<string, string>>;
}
