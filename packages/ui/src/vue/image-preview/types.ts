import type { ComputedRef, Ref } from 'vue';
import type { Messages as QuireKitImagePreviewMessages } from '../../locale/components/image-preview';
import type { QuireKitImagePreviewToolbar } from './toolbar/types';

/** 图片组中可独立识别的资源。 */
export interface QuireKitImagePreviewItem {
  /** 稳定且唯一的资源标识。 */ readonly id: string;
  /** 预览原图地址。 */ readonly src: string;
  /** 图像的可访问替代说明。 */ readonly alt: string;
  /** 缩略图地址，省略时使用 src。 */ readonly thumbnail?: string;
  /** 可选的可见标题；省略或留空时不显示名称，不从 alt、id 或地址推断。 */ readonly title?: string;
  /** 图片的补充说明。 */ readonly description?: string;
  /** 透明区域下方的底色（CSS 颜色），如图表这类绘制在白纸上的图；省略时透明。 */ readonly background?: string;
}
/** 图片预览内置界面与可访问名称使用的文案，由当前语言包提供。 */
export type QuireKitImagePreviewLabels = QuireKitImagePreviewMessages;
/** 单图和图片组共用的预览外观与交互选项。 */
export interface QuireKitImagePreviewOptions {
  /** 显式的 Portal 容器；预览和焦点始终归属其 ownerDocument。 */ readonly portalTarget?: HTMLElement | undefined;
  /** 遮罩颜色，默认 #000；与透明度独立配置。 */ readonly maskColor?: string;
  /** 遮罩透明度，范围 0–1，默认 0.8。 */ readonly maskOpacity?: number;
  /** 背景模糊的 CSS 像素数，默认 0。 */ readonly maskBlur?: number;
  /** 操作区配色，默认 dark；浅色遮罩可用 light。 */ readonly scheme?: 'light' | 'dark';
  /** 点击图像外的舞台空白关闭，默认开启；拖动不会关闭。 */ readonly closeOnMaskClick?: boolean;
  /** 工具栏开关、预设或有序 layout；默认 standard，不影响键盘手势。 */ readonly toolbar?: QuireKitImagePreviewToolbar;
  /** 显示图片说明，默认开启。 */ readonly caption?: boolean;
  /** 显示两侧切图按钮，默认开启；不影响键盘与触摸切图。 */ readonly navigation?: boolean;
  /** 多图时显示缩略图导航，默认开启。 */ readonly thumbnails?: boolean;
  /** 到达两端后是否循环切换，默认关闭。 */ readonly loop?: boolean;
}
/** 全屏图片阅读的公开合同。 */
export interface QuireKitImagePreviewProps extends QuireKitImagePreviewOptions {
  /** 按阅读顺序排列的图片，id 必须唯一。 */ readonly items: readonly QuireKitImagePreviewItem[];
  /** 受控显示状态。 */ readonly open?: boolean | undefined;
  /** 非受控初始显示状态。 */ readonly defaultOpen?: boolean;
  /** 受控当前索引。 */ readonly index?: number | undefined;
  /** 非受控初始索引。 */ readonly defaultIndex?: number;
  /** 关闭后返回的焦点目标；默认回到打开预览的元素。 */ readonly finalFocusEl?: () => HTMLElement | null;
}
/** 图像加载状态。 */
export type ImageLoadState = 'loading' | 'loaded' | 'error';
/** CSS 像素或自然图片尺寸。 */
export interface PreviewSize { /** 横向尺寸。 */ width: number; /** 纵向尺寸。 */ height: number }
/** 以舞台中心为原点的 CSS 像素位置。 */
export interface PreviewPoint { /** 横向坐标。 */ x: number; /** 纵向坐标。 */ y: number }
/** 手势操作的变换入口。 */
export interface PreviewTransform {
  /** 图片当前是否加载成功。 */ ready: Ref<boolean>;
  /** 当前自然尺寸缩放倍数。 */ scale: Ref<number>;
  /** 当前平移量。 */ offset: Ref<PreviewPoint>;
  /** 完整图片的适应缩放倍数。 */ fitRatio: ComputedRef<number>;
  /** 以舞台中的指定位置缩放。 */ zoomTo: (scale: number, anchor?: PreviewPoint) => void;
  /** 更新平移并夹取边界。 */ panTo: (point: PreviewPoint) => void;
  /** 双击或双触切换缩放状态。 */ toggle: (point: PreviewPoint) => void;
}

/** 自定义工具栏位置接收的当前图片与变换状态。 */
export interface QuireKitImagePreviewToolbarSlotProps {
  /** layout 中声明的 slot 名称。 */ readonly slot: string;
  /** 当前图片；空组时未定义。 */ readonly item: QuireKitImagePreviewItem | undefined;
  /** 当前图片的零基索引。 */ readonly index: number;
  /** 图片总数。 */ readonly count: number;
  /** 当前自然尺寸比例。 */ readonly scale: number;
  /** 当前图片是否成功加载。 */ readonly ready: boolean;
}
