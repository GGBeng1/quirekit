import type { ComponentViewRenderer } from "../views/component/types";
import type { MsfeIconFactory } from "../presentation/types";
import type { SearchAction, SearchPanelProps, SearchParameters } from "./types";

/** @param icon - Host icons. @returns Small framework-free fallback using the same query/action contract. */
export function nativeSearchPanel(icon: MsfeIconFactory): ComponentViewRenderer<SearchPanelProps> {
  return ({ dom, props }) => {
    let current = props;
    const document = dom.ownerDocument;
    dom.classList.add("cm-search");
    dom.setAttribute("role", "search"); dom.setAttribute("aria-label", current.phrase("Find"));
    const actions = new Map<HTMLButtonElement, SearchAction>();
    /** @param name - Query field. @param label - Phrase key. @returns Labeled native input. */
    function field(name: "search" | "replace", label: string): HTMLInputElement {
      const input = document.createElement("input"); input.name = name; input.className = "cm-textfield";
      input.placeholder = current.phrase(label); input.setAttribute("aria-label", current.phrase(label));
      input.addEventListener("input", () => current.setQuery({ [name]: input.value })); return input;
    }
    /** @param label - Phrase key. @param action - Canonical search action. @returns Accessible button. */
    function button(label: string, action: SearchAction): HTMLButtonElement {
      const element = document.createElement("button"); element.type = "button"; element.className = "cm-button";
      element.textContent = current.phrase(label); element.addEventListener("click", () => current.run(action)); actions.set(element, action); return element;
    }
    const query = field("search", "Find"); query.setAttribute("main-field", "true");
    const replacement = field("replace", "Replace");
    const flags = ["caseSensitive", "regexp", "wholeWord"] as const;
    const labels = ["match case", "regexp", "by word"];
    const checks = flags.map((name, index) => {
      const label = document.createElement("label"), input = document.createElement("input");
      input.type = "checkbox"; input.name = name;
      input.addEventListener("change", () => current.setQuery({ [name]: input.checked } as Partial<SearchParameters>));
      label.append(input, current.phrase(labels[index]!)); return { label, input };
    });
    const replaceRow = document.createElement("div");
    replaceRow.append(replacement, button("replace", "replace"), button("replace all", "replaceAll"));
    const close = button("close", "close"); close.name = "close";
    close.setAttribute("aria-label", current.phrase("close")); close.replaceChildren(icon("close", document));
    dom.append(query, button("next", "next"), button("previous", "previous"), button("all", "all"), ...checks.map(check => check.label), replaceRow, close);
    /** @param value - Latest immutable search metadata. */
    function update(value: SearchPanelProps): void {
      current = value;
      if (query.value !== value.query.search) query.value = value.query.search;
      if (replacement.value !== value.query.replace) replacement.value = value.query.replace;
      flags.forEach((name, index) => { checks[index]!.input.checked = value.query[name]; });
      query.setAttribute("aria-invalid", String(!!value.query.search && !value.valid));
      if (value.readOnly && replaceRow.contains(document.activeElement)) query.focus();
      replaceRow.hidden = value.readOnly;
      for (const [element, action] of actions) element.disabled = action !== "close" && (!value.valid || value.composing || value.readOnly && (action === "replace" || action === "replaceAll"));
    }
    update(props);
    return { update, destroy() { dom.replaceChildren(); } };
  };
}
