/** 水墨背景的颜色：纸色与墨色，均为 0–1 的线性 RGB 分量。 */
export interface InkWashPalette {
    /** 纸（背景）颜色。 */
    paper: [number, number, number];
    /** 墨颜色。 */
    ink: [number, number, number];
}

/** 创建水墨背景的选项。 */
export interface InkWashOptions {
    /** 画面题材，例如 `mountains`。 */
    scene: InkScene;
    /** 初始配色。 */
    palette: InkWashPalette;
    /** 是否减少动态：为真时不启用流体与云雾流动，只绘制静止画面。 */
    reducedMotion: boolean;
    /** 视角：fixed 固定不动；drag 在空白处按住拖动时绕画面主体转动视角。 */
    orbit: InkWashOrbit;
    /** 静景：不响应指针，墨色洇开后停止渲染（用于页面横幅）。 */
    still?: boolean;
    /** 环境动画；关闭后缓存静止主体，指针墨迹和镜头交互仍有效，默认开启。 */
    ambient?: boolean;
    /** 首帧成功提交后通知宿主，可用于揭示画布。 */
    onReady?: () => void;
    /** 视点高度（世界单位），省略时用题材的默认高度；抬高后画面主体整体下沉。 */
    eye?: number;
    /** 中央留白区：中心（0–1 画面坐标）与半径（以画面高度为单位）；省略时为登录表单的位置。 */
    clearing?: { center: [number, number]; radius: [number, number] };
}

/** 视角模式。 */
export type InkWashOrbit = 'fixed' | 'drag';

/** 由宿主设定的镜头目标；省略的分量保持不变。 */
export interface InkViewTarget {
    /** 环转角（弧度），限制在题材的环转范围内。 */
    angle?: number;
    /** 视点高度，限制在题材的升降范围内。 */
    eye?: number;
    /** 沿纵深向前穿行的距离（世界单位），限制在题材的穿行范围内。 */
    travel?: number;
}

/** 水墨背景控制器。 */
export interface InkWashController {
    /**
     * 设定镜头目标，渲染时平滑逼近；减少动态时直接到位。
     * @param target 新的镜头目标。
     */
    setView(target: InkViewTarget): void;
    /** @returns 当前已平滑的镜头，用于把前景内容锚定到画面中的物体。 */
    getView(): Readonly<Required<InkViewTarget>>;
    /** 更新配色（主题切换时调用）。 */
    setPalette(palette: InkWashPalette): void;
    /** 停止渲染并释放 GPU 资源与事件监听。 */
    destroy(): void;
}

/** 一张可渲染的浮点纹理及其帧缓冲。 */
export interface RenderTarget {
    /** 纹理对象。 */
    texture: WebGLTexture;
    /** 帧缓冲对象。 */
    framebuffer: WebGLFramebuffer;
    /** 宽度（像素）。 */
    width: number;
    /** 高度（像素）。 */
    height: number;
}

/** 读写交替的一对渲染目标，用于迭代计算。 */
export interface PingPongTarget {
    /** 当前可读的一张。 */
    read: RenderTarget;
    /** 当前写入的一张。 */
    write: RenderTarget;
    /** 交换读写。 */
    swap(): void;
}

/** 编译好的着色器程序与其 uniform 位置。 */
export interface ShaderProgram {
    /** 程序对象。 */
    program: WebGLProgram;
    /** uniform 名称到位置的映射。 */
    uniforms: Record<string, WebGLUniformLocation>;
}

/** 一次注入：位置为 0–1 画面坐标（y 向上），速度为每秒画面坐标。 */
export interface InkSplat {
    /** 横坐标。 */
    x: number;
    /** 纵坐标。 */
    y: number;
    /** 横向速度。 */
    dx: number;
    /** 纵向速度。 */
    dy: number;
    /** 注入的墨量。 */
    ink: number;
    /** 半径（高斯核方差，画面高度平方单位）。 */
    radius: number;
    /** 为真时速度沿离心方向注入，dx 为强度。 */
    burst?: boolean;
}

/** 指针交互回调。 */
export interface PointerInkHandlers {
    /**
     * 按住拖动时的位移（0–1 画面坐标，y 向上）。
     * @param dx 横向位移。
     * @param dy 纵向位移。
     */
    onDrag(dx: number, dy: number): void;
    /** 松开或取消拖动。 */
    onDragEnd(): void;
    /**
     * 产生一次墨水注入。
     * @param splat 注入参数。
     */
    onSplat(splat: InkSplat): void;
}

/** 指针交互句柄。 */
export interface PointerInk {
    /** 移除监听。 */
    dispose(): void;
}

/** 所有题材共用的视点：绕画面主体的环转角、视点高度与画面宽高比。 */
export interface InkView {
    /** 环转角（弧度）。 */
    angle: number;
    /** 视点高度（世界单位）。 */
    eye: number;
    /** 沿纵深向前穿行的距离（世界单位），不支持穿行的题材恒为 0。 */
    travel: number;
    /** 画布宽高比。 */
    aspect: number;
}

/** 拖动环转的范围。 */
export interface InkOrbitRange {
    /** 环转角的最大绝对值（弧度）。 */
    angle: number;
    /** 视点可低于默认高度的量。 */
    eyeBelow: number;
    /** 视点可高于默认高度的量。 */
    eyeAbove: number;
    /** 可沿纵深穿行的最大距离；省略时不支持穿行。 */
    travel?: number;
}

/**
 * 一个水墨题材：GLSL 画法加上它在每张画布上需要的 GPU 状态。
 * 管线负责流体、指针、留白、显影与纸纹，题材只回答“这一像素画什么”。
 */
export interface InkScene {
    /** 题材名称，例如 `mountains`。 */
    name: string;
    /** 默认视点高度。 */
    defaultEye: number;
    /** 拖动环转的范围。 */
    orbit: InkOrbitRange;
    /** 声明题材 uniform 与 `vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color)` 的 GLSL。 */
    glsl: string;
    /**
     * 为一张画布创建题材的 GPU 状态。
     * @param gl WebGL2 上下文。
     * @returns 题材实例。
     */
    create(gl: WebGL2RenderingContext): InkSceneInstance;
}

/** 题材在一张画布上的 GPU 状态。 */
export interface InkSceneInstance {
    /**
     * 可选题材预计算；允许绘制缓存，管线随后恢复合成目标与程序。
     * @param gl WebGL2 上下文。
     * @param view 当前视点。
     * @param seconds 环境动画时间（秒）。
     */
    prepare?(gl: WebGL2RenderingContext, view: InkView, seconds: number): void;
    /**
     * 绘制前绑定题材自己的 uniform 与纹理。
     * @param gl WebGL2 上下文。
     * @param program 已启用的合成程序。
     * @param view 当前视点。
     * @param unit 题材可用的第一个纹理单元。
     */
    bind(gl: WebGL2RenderingContext, program: ShaderProgram, view: InkView, unit: number): void;
    /**
     * 释放 GPU 资源。
     * @param gl WebGL2 上下文。
     */
    dispose(gl: WebGL2RenderingContext): void;
}
