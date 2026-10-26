import type { CompiledExtensions, MsfeExtension, MsfeProjection } from "./types";
import type { MsfeNodeViewSpec } from "../views/types";
import type { AuthorCommandFactories, CommandProps } from "../commands/types";
import type { AnyExtension } from "../authoring/types";
import type { MsfeEditor } from "../editor/types";
import { sourceCommand } from "../commands/planner";
import { sourceRules } from "../rules/runtime";
import { patchAttributes } from "../source/semantics/query";
import type { SourceType } from "../source/semantics/types";
import { editingBoundaries } from "../input/boundaries/runtime";
import { blockInputExtension } from "../input/extension";

/** @param features - Presets and descriptors. @param editor - Late editor reference. @returns Validated order before DOM allocation. */
export function compileExtensions(features: readonly AnyExtension[], editor: () => MsfeEditor = () => { throw new Error("editor-not-created"); }): CompiledExtensions {
  const pending = new Map<string, MsfeExtension>();
  /** @param feature - Descriptor including optional nested presets. */
  function include(input: AnyExtension): void {
    const feature = "resolve" in input ? input.resolve(editor) : input;
    if (!feature.id || pending.has(feature.id)) throw new Error(`duplicate-extension: ${feature.id}`);
    pending.set(feature.id, feature);
    for (const child of feature.includes ?? []) include(child);
  }
  features.forEach(include);
  for (const feature of pending.values()) for (const id of feature.requires ?? []) {
    if (!pending.has(id)) throw new Error(`missing-dependency: ${feature.id} requires ${id}`);
  }
  const ordered: MsfeExtension[] = [];
  const resolved = new Set<string>();
  // Only ready vertices compete on priority; stable sort retains installation order for ties.
  while (pending.size) {
    const ready = [...pending.values()].filter(feature => (feature.requires ?? []).every(id => resolved.has(id)))
      .sort((a, b) => (b.priority ?? 100) - (a.priority ?? 100));
    const next = ready[0];
    if (!next) throw new Error(`dependency-cycle: ${[...pending.keys()].join(", ")}`);
    ordered.push(next); resolved.add(next.id); pending.delete(next.id);
  }
  const projections = new Map<string, MsfeProjection>();
  const nodeViews = new Map<string, MsfeNodeViewSpec>();
  const sources = new Map<string, SourceType>();
  const stateOwners = new Map<string, string>();
  const layerOwners = new Map<string, string>();
  const commands: Record<string, AuthorCommandFactories[string]> = Object.assign(Object.create(null), {
    insertText: (text: string) => ({ tr }: CommandProps) => tr.insertText(text),
    updateAttributes: (name: string, patch: object) => ({ state, tr }: CommandProps) => {
      const changes = patchAttributes(state, sources.get(name), patch);
      return changes !== null && tr.apply({ changes });
    },
  });
  for (const feature of ordered) {
    for (const layer of feature.layers ?? []) {
      if (!layer.key || layerOwners.has(layer.key)) throw new Error(`duplicate-projection-layer: ${layer.key} (${layerOwners.get(layer.key)}, ${feature.id})`);
      layerOwners.set(layer.key, feature.id);
    }
    for (const slot of feature.states ?? []) {
      if (stateOwners.has(slot.key)) throw new Error(`duplicate-state: ${slot.key} (${stateOwners.get(slot.key)}, ${feature.id})`);
      stateOwners.set(slot.key, feature.id);
    }
    if (feature.source) {
      if (sources.has(feature.source.name)) throw new Error(`duplicate-source-type: ${feature.source.name}`);
      sources.set(feature.source.name, feature.source);
    }
    for (const projection of feature.projections ?? []) for (const name of projection.nodes) {
      if (projections.has(name)) throw new Error(`duplicate-projection-owner: ${name}`);
      projections.set(name, projection);
    }
    const spec = feature.nodeView;
    if (spec) for (const name of spec.nodes) {
      if (nodeViews.has(name)) throw new Error(`duplicate-node-view-owner: ${name}`);
      nodeViews.set(name, feature.addNodeView ? { ...spec, renderer: feature.addNodeView() } : spec);
    }
    for (const [name, factory] of Object.entries(feature.commands ?? {})) {
      if (name in commands || ["run", "command", "chain", "then"].includes(name)) throw new Error(`duplicate-command: ${name}`);
      commands[name] = (...args) => sourceCommand(factory(...args));
    }
    for (const [name, factory] of Object.entries(feature.authorCommands ?? {})) {
      if (name in commands || ["run", "command", "chain", "then"].includes(name)) throw new Error(`duplicate-command: ${name}`);
      commands[name] = factory;
    }
  }
  const providers = ordered.filter(feature => feature.sourceProvider);
  if (providers.length > 1) throw new Error(`duplicate-source-provider: ${providers.map(feature => feature.id).join(", ")}`);
  return { ordered, projections, nodeViews, sources, commands, ...(providers[0]?.sourceProvider ? { sourceProvider: providers[0].sourceProvider } : {}),
    layers: ordered.flatMap(feature => feature.layers ?? []),
    extensions: [sourceRules(ordered.flatMap(feature => feature.inputRules ?? []), ordered.flatMap(feature => feature.pasteRules ?? [])),
      editingBoundaries(ordered.flatMap(feature => feature.editingBoundaries ?? [])),
      blockInputExtension(ordered.flatMap(feature => feature.blockInput ?? [])),
      ...ordered.flatMap(feature => feature.states?.map(slot => slot.extension) ?? []),
      ...ordered.flatMap(feature => feature.extensions ? [feature.extensions] : [])],
    syntax: ordered.flatMap(feature => feature.syntax ? [feature.syntax] : []),
  };
}
