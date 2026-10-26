import { flowchartSvgImage } from "./image";
import type { FlowchartImage, FlowchartIcon } from "./types";

/** Neutral, independently authored diagram icon silhouettes. */
export const flowchartIconPaths = {
  cloud: 'M5 19a4 4 0 0 1-1-7 7 7 0 0 1 14-1 4 4 0 0 1 0 8Z',
  server: 'M4 3h16v7H4z M4 14h16v7H4z M7 6h1 M7 17h1 M12 6h5 M12 17h5',
  database: 'M4 6c0-4 16-4 16 0s-16 4-16 0v12c0 4 16 4 16 0V6 M4 12c0 4 16 4 16 0',
  browser: 'M3 4h18v16H3z M3 9h18 M6 6h1 M9 6h1 M12 6h1',
  mobile: 'M7 2h10v20H7z M10 5h4 M11 19h2',
  user: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 22v-3c0-8 16-8 16 0v3',
  mail: 'M2 5h20v14H2z M2 5l10 8L22 5',
  shield: 'M12 2l8 3v8c0 4-8 9-8 9s-8-5-8-9V5Z M8 12l3 3 5-6',
  folder: 'M2 6h8l2 3h10v12H2z M2 6V3h7l3 3h8v3',
  network: 'M9 2h6v6H9z M2 16h6v6H2z M16 16h6v6h-6z M12 8v4 M5 16v-4h14v4',
  globe: 'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0 M2 12h20 M12 2c-6 5-6 15 0 20c6-5 6-15 0-20',
  lock: 'M5 10h14v12H5z M8 10V6a4 4 0 0 1 8 0v4',
} as const satisfies Readonly<Record<FlowchartIcon, string>>;
/** @param icon - Built-in silhouette. @param color - Six-digit stroke color. @param alt - Literal description. @returns The same resource contract used by uploaded SVGs. */
export function createFlowchartIcon(icon: FlowchartIcon, color = "#475569", alt = ""): FlowchartImage {
  if (!Object.hasOwn(flowchartIconPaths, icon) || !/^#[\da-f]{6}$/iu.test(color)) throw new TypeError("image: invalid icon or color");
  return flowchartSvgImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${flowchartIconPaths[icon]}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`, alt);
}
