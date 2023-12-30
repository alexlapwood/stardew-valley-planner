export function getCanvasPositionAndScale(canvas?: HTMLCanvasElement) {
  if (canvas === undefined) {
    throw new Error("Canvas must be initialised");
  }

  const rect = canvas.getBoundingClientRect();

  const { bottom, left, right, top } = rect;

  const scaleX = canvas.width / (right - left);
  const scaleY = canvas.height / (bottom - top);

  if (isNaN(scaleX) || isNaN(scaleY)) {
    return { left, scaleX: 1, scaleY: 1, top };
  }

  return { left, scaleX, scaleY, top };
}
