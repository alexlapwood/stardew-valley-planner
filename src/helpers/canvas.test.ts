import { getCanvasPositionAndScale } from "./canvas";

describe("getCanvasPositionAndScale", () => {
  document.body.innerHTML = "<canvas />";
  const canvas = document.querySelector("canvas");

  if (canvas === null) {
    throw new Error();
  }

  it("", () => {
    const result = getCanvasPositionAndScale(canvas);
    expect(result).toEqual({
      left: 0,
      scaleX: Infinity,
      scaleY: Infinity,
      top: 0
    });
  });
});
