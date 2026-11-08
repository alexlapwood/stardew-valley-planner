import { fireEvent } from "@solidjs/testing-library";

// The focus shows the tooltip at once, with no wait for the hover delay.
export function readTooltip(anchor: HTMLElement) {
  fireEvent.focusIn(anchor);

  const id = anchor.getAttribute("aria-describedby");
  const text =
    id === null
      ? null
      : (document.getElementById(id)?.getAttribute("aria-label") ?? null);

  fireEvent.focusOut(anchor);

  return text;
}
