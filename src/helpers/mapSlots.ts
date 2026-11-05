import { findAtlas, findImage } from "./atlas";
import { drawDefaultBuildingShadows } from "./defaultBuildings";
import {
  earliestChange,
  getNextFrameChange,
  noChange,
  type TNextChange,
} from "./mapFrames";
import { drawTileAt } from "./renderFarmMap";
import { getWaterSlot, waterImageUrl } from "./water";

export interface IMapSlot {
  draw: (context: CanvasRenderingContext2D, time: number) => void;
  nextChange?: TNextChange;
}

export interface IMapSlots {
  underBuildings?: IMapSlot;
  water?: IMapSlot;
}

function getPathAnimations(map: IFarmMap) {
  return [
    ...new Set(
      map.greenhousePath.flatMap(({ gid }) => map.animations.get(gid) ?? []),
    ),
  ];
}

function drawGreenhousePath(
  context: CanvasRenderingContext2D,
  scene: IFarmScene,
  time: number,
) {
  const { greenhousePath, spots } = scene.map;

  greenhousePath.forEach(({ gid, x, y }) => {
    drawTileAt(
      context,
      scene,
      gid,
      spots.greenhouse.x + x,
      spots.greenhouse.y + y,
      time,
    );
  });
}

// The game draws the greenhouse path for the broken and the repaired
// greenhouse, so it does not depend on the farm looks.
export function getUnderBuildingsSlot(
  scene: IFarmScene,
  buildingsImage: CanvasImageSource,
): IMapSlot {
  const pathAnimations = getPathAnimations(scene.map);

  return {
    draw: (context, time) => {
      drawGreenhousePath(context, scene, time);
      drawDefaultBuildingShadows(
        context,
        buildingsImage,
        scene.map,
        "underFloors",
      );
    },
    nextChange: (time) => getNextFrameChange(pathAnimations, time),
  };
}

export function getMapSlots(
  scene: IFarmScene,
  images: HTMLImageElement[],
  canvasScale = 1,
): IMapSlots {
  return {
    underBuildings: getUnderBuildingsSlot(
      scene,
      findAtlas(images, "buildings"),
    ),
    water: getWaterSlot(scene, findImage(images, waterImageUrl), canvasScale),
  };
}

export function drawMapSlot(
  context: CanvasRenderingContext2D,
  slot: IMapSlot | undefined,
  time: number,
) {
  if (slot === undefined) {
    return;
  }

  context.save();
  slot.draw(context, time);
  context.restore();
}

export function getSlotsNextChange({
  underBuildings,
  water,
}: IMapSlots): TNextChange {
  return earliestChange(
    [water, underBuildings].map((slot) => slot?.nextChange ?? noChange),
  );
}
