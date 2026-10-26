import {
  styleCustomColorCursor,
  styleCustomColorField,
  styleCustomColorHue,
  styleCustomColorInput,
  styleCustomColorInputRow,
  styleCustomColorPanel,
  styleCustomColorPlane,
  styleCustomColorPreview,
  styleCustomColorSliderRow
} from "./style";

/**
 * Creates and styles the stable custom-color DOM.
 *
 * @param ownerDocument - Document creating the editing surface.
 * @returns Complete element references used by controlled updates.
 */
export function createCustomColorPanelElements(ownerDocument: Document) {
  const root = ownerDocument.createElement("div");
  root.dataset.qkCustomColorPanel = "true";
  root.setAttribute("role", "group");
  styleCustomColorPanel(root);
  const plane = ownerDocument.createElement("div");
  plane.dataset.qkCustomColorPlane = "true";
  styleCustomColorPlane(plane);
  const cursor = ownerDocument.createElement("span");
  cursor.setAttribute("aria-hidden", "true");
  styleCustomColorCursor(cursor);
  plane.append(cursor);
  const sliderRow = ownerDocument.createElement("div");
  styleCustomColorSliderRow(sliderRow);
  const hue = ownerDocument.createElement("input");
  hue.type = "range";
  hue.min = "0";
  hue.max = "360";
  hue.dataset.qkCustomColorHue = "true";
  styleCustomColorHue(hue);
  const preview = ownerDocument.createElement("span");
  preview.setAttribute("aria-hidden", "true");
  styleCustomColorPreview(preview);
  sliderRow.append(hue, preview);
  const fields = ownerDocument.createElement("div");
  styleCustomColorInputRow(fields);
  const hex = createInput(ownerDocument, "hex", "text", "HEX", fields);
  hex.maxLength = 6;
  const red = createInput(ownerDocument, "red", "number", "R", fields);
  const green = createInput(ownerDocument, "green", "number", "G", fields);
  const blue = createInput(ownerDocument, "blue", "number", "B", fields);
  for (const input of [red, green, blue]) {
    input.min = "0";
    input.max = "255";
  }
  root.append(plane, sliderRow, fields);
  return {
    root,
    plane,
    cursor,
    hue,
    preview,
    hex,
    red,
    green,
    blue,
    channels: [[hex, "HEX"], [red, "R"], [green, "G"], [blue, "B"]] as const
  };
}

/**
 * Creates one labelled hexadecimal or RGB input.
 *
 * @param ownerDocument - Document creating the input.
 * @param name - Stable dataset suffix.
 * @param type - Native input type.
 * @param channel - Visible channel label.
 * @param parent - Field row receiving the label.
 * @returns Created native input.
 */
function createInput(
  ownerDocument: Document,
  name: "hex" | "red" | "green" | "blue",
  type: "text" | "number",
  channel: string,
  parent: HTMLElement
): HTMLInputElement {
  const label = ownerDocument.createElement("label");
  styleCustomColorField(label);
  const input = ownerDocument.createElement("input");
  input.type = type;
  input.placeholder = name === "hex" ? "#RRGGBB" : "0–255";
  input.dataset[`qkCustomColor${name[0]?.toUpperCase()}${name.slice(1)}`] = "true";
  styleCustomColorInput(input);
  label.append(input, channel);
  parent.append(label);
  return input;
}
