import type {
  DrawingCommandPaintIndicator,
  DrawingContextualCommandIcon
} from "./types";

const svgNamespace = "http://www.w3.org/2000/svg";
const noPaintFrameColor = "#94a3b8";
const noPaintSlashColor = "#ef4444";
const fillPaintRegionPath = [
  "M2.12 12h16.872",
  "l-6.895 6.944",
  "a3.615 3.615 0 0 1-5.112 0",
  "l-3.888-3.888",
  "A3.615 3.615 0 0 1 2.12 12Z"
].join(" ");

// Action silhouettes follow the repository's local lucide-static v1.25.0
// allowlist (ISC); live paint uses small repository-owned internal overlays.
const iconPaths: Readonly<
  Record<DrawingContextualCommandIcon, readonly string[]>
> = {
  wrap: [
    "m16 16-3 3 3 3",
    "M3 12h14.5a1 1 0 0 1 0 7H13",
    "M3 19h6",
    "M3 5h18"
  ],
  fill: [
    "M11 7 6 2",
    "M18.992 12H2.041",
    "m8.5 4.5 2.148-2.148a1.205 1.205 0 0 1 1.704 0l7.296 7.296a1.205 1.205 0 0 1 0 1.704l-7.592 7.592a3.615 3.615 0 0 1-5.112 0l-3.888-3.888a3.615 3.615 0 0 1 0-5.112L5.67 7.33"
  ],
  outline: [
    "M12 3H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4",
    "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
  ],
  "edit-text": [
    "M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6",
    "M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7",
    "M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1",
    "M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1",
    "M9 6v12"
  ],
  delete: [
    "M10 11v6",
    "M14 11v6",
    "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
    "M3 6h18",
    "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  ]
};

/**
 * Creates one compact Lucide-style contextual command icon.
 *
 * @param ownerDocument - Document that owns the mounted toolbar.
 * @param icon - Implemented command artwork to create.
 * @param paintIndicator - Optional live fill or outline state.
 * @returns Accessible-label-neutral SVG artwork for a labelled button.
 */
export function createDrawingContextualCommandIcon(
  ownerDocument: Document,
  icon: DrawingContextualCommandIcon,
  paintIndicator?: DrawingCommandPaintIndicator
): SVGSVGElement {
  const svg = ownerDocument.createElementNS(svgNamespace, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  if (icon === "fill" && paintIndicator !== undefined) {
    appendFillPaintRegion(ownerDocument, svg, paintIndicator);
  }
  for (const [index, pathData] of resolveIconPaths(icon).entries()) {
    const path = ownerDocument.createElementNS(svgNamespace, "path");
    path.setAttribute("d", pathData);
    if (icon === "outline" && index === 0 && paintIndicator !== undefined) {
      applyOutlineFramePaintIndicator(path, paintIndicator);
    }
    svg.append(path);
  }
  if (
    paintIndicator?.kind === "none"
    && (icon === "fill" || icon === "outline")
  ) {
    appendNoPaintSlash(ownerDocument, svg, icon);
  }
  return svg;
}

/**
 * Resolves stable path geometry for one supported command icon.
 *
 * @param icon - Implemented command artwork identifier.
 * @returns Ordered SVG path data for the icon.
 */
function resolveIconPaths(icon: DrawingContextualCommandIcon): readonly string[] {
  return iconPaths[icon];
}

/**
 * Appends live paint inside the bucket rather than below the action icon.
 *
 * @param ownerDocument - Document creating SVG elements.
 * @param svg - Command icon receiving the state projection.
 * @param indicator - Live canonical paint state.
 */
function appendFillPaintRegion(
  ownerDocument: Document,
  svg: SVGSVGElement,
  indicator: DrawingCommandPaintIndicator
): void {
  const paintRegion = ownerDocument.createElementNS(svgNamespace, "path");
  paintRegion.dataset.qkDrawingPaintIndicator = indicator.kind;
  paintRegion.dataset.qkDrawingPaintIndicatorRole = "fill-region";
  paintRegion.setAttribute("d", fillPaintRegionPath);
  paintRegion.setAttribute(
    "fill",
    indicator.kind === "solid" ? indicator.color : "#ffffff"
  );
  paintRegion.setAttribute("stroke", "none");
  svg.append(paintRegion);
}

/**
 * Colors the represented object frame while leaving the edit pencil neutral.
 *
 * @param frame - Lucide outline-frame path receiving live paint state.
 * @param indicator - Live canonical outline state.
 */
function applyOutlineFramePaintIndicator(
  frame: SVGPathElement,
  indicator: DrawingCommandPaintIndicator
): void {
  frame.dataset.qkDrawingPaintIndicator = indicator.kind;
  frame.dataset.qkDrawingPaintIndicatorRole = "outline-frame";
  frame.setAttribute(
    "stroke",
    indicator.kind === "solid" ? indicator.color : noPaintFrameColor
  );
}

/**
 * Adds a compact no-paint mark inside the semantic icon geometry.
 *
 * @param ownerDocument - Document creating SVG elements.
 * @param svg - Command icon receiving the no-paint state.
 * @param icon - Fill or outline command choosing slash placement.
 */
function appendNoPaintSlash(
  ownerDocument: Document,
  svg: SVGSVGElement,
  icon: "fill" | "outline"
): void {
  const slash = ownerDocument.createElementNS(svgNamespace, "path");
  slash.dataset.qkDrawingPaintIndicatorSlash = "true";
  slash.setAttribute(
    "d",
    icon === "fill" ? "M5.25 17.75 16.3 12.25" : "M4.5 4.5 16.5 16.5"
  );
  slash.setAttribute("fill", "none");
  slash.setAttribute("stroke", noPaintSlashColor);
  slash.setAttribute("stroke-width", "1.75");
  svg.append(slash);
}
