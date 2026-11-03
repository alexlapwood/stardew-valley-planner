import "./BigButton.css";

import cn from "clsx";
import { type JSX, type JSXElement, splitProps } from "solid-js";

import BigText from "../BigText/BigText";

interface IProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSXElement;
  selected?: boolean;
  onClick?: ((event: MouseEvent) => void) | undefined;
}

export default function BigButton(props: IProps) {
  const [localProps, spreadProps] = splitProps(props, [
    "children",
    "selected",
    "onClick",
  ]);
  return (
    <div
      class={cn("sdv-button-big", "sdv-hover-effect", {
        selected: localProps.selected,
      })}
      onClick={(event) => localProps.onClick?.(event)}
      {...spreadProps}
    >
      <div class="BigButton">
        <BigText>{localProps.children}</BigText>
      </div>
    </div>
  );
}
