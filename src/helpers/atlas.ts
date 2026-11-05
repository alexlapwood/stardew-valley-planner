export const atlasUrls = {
  crops: "images/game/crops.png",
  fences: "images/game/fences.png",
  flooring: "images/game/flooring.png",
  flooringWinter: "images/game/flooring_winter.png",
  items: "images/game/items.png",
} as const;

export type TAtlas = keyof typeof atlasUrls;

export function atlasSprite(atlas: TAtlas, rect: TSpriteRect) {
  const [x, y, width, height] = rect;

  return { height, src: atlasUrls[atlas], width, x, y };
}

export function findImage(images: HTMLImageElement[], path: string) {
  const image = images.find((candidate) => candidate.src.includes(path));

  if (image === undefined) {
    throw new Error("Error loading images");
  }

  return image;
}

export function findAtlas(images: HTMLImageElement[], atlas: TAtlas) {
  return findImage(images, atlasUrls[atlas]);
}

export function drawSprite(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: TSpriteRect,
  dx: number,
  dy: number,
) {
  const [x, y, width, height] = rect;

  context.drawImage(image, x, y, width, height, dx, dy, width, height);
}

export function drawSpriteOnTile(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: TSpriteRect,
  x: number,
  y: number,
) {
  const [, , width, height] = rect;

  drawSprite(
    context,
    image,
    rect,
    x * 16 + (16 - width) / 2,
    y * 16 + 16 - height,
  );
}
