/** 一段枝干：两端位置与两端粗细（世界单位，y 向上）。 */
export interface PlumSegment {
    /** 起点横坐标。 */
    x0: number;
    /** 起点高度。 */
    y0: number;
    /** 终点横坐标。 */
    x1: number;
    /** 终点高度。 */
    y1: number;
    /** 起点半径。 */
    w0: number;
    /** 终点半径。 */
    w1: number;
}

/** 一朵梅花或一个花苞。 */
export interface PlumBlossom {
    /** 横坐标。 */
    x: number;
    /** 高度。 */
    y: number;
    /** 半径。 */
    r: number;
    /** 是否已开（否则为花苞）。 */
    open: boolean;
}

/** 一枝梅的完整布局。 */
export interface PlumLayout {
    /** 枝干，按生长顺序排列。 */
    segments: PlumSegment[];
    /** 花与花苞。 */
    blossoms: PlumBlossom[];
}
