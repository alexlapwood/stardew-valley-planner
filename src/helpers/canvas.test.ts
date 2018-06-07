import { getCanvasPositionAndScale } from "./canvas";

it("getCanvasPositionAndScale", () => {
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
