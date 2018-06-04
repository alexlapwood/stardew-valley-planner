import { getSeason } from "./date";

export function getCanvasImages(date: number) {
  const season = ["spring", "summer", "fall", "winter"][getSeason(date)];

  const createImage: HTMLImageElement | null = document.querySelector(
    `img[src="/images/create.png"]`
  );

  const destroyImage: HTMLImageElement | null = document.querySelector(
    `img[src="/images/destroy.png"]`
  );
  const backgroundImage: HTMLImageElement | null = document.querySelector(
    `img[src="/images/background-${season}.png"]`
  );
  const cropsImage: HTMLImageElement | null = document.querySelector(
    `img[src="/images/crops.png"]`
  );

  if (
    backgroundImage === null ||
    createImage === null ||
    cropsImage === null ||
    destroyImage === null
  ) {
    throw new Error("Error loading images");
  }

  return { backgroundImage, createImage, cropsImage, destroyImage };
}

export function getCanvasPositionAndScale(canvas?: HTMLCanvasElement) {
  if (canvas === undefined) {
    throw new Error();
  }

  const rect = canvas.getBoundingClientRect();
  const { left, top } = rect;

  const scaleX = canvas.width / (rect.right - rect.left);
  const scaleY = canvas.height / (rect.bottom - rect.top);

  return { left, top, scaleX, scaleY };
}
