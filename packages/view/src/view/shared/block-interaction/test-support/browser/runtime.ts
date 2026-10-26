import { runBlockGeometryFixture } from "./geometry";
import type { BrowserBlockGeometryResult } from "./geometry";
import { runDragLifecycleFixture } from "./lifecycle";
import type { BrowserDragLifecycleResult } from "./lifecycle";

declare global {
  /** Browser fixture APIs installed on the real page window. */
  interface Window {
    /** Runs Canvas/SVG retained-geometry equivalence probes. */
    runBlockGeometryFixture: () => BrowserBlockGeometryResult;
    /** Runs real pointer and keyboard lifecycle probes. */
    runDragLifecycleFixture: () => BrowserDragLifecycleResult;
  }
}

window.runBlockGeometryFixture = runBlockGeometryFixture;
window.runDragLifecycleFixture = runDragLifecycleFixture;
