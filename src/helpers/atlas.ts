export const atlasUrls = {
  buildings: "images/game/buildings.png",
  bushes: "images/game/bushes.png",
  crops: "images/game/crops.png",
  fences: "images/game/fences.png",
  flooring: "images/game/flooring.png",
  flooringWinter: "images/game/flooring_winter.png",
  items: "images/game/items.png",
  materials: "images/game/materials.png",
  robin: "images/game/robin.png",
  trees: "images/game/trees.png",
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

// A negative drawImage width does not flip the image, so the flip is a
// transform that mirrors the sprite inside its own rectangle.
export function drawSpriteFlipped(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: TSpriteRect,
  dx: number,
  dy: number,
) {
  const [x, y, width, height] = rect;

  context.save();
  context.translate(dx + width, dy);
  context.scale(-1, 1);
  context.drawImage(image, x, y, width, height, 0, 0, width, height);
  context.restore();
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
