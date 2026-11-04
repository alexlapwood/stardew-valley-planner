import { onCleanup } from "solid-js";

export type DragKind = "erase" | "pan" | "put";

export const dragKindByButton: Record<number, DragKind | undefined> = {
  0: "put",
  1: "pan",
  2: "erase",
};

const panningClass = "farm-panning";

const rightButton = 2;

const buttonsBitByKind: Record<DragKind, number> = {
  erase: 2,
  pan: 4,
  put: 1,
};

function isButtonUp(kind: DragKind, event: MouseEvent) {
  return (event.buttons & buttonsBitByKind[kind]) === 0;
}

export function isDragStale(kind: DragKind, press: MouseEvent) {
  // A button cannot go down while it is down, so a press of the drag's own
  // button also shows that the drag's release was lost.
  return dragKindByButton[press.button] === kind || isButtonUp(kind, press);
}

export function createMenuBlocker() {
  let stopBlocking: (() => void) | undefined;

  onCleanup(() => {
    stopBlocking?.();
  });

  return (press: MouseEvent) => {
    if (press.button !== rightButton) {
      return;
    }

    stopBlocking?.();

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      stop();
    };

    const stop = () => {
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", stop, true);
      window.removeEventListener("pointerdown", stop, true);
      stopBlocking = undefined;
    };

    // Windows sends the menu event after the release, to the element under
    // the cursor, which can be off the farm. A new press or key press shows
    // that the menu event of this press is not coming.
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("keydown", stop, true);
    window.addEventListener("pointerdown", stop, true);
    stopBlocking = stop;
  };
}

function scrollPixelsPerScreenPixel(layoutSize: number, screenSize: number) {
  const scale = layoutSize / screenSize;

  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function startPan(
  scrollView: HTMLElement,
  startEvent: MouseEvent,
  onEnd: () => void,
) {
  const { height, width } = scrollView.getBoundingClientRect();
  const scaleX = scrollPixelsPerScreenPixel(scrollView.offsetWidth, width);
  const scaleY = scrollPixelsPerScreenPixel(scrollView.offsetHeight, height);
  const { scrollLeft, scrollTop } = scrollView;

  const onMouseMove = (event: MouseEvent) => {
    // startDrag ends the pan on this move.
    if (isButtonUp("pan", event)) {
      return;
    }

    scrollView.scrollLeft =
      scrollLeft - (event.clientX - startEvent.clientX) * scaleX;
    scrollView.scrollTop =
      scrollTop - (event.clientY - startEvent.clientY) * scaleY;
  };

  const onMouseDown = (event: MouseEvent) => {
    // The press that starts the pan is still bubbling, so it reaches this
    // listener too.
    if (event !== startEvent) {
      onEnd();
    }
  };

  const onMouseUp = (event: MouseEvent) => {
    if (event.button === startEvent.button) {
      onEnd();
    }
  };

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  document.documentElement.classList.add(panningClass);

  return () => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    document.documentElement.classList.remove(panningClass);
  };
}

export function startDrag(
  kind: DragKind,
  scrollView: HTMLElement | undefined,
  startEvent: MouseEvent,
  onEnd: () => void,
) {
  const stopPan =
    kind === "pan" && scrollView !== undefined
      ? startPan(scrollView, startEvent, onEnd)
      : undefined;

  const onMouseMove = (event: MouseEvent) => {
    // The browser can lose the mouseup, for example when the button is
    // released over a context menu or outside the window.
    if (isButtonUp(kind, event)) {
      onEnd();
    }
  };

  window.addEventListener("blur", onEnd);
  window.addEventListener("mousemove", onMouseMove);

  return () => {
    stopPan?.();
    window.removeEventListener("blur", onEnd);
    window.removeEventListener("mousemove", onMouseMove);
  };
}
