import { type Accessor, batch, createSignal, onCleanup } from "solid-js";

import { getCanvasPositionAndScale } from "../../helpers/canvas";
import {
  createMenuBlocker,
  type DragKind,
  dragKindByButton,
  isDragStale,
  pickAxe,
  startDrag,
} from "./Farm.drag";
import {
  createHighlightedRegion,
  type IMousePosition,
  type IRegion,
} from "./Farm.region";

interface IFarmPointerOptions {
  canvas: Accessor<HTMLCanvasElement | undefined>;
  disableToolbars: (disabled: boolean) => void;
  onApply: (item: ISelectedItem, region: IRegion) => void;
  scrollView: Accessor<HTMLElement | undefined>;
  selectedItem: Accessor<ISelectedItem | undefined>;
}

const onContextMenu = (event: MouseEvent) => {
  event.preventDefault();
};

export function createFarmPointer(options: IFarmPointerOptions) {
  const [drag, setDrag] = createSignal<DragKind>();
  const [mouseDownPosition, setMouseDownPosition] =
    createSignal<IMousePosition>();
  const [mousePosition, setMousePosition] = createSignal<IMousePosition>();

  let stopDrag: (() => void) | undefined;

  const highlightedRegion = createHighlightedRegion(
    mousePosition,
    mouseDownPosition,
    () => drag() === "pan",
  );

  const blockMenuAfterRightPress = createMenuBlocker();

  const getActiveItem = () =>
    drag() === "erase" ? pickAxe : options.selectedItem();

  const getMousePosition = (event: MouseEvent) => {
    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(
      options.canvas(),
    );

    return {
      left: left * scaleX,
      top: top * scaleY,
      x: event.clientX * scaleX,
      y: event.clientY * scaleY,
    };
  };

  const endDrag = () => {
    batch(() => {
      stopDrag?.();
      stopDrag = undefined;
      setDrag(undefined);
      setMouseDownPosition(undefined);
      options.disableToolbars(false);
    });
  };

  const onMouseDown = (event: MouseEvent) => {
    batch(() => {
      blockMenuAfterRightPress(event);

      if (event.button === 1) {
        // Without this, Windows browsers start their own middle-button
        // auto-scroll.
        event.preventDefault();
      }

      const currentDrag = drag();
      if (currentDrag !== undefined) {
        endDrag();

        if (!isDragStale(currentDrag, event)) {
          return;
        }
      }

      const kind = dragKindByButton[event.button];
      if (kind === undefined) {
        return;
      }

      options.disableToolbars(true);
      setDrag(kind);
      stopDrag = startDrag(kind, options.scrollView(), event, endDrag);

      if (kind === "pan") {
        return;
      }

      const position = getMousePosition(event);
      setMouseDownPosition(position);
      setMousePosition(position);
    });
  };

  const onMouseMove = (event: MouseEvent) => {
    setMousePosition(getMousePosition(event));
  };

  const onMouseOut = () => {
    batch(() => {
      setMousePosition(undefined);

      if (drag() !== "pan") {
        endDrag();
      }
    });
  };

  const onMouseUp = (event: MouseEvent) => {
    batch(() => {
      const kind = drag();
      if (kind !== undefined && dragKindByButton[event.button] !== kind) {
        return;
      }

      const activeItem = getActiveItem();
      const region = highlightedRegion();
      if (
        (kind === "put" || kind === "erase") &&
        activeItem !== undefined &&
        region !== undefined
      ) {
        options.onApply(activeItem, region);
      }

      endDrag();
    });
  };

  const onScroll = () => {
    const currentMousePosition = mousePosition();
    // A pan can scroll the farm while the cursor is off it. A made-up
    // position here would show a highlight away from the cursor.
    if (currentMousePosition === undefined) {
      return;
    }

    const { left, top, scaleX, scaleY } = getCanvasPositionAndScale(
      options.canvas(),
    );

    setMousePosition({
      ...currentMousePosition,
      left: left * scaleX,
      top: top * scaleY,
    });
  };

  onCleanup(() => {
    stopDrag?.();
  });

  return {
    getActiveItem,
    highlightedRegion,
    onContextMenu,
    onMouseDown,
    onMouseMove,
    onMouseOut,
    onMouseUp,
    onScroll,
  };
}
