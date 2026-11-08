import { water as waterStrip } from "../data/game/water.json";
import { drawSprite } from "./atlas";
import { getSpriteAt } from "./spriteAnimation";
import {
  getTintedStrip,
  getWaterMotion,
  getWaterRow,
  type IWaterDraw,
  type IWaterMotion,
} from "./water";

const tileSize = 16;

// The pond water is the farm water, so it has the strip and the tint of the
// farm water in the season. With no tint, the farm has no water to show.
export interface IWaterLook {
  image: CanvasImageSource;
  tint?: TRgba;
}

export interface IPondImages {
  buildings: CanvasImageSource;
  water?: IWaterLook;
}

export interface IPondDraw extends IWaterDraw {
  sheet: "buildings" | "water";
}

export function getNettingStyle(
  { nettings, nettingTileStep }: IFishPond,
  { x, y }: IFarmTile,
) {
  return (
    (Math.floor(x / nettingTileStep) + Math.floor(y / nettingTileStep)) %
    nettings.length
  );
}

// The rows slide up with the farm water. The first row loses the slide at its
// top, as the top of the farm water does, and the last row grows by the slide,
// so the water has no gap under the edge (SV › FishPond.draw).
export function getPondWaterDraws(
  { columns, lastRowHeight, offset, rows }: IFishPondWater,
  { x, y }: IFarmTile,
  { flip, frame, slide }: IWaterMotion,
  strip: IWaterStrip = waterStrip,
): IWaterDraw[] {
  const { frameHeight, frameWidth } = strip;

  return Array.from({ length: rows }, (_, row) => {
    const cut = row === 0 ? slide : 0;
    const height = row === rows - 1 ? lastRowHeight + slide : frameHeight;

    return Array.from({ length: columns }, (__, column): IWaterDraw => ({
      dx: x * tileSize + offset.x + column * frameWidth,
      dy: y * tileSize + offset.y + row * frameHeight - slide + cut,
      source: [
        frame * frameWidth,
        getWaterRow(x + column, y + row, flip) * frameHeight + cut,
        frameWidth,
        height - cut,
      ],
    }));
  }).flat();
}

// The game draws the pieces from the floor up (SV › FishPond.draw).
export function getFishPondDraws(
  pond: IFishPond,
  tile: IFarmTile,
  time?: number,
): IPondDraw[] {
  const { edge, floor } = pond;
  const netting = pond.nettings.at(getNettingStyle(pond, tile));
  const piece = ({ offset }: ISpritePiece, source: TSpriteRect): IPondDraw => ({
    dx: tile.x * tileSize + offset.x,
    dy: tile.y * tileSize + offset.y,
    sheet: "buildings",
    source,
  });
  const water = getPondWaterDraws(
    pond.water,
    tile,
    getWaterMotion(waterStrip, time ?? 0),
  );

  return [
    piece(floor, floor.sprite),
    ...water.map((draw): IPondDraw => ({ ...draw, sheet: "water" })),
    piece(edge, getSpriteAt(edge.sprite, edge.animation, time)),
    ...(netting === undefined ? [] : [piece(netting, netting.sprite)]),
  ];
}

function getWaterImage(water: IWaterLook | undefined) {
  if (water === undefined || water.tint === undefined) {
    return undefined;
  }

  return getTintedStrip(waterStrip, water.image, water.tint);
}

// fade is the alpha of the pond pieces. The water keeps the alpha of the
// context, because the game draws it with no fade (SV › FishPond.draw).
export function drawFishPond(
  context: CanvasRenderingContext2D,
  images: IPondImages,
  pond: IFishPond,
  tile: IFarmTile,
  time?: number,
  fade = 1,
) {
  const sheets = {
    buildings: images.buildings,
    water: getWaterImage(images.water),
  };
  const { globalAlpha } = context;

  getFishPondDraws(pond, tile, time).forEach(({ dx, dy, sheet, source }) => {
    const image = sheets[sheet];

    if (image !== undefined) {
      context.globalAlpha =
        sheet === "water" ? globalAlpha : globalAlpha * fade;
      drawSprite(context, image, source, dx, dy);
    }
  });

  context.globalAlpha = globalAlpha;
}
