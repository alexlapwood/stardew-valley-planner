import { buildings } from "../data/game/buildings.json";
import { drawSprite } from "./atlas";
import type { ISortedDraw } from "./renderSorted";

export interface IPlacedBuilding {
  building: IBuilding;
  buildingId: string;
  lookKey?: string;
  spot: IFarmSpot;
}

export type TShadowLayer = "overFloors" | "underFloors";

export const buildingIdBySpot: Record<keyof IFarmSpots, string> = {
  farmhouse: "farmhouse",
  greenhouse: "greenhouse",
  petBowl: "pet_bowl",
  shippingBin: "shipping_bin",
};

export const farmhouseLooks: readonly TFarmhouseLook[] = [0, 1, 2];

export const greenhouseLooks: readonly TGreenhouseLook[] = [
  "broken",
  "repaired",
];

const farmhouseLookKey = (house: TFarmhouseLook) => `upgrade_${house}`;

const greenhouseLookKey = (greenhouse: TGreenhouseLook) => greenhouse;

const lookKeyBySpot: Partial<
  Record<keyof IFarmSpots, (looks: IFarmLooks) => string>
> = {
  farmhouse: ({ house }) => farmhouseLookKey(house),
  greenhouse: ({ greenhouse }) => greenhouseLookKey(greenhouse),
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

export const defaultFarmLooks: IFarmLooks = {
  greenhouse: findStartLook("greenhouse", greenhouseLooks, greenhouseLookKey),
  house: findStartLook("farmhouse", farmhouseLooks, farmhouseLookKey),
};

export function getDefaultBuildings(
  map: IFarmMap,
  looks = defaultFarmLooks,
): IPlacedBuilding[] {
  return spotNames.map((spotName) => {
    const buildingId = buildingIdBySpot[spotName];

    return {
      building: getBuilding(buildingId),
      buildingId,
      lookKey: lookKeyBySpot[spotName]?.(looks),
      spot: map.spots[spotName],
    };
  });
}

function getLookSprite(building: IBuilding, lookKey: string | undefined) {
  return lookKey === undefined ? undefined : building.looks?.[lookKey]?.sprite;
}

export function getBuildingSprite(
  building: IBuilding,
  season: string,
  lookKey?: string,
) {
  const { offset, seasons, sprite } =
    getLookSprite(building, lookKey) ?? building.sprite;

  return { offset, rect: seasons?.[season] ?? sprite };
}

export function getDefaultBuildingDraws(
  context: CanvasRenderingContext2D,
  buildingsImage: CanvasImageSource,
  map: IFarmMap,
  season: string,
  looks: IFarmLooks,
): ISortedDraw[] {
  return getDefaultBuildings(map, looks).map(({ building, lookKey, spot }) => {
    const { offset, rect } = getBuildingSprite(building, season, lookKey);

    return {
      draw: () => {
        drawSprite(
          context,
          buildingsImage,
          rect,
          spot.x * 16 + offset.x,
          spot.y * 16 + offset.y,
        );
      },
      layer: "building",
      row: spot.y + spot.height - 1,
    };
  });
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
  getDefaultBuildings(map).forEach(({ building, spot }) => {
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
