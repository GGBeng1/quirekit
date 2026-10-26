import type {
  CreateSvgGeometryProviderOptions,
  SvgTextMeasurement
} from "../types";
import { collectSvgTextPaintCommands } from "./commands";
import { createSvgTextElementMeasurement } from "./text-element";

/**
 * Collects browser-measurable SVG text nodes and matches them to display commands.
 *
 * @param options - Render result and SVG text roots.
 * @returns Measurements keyed by display command range.
 */
export function collectSvgTextMeasurements(
  options: CreateSvgGeometryProviderOptions
): readonly SvgTextMeasurement[] {
  const commands = collectSvgTextPaintCommands(
    options.renderResult.contentDisplayList.commands
  );
  for (const chunk of options.renderResult.pageDisplayListChunks?.chunks ?? []) {
    for (const [commandId, command] of collectSvgTextPaintCommands(
      chunk.contentDisplayList.commands
    )) {
      commands.set(commandId, command);
    }
  }
  const measurements: SvgTextMeasurement[] = [];

  for (const root of options.textRoots) {
    for (const element of root.querySelectorAll("text[data-quirekit-command-id]")) {
      const commandId = element.getAttribute("data-quirekit-command-id");
      const command = commandId === null ? undefined : commands.get(commandId);

      if (!command || command.range === undefined || command.text.length === 0) {
        continue;
      }

      measurements.push(
        createSvgTextElementMeasurement({
          root,
          element: element as SVGTextContentElement,
          command
        })
      );
    }
  }

  return measurements;
}
