import "./Tooltip.css";

import cn from "clsx";
import {
  type Accessor,
  createEffect,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  onMount,
  type Ref,
  Show,
} from "solid-js";

import { createEscapeKey } from "../../helpers/keyboard";
import {
  getTooltipPosition,
  getTooltipText,
  type IBox,
  type ITooltipLine,
  splitFontRuns,
} from "../../helpers/tooltip";
import BigText from "../BigText/BigText";
import FitSprite from "../FitSprite/FitSprite";

interface IBoxProps {
  class?: string;
  id: string;
  lines: readonly ITooltipLine[];
  ref?: Ref<HTMLDivElement>;
  testId?: string;
}

interface IProps {
  anchor: Accessor<HTMLElement | undefined>;
  lines: readonly ITooltipLine[];
}

const spriteSize = 16;

// A tooltip that shows at once would flash over each row that the mouse
// crosses on its way to another part of the page.
export const hoverDelay = 400;

const toBox = ({ height, left, top, width }: DOMRect): IBox => ({
  height,
  width,
  x: left,
  y: top,
});

// The size of the box comes from its lines, so it is placed only after it is
// drawn. anchor and view are in the pixels of style.left and style.top.
export function placeTooltip(box: HTMLElement, anchor: IBox, view: IBox) {
  const { left, top } = getTooltipPosition(
    { height: box.offsetHeight, width: box.offsetWidth },
    anchor,
    view,
  );

  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
}

// The page is scaled to fit the window, and a fixed box in it is positioned
// in page pixels. The box at 0, 0 shows where the page starts on the screen,
// and how much it is scaled.
function placeNextTo(box: HTMLElement, anchor: HTMLElement) {
  box.style.left = "0px";
  box.style.top = "0px";

  const origin = box.getBoundingClientRect();
  const scale = box.offsetWidth > 0 ? origin.width / box.offsetWidth : 1;
  const toPage = ({ height, width, x, y }: IBox): IBox => ({
    height: height / scale,
    width: width / scale,
    x: (x - origin.left) / scale,
    y: (y - origin.top) / scale,
  });
  const { clientHeight, clientWidth } = document.documentElement;

  placeTooltip(
    box,
    toPage(toBox(anchor.getBoundingClientRect())),
    toPage({ height: clientHeight, width: clientWidth, x: 0, y: 0 }),
  );
}

export function TooltipBox(props: IBoxProps) {
  return (
    <div
      aria-label={getTooltipText(props.lines)}
      class={cn("Tooltip", "sdv-toolbar-border", props.class)}
      data-testid={props.testId}
      id={props.id}
      ref={props.ref}
      role="tooltip"
    >
      <For each={props.lines}>
        {(line) => (
          <div class="Tooltip--line">
            <Show
              fallback={
                <Show when={line.icon}>
                  {(icon) => <span class="Tooltip--icon">{icon()}</span>}
                </Show>
              }
              when={line.sprite}
            >
              {(sprite) => <FitSprite {...sprite()} size={spriteSize} />}
            </Show>
            <div class="Tooltip--text">
              <For each={splitFontRuns(line.text)}>
                {(run) =>
                  run.isInFont ? (
                    <BigText>{run.text}</BigText>
                  ) : (
                    <span class="Tooltip--symbol">{run.text}</span>
                  )
                }
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

export default function Tooltip(props: IProps) {
  let boxRef: HTMLDivElement | undefined;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;

  const id = createUniqueId();
  const [isOpen, setIsOpen] = createSignal(false);

  const isShown = () => isOpen() && props.lines.length > 0;

  const open = () => {
    clearTimeout(hoverTimer);
    setIsOpen(true);
  };

  const close = () => {
    clearTimeout(hoverTimer);
    setIsOpen(false);
  };

  const openAfterDelay = () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(open, hoverDelay);
  };

  const place = () => {
    const anchor = props.anchor();

    if (boxRef !== undefined && anchor !== undefined) {
      placeNextTo(boxRef, anchor);
    }
  };

  onMount(() => {
    const anchor = props.anchor();

    if (anchor === undefined) {
      return;
    }

    anchor.addEventListener("mouseenter", openAfterDelay);
    anchor.addEventListener("mouseleave", close);
    anchor.addEventListener("focusin", open);
    anchor.addEventListener("focusout", close);

    onCleanup(() => {
      clearTimeout(hoverTimer);
      anchor.removeEventListener("mouseenter", openAfterDelay);
      anchor.removeEventListener("mouseleave", close);
      anchor.removeEventListener("focusin", open);
      anchor.removeEventListener("focusout", close);
    });
  });

  createEscapeKey(isShown, close);

  createEffect(() => {
    const anchor = props.anchor();

    if (!isShown() || anchor === undefined) {
      return;
    }

    anchor.setAttribute("aria-describedby", id);
    // A scroll moves the anchor, and the fixed box must follow it.
    document.addEventListener("scroll", place, true);

    onCleanup(() => {
      anchor.removeAttribute("aria-describedby");
      document.removeEventListener("scroll", place, true);
    });
  });

  createEffect(() => {
    if (isShown()) {
      place();
    }
  });

  return (
    <Show when={isShown()}>
      <TooltipBox
        class="Tooltip--fixed"
        id={id}
        lines={props.lines}
        ref={boxRef}
      />
    </Show>
  );
}
