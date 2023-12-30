import "./BigText.css";

import { children } from "solid-js";
import { createRenderEffect, createSignal, JSXElement } from "solid-js";

import Sprite from "../Sprite/Sprite";

export default function BigText(props: { children?: JSXElement }) {
  let bigTextRef: HTMLDivElement | undefined;

  const [scale, setScale] = createSignal(1);

  const text = () => {
    const childrenWithText = children(() => props.children)();
    if (childrenWithText) {
      if (Array.isArray(childrenWithText)) {
        return childrenWithText.join("");
      } else {
        return String(childrenWithText);
      }
    }

    return "";
  };

  createRenderEffect(() => {
    if (bigTextRef) {
      setScale(Math.min(bigTextRef.offsetWidth / (text().length * 8), 1));
    }
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
          text()
            .split("")
            .map((character) => {
              const characterIndex = character.charCodeAt(0) - 32;
              return (
                <Sprite
                  height={16}
                  src="images/sdv-font.png"
                  width={8}
                  x={characterIndex * 8}
                  y={0}
                />
              );
            })
        }
      </div>
    </div>
  );
}
