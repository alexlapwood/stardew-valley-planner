export function getCanvasPositionAndScale(canvas?: HTMLCanvasElement) {
  if (canvas === undefined) {
    throw new Error("Canvas must be defined");
  }

  const rect = canvas.getBoundingClientRect();

  const { bottom, left, right, top } = rect;

  const scaleX = canvas.width / (right - left);
  const scaleY = canvas.height / (bottom - top);

  if (isNaN(scaleX) || isNaN(scaleY)) {
    return { left, top, scaleX: 1, scaleY: 1 };
  }

  return { left, top, scaleX, scaleY };
}
