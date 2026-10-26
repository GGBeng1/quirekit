import { onBeforeUnmount, onMounted, type Ref } from "vue";

/** 滚动轴。 */
type Axis = "vertical" | "horizontal";

/** 滚动区域各部分的 DOM 引用。 */
export interface ScrollAreaElements {
  /** 根节点，悬停状态以它为准。 */
  readonly root: Ref<HTMLElement | null>;
  /** 原生滚动的 viewport。 */
  readonly viewport: Ref<HTMLElement | null>;
  /** viewport 内的内容容器，尺寸变化时重新计算滑块。 */
  readonly content: Ref<HTMLElement | null>;
  /** 各轴滚动条轨道；未启用的轴为 null。 */
  readonly bars: Readonly<Record<Axis, Ref<HTMLElement | null>>>;
  /** 各轴滑块。 */
  readonly thumbs: Readonly<Record<Axis, Ref<HTMLElement | null>>>;
  /** 两个轴都启用时的角落块。 */
  readonly corner: Ref<HTMLElement | null>;
}

/** 滚动停止后保留 `data-scrolling` 的时间。 */
const SCROLLING_TIMEOUT = 1000;
/** 滑块最小长度，与样式中的最小尺寸一致。 */
const MIN_THUMB = 20;

/** @param element 元素。 @param name 属性名。 @param on 是否设置。 写入前比较，避免无变化的属性写入触发样式失效。 */
function flag(element: HTMLElement | null, name: string, on: boolean): void {
  if (!element || element.hasAttribute(name) === on) return;
  if (on) element.setAttribute(name, "");
  else element.removeAttribute(name);
}

/**
 * 自定义滚动条与原生滚动同步。滚动事件只登记脏帧并报告位置，读取滚动尺寸与写入滑块样式集中在
 * 同一动画帧内完成；轨道长度来自 ResizeObserver。整个过程不经过 Vue 响应式状态，也不在包住内容的
 * 祖先节点上写可继承的 CSS 变量，滚动时既不重渲染组件，也不让内容子树的样式失效。
 * @param elements 各部分的 DOM 引用。
 * @param onScroll 每个原生滚动事件后报告坐标。
 * @returns viewport 滚动事件处理函数。
 */
export function useScrollSync(elements: ScrollAreaElements, onScroll: (x: number, y: number) => void): (event: Event) => void {
  const track: Record<Axis, number> = { vertical: 0, horizontal: 0 };
  const thickness: Record<Axis, number> = { vertical: 0, horizontal: 0 };
  const timers: Record<Axis, ReturnType<typeof setTimeout> | undefined> = { vertical: undefined, horizontal: undefined };
  const last = { top: 0, left: 0 };
  let frame = 0, rtl = false, observer: ResizeObserver | null = null;
  let drag: { axis: Axis; pointer: number; scroll: number; ratio: number } | null = null;

  const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
  const bar = (axis: Axis) => elements.bars[axis].value;
  const partsOf = (axis: Axis) => [bar(axis), elements.thumbs[axis].value];

  // 读取阶段只取滚动尺寸；写入阶段只改滑块与少数状态属性。
  function sync(): void {
    frame = 0;
    const viewport = elements.viewport.value;
    if (!viewport) return;
    const metrics = {
      vertical: { scroll: viewport.scrollHeight, client: viewport.clientHeight, position: viewport.scrollTop },
      horizontal: { scroll: viewport.scrollWidth, client: viewport.clientWidth, position: Math.abs(viewport.scrollLeft) },
    };
    const overflow = { vertical: metrics.vertical.scroll > metrics.vertical.client + 1, horizontal: metrics.horizontal.scroll > metrics.horizontal.client + 1 };
    for (const element of [elements.root.value, viewport, elements.content.value, bar("vertical"), bar("horizontal"), elements.corner.value]) {
      flag(element, "data-overflow-y", overflow.vertical);
      flag(element, "data-overflow-x", overflow.horizontal);
    }
    for (const axis of ["vertical", "horizontal"] as const) {
      const thumb = elements.thumbs[axis].value, { scroll, client, position } = metrics[axis];
      if (!thumb || !overflow[axis] || !track[axis]) continue;
      const size = Math.min(track[axis], Math.max(MIN_THUMB, track[axis] * client / scroll));
      const range = scroll - client, travel = track[axis] - size;
      let offset = range > 0 ? travel * Math.min(1, position / range) : 0;
      if (axis === "horizontal" && rtl) offset = travel - offset;
      if (drag?.axis === axis) drag.ratio = range / Math.max(1, travel);
      thumb.style[axis === "vertical" ? "height" : "width"] = `${size}px`;
      thumb.style.transform = axis === "vertical" ? `translate3d(0, ${offset}px, 0)` : `translate3d(${offset}px, 0, 0)`;
    }
    // 两个方向都可滚动时，轨道给角落块让出对方滚动条的厚度。
    const both = overflow.vertical && overflow.horizontal;
    const vertical = bar("vertical"), horizontal = bar("horizontal"), corner = elements.corner.value;
    if (vertical) vertical.style.bottom = both ? `${thickness.horizontal}px` : "0px";
    if (horizontal) horizontal.style.insetInlineEnd = both ? `${thickness.vertical}px` : "0px";
    if (corner) { corner.style.width = both ? `${thickness.vertical}px` : "0px"; corner.style.height = both ? `${thickness.horizontal}px` : "0px"; }
  }

  /** @param axis 轴。 标记正在滚动，停止一段时间后清除。 */
  function scrolling(axis: Axis): void {
    flag(bar(axis), "data-scrolling", true);
    clearTimeout(timers[axis]);
    timers[axis] = setTimeout(() => flag(bar(axis), "data-scrolling", false), SCROLLING_TIMEOUT);
  }

  /** @param event viewport 原生滚动事件。 */
  function handleScroll(event: Event): void {
    const viewport = event.currentTarget as HTMLElement;
    const top = viewport.scrollTop, left = viewport.scrollLeft;
    if (top !== last.top) scrolling("vertical");
    if (left !== last.left) scrolling("horizontal");
    last.top = top; last.left = left;
    schedule();
    onScroll(left, top);
  }

  /** @param on 指针是否在区域内。 */
  const hover = (on: boolean) => { for (const element of [bar("vertical"), bar("horizontal"), elements.corner.value]) flag(element, "data-hover", on); };
  const enter = () => hover(true);
  const leave = () => hover(false);

  /** @param axis 轴。 @param event 轨道上的按下：滚动到使滑块中心对准指针的位置。 */
  function trackDown(axis: Axis, event: PointerEvent): void {
    const viewport = elements.viewport.value, thumb = elements.thumbs[axis].value, element = bar(axis);
    if (event.button !== 0 || event.target !== element || !viewport || !thumb || !element) return;
    const rect = element.getBoundingClientRect();
    const size = axis === "vertical" ? thumb.offsetHeight : thumb.offsetWidth, travel = Math.max(1, track[axis] - size);
    const along = axis === "vertical" ? event.clientY - rect.top : rtl ? rect.right - event.clientX : event.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, (along - size / 2) / travel));
    if (axis === "vertical") viewport.scrollTop = ratio * (viewport.scrollHeight - viewport.clientHeight);
    else viewport.scrollLeft = (rtl ? -1 : 1) * ratio * (viewport.scrollWidth - viewport.clientWidth);
    event.preventDefault();
  }

  /** @param axis 轴。 @param event 滑块上的按下：开始拖动。 */
  function thumbDown(axis: Axis, event: PointerEvent): void {
    const viewport = elements.viewport.value, thumb = elements.thumbs[axis].value;
    if (event.button !== 0 || !viewport || !thumb) return;
    const size = axis === "vertical" ? thumb.offsetHeight : thumb.offsetWidth;
    const range = axis === "vertical" ? viewport.scrollHeight - viewport.clientHeight : viewport.scrollWidth - viewport.clientWidth;
    drag = { axis, pointer: axis === "vertical" ? event.clientY : event.clientX, scroll: axis === "vertical" ? viewport.scrollTop : viewport.scrollLeft,
      ratio: range / Math.max(1, track[axis] - size) };
    thumb.setPointerCapture(event.pointerId);
    for (const part of partsOf(axis)) flag(part, "data-dragging", true);
    event.preventDefault();
    event.stopPropagation();
  }

  /** @param event 拖动中的移动。 */
  function thumbMove(event: PointerEvent): void {
    const viewport = elements.viewport.value;
    if (!drag || !viewport) return;
    const delta = (drag.axis === "vertical" ? event.clientY : event.clientX) - drag.pointer;
    if (drag.axis === "vertical") viewport.scrollTop = drag.scroll + delta * drag.ratio;
    else viewport.scrollLeft = drag.scroll + (rtl ? -1 : 1) * delta * drag.ratio;
  }

  /** 结束拖动。 */
  function thumbUp(): void {
    if (!drag) return;
    for (const part of partsOf(drag.axis)) flag(part, "data-dragging", false);
    drag = null;
  }

  const listeners: [HTMLElement, string, EventListener][] = [];
  /** @param element 元素。 @param type 事件。 @param listener 处理函数。 */
  const listen = (element: HTMLElement | null, type: string, listener: (event: PointerEvent) => void) => {
    if (!element) return;
    element.addEventListener(type, listener as EventListener);
    listeners.push([element, type, listener as EventListener]);
  };

  onMounted(() => {
    const viewport = elements.viewport.value;
    if (!viewport) return;
    rtl = getComputedStyle(viewport).direction === "rtl";
    listen(elements.root.value, "pointerenter", enter);
    listen(elements.root.value, "pointerleave", leave);
    for (const axis of ["vertical", "horizontal"] as const) {
      const thumb = elements.thumbs[axis].value;
      listen(bar(axis), "pointerdown", event => trackDown(axis, event));
      listen(thumb, "pointerdown", event => thumbDown(axis, event));
      listen(thumb, "pointermove", thumbMove);
      listen(thumb, "pointerup", thumbUp);
      listen(thumb, "pointercancel", thumbUp);
      listen(thumb, "lostpointercapture", thumbUp);
    }
    // 轨道长度与厚度来自观察结果，同步时不再读取布局。
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        for (const axis of ["vertical", "horizontal"] as const) {
          if (entry.target !== bar(axis)) continue;
          track[axis] = axis === "vertical" ? entry.contentRect.height : entry.contentRect.width;
          const box = entry.borderBoxSize?.[0];
          thickness[axis] = box ? (axis === "vertical" ? box.inlineSize : box.blockSize) : 0;
        }
      }
      schedule();
    });
    for (const element of [viewport, elements.content.value, bar("vertical"), bar("horizontal")]) if (element) observer.observe(element);
    schedule();
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(timers.vertical);
    clearTimeout(timers.horizontal);
    observer?.disconnect();
    for (const [element, type, listener] of listeners) element.removeEventListener(type, listener);
    listeners.length = 0;
  });

  return handleScroll;
}
