/** 一座山：一条有走向的山脊，世界坐标 y 向上、z 向前。 */
export interface Mountain {
    /** 中心 x。 */
    x: number;
    /** 中心 z。 */
    z: number;
    /** 走向角（弧度）。 */
    angle: number;
    /** 半长（沿走向）。 */
    length: number;
    /** 半宽（横截面）。 */
    width: number;
    /** 高度。 */
    height: number;
}

/** 当前视角下按远到近排好的群山轮廓。 */
export interface SilhouetteFrame {
    /** 每行一座山、每列一个屏幕横向采样点的轮廓高度（0–1 屏幕坐标，无山处为 -1）。 */
    heights: Float32Array;
    /** 每行的山离视点的距离。 */
    distances: Float32Array;
    /** 每行的轮廓最高点。 */
    peaks: Float32Array;
    /** 每行的山脚高度。 */
    bases: Float32Array;
    /** 每行对应的原始山序号（作噪声种子）。 */
    indices: Float32Array;
    /** 主峰所在的行。 */
    mainRow: number;
}
