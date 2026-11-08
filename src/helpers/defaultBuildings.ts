import { buildings } from "../data/game/buildings.json";
import { water as waterStrip } from "../data/game/water.json";
import { drawSprite } from "./atlas";
import { getPaintJob } from "./buildingColors";
import type { TNextChange } from "./mapFrames";
import { drawPaintedSprite } from "./paintedSprites";
import { drawFishPond, type IWaterLook } from "./renderFishPond";
import { getSortRow, type ISortedDraw } from "./renderSorted";
import { getAnimationNextChange, getSpriteAt } from "./spriteAnimation";
import { fadedAlpha } from "./tallSprites";
import { getWaterNextChange } from "./water";

// colors are the paint on the date. A look with no paint mask shows none.
export interface IPlacedBuilding {
  building: IBuilding;
  buildingId: string;
  colors?: TPaintColors;
  isUpgrading?: boolean;
  lookKey?: string;
  spot: IFarmSpot;
}

// time is the time of the map clock. With no time, the buildings are still.
// water is the farm water, which a fish pond shows.
export interface IBuildingMotion {
  time?: number;
  water?: IWaterLook;
}

export type TShadowLayer = "overFloors" | "underFloors";

export const buildingIdBySpot: Record<keyof IFarmSpots, string> = {
  farmhouse: "farmhouse",
  greenhouse: "greenhouse",
  petBowl: "pet_bowl",
  shippingBin: "shipping_bin",
};

export const greenhouseLooks: readonly TGreenhouseLook[] = [
  "broken",
  "repaired",
];

const greenhouseLookKey = (greenhouse: TGreenhouseLook) => greenhouse;

const lookKeyBySpot: Partial<
  Record<keyof IFarmSpots, (looks: IFarmLooks) => string>
> = {
  farmhouse: ({ house }) => house,
  greenhouse: ({ greenhouse }) => greenhouseLookKey(greenhouse),
  petBowl: ({ petBowl }) => petBowl,
};

const colorsBySpot: Partial<
  Record<keyof IFarmSpots, (looks: IFarmLooks) => TPaintColors | undefined>
> = {
  farmhouse: ({ houseColors }) => houseColors,
};

const spotNames: (keyof IFarmSpots)[] = [
  "farmhouse",
  "greenhouse",
  "petBowl",
  "shippingBin",
];

function getBuilding(buildingId: string) {
  if (!Object.hasOwn(buildings, buildingId)) {
    throw new Error(`buildings.json has no ${buildingId} building`);
  }

  return buildings[buildingId];
}

function findStartLook<T>(
  buildingId: string,
  looks: readonly T[],
  lookKey: (look: T) => string,
) {
  const { startLook } = getBuilding(buildingId);
  const look = looks.find((candidate) => lookKey(candidate) === startLook);

  if (look === undefined) {
    throw new Error(
      `The ${buildingId} in buildings.json starts with the look "${startLook}", which the planner does not know.`,
    );
  }

  return look;
}

// The pet bowl starts with no skin, and its look with no skin has the id of
// the building.
export const defaultFarmLooks: IFarmLooks = {
  greenhouse: findStartLook("greenhouse", greenhouseLooks, greenhouseLookKey),
  house: findStartLook(
    "farmhouse",
    Object.keys(getBuilding("farmhouse").looks ?? {}),
    (look) => look,
  ),
  petBowl: buildingIdBySpot.petBowl,
};

function findLook(building: IBuilding, lookKey: string) {
  return building.looks?.[lookKey] ?? building.skins?.[lookKey];
}

export function getDefaultBuildings(
  map: IFarmMap,
  looks = defaultFarmLooks,
): IPlacedBuilding[] {
  return spotNames.map((spotName) => {
    const buildingId = buildingIdBySpot[spotName];
    const colors = colorsBySpot[spotName]?.(looks);

    return {
      building: getBuilding(buildingId),
      buildingId,
      ...(colors === undefined ? {} : { colors }),
      lookKey: lookKeyBySpot[spotName]?.(looks),
      spot: map.spots[spotName],
    };
  });
}

export function isInSpot(spot: IFarmSpot, x: number, y: number) {
  return (
    x >= spot.x &&
    x < spot.x + spot.width &&
    y >= spot.y &&
    y < spot.y + spot.height
  );
}

export function isOnDefaultBuilding(map: IFarmMap, x: number, y: number) {
  return spotNames.some((spotName) => isInSpot(map.spots[spotName], x, y));
}

export function findDefaultBuildingAt(map: IFarmMap, x: number, y: number) {
  const spotName = spotNames.find((name) => isInSpot(map.spots[name], x, y));

  return spotName === undefined
    ? undefined
    : { buildingId: buildingIdBySpot[spotName], spot: map.spots[spotName] };
}

const solidCollisionTile = "X";

export function isSolidBuildingTile(
  { building, spot }: Pick<IPlacedBuilding, "building" | "spot">,
  x: number,
  y: number,
) {
  return (
    isInSpot(spot, x, y) &&
    building.collision[y - spot.y]?.[x - spot.x] === solidCollisionTile
  );
}

function getLookSprite(building: IBuilding, lookKey: string | undefined) {
  return lookKey === undefined
    ? undefined
    : findLook(building, lookKey)?.sprite;
}

interface IShownSprite {
  animation?: ISpriteAnimation;
  offset: IPixelOffset;
  rect: TSpriteRect;
}

// The animation frames are of the sprite, so a season sprite has no
// animation.
export function getBuildingSprite(
  building: IBuilding,
  season: string,
  lookKey?: string,
): IShownSprite {
  const { animation, offset, seasons, sprite } =
    getLookSprite(building, lookKey) ?? building.sprite;
  const seasonRect = seasons?.[season];

  return {
    offset,
    rect: seasonRect ?? sprite,
    ...(animation === undefined || seasonRect !== undefined
      ? {}
      : { animation }),
  };
}

// The game draws the upgrade sign just over the building, with the same fade
// (SV › Building.draw), and nothing else sorts between them.
function getUpgradeSign({ building, isUpgrading }: IPlacedBuilding) {
  return isUpgrading === true ? building.upgradeSign : undefined;
}

// The game sorts all the pieces of a fish pond near the top of its footprint,
// not by its bottom row (SV › FishPond.draw).
function getBuildingRow({ building, spot }: IPlacedBuilding) {
  const { fishPond } = building;

  return fishPond === undefined
    ? spot.y + spot.height - 1
    : getSortRow(spot.y, fishPond.sortY);
}

export function getBuildingDraws(
  context: CanvasRenderingContext2D,
  buildingsImage: CanvasImageSource,
  placedBuildings: readonly IPlacedBuilding[],
  season: string,
  { time, water }: IBuildingMotion = {},
): ISortedDraw[] {
  return placedBuildings.map((placedBuilding): ISortedDraw => {
    const { building, colors, lookKey, spot } = placedBuilding;
    const { animation, offset, rect } = getBuildingSprite(
      building,
      season,
      lookKey,
    );
    const [, , width, height] = rect;
    const x = spot.x * 16 + offset.x;
    const y = spot.y * 16 + offset.y;
    const sign = getUpgradeSign(placedBuilding);
    const paintJob = getPaintJob(building, lookKey, colors, offset);
    const { fishPond } = building;
    const tall = { base: spot, drawn: { height, width, x, y } };
    const row = getBuildingRow(placedBuilding);

    if (fishPond !== undefined) {
      const images = { buildings: buildingsImage, water };

      return {
        draw: () => {
          drawFishPond(context, images, fishPond, spot, time);
        },
        // The game fades all of the pond but its water (SV › FishPond.draw).
        fadedDraw: () => {
          drawFishPond(context, images, fishPond, spot, time, fadedAlpha);
        },
        layer: "building",
        row,
        tall,
      };
    }

    return {
      draw: () => {
        const frame = getSpriteAt(rect, animation, time);

        drawPaintedSprite(context, buildingsImage, frame, x, y, paintJob);

        if (sign !== undefined) {
          drawSprite(
            context,
            buildingsImage,
            sign.sprite,
            spot.x * 16 + sign.offset.x,
            spot.y * 16 + sign.offset.y,
          );
        }
      },
      layer: "building",
      row,
      tall,
    };
  });
}

export function getDefaultBuildingDraws(
  context: CanvasRenderingContext2D,
  buildingsImage: CanvasImageSource,
  map: IFarmMap,
  season: string,
  looks: IFarmLooks,
  motion: IBuildingMotion = {},
): ISortedDraw[] {
  return getBuildingDraws(
    context,
    buildingsImage,
    getDefaultBuildings(map, looks),
    season,
    motion,
  );
}

function getAnimations({ building, lookKey }: IPlacedBuilding, season: string) {
  return [
    getBuildingSprite(building, season, lookKey).animation,
    building.fishPond?.edge.animation,
  ].filter((animation) => animation !== undefined);
}

// A fish pond shows the farm water, so it changes when the farm water does.
export function getBuildingsNextChange(
  placedBuildings: readonly IPlacedBuilding[],
  season: string,
): TNextChange {
  const animations = [
    ...new Set(
      placedBuildings.flatMap((placedBuilding) =>
        getAnimations(placedBuilding, season),
      ),
    ),
  ];
  const hasWater = placedBuildings.some(
    ({ building }) => building.fishPond !== undefined,
  );

  return (time) =>
    Math.min(
      ...animations.map((animation) => getAnimationNextChange(animation, time)),
      hasWater ? getWaterNextChange(waterStrip, time) : Infinity,
    );
}

function getShadowLayer(building: IBuilding): TShadowLayer {
  return building.shadowUnderFloors === true ? "underFloors" : "overFloors";
}

export function drawDefaultBuildingShadows(
  context: CanvasRenderingContext2D,
  buildingsImage: CanvasImageSource,
  map: IFarmMap,
  layer: TShadowLayer,
) {
  drawBuildingShadows(context, buildingsImage, getDefaultBuildings(map), layer);
}

export function drawBuildingShadows(
  context: CanvasRenderingContext2D,
  buildingsImage: CanvasImageSource,
  placedBuildings: readonly IPlacedBuilding[],
  layer: TShadowLayer,
) {
  placedBuildings.forEach(({ building, spot }) => {
    if (getShadowLayer(building) !== layer) {
      return;
    }

    building.shadowPieces?.forEach(({ offset, sprite }) => {
      drawSprite(
        context,
        buildingsImage,
        sprite,
        spot.x * 16 + offset.x,
        spot.y * 16 + offset.y,
      );
    });
  });
}
