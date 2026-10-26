import { expect, it } from "vitest";
import type { FlowchartDocument, FlowchartNode } from "@quirekit/flowchart";
import { organizationDiagram } from "./organization";
import { fishboneDiagram } from "./fishbone";
import { radialDiagram } from "./radial";
import { cycleDiagram } from "./cycle";
import { milestonesDiagram } from "./milestones";
import { honeycombDiagram } from "./honeycomb";

/** @param graph - Authored graph. @param id - Node identity. @returns All edges attached to the node. */
function connections(graph: FlowchartDocument, id: string) {
  return graph.edges.filter(edge => ("node" in edge.source && edge.source.node === id) || ("node" in edge.target && edge.target.node === id));
}
/** @param node - Positioned shape. @returns World-space center. */
function center(node: FlowchartNode) { return { x: node.x + node.width / 2, y: node.y + node.height / 2 }; }

it("organization is a three-level rooted tree with real reporting links", () => {
  const graph = organizationDiagram(), incoming = new Map<string, number>();
  for (const edge of graph.edges) {
    expect(edge.style.targetArrow).toBe("none");
    if ("node" in edge.target) incoming.set(edge.target.node, (incoming.get(edge.target.node) ?? 0) + 1);
  }
  const roles = graph.nodes.filter(node => node.shape !== "text");
  expect(roles).toHaveLength(10); expect(graph.edges).toHaveLength(9);
  expect(roles.filter(node => !incoming.has(node.id))).toHaveLength(1);
  expect([...incoming.values()].every(count => count === 1)).toBe(true);
  expect(new Set(roles.map(node => node.y)).size).toBe(3);
});

it("fishbone causes attach to visible joints rather than detached free coordinates", () => {
  const graph = fishboneDiagram();
  expect(graph.nodes.filter(node => node.id.startsWith("cause-"))).toHaveLength(12);
  const main = graph.nodes.filter(node => node.id.startsWith("spine-"));
  expect(main).toHaveLength(3); expect(new Set(main.map(node => center(node).y)).size).toBe(1);
  expect(main.every(node => connections(graph, node.id).length === 4)).toBe(true);
  expect(graph.edges.every(edge => "node" in edge.source && "node" in edge.target)).toBe(true);
  expect(graph.edges.filter(edge => edge.style.targetArrow === "block")).toHaveLength(1);
});

it("radial relationships have a hub, six groups and twelve separate satellites", () => {
  const graph = radialDiagram(), circles = graph.nodes.filter(node => node.shape === "circle");
  const hub = circles.find(node => connections(graph, node.id).length === 6)!;
  expect(hub).toBeDefined(); expect(circles).toHaveLength(19);
  expect(circles.filter(node => connections(graph, node.id).length === 3)).toHaveLength(6);
  expect(circles.filter(node => connections(graph, node.id).length === 1)).toHaveLength(12);
  for (const a of circles) for (const b of circles) if (a.id !== b.id) {
    const ac = center(a), bc = center(b);
    expect(Math.hypot(ac.x - bc.x, ac.y - bc.y)).toBeGreaterThan((a.width + b.width) / 2 + 8);
  }
});

it("cycle arrows form one closed ring with saved curve points outside its center", () => {
  const graph = cycleDiagram(), steps = graph.nodes.filter(node => node.shape === "circle");
  expect(steps).toHaveLength(6); expect(graph.edges).toHaveLength(6);
  const visited = new Set<string>(); let id = steps[0]!.id;
  for (let i = 0; i < steps.length; i++) {
    expect(visited.has(id)).toBe(false); visited.add(id);
    const edge = graph.edges.find(item => "node" in item.source && item.source.node === id)!;
    expect(edge.connector).toBe("smooth"); expect(edge.vertices).toHaveLength(1);
    expect(edge.style.targetArrow).toBe("block");
    id = "node" in edge.target ? edge.target.node : "";
  }
  expect(id).toBe(steps[0]!.id);
});

it("milestones share a chronological axis with alternating attached captions", () => {
  const graph = milestonesDiagram(), dots = graph.nodes.filter(node => node.shape === "circle");
  expect(dots).toHaveLength(6); expect(new Set(dots.map(node => center(node).y)).size).toBe(1);
  expect(dots.map(node => node.x)).toEqual(dots.map(node => node.x).sort((a, b) => a - b));
  const captions = graph.nodes.filter(node => node.id.startsWith("event-"));
  expect(captions).toHaveLength(6);
  captions.forEach((node, i) => {
    expect(center(node).x).toBe(center(dots[i]!).x);
    expect(center(node).y < center(dots[i]!).y).toBe(i % 2 === 0);
    expect(connections(graph, node.id)).toHaveLength(1);
  });
});

it("honeycomb is seven editable adjacent capability cells without fake workflow arrows", () => {
  const graph = honeycombDiagram(), cells = graph.nodes.filter(node => node.shape === "hexagon");
  expect(cells).toHaveLength(7); expect(graph.edges).toHaveLength(0);
  expect(new Set(cells.map(node => node.text)).size).toBe(7);
  const hub = center(cells[0]!);
  expect(cells.slice(1).every(node => Math.abs(Math.hypot(center(node).x - hub.x, center(node).y - hub.y) - 190) < 1)).toBe(true);
});
