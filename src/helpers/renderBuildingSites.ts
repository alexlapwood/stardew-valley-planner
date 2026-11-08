import { buildings } from "../data/game/buildings.json";
import { drawSprite } from "./atlas";
import {
  getBuildMoment,
  type IBuildAnimation,
  type IBuildPlan,
  isBuildOn,
} from "./buildAnimation";
import type { IPlacedBuilding } from "./defaultBuildings";
import {
  getFootprint,
  getPlacedBuildingsOn,
  toLookedBuildingOn,
} from "./plannedBuildings";
import { getSortRow, type ISortedDraw } from "./renderSorted";
import { getRobinDraw } from "./robin";
import type { ITallSprite } from "./tallSprites";

const tileSize = 16;

interface ISiteImages {
  buildings: CanvasImageSource;
  robin: CanvasImageSource;
}

export interface IBuildSite {
  isLastDay: boolean;
  robinFrame?: number;
  site: IBuildingSite;
  spot: IFarmSpot;
}

export interface IHouseBuild {
  level: number;
  robinFrame?: number;
}

// built are the planned buildings that the animations draw in their place,
// and upgrading are the lower tiers that they draw with the upgrade sign.
export interface IBuildScene {
  built: ReadonlySet<IPlannedBuilding>;
  house?: IHouseBuild;
  sites: IBuildSite[];
  upgrading: IPlacedBuilding[];
}

interface ISitePiece {
  draw: () => void;
  sortY: number;
  tall?: ITallSprite;
}

export function getBuildScene(
  animations: readonly IBuildAnimation[],
  plan: IBuildPlan,
  time: number,
): IBuildScene {
  const built = new Set<IPlannedBuilding>();
  const scene: IBuildScene = { built, sites: [], upgrading: [] };

  animations.forEach((animation) => {
    const moment = isBuildOn(animation, plan)
      ? getBuildMoment(animation, time)
      : undefined;
    const { target } = animation;

    if (moment === undefined) {
      return;
    }

    const { robinFrame, stage } = moment;

    if (stage.type === "house") {
      scene.house = { level: stage.level, robinFrame };
      return;
    }

    if (target.type === "house") {
      return;
    }

    const { plannedBuilding } = target;
    built.add(plannedBuilding);

    if (stage.type === "upgrade") {
      scene.upgrading.push({
        ...toLookedBuildingOn(plannedBuilding, plan.date, stage.fromId),
        isUpgrading: true,
      });
      return;
    }

    const { site } = buildings[stage.buildingId];

    if (site !== undefined) {
      scene.sites.push({
        isLastDay: stage.isLastDay,
        robinFrame,
        site,
        spot: getFootprint(plannedBuilding),
      });
    }
  });

  return scene;
}

// The planned buildings on the date, with the stages of the animations in the
// place of the buildings that they build.
export function getDrawnBuildingsOn(
  plannedBuildings: readonly IPlannedBuilding[],
  date: number,
  { built, upgrading }: IBuildScene,
): IPlacedBuilding[] {
  return [
    ...getPlacedBuildingsOn(
      plannedBuildings.filter((plannedBuilding) => !built.has(plannedBuilding)),
      date,
    ),
    ...upgrading,
  ];
}

function getSiteOrigin({ spot }: IBuildSite): IPixelOffset {
  return { x: spot.x * tileSize, y: spot.y * tileSize };
}

// The game draws the last-day floor at the depth of the building shadows, so
// it goes over the floors and under all the sprites (SV ›
// Building.drawInConstruction).
export function drawBuildingSiteFloors(
  context: CanvasRenderingContext2D,
  buildingsImage: CanvasImageSource,
  sites: readonly IBuildSite[],
) {
  sites.forEach((buildSite) => {
    if (!buildSite.isLastDay) {
      return;
    }

    const { offset, sprite } = buildSite.site.lastDayFloor;
    const origin = getSiteOrigin(buildSite);

    drawSprite(
      context,
      buildingsImage,
      sprite,
      origin.x + offset.x,
      origin.y + offset.y,
    );
  });
}

function getFramePieces(
  context: CanvasRenderingContext2D,
  buildingsImage: CanvasImageSource,
  buildSite: IBuildSite,
): ISitePiece[] {
  const origin = getSiteOrigin(buildSite);

  return buildSite.site.frame.map(({ offset, sortY, sprite }) => ({
    draw: () => {
      drawSprite(
        context,
        buildingsImage,
        sprite,
        origin.x + offset.x,
        origin.y + offset.y,
      );
    },
    sortY,
  }));
}

function getRobinPieces(
  context: CanvasRenderingContext2D,
  images: ISiteImages,
  buildSite: IBuildSite,
  season: string,
): ISitePiece[] {
  const { isLastDay, robinFrame, site, spot } = buildSite;
  const origin = getSiteOrigin(buildSite);
  const { prop } = site;
  const propSprite = isLastDay ? prop.lastDaySprite : prop.sprite;
  const [, , width, height] = propSprite;
  const propX = origin.x + prop.offset.x;
  const propY = origin.y + prop.offset.y;
  const robin = getRobinDraw(
    context,
    images.robin,
    { x: origin.x + site.robin.x, y: origin.y + site.robin.y },
    season,
    robinFrame,
  );

  return [
    {
      draw: () => {
        drawSprite(context, images.buildings, propSprite, propX, propY);
      },
      sortY: prop.sortY,
      tall: { base: spot, drawn: { height, width, x: propX, y: propY } },
    },
    {
      draw: robin.draw,
      sortY: site.robin.y,
      tall:
        robin.drawn === undefined
          ? undefined
          : { base: spot, drawn: robin.drawn },
    },
  ];
}

// During a house upgrade Robin works outside, east of the house wall, with no
// site and no prop (SV › NPC.updateConstructionAnimation,
// GameLocation.resetLocalState). She sorts by her own depth, as any NPC does.
export function getHouseRobinDraws(
  context: CanvasRenderingContext2D,
  robinImage: CanvasImageSource,
  farmhouse: IFarmSpot,
  season: string,
  robinFrame: number | undefined,
): ISortedDraw[] {
  const { upgradeRobin } = buildings.farmhouse;

  if (upgradeRobin === undefined) {
    return [];
  }

  const standingPixel = {
    x: farmhouse.x * tileSize + upgradeRobin.x,
    y: farmhouse.y * tileSize + upgradeRobin.y,
  };
  const robin = getRobinDraw(
    context,
    robinImage,
    standingPixel,
    season,
    robinFrame,
  );
  const standingTile = {
    height: 1,
    width: 1,
    x: Math.floor(standingPixel.x / tileSize),
    y: Math.floor(standingPixel.y / tileSize),
  };

  return [
    {
      draw: robin.draw,
      layer: "building",
      row: getSortRow(farmhouse.y, upgradeRobin.y),
      tall:
        robin.drawn === undefined
          ? undefined
          : { base: standingTile, drawn: robin.drawn },
    },
  ];
}

// The game sorts each piece by its own depth.
export function getBuildingSiteDraws(
  context: CanvasRenderingContext2D,
  images: ISiteImages,
  sites: readonly IBuildSite[],
  season: string,
): ISortedDraw[] {
  return sites.flatMap((buildSite) =>
    [
      ...getFramePieces(context, images.buildings, buildSite),
      ...getRobinPieces(context, images, buildSite, season),
    ]
      .toSorted((a, b) => a.sortY - b.sortY)
      .map(({ draw, sortY, tall }): ISortedDraw => ({
        draw,
        layer: "building",
        row: getSortRow(buildSite.spot.y, sortY),
        tall,
      })),
  );
}
