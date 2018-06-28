import { getCanvasPositionAndScale } from "./canvas";

describe("getCanvasPositionAndScale", () => {
  it("can get the canvas position and scale", () => {
    document.body.innerHTML = "<canvas />";
    const canvas = document.querySelector("canvas");

    if (canvas === null) {
      throw new Error();
    }

    const result = getCanvasPositionAndScale(canvas);
    expect(result).toEqual({
      left: 0,
      scaleX: Infinity,
      scaleY: Infinity,
      top: 0
    });
  });

  it("will throw an error if canvas is undefined", () => {
    expect(getCanvasPositionAndScale).toThrowError("Canvas must be defined");
  });
});
