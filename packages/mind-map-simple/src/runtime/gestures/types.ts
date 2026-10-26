import type { MindMapPoint } from "@quirekit/mind-map";
import type { SimpleNode } from "../../vendor/types";

/** A completed gesture, committed atomically after preview cleanup. */
export interface MindMapDrop {
  /** Optional destination parent; absent means independent roots. */ readonly parentId?: string;
  /** Topmost moved subtrees, never both an ancestor and its child. */ readonly moves: readonly {
    /** Stable node id. */ readonly id: string;
    /** Root-relative free position. */ readonly position: MindMapPoint;
    /** Original subtree growth direction. */ readonly side: "left" | "right";
  }[];
}

/** Geometry captured once at gesture start, excluding all hidden descendants. */
export interface MindMapHit {
  /** Runtime identity for selection projection only. */ readonly node: SimpleNode;
  /** Stable canonical identity. */ readonly id: string;
  /** World-space left. */ readonly x: number;
  /** World-space top. */ readonly y: number;
  /** World width. */ readonly width: number;
  /** World height. */ readonly height: number;
}

/** Instance-owned gesture callbacks. */
export interface MindMapGestureOptions {
  /** @returns Whether IME or readonly currently forbids authoring. */ blocked(): boolean;
  /** @param drop - Resolved atomic change. @returns Completion of persisted move. */ drop(drop: MindMapDrop): Promise<void>;
  /** @param point - Root-relative position. @returns Completion of adding a topic. */ add(point: MindMapPoint): Promise<void>;
  /** @param error - Event-owned failure. */ report(error: unknown): void;
}
