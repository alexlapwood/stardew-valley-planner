import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import NameField from "./NameField";

function renderField(maxLength?: number) {
  const [value, setValue] = createSignal("A name that is wider than the box");

  const result = render(() => (
    <NameField
      changeValue={setValue}
      label="Name"
      maxLength={maxLength}
      testId="name-field"
      value={value()}
    />
  ));

  return { ...result, value };
}

function input() {
  return screen.getByTestId<HTMLInputElement>("name-field");
}

function scrollInput(scrollLeft: number) {
  Object.defineProperty(input(), "scrollLeft", {
    configurable: true,
    value: scrollLeft,
  });
}

function textOffset(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".NameField--text > div")?.style
    .transform;
}

describe("<NameField />", () => {
  it("moves the text left with the input when the input scrolls to the caret", () => {
    const { container } = renderField();

    expect(textOffset(container)).toBe("translateX(0px)");

    scrollInput(40);
    fireEvent.scroll(input());

    expect(textOffset(container)).toBe("translateX(-40px)");

    scrollInput(0);
    fireEvent.scroll(input());

    expect(textOffset(container)).toBe("translateX(0px)");
  });

  it("moves the text with the input while the user types", () => {
    const { container, value } = renderField();

    scrollInput(48);
    fireEvent.input(input(), { target: { value: `${value()} and more` } });

    expect(value()).toBe("A name that is wider than the box and more");
    expect(textOffset(container)).toBe("translateX(-48px)");
  });

  it("has no length limit with no maxLength", () => {
    renderField();

    expect(input().hasAttribute("maxlength")).toBe(false);
  });

  it("limits the length to maxLength", () => {
    renderField(48);

    expect(input().maxLength).toBe(48);
  });
});
