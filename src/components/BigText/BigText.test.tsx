import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

import BigText from "./BigText";

class FakeResizeObserver {
  static observers: FakeResizeObserver[] = [];

  readonly targets = new Set<Element>();

  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.observers.push(this);
  }

  disconnect() {
    this.targets.clear();
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }
}

function resizeBox(width: number) {
  for (const observer of FakeResizeObserver.observers) {
    for (const target of observer.targets) {
      const entry = { contentRect: { width }, target };

      observer.callback([entry as unknown as ResizeObserverEntry], observer);
    }
  }
}

function watchedBoxes() {
  return FakeResizeObserver.observers.flatMap((observer) =>
    Array.from(observer.targets),
  );
}

function spritePositions(text: string) {
  const { container } = render(() => <BigText>{text}</BigText>);

  return Array.from(
    container.querySelectorAll<HTMLElement>(".sprite"),
    (sprite) => sprite.style.backgroundPosition,
  );
}

function textScale(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".BigText > div")?.style
    .transform;
}

describe("<BigText />", () => {
  it("draws each letter from the font", () => {
    expect(spritePositions("A~ ")).toEqual([
      "-264px 0px",
      "-752px 0px",
      "0px 0px",
    ]);
  });

  it("draws a letter that the font does not have as ?", () => {
    const questionMark = "-248px 0px";

    expect(spritePositions("é🌾")).toEqual([questionMark, questionMark]);
  });

  describe("fit to the box", () => {
    beforeEach(() => {
      FakeResizeObserver.observers = [];
      vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("shrinks text that is wider than its box", () => {
      const { container } = render(() => (
        <BigText>Junimo Kart Arcade System</BigText>
      ));

      resizeBox(100);

      expect(textScale(container)).toBe("scale(0.5)");
    });

    it("keeps text that fits at full size", () => {
      const { container } = render(() => <BigText>Stone Floor</BigText>);

      resizeBox(88);

      expect(textScale(container)).toBe("scale(1)");
    });

    it("counts a letter that the font does not have as one letter", () => {
      const { container } = render(() => <BigText>🌾🌾</BigText>);

      resizeBox(8);

      expect(textScale(container)).toBe("scale(0.5)");
    });

    it("fits the text again when the text changes", () => {
      const [text, setText] = createSignal("Hoe");
      const { container } = render(() => <BigText>{text()}</BigText>);

      resizeBox(80);

      expect(textScale(container)).toBe("scale(1)");

      setText("Stepping Stone Path");

      expect(textScale(container)).toBe(`scale(${80 / (19 * 8)})`);

      setText("Hoe");

      expect(textScale(container)).toBe("scale(1)");
    });

    it("fits the text again when the box changes size", () => {
      const { container } = render(() => <BigText>Rustic Plank Floor</BigText>);

      resizeBox(144);

      expect(textScale(container)).toBe("scale(1)");

      resizeBox(72);

      expect(textScale(container)).toBe("scale(0.5)");
    });

    it("keeps the text at full size while the box is hidden", () => {
      const { container } = render(() => (
        <BigText>Junimo Kart Arcade System</BigText>
      ));

      resizeBox(0);

      expect(textScale(container)).toBe("scale(1)");
    });

    it("stops watching the box when it goes away", () => {
      const { container, unmount } = render(() => <BigText>Hoe</BigText>);

      expect(watchedBoxes()).toEqual([container.querySelector(".BigText")]);

      unmount();

      expect(watchedBoxes()).toEqual([]);
    });
  });
});
