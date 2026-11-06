import "./BigText.css";

import {
  children,
  createMemo,
  createSignal,
  type JSXElement,
  onCleanup,
  onMount,
} from "solid-js";

import Sprite from "../Sprite/Sprite";

const characterWidth = 8;
const spaceCode = 32;
const tildeCode = 126;
const questionMarkCode = 63;

function fontIndex(character: string) {
  const code = character.codePointAt(0) ?? questionMarkCode;
  const fontCode =
    code >= spaceCode && code <= tildeCode ? code : questionMarkCode;

  return fontCode - spaceCode;
}

export default function BigText(props: { children?: JSXElement }) {
  let bigTextRef: HTMLDivElement | undefined;

  const [boxWidth, setBoxWidth] = createSignal(0);

  const resolvedChildren = children(() => props.children);

  const characters = createMemo(() =>
    Array.from(
      resolvedChildren
        .toArray()
        .map((part) =>
          typeof part === "string" || typeof part === "number"
            ? String(part)
            : "",
        )
        .join(""),
    ),
  );

  // A box with no width is not on screen (a hidden tab or row), so the text
  // keeps its size until the box shows.
  const scale = () => {
    const textWidth = characters().length * characterWidth;

    return boxWidth() > 0 && textWidth > boxWidth()
      ? boxWidth() / textWidth
      : 1;
  };

  onMount(() => {
    // jsdom has no ResizeObserver.
    if (bigTextRef === undefined || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setBoxWidth(entry.contentRect.width);
      }
    });

    observer.observe(bigTextRef);

    onCleanup(() => {
      observer.disconnect();
    });
  });

  return (
    <div class="BigText" ref={bigTextRef}>
      <div
        style={{
          transform: `scale(${scale()})`,
          "transform-origin": "left center",
          "white-space": "nowrap",
        }}
      >
        {
          // eslint-disable-next-line solid/prefer-for
          characters().map((character) => (
            <Sprite
              height={16}
              src="images/sdv-font.png"
              width={characterWidth}
              x={fontIndex(character) * characterWidth}
              y={0}
            />
          ))
        }
      </div>
    </div>
  );
}
