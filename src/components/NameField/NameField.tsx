import "./NameField.css";

import cn from "clsx";
import { createSignal, onMount } from "solid-js";

import BigText from "../BigText/BigText";

interface IProps {
  changeValue: (value: string) => void;
  class?: string;
  isSelectedAtStart?: boolean;
  label: string;
  maxLength?: number;
  placeholder?: string;
  submit?: () => void;
  testId: string;
  value: string;
}

export default function NameField(props: IProps) {
  let inputRef: HTMLInputElement | undefined;

  const [scrollLeft, setScrollLeft] = createSignal(0);

  const isPlaceholderShown = () =>
    props.placeholder !== undefined && props.value === "";

  // The bitmap font is drawn over the hidden letters of the input, so it moves
  // with them when the input scrolls to keep the caret in view.
  const followScroll = () => {
    setScrollLeft(inputRef?.scrollLeft ?? 0);
  };

  onMount(() => {
    if (props.isSelectedAtStart === true) {
      inputRef?.focus();
      inputRef?.select();
    }
  });

  return (
    <label class={cn("NameField", props.class)}>
      <div
        class={cn("NameField--text", {
          "NameField--placeholder": isPlaceholderShown(),
        })}
      >
        <div style={{ transform: `translateX(${-scrollLeft()}px)` }}>
          <BigText>
            {isPlaceholderShown() ? props.placeholder : props.value}
          </BigText>
        </div>
      </div>
      <input
        aria-label={props.label}
        class="NameField--input"
        data-testid={props.testId}
        maxLength={props.maxLength}
        on:keydown={(event) => {
          if (event.key === "Enter") {
            props.submit?.();
          }
        }}
        on:scroll={followScroll}
        onInput={(event) => {
          props.changeValue(event.currentTarget.value);
          followScroll();
        }}
        ref={inputRef}
        spellcheck={false}
        type="text"
        value={props.value}
      />
    </label>
  );
}
