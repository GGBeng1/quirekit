import type {
  HtmlDomPatchHost,
  MutableHtmlReconcileTrace
} from "./types";

/**
 * Creates a direct-DOM patch host backed by one exact mutation trace.
 *
 * @param trace - Mutable trace for the current reconciliation pass.
 * @returns Narrow retained DOM patch host.
 */
export function createHtmlDomPatchHost(
  trace: MutableHtmlReconcileTrace
): HtmlDomPatchHost {
  return {
    patchText(descriptor, value): void {
      const dom = descriptor.mount?.dom;

      if (!dom || dom.nodeValue === value) {
        return;
      }
      dom.nodeValue = value;
      descriptor.geometryEpoch += 1;
      trace.textWrites.push(descriptor.id);
      trace.textWriteDetails.push({ descriptorId: descriptor.id, value });
    },
    patchAttributes(descriptor, desired): void {
      const current = descriptor.mount?.dom;

      if (!isElement(current)) {
        return;
      }
      const names = new Set([...readAttributeNames(current), ...readAttributeNames(desired)]);
      let wroteAttribute = false;

      for (const name of names) {
        const nextValue = desired.getAttribute(name);

        if (current.getAttribute(name) === nextValue) {
          continue;
        }
        if (nextValue === null) {
          current.removeAttribute(name);
        } else {
          current.setAttribute(name, nextValue);
        }
        wroteAttribute = true;
        trace.attributeWrites.push({ descriptorId: descriptor.id, name, value: nextValue });
      }
      if (wroteAttribute) {
        descriptor.geometryEpoch += 1;
      }
    },
    placeChild(parent, child, index): void {
      const contentDOM = parent.mount?.contentDOM;
      const childDOM = child.mount?.dom;

      if (!contentDOM || !childDOM) {
        return;
      }
      const current = contentDOM.childNodes[index] ?? null;

      if (current === childDOM) {
        return;
      }
      const operation = childDOM.parentNode ? "move" : "insert";

      contentDOM.insertBefore(childDOM, current);
      parent.geometryEpoch += 1;
      child.geometryEpoch += 1;
      trace.structureWrites.push({ operation, descriptorId: child.id, parentId: parent.id, index });
    },
    removeChild(parent, child): void {
      const contentDOM = parent.mount?.contentDOM;
      const childDOM = child.mount?.dom;

      if (!contentDOM || !childDOM || childDOM.parentNode !== contentDOM) {
        return;
      }
      const index = Array.from<Node>(contentDOM.childNodes).indexOf(childDOM);

      contentDOM.removeChild(childDOM);
      parent.geometryEpoch += 1;
      child.geometryEpoch += 1;
      trace.structureWrites.push({ operation: "remove", descriptorId: child.id, parentId: parent.id, index });
    }
  };
}

/**
 * Reads browser or fake-DOM attribute names.
 *
 * @param element - Element whose attributes are inspected.
 * @returns Attribute names in stable DOM order.
 */
function readAttributeNames(element: Element): string[] {
  if (typeof element.getAttributeNames === "function") {
    return element.getAttributeNames();
  }
  return Array.from(element.attributes, (attribute) => attribute.name);
}

/**
 * Narrows a DOM node to an element without relying on global constructors.
 *
 * @param node - Possible retained shell node.
 * @returns Whether the node exposes the element attribute contract.
 */
function isElement(node: Node | null | undefined): node is Element {
  return Boolean(node && node.nodeType === 1 && "getAttribute" in node);
}
