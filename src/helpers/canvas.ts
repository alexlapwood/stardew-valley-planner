export function getCanvasPositionAndScale(canvas?: HTMLCanvasElement) {
  if (canvas === undefined) {
    throw new Error("Canvas must be defined");
  }

  const rect = canvas.getBoundingClientRect();
  const { left, top } = rect;

  const scaleX = canvas.width / (rect.right - rect.left);
  const scaleY = canvas.height / (rect.bottom - rect.top);

  return { left, top, scaleX, scaleY };
}
