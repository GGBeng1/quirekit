/** Fake Canvas 2D context used by mounted canvas view tests. */
export class FakeCanvasMountContext {
  /** Paint calls recorded by the fake rendering context. */
  readonly calls: string[] = [];
  /** Transform matrices recorded separately so paint-call assertions stay stable. */
  readonly transforms: string[] = [];
  /** Fill style used by subsequent fill calls. */
  fillStyle = "";
  /** Font used by subsequent text calls. */
  font = "";

  /**
   * Records a transform matrix command.
   *
   * @param a - Horizontal scale.
   * @param b - Vertical skew.
   * @param c - Horizontal skew.
   * @param d - Vertical scale.
   * @param e - Horizontal translation.
   * @param f - Vertical translation.
   */
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.transforms.push(`setTransform(${a},${b},${c},${d},${e},${f})`);
  }

  /** Saves the current fake drawing state. */
  save(): void {}

  /** Restores the current fake drawing state. */
  restore(): void {}

  /**
   * Records one composed affine transform separately from paint calls.
   *
   * @param a - Horizontal scale.
   * @param b - Vertical skew.
   * @param c - Horizontal skew.
   * @param d - Vertical scale.
   * @param e - Horizontal translation.
   * @param f - Vertical translation.
   */
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.transforms.push(`transform(${a},${b},${c},${d},${e},${f})`);
  }

  /**
   * Records a clear rectangle command.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  clearRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`clearRect(${x},${y},${width},${height})`);
  }

  /**
   * Records a fill rectangle command.
   *
   * @param x - Rectangle x coordinate.
   * @param y - Rectangle y coordinate.
   * @param width - Rectangle width.
   * @param height - Rectangle height.
   */
  fillRect(x: number, y: number, width: number, height: number): void {
    this.calls.push(`fillRect(${x},${y},${width},${height})`);
  }

  /**
   * Records a text draw command.
   *
   * @param text - Text content drawn to the fake context.
   * @param x - Text x coordinate.
   * @param y - Text baseline y coordinate.
   */
  fillText(text: string, x: number, y: number): void {
    this.calls.push(`fillText(${text},${x},${y})`);
  }

  /**
   * Records a bitmap copy between fake canvas surfaces.
   *
   * @param _image - Source canvas image.
   * @param coordinates - Canvas source and destination coordinates.
   */
  drawImage(
    _image: CanvasImageSource,
    ...coordinates: readonly number[]
  ): void {
    this.calls.push(`drawImage(${coordinates.join(",")})`);
  }
}
