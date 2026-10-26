import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from 'vue';
import { resolveCssColor } from '../core/color';
import { createInkWash } from '../core/renderer';
import type { InkScene, InkViewTarget, InkWashController, InkWashOptions, InkWashOrbit, InkWashPalette } from '../types';

/** @param element 画布。 @returns 宿主 CSS 中的纸色与墨色。 */
function readPalette(element: HTMLElement): InkWashPalette {
    const style = getComputedStyle(element);
    return { paper: resolveCssColor(style.backgroundColor), ink: resolveCssColor(style.color) };
}

/** 水墨背景；首帧成功后设置 data-ready，宿主 CSS 拥有配色和淡入。 */
export const InkWash = defineComponent({
    name: 'InkWash',
    props: {
        /** 画面题材。 */
        scene: { type: Object as PropType<InkScene>, required: true },
        /** 固定视角或拖动环转。 */
        orbit: { type: String as PropType<InkWashOrbit>, default: 'fixed' },
        /** 显影后停止且不接收指针。 */
        still: { type: Boolean, default: false },
        /** 关闭主体环境动画，仍可拖动和洇墨。 */
        ambient: { type: Boolean, default: true },
        /** 直接绘制一帧完整静景，适用于主题缩略图。 */
        frozen: { type: Boolean, default: false },
        /** 前景留白。 */
        clearing: { type: Object as PropType<InkWashOptions['clearing']>, default: undefined },
        /** 视点高度。 */
        eye: { type: Number, default: undefined },
        /** 会改变主题的祖先属性。 */
        themeAttributes: { type: Array as PropType<string[]>, default: () => ['data-qk-scheme', 'data-qk-theme', 'data-theme', 'class', 'style'] },
    },
    setup(props, { expose }) {
        const canvas = shallowRef<HTMLCanvasElement | null>(null);
        const ready = ref(false);
        const revision = ref(0);
        let controller: InkWashController | null = null;
        let observer: MutationObserver | null = null;
        let repaintFrame = 0;
        let mounted = false;
        const scheme = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
        const motion = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

        /** 合并主题变化，在父主题容器的样式更新后重新读取配色。 */
        function repaint(): void {
            if (repaintFrame) return;
            repaintFrame = requestAnimationFrame(() => {
                repaintFrame = requestAnimationFrame(() => {
                    repaintFrame = 0;
                    if (canvas.value) controller?.setPalette(readPalette(canvas.value));
                });
            });
        }
        /** 停止当前画布的监听与 GPU 生命周期。 */
        function stop(): void {
            cancelAnimationFrame(repaintFrame); repaintFrame = 0;
            observer?.disconnect(); observer = null; controller?.destroy(); controller = null; ready.value = false;
        }
        /** 在已挂载画布上创建渲染器；不监听整棵文档的样式变化。 */
        function start(): void {
            const element = canvas.value;
            if (!element || !mounted) return;
            try {
                controller = createInkWash(element, {
                    scene: props.scene, palette: readPalette(element),
                    reducedMotion: props.frozen || !!motion?.matches,
                    orbit: props.orbit, still: props.still, ambient: props.ambient,
                    onReady: () => { ready.value = true; },
                    ...(props.clearing ? { clearing: props.clearing } : {}),
                    ...(props.eye === undefined ? {} : { eye: props.eye }),
                });
                observer = new MutationObserver(repaint);
                for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
                    observer.observe(ancestor, { attributes: true, attributeFilter: props.themeAttributes });
                }
            } catch { stop(); }
        }
        /** @returns 新配置对应的画布已创建。 */
        async function rebuild(): Promise<void> {
            if (!mounted) return;
            stop(); const generation = ++revision.value;
            await nextTick();
            if (mounted && generation === revision.value) start();
        }
        onMounted(() => { mounted = true; start(); scheme?.addEventListener('change', repaint); motion?.addEventListener('change', rebuild); });
        watch(() => [props.scene, props.orbit, props.still, props.ambient, props.frozen, props.eye, props.clearing, props.themeAttributes], rebuild, { deep: true });
        expose({
            /** @param target 镜头目标。 */
            setView: (target: InkViewTarget) => controller?.setView(target),
            /** @returns 当前世界坐标镜头；挂载前为 null。 */
            getView: () => controller?.getView() ?? null,
        });
        onBeforeUnmount(() => { mounted = false; stop(); scheme?.removeEventListener('change', repaint); motion?.removeEventListener('change', rebuild); });
        return () => h('canvas', {
            key: revision.value, ref: canvas, class: 'ink-wash', 'data-ready': ready.value || undefined, 'aria-hidden': 'true',
            onWebglcontextlost: () => { ready.value = false; }, onInkwasherror: () => { ready.value = false; },
        });
    },
});
