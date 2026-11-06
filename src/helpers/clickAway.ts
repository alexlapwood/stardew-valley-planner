import { type Accessor, createEffect, onCleanup } from "solid-js";

interface IPress {
  x: number;
  y: number;
}

// A hand that clicks can move the mouse a few pixels, and that is still a
// click.
const clickSlop = 4;

function isDrag(press: IPress, event: MouseEvent) {
  return (
    Math.hypot(event.clientX - press.x, event.clientY - press.y) > clickSlop
  );
}

export function createClickAway(
  root: Accessor<HTMLElement | undefined>,
  isOpen: Accessor<boolean>,
  onClickAway: () => void,
) {
  createEffect(() => {
    if (!isOpen()) {
      return;
    }

    let press: IPress | undefined;

    const onMouseDown = (event: MouseEvent) => {
      const isInside =
        event.target instanceof Node && root()?.contains(event.target) === true;

      press = isInside ? undefined : { x: event.clientX, y: event.clientY };
    };

    const onMouseMove = (event: MouseEvent) => {
      if (press !== undefined && isDrag(press, event)) {
        press = undefined;
      }
    };

    const onMouseUp = (event: MouseEvent) => {
      const isClick = press !== undefined && !isDrag(press, event);

      press = undefined;

      if (isClick) {
        onClickAway();
      }
    };

    // The menu only listens, and puts nothing over the page, so a press away
    // from it still pans and edits the farm. A touch pan sends no mouse
    // events, so it does not close the menu, but a tap does.
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);

    onCleanup(() => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("mouseup", onMouseUp, true);
    });
  });
}
