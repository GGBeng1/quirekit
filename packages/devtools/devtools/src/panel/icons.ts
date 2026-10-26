import {
  Activity,
  Braces,
  ChevronDown,
  ChevronRight,
  Copy,
  Crosshair,
  Download,
  FileJson,
  Gauge,
  GripHorizontal,
  Keyboard,
  Maximize2,
  Minimize2,
  MousePointerClick,
  PanelBottomOpen,
  Search,
  Trash2,
  X
} from "lucide-static";

/** Lucide icon names used by the devtools panel. */
export type QuireDevtoolsIconName =
  | "activity"
  | "braces"
  | "chevron-down"
  | "chevron-right"
  | "copy"
  | "crosshair"
  | "download"
  | "file-json"
  | "gauge"
  | "grip"
  | "keyboard"
  | "maximize"
  | "minimize"
  | "mouse"
  | "panel"
  | "search"
  | "trash"
  | "x";

const icons: Record<QuireDevtoolsIconName, string> = {
  activity: Activity,
  braces: Braces,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  copy: Copy,
  crosshair: Crosshair,
  download: Download,
  "file-json": FileJson,
  gauge: Gauge,
  grip: GripHorizontal,
  keyboard: Keyboard,
  maximize: Maximize2,
  minimize: Minimize2,
  mouse: MousePointerClick,
  panel: PanelBottomOpen,
  search: Search,
  trash: Trash2,
  x: X
};

/**
 * Renders a Lucide icon SVG string with panel-scoped classes.
 *
 * @param name - Icon name.
 * @param className - Extra class name.
 * @returns SVG markup.
 */
export function renderIcon(
  name: QuireDevtoolsIconName,
  className = ""
): string {
  const classes = ["qk-devtools-icon", className].filter(Boolean).join(" ");

  return icons[name]
    .replace("<svg", `<svg class="${classes}" aria-hidden="true" focusable="false"`)
    .replace(/ width="[^"]+"/, "")
    .replace(/ height="[^"]+"/, "");
}

/**
 * Renders the QuireKit brand mark.
 *
 * @returns SVG markup for the custom QuireKit logo.
 */
export function renderQuireKitLogo(): string {
  return [
    "<svg class=\"qk-devtools-logo\" viewBox=\"0 0 32 32\" aria-hidden=\"true\" focusable=\"false\">",
    "<rect x=\"4\" y=\"4\" width=\"24\" height=\"24\" rx=\"7\" fill=\"#07110d\" stroke=\"#1f6f50\"/>",
    "<path d=\"M10 11.5C10 9.57 11.57 8 13.5 8H21C21.55 8 22 8.45 22 9V20.5C22 22.43 20.43 24 18.5 24H11C10.45 24 10 23.55 10 23V11.5Z\" fill=\"#00dc82\"/>",
    "<path d=\"M14 13H19M14 17H20\" stroke=\"#07110d\" stroke-width=\"1.8\" stroke-linecap=\"round\"/>",
    "<path d=\"M19.5 20.5L24 25\" stroke=\"#7dd3fc\" stroke-width=\"2.4\" stroke-linecap=\"round\"/>",
    "</svg>"
  ].join("");
}
