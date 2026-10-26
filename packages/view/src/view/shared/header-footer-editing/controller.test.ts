// @vitest-environment happy-dom

import type { QuireInteractionSelectionTarget } from "@quirekit/view-engine";
import { describe, expect, it, vi } from "vitest";
import { createMountedHeaderFooterEditingController } from "./controller";
import type { QuireHeaderFooterToolbarRenderer, QuireHeaderFooterToolbarState } from "./toolbar";

describe("mounted header/footer editing controller", () => {
  it("requires a double click before a header story may own selection", () => {
    const fixture = createControllerFixture();
    const target = createStoryTarget("header", "header:first", "page:1:header");

    expect(fixture.controller.preparePointerSelection(target, 1)).toBe(false);
    expect(fixture.controller.getSession()).toBeNull();
    expect(fixture.root.dataset.qkHeaderFooterEditing).toBeUndefined();

    expect(fixture.controller.preparePointerSelection(target, 2)).toBe(true);
    expect(fixture.controller.getSession()).toEqual({
      sourceId: "header:first",
      region: "header",
      visualInstanceId: "page:1:header"
    });
    expect(fixture.root.dataset.qkHeaderFooterEditing).toBe("header");
    expect(fixture.onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceId: "header:first" })
    );
  });

  it("gates floating descendants and their controls through the enclosing story", () => {
    const fixture = createControllerFixture();
    const object = createScopedHeaderTarget("object");
    const control = createScopedHeaderTarget("control");

    expect(fixture.controller.preparePointerSelection(object, 1)).toBe(false);
    expect(fixture.controller.getSession()).toBeNull();

    expect(fixture.controller.preparePointerSelection(object, 2)).toBe(true);
    expect(fixture.controller.getSession()).toMatchObject({
      sourceId: "word-story:header-default",
      region: "header"
    });
    expect(fixture.controller.preparePointerSelection(control, 1)).toBe(true);
    expect(fixture.controller.matchesTarget(control)).toBe(true);
  });

  it("keeps one shared story active across repeated visual instances", () => {
    const fixture = createControllerFixture();

    fixture.controller.preparePointerSelection(
      createStoryTarget("footer", "footer:default", "page:1:footer"),
      2
    );

    expect(fixture.controller.preparePointerSelection(
      createStoryTarget("footer", "footer:default", "page:2:footer"),
      1
    )).toBe(true);
    expect(fixture.controller.getSession()?.visualInstanceId).toBe("page:2:footer");
    expect(fixture.overlayHost.querySelector("[data-qk-header-footer-band]"))
      .not.toBeNull();
  });

  it("retains section command ownership and separates shared stories by section", () => {
    const fixture = createControllerFixture();
    const firstSection = createStoryTarget(
      "header",
      "header:shared",
      "page:1:header",
      { position: 0, nodeType: "wordSection", stableId: "section-1" }
    );
    const secondSection = createStoryTarget(
      "header",
      "header:shared",
      "page:2:header",
      { position: 42, nodeType: "wordSection", stableId: "section-2" }
    );

    fixture.controller.preparePointerSelection(firstSection, 2);

    expect(fixture.controller.getSession()?.commandOwner).toEqual({
      position: 0,
      nodeType: "wordSection",
      stableId: "section-1"
    });
    expect(fixture.controller.preparePointerSelection(secondSection, 1)).toBe(false);
    expect(fixture.controller.getSession()).toBeNull();
  });

  it("steps the section distance from the action bar without leaving the session", () => {
    const fixture = createControllerFixture({ commandDistanceTwips: 709 });
    fixture.controller.preparePointerSelection(
      createStoryTarget(
        "header",
        "header:first",
        "page:1:header",
        { position: 0, nodeType: "wordSection", stableId: "section-1" }
      ),
      2
    );

    expect(requireElement(
      fixture.overlayHost,
      '[data-qk-header-footer-distance-value="header"]'
    ).textContent).toBe("1.25 cm");

    const increment = requireElement(
      fixture.overlayHost,
      '[aria-label="Increase header distance from top"]'
    );
    increment.click();
    fixture.setDistanceTwips(737);
    increment.click();

    expect(fixture.onDistanceChange).toHaveBeenNthCalledWith(1, expect.any(Object), 737);
    expect(fixture.onDistanceChange).toHaveBeenNthCalledWith(2, expect.any(Object), 765);
    expect(fixture.controller.getSession()).not.toBeNull();
  });

  it("hides the distance stepper when the session has no section owner", () => {
    const fixture = createControllerFixture();
    fixture.controller.preparePointerSelection(
      createStoryTarget("header", "header:first", "page:1:header"),
      2
    );

    expect(requireElement(
      fixture.overlayHost,
      '[data-qk-header-footer-distance-value="header"]'
    ).style.display).toBe("none");
  });

  it("draws one body-width boundary per region and clips the wash inside the page", () => {
    const headerFixture = createControllerFixture();
    headerFixture.controller.preparePointerSelection(
      createStoryTarget("header", "header:first", "page:1:header"),
      2
    );

    expect(readRectStyle(requireElement(
      headerFixture.overlayHost,
      "[data-qk-header-footer-band]"
    ))).toEqual({ left: "0px", top: "0px", width: "600px", height: "100px" });
    expect(readRectStyle(requireElement(
      headerFixture.overlayHost,
      "[data-qk-header-footer-inactive]"
    ))).toEqual({ left: "1px", top: "100px", width: "598px", height: "699px" });
    expect(readRectStyle(requireElement(
      headerFixture.overlayHost,
      '[data-qk-header-footer-guide="header"]'
    ))).toEqual({ left: "40px", top: "100px", width: "520px", height: "0px" });
    expect(readRectStyle(requireElement(
      headerFixture.overlayHost,
      '[data-qk-header-footer-guide="footer"]'
    ))).toEqual({ left: "40px", top: "700px", width: "520px", height: "0px" });
    expect(requireElement(
      headerFixture.overlayHost,
      '[data-qk-header-footer-guide="header"]'
    ).dataset.qkHeaderFooterGuideActive).toBe("true");
    expect(requireElement(
      headerFixture.overlayHost,
      '[data-qk-header-footer-guide="footer"]'
    ).dataset.qkHeaderFooterGuideActive).toBe("false");
    expect(headerFixture.overlayHost.querySelectorAll(
      "[data-qk-header-footer-boundary-label]"
    )).toHaveLength(1);

    const footerFixture = createControllerFixture();
    footerFixture.controller.preparePointerSelection(
      createStoryTarget("footer", "footer:default", "page:1:footer"),
      2
    );

    expect(readRectStyle(requireElement(
      footerFixture.overlayHost,
      "[data-qk-header-footer-inactive]"
    ))).toEqual({ left: "1px", top: "1px", width: "598px", height: "699px" });
    expect(requireElement(
      footerFixture.overlayHost,
      '[data-qk-header-footer-guide="footer"]'
    ).dataset.qkHeaderFooterGuideActive).toBe("true");
  });

  it("anchors the region tag and action bar to the active boundary in the mounted language", () => {
    const fixture = createControllerFixture({ lang: "zh-CN" });
    fixture.controller.preparePointerSelection(
      createStoryTarget("footer", "footer:default", "page:1:footer"),
      2
    );

    const tag = requireElement(
      fixture.overlayHost,
      '[data-qk-header-footer-boundary-label="footer"]'
    );
    const actions = requireElement(
      fixture.overlayHost,
      '[data-qk-header-footer-actions="footer"]'
    );
    expect(tag.textContent).toBe("页脚");
    expect([tag.style.left, tag.style.top]).toEqual(["40px", "700px"]);
    expect([actions.style.left, actions.style.top]).toEqual(["560px", "700px"]);
    expect(requireElement(actions, '[data-qk-header-footer-exit="footer"]')
      .getAttribute("aria-label")).toBe("关闭页脚");
  });

  it("closes from the action bar while pointer presses keep editor focus", () => {
    const fixture = createControllerFixture();
    fixture.controller.preparePointerSelection(
      createStoryTarget("header", "header:first", "page:1:header"),
      2
    );
    const actions = requireElement(
      fixture.overlayHost,
      '[data-qk-header-footer-actions="header"]'
    );
    const exit = requireElement(actions, '[data-qk-header-footer-exit="header"]');
    const press = new Event("pointerdown", { bubbles: true, cancelable: true });

    exit.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
    exit.click();

    expect(fixture.controller.getSession()).toBeNull();
    expect(fixture.overlayHost.children).toHaveLength(0);
    expect(fixture.onChromeExit).toHaveBeenCalledOnce();
    expect(fixture.onChange).toHaveBeenLastCalledWith(null);
  });

  it("retains one product toolbar across reprojections and releases it on exit", () => {
    const destroy = vi.fn();
    const update = vi.fn();
    const renderer = vi.fn((ownerDocument: Document, _state: QuireHeaderFooterToolbarState) => ({
      element: ownerDocument.createElement("div"),
      update,
      destroy
    }));
    const fixture = createControllerFixture({ commandDistanceTwips: 720, renderer });
    fixture.controller.preparePointerSelection(
      createStoryTarget(
        "header",
        "header:first",
        "page:1:header",
        { position: 0, nodeType: "wordSection", stableId: "section-1" }
      ),
      2
    );
    fixture.controller.refreshChrome();

    expect(renderer).toHaveBeenCalledOnce();
    expect(renderer.mock.calls[0]?.[1]).toMatchObject({
      region: "header",
      distanceText: "1.27 cm"
    });
    expect(update).toHaveBeenCalledOnce();
    fixture.controller.exit();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("treats the toolbar and popups it controls as session focus owners", () => {
    const fixture = createControllerFixture({ commandDistanceTwips: 720 });
    fixture.controller.preparePointerSelection(
      createStoryTarget(
        "header",
        "header:first",
        "page:1:header",
        { position: 0, nodeType: "wordSection", stableId: "section-1" }
      ),
      2
    );
    const actions = requireElement(fixture.overlayHost, '[data-qk-header-footer-actions="header"]');
    const trigger = document.createElement("button");
    const popup = document.createElement("div");
    const option = document.createElement("div");
    popup.id = "unit-listbox";
    trigger.setAttribute("aria-controls", popup.id);
    popup.append(option);
    actions.firstElementChild?.append(trigger);
    document.body.append(popup);

    expect(fixture.controller.ownsFocusTarget(trigger)).toBe(true);
    expect(fixture.controller.ownsFocusTarget(option)).toBe(true);
    expect(fixture.controller.ownsFocusTarget(document.body)).toBe(false);

    fixture.controller.refreshChrome();
    expect(fixture.overlayHost.contains(actions)).toBe(true);
    expect(actions.contains(trigger)).toBe(true);
    fixture.controller.exit();
    expect(fixture.controller.ownsFocusTarget(option)).toBe(false);
    popup.remove();
  });

  it("reprojects active chrome after measured page geometry changes", () => {
    const fixture = createControllerFixture();
    fixture.controller.preparePointerSelection(
      createStoryTarget("header", "header:first", "page:1:header"),
      2
    );
    fixture.setBodyTop(160);

    expect(fixture.controller.refreshChrome()).toBe(true);
    expect(readRectStyle(requireElement(
      fixture.overlayHost,
      '[data-qk-header-footer-guide="header"]'
    )).top).toBe("160px");
    expect(readRectStyle(requireElement(
      fixture.overlayHost,
      "[data-qk-header-footer-inactive]"
    )).top).toBe("160px");

    fixture.controller.exit();
    expect(fixture.controller.refreshChrome()).toBe(false);
  });

  it("requires a body double click to exit or exits immediately on Escape", () => {
    const fixture = createControllerFixture();
    const footer = createStoryTarget("footer", "footer:default", "page:1:footer");

    fixture.controller.preparePointerSelection(footer, 2);
    expect(fixture.controller.preparePointerSelection(createBodyTarget(), 1)).toBe(false);
    expect(fixture.controller.getSession()).not.toBeNull();

    expect(fixture.controller.preparePointerSelection(createBodyTarget(), 2)).toBe(true);
    expect(fixture.controller.getSession()).toBeNull();

    fixture.controller.preparePointerSelection(footer, 2);
    expect(fixture.controller.handleEscape()).toBe(true);
    expect(fixture.controller.handleEscape()).toBe(false);
    expect(fixture.overlayHost.children).toHaveLength(0);
    expect(fixture.onChange).toHaveBeenLastCalledWith(null);
  });

  it("rejects a single click on a different story while editing", () => {
    const fixture = createControllerFixture();

    fixture.controller.preparePointerSelection(
      createStoryTarget("header", "header:first", "page:1:header"),
      2
    );

    expect(fixture.controller.preparePointerSelection(
      createStoryTarget("header", "header:default", "page:2:header"),
      1
    )).toBe(false);
    expect(fixture.controller.getSession()).toBeNull();
  });

  it("owns session and chrome independently per mounted view", () => {
    const first = createControllerFixture();
    const second = createControllerFixture();

    first.controller.preparePointerSelection(
      createStoryTarget("footer", "footer:default", "page:1:footer"),
      2
    );

    expect(first.controller.getSession()).not.toBeNull();
    expect(second.controller.getSession()).toBeNull();
    expect(second.overlayHost.children).toHaveLength(0);

    first.controller.destroy();
    expect(first.controller.getSession()).toBeNull();
    expect(first.overlayHost.children).toHaveLength(0);
  });
});

/**
 * Creates DOM and observer inputs for one controller.
 *
 * @returns Independent controller fixture.
 */
function createControllerFixture(
  options: {
    readonly commandDistanceTwips?: number | undefined;
    readonly lang?: string | undefined;
    readonly renderer?: QuireHeaderFooterToolbarRenderer | undefined;
  } = {}
) {
  const root = document.createElement("div");
  const overlayHost = document.createElement("div");
  const onChange = vi.fn();
  const onChromeExit = vi.fn();
  const onDistanceChange = vi.fn(() => true);
  let bodyTop = 100;
  let distanceTwips = options.commandDistanceTwips ?? null;

  if (options.lang !== undefined) root.setAttribute("lang", options.lang);
  root.appendChild(overlayHost);

  return {
    root,
    overlayHost,
    onChange,
    onChromeExit,
    onDistanceChange,
    setBodyTop(value: number): void {
      bodyTop = value;
    },
    setDistanceTwips(value: number): void {
      distanceTwips = value;
    },
    controller: createMountedHeaderFooterEditingController({
      root,
      overlayHost,
      readPages: () => [{
        pageIndex: 0,
        range: { from: 0, to: 100 },
        pageRect: { x: 0, y: 0, width: 600, height: 800 },
        bodyRect: { x: 40, y: bodyTop, width: 520, height: 700 - bodyTop }
      }],
      readToolbarRenderer: () => options.renderer,
      ...(options.commandDistanceTwips === undefined
        ? {}
        : {
            readDistanceTwips: () => distanceTwips,
            onDistanceChange
          }),
      onChromeExit,
      onChange
    })
  };
}

/**
 * Creates one editable retained header or footer target.
 *
 * @param region - Story region kind.
 * @param sourceId - Shared story source identity.
 * @param visualInstanceId - Page-local visual occurrence.
 * @param commandOwner - Optional structural section receiving contextual commands.
 * @returns Retained interaction target.
 */
function createStoryTarget(
  region: "header" | "footer",
  sourceId: string,
  visualInstanceId: string,
  commandOwner?: NonNullable<
    QuireInteractionSelectionTarget["region"]
  >["commandOwner"]
): QuireInteractionSelectionTarget {
  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    region: {
      rootId: { value: `${region}:root` },
      regionId: { value: `${region}:region` },
      kind: region,
      visualInstanceId,
      ...(commandOwner === undefined ? {} : { commandOwner })
    },
    source: { sourceId, range: { from: 10, to: 20 } },
    referenceRect: { x: 40, y: region === "header" ? 20 : 700, width: 520, height: 42 }
  };
}

/**
 * Creates a floating-object descendant carrying an enclosing header scope.
 *
 * @param kind - Exact descendant hit kind.
 * @returns Object or control target that must share the outer editing session.
 */
function createScopedHeaderTarget(
  kind: "object" | "control"
): QuireInteractionSelectionTarget {
  const target = {
    domain: kind,
    commandTarget: kind,
    hitKind: kind,
    region: {
      rootId: { value: "root:header-picture" },
      regionId: { value: "region:header-picture" },
      kind: kind === "object" ? "floating-object" : "control",
      visualInstanceId: "page:1:header-picture"
    },
    source: {
      sourceId: "header-picture-anchor",
      range: { from: 12, to: 13 }
    },
    referenceRect: { x: 40, y: 20, width: 120, height: 42 },
    interactionScope: {
      region: {
        rootId: { value: "root:header" },
        regionId: { value: "region:header" },
        kind: "header",
        visualInstanceId: "page:1:header",
        commandOwner: {
          position: 0,
          nodeType: "wordSection",
          stableId: "section-1"
        }
      },
      source: {
        sourceId: "word-story:header-default",
        range: { from: 10, to: 20 }
      },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    }
  };

  return target as unknown as QuireInteractionSelectionTarget;
}

/**
 * Creates one ordinary body text target.
 *
 * @returns Retained body interaction target.
 */
function createBodyTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    region: {
      rootId: { value: "body:root" },
      regionId: { value: "body:region" },
      kind: "body",
      visualInstanceId: "page:1:body"
    },
    source: { sourceId: "doc:body", range: { from: 0, to: 100 } }
  };
}

/**
 * Requires one chrome element in a test fixture.
 *
 * @param host - Overlay host to query.
 * @param selector - Data-attribute selector for the chrome element.
 * @returns Matching HTML element.
 */
function requireElement(host: HTMLElement, selector: string): HTMLElement {
  const element = host.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`Missing test chrome element: ${selector}`);
  }
  return element;
}

/**
 * Reads the four projected rectangle style properties.
 *
 * @param element - Chrome element with absolute geometry.
 * @returns Serializable rectangle style values.
 */
function readRectStyle(element: HTMLElement): Readonly<Record<string, string>> {
  return {
    left: element.style.left,
    top: element.style.top,
    width: element.style.width,
    height: element.style.height
  };
}
