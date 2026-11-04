import { type Accessor, createMemo } from "solid-js";

import type { IRegion } from "./Farm.canvas";

export interface IMousePosition {
  // Left and top are used for updating the cursor position
  // on the scroll event (because the scroll event doesn't actually
  // have access to the cursor position).
  left: number;
  top: number;
  x: number;
  y: number;
}

function tileUnder(position: IMousePosition) {
  return {
    x: Math.floor((position.x - position.left) / 16),
    y: Math.floor((position.y - position.top) / 16),
  };
}

function isSameRegion(a: IRegion | undefined, b: IRegion | undefined) {
  if (a === undefined || b === undefined) {
    return a === b;
  }

  return a.x1 === b.x1 && a.x2 === b.x2 && a.y1 === b.y1 && a.y2 === b.y2;
}

export function createHighlightedRegion(
  mousePosition: Accessor<IMousePosition | undefined>,
  mouseDownPosition: Accessor<IMousePosition | undefined>,
  isPanning: Accessor<boolean>,
) {
  return createMemo<IRegion | undefined>(
    () => {
      const position = isPanning() ? undefined : mousePosition();
      if (position === undefined) {
        return undefined;
      }

      const end = tileUnder(position);
      const start = tileUnder(mouseDownPosition() ?? position);

      return { x1: end.x, x2: start.x, y1: end.y, y2: start.y };
    },
    undefined,
    { equals: isSameRegion },
  );
}
