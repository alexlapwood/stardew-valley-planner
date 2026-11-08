import { drawSprite, drawSpriteFlipped } from "./atlas";
import {
  getBushesOn,
  getBushFootprint,
  getBushKind,
  getBushSprite,
  isBushFlipped,
} from "./bushes";
import { getSeasonName } from "./date";
import type { ISortedDraw, TSortedLayer } from "./renderSorted";

const tileSize = 16;

// cutBushes and date pick the bushes that are on the farm on the date.
export interface IBushScene {
  cutBushes?: readonly ICutBush[];
  date: number;
  map: IFarmMap;
}

// The game flips the shadow with the bush (SV › Bush.draw).
function drawBushPiece(
  context: CanvasRenderingContext2D,
  bushesImage: CanvasImageSource,
  bush: IFarmBush,
  { offset, sprite }: ISpritePiece,
) {
  const draw = isBushFlipped(bush) ? drawSpriteFlipped : drawSprite;

  draw(
    context,
    bushesImage,
    sprite,
    bush.x * tileSize + offset.x,
    bush.y * tileSize + offset.y,
  );
}

export function drawBushShadows(
  context: CanvasRenderingContext2D,
  bushesImage: CanvasImageSource,
  { cutBushes, date, map }: IBushScene,
) {
  getBushesOn(map, cutBushes, date)
    .filter(({ noShadow }) => noShadow !== true)
    .forEach((bush) => {
      drawBushPiece(context, bushesImage, bush, getBushKind(bush).shadow);
    });
}

// sortY is the depth of the bush in pixels from the top of its row (SV ›
// Bush.draw). Past the bottom line of the row, the bush covers all of its
// row, also the Front tiles, and the next row covers it.
function getBushLayer({ sortY }: IBush): TSortedLayer {
  return sortY > tileSize ? "afterRow" : "building";
}

// The planner draws the bush with no berries.
export function getBushDraws(
  context: CanvasRenderingContext2D,
  bushesImage: CanvasImageSource,
  { cutBushes, date, map }: IBushScene,
): ISortedDraw[] {
  const season = getSeasonName(date);

  return getBushesOn(map, cutBushes, date).map((bush) => {
    const { offset, rect } = getBushSprite(bush, season);
    const [, , width, height] = rect;

    return {
      draw: () => {
        drawBushPiece(context, bushesImage, bush, { offset, sprite: rect });
      },
      layer: getBushLayer(getBushKind(bush)),
      row: bush.y,
      tall: {
        base: getBushFootprint(bush),
        drawn: {
          height,
          width,
          x: bush.x * tileSize + offset.x,
          y: bush.y * tileSize + offset.y,
        },
      },
    };
  });
}
