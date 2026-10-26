import { flowchartSvgImage } from "@quirekit/flowchart";

/** @param values - Illustrative embedding components. @param color - Diagram channel. @returns Canonical self-contained vector resource, never real model telemetry. */
export function attentionVector(values: readonly number[], color: string) {
  const cells = values.map((raw, i) => { const value = Math.max(-1, Math.min(1, raw)); return `<rect x="${3 + i * 13}" y="2" width="11" height="19" rx="2" fill="${color}" opacity="${.15 + Math.abs(value) * .8}"/><rect x="${6 + i * 13}" y="25" width="5" height="2" rx="1" fill="${color}"/><rect x="${7.5 + i * 13}" y="${value < 0 ? 25 : 22}" width="2" height="${value < 0 ? 2 : 8}" rx="1" fill="${color}"/>`; }).join("");
  return flowchartSvgImage(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 34">${cells}</svg>`);
}
