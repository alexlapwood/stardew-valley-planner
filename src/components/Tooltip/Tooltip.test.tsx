import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import { atlasSprite } from "../../helpers/atlas";
import type { IBox, ITooltipLine } from "../../helpers/tooltip";
import Tooltip, { hoverDelay, TooltipBox } from "./Tooltip";

const barnLines: ITooltipLine[] = [
  { text: "Barn" },
  { icon: "💰", text: "6000g" },
];

const woodSprite = atlasSprite("items", [32, 48, 16, 16]);

function renderAnchor(startLines: readonly ITooltipLine[] = barnLines) {
  const [lines, setLines] = createSignal(startLines);
  let anchorRef: HTMLButtonElement | undefined;

  render(() => (
    <>
      <button data-testid="anchor" ref={anchorRef} type="button" />
      <Tooltip anchor={() => anchorRef} lines={lines()} />
    </>
  ));

  return { anchor: screen.getByTestId("anchor"), setLines };
}

const shownText = () =>
  screen.queryByRole("tooltip")?.getAttribute("aria-label") ?? null;

function lineParts(line: Element) {
  return Array.from(
    line.querySelectorAll(".Tooltip--icon, .Tooltip--text > *"),
  ).map((part) =>
    part.classList.contains("BigText")
      ? `BigText(${part.querySelectorAll(".sprite").length})`
      : part.textContent,
  );
}

const toRect = ({ height, width, x, y }: IBox) =>
  ({
    bottom: y + height,
    height,
    left: x,
    right: x + width,
    top: y,
    width,
    x,
    y,
  }) as DOMRect;

// The box is 100 × 30 page pixels. The page is scaled 2 times, and it starts
// at 10, 20 on the screen, so the box at 0, 0 is at 10, 20 and 200 × 60.
function fakePageLayout(anchorOnScreen: IBox) {
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1600);
  vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(900);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(30);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      return this.getAttribute("role") === "tooltip"
        ? toRect({ height: 60, width: 200, x: 10, y: 20 })
        : toRect(anchorOnScreen);
    },
  );
}

const shownPosition = () => {
  const box = screen.getByRole("tooltip");

  return [box.style.left, box.style.top];
};

describe("<Tooltip />", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows the lines when the mouse stays on the anchor, and hides them when it leaves", () => {
    const { anchor } = renderAnchor();

    fireEvent.mouseEnter(anchor);
    vi.advanceTimersByTime(hoverDelay - 1);

    expect(shownText()).toBeNull();

    vi.advanceTimersByTime(1);

    expect(shownText()).toBe("Barn\n💰 6000g");

    fireEvent.mouseLeave(anchor);

    expect(shownText()).toBeNull();
  });

  it("shows nothing when the mouse only crosses the anchor", () => {
    const { anchor } = renderAnchor();

    fireEvent.mouseEnter(anchor);
    vi.advanceTimersByTime(hoverDelay / 2);
    fireEvent.mouseLeave(anchor);
    vi.advanceTimersByTime(hoverDelay);

    expect(shownText()).toBeNull();
  });

  it("shows the lines at once when the focus goes into the anchor, and hides them when it goes out", () => {
    const { anchor } = renderAnchor();

    fireEvent.focusIn(anchor);

    expect(shownText()).toBe("Barn\n💰 6000g");

    fireEvent.focusOut(anchor);

    expect(shownText()).toBeNull();
  });

  it("hides the lines when Esc is pressed", () => {
    const { anchor } = renderAnchor();

    fireEvent.focusIn(anchor);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(shownText()).toBeNull();
  });

  it("describes the anchor with the tooltip only while it shows", () => {
    const { anchor } = renderAnchor();

    expect(anchor.hasAttribute("aria-describedby")).toBe(false);

    fireEvent.focusIn(anchor);

    expect(anchor.getAttribute("aria-describedby")).toBe(
      screen.getByRole("tooltip").id,
    );

    fireEvent.focusOut(anchor);

    expect(anchor.hasAttribute("aria-describedby")).toBe(false);
  });

  it("shows nothing, and describes nothing, for an anchor with no lines", () => {
    const { anchor } = renderAnchor([]);

    fireEvent.focusIn(anchor);

    expect(shownText()).toBeNull();
    expect(anchor.hasAttribute("aria-describedby")).toBe(false);
  });

  it("changes the lines while it shows", () => {
    const { anchor, setLines } = renderAnchor();

    fireEvent.focusIn(anchor);
    setLines([{ text: "Big Barn" }]);

    expect(shownText()).toBe("Big Barn");
  });

  it("does not add a title, so that the browser shows no second tooltip", () => {
    const { anchor } = renderAnchor();

    fireEvent.focusIn(anchor);

    expect(document.querySelectorAll("[title]")).toHaveLength(0);
    expect(anchor.hasAttribute("title")).toBe(false);
  });

  describe("on a page that is scaled to fit the window", () => {
    it("puts the tooltip above the anchor, in page pixels", () => {
      fakePageLayout({ height: 40, width: 100, x: 310, y: 420 });
      const { anchor } = renderAnchor();

      fireEvent.focusIn(anchor);

      expect(shownPosition()).toEqual(["150px", "168px"]);
    });

    it("keeps the tooltip in the window", () => {
      fakePageLayout({ height: 40, width: 100, x: 1590, y: 24 });
      const { anchor } = renderAnchor();

      fireEvent.focusIn(anchor);

      expect(shownPosition()).toEqual(["695px", "24px"]);
    });

    it("moves the tooltip with the anchor when the page scrolls", () => {
      fakePageLayout({ height: 40, width: 100, x: 310, y: 420 });
      const { anchor } = renderAnchor();

      fireEvent.focusIn(anchor);
      fakePageLayout({ height: 40, width: 100, x: 310, y: 220 });
      fireEvent.scroll(anchor);

      expect(shownPosition()).toEqual(["150px", "68px"]);
    });
  });
});

function renderLines(lines: ITooltipLine[]) {
  render(() => <TooltipBox id="tooltip" lines={lines} />);

  return Array.from(screen.getByRole("tooltip").children);
}

describe("<TooltipBox />", () => {
  it("has the look of the toolbar, and the text of all its lines as its label", () => {
    renderLines(barnLines);

    const box = screen.getByRole("tooltip");

    expect(box.classList).toContain("sdv-toolbar-border");
    expect(box.getAttribute("aria-label")).toBe("Barn\n💰 6000g");
  });

  it("draws the icon of a line before its text", () => {
    const [nameLine, goldLine] = renderLines(barnLines);

    expect(lineParts(nameLine)).toEqual(["BigText(4)"]);
    expect(lineParts(goldLine)).toEqual(["💰", "BigText(5)"]);
  });

  it("draws the sprite of a line in the place of its icon", () => {
    const [woodLine] = renderLines([
      { icon: "🧱", sprite: woodSprite, text: "Wood" },
    ]);

    expect(woodLine.querySelector(".Tooltip--icon")).toBeNull();
    expect(
      woodLine.querySelector<HTMLElement>(".FitSprite .sprite")?.style
        .backgroundPosition,
    ).toBe("-32px -48px");
  });

  it("draws the characters that the font does not have as text", () => {
    const [woodLine, builderLine] = renderLines([
      { icon: "🧱", text: "Wood ×350" },
      { icon: "🔨", text: "Robin · ⏱️ 3 days" },
    ]);

    expect(lineParts(woodLine)).toEqual([
      "🧱",
      "BigText(5)",
      "×",
      "BigText(3)",
    ]);
    expect(lineParts(builderLine)).toEqual([
      "🔨",
      "BigText(6)",
      "·",
      "BigText(1)",
      "⏱️",
      "BigText(7)",
    ]);
  });
});
