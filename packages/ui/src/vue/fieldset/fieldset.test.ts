// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, reactive } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import Fieldset from "./fieldset.vue";

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/**
 * Mounts a group with a mutable title and feedback state.
 * @returns Live controls, group and reactive props.
 */
async function mountGroup() {
  const state = reactive({ legendHidden: false, invalid: false, disabled: false });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(defineComponent({
    setup: () => () => h(Fieldset, {
      legend: "校对设置", description: "编辑文档时使用", errorText: "请选择至少一项", ...state
    }, {
      default: () => h("input", { name: "proofing", "aria-label": "校对语言", value: "中文" }),
      legend: () => h("span", "文档校对设置"),
      meta: () => h("button", { type: "button" }, "恢复默认")
    })
  }));
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  await nextTick();
  return { state, group: host.querySelector("fieldset")!, input: host.querySelector("input")! };
}

describe("Fieldset", () => {
  it("hides only the presentation of the group name without remounting its input", async () => {
    const { state, group, input } = await mountGroup();
    expect(group.classList.contains("qk-fieldset--plain")).toBe(true);
    expect(group.firstElementChild?.tagName).toBe("LEGEND");
    input.focus();
    state.legendHidden = true;
    await nextTick();
    const legend = group.querySelector("legend")!;
    expect(legend.textContent).toBe("校对设置");
    expect(legend.classList.contains("qk-fieldset__legend--hidden")).toBe(true);
    expect(legend.hidden).toBe(false);
    expect(legend.getAttribute("aria-hidden")).toBeNull();
    expect(group.querySelector("button")).toBeNull();
    expect(group.querySelector("input")).toBe(input);
    expect(document.activeElement).toBe(input);
    state.legendHidden = false;
    await nextTick();
    expect(group.querySelector("legend")!.textContent).toContain("文档校对设置");
    expect(group.querySelector("button")!.textContent).toBe("恢复默认");
    expect(input.value).toBe("中文");
  });

  it("keeps native group disabling and switches the associated feedback", async () => {
    const { state, group } = await mountGroup();
    const helperId = group.getAttribute("aria-describedby")!;
    expect(document.getElementById(helperId)?.textContent).toBe("编辑文档时使用");
    state.disabled = true;
    state.invalid = true;
    await nextTick();
    expect(group.disabled).toBe(true);
    expect(group.querySelector(".qk-fieldset__message--error")!.textContent).toBe("请选择至少一项");
    expect(group.textContent).not.toContain("编辑文档时使用");
    expect(group.classList.contains("qk-fieldset--plain")).toBe(true);
  });
});
