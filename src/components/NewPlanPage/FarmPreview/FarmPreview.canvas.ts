import { defaultFarmLooks } from "../../../helpers/defaultBuildings";
import { hashFloorVariant } from "../../../helpers/floorVariant";
import { getMapSlots } from "../../../helpers/mapSlots";
import { drawMap, drawPlan } from "../../Farm/Farm.canvas";

const tileSize = 16;

export const previewTileSize = 4;

function getContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("Could not get context for the farm preview canvas");
  }

  return context;
}

// The map code draws only whole 16 px tiles, so the farm is drawn at full size
// and then made smaller.
export function drawFarmPreview(
  canvas: HTMLCanvasElement,
  scene: IFarmScene,
  images: HTMLImageElement[],
) {
  const { map } = scene;
  const fullSize = document.createElement("canvas");
  fullSize.width = map.width * tileSize;
  fullSize.height = map.height * tileSize;
  canvas.width = map.width * previewTileSize;
  canvas.height = map.height * previewTileSize;

  const context = getContext(canvas);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const copyToPreview = () => {
    context.drawImage(fullSize, 0, 0, canvas.width, canvas.height);
  };

  drawMap(fullSize, scene, 0, getMapSlots(scene, images));
  copyToPreview();
  drawPlan(fullSize, {
    crops: {},
    date: 0,
    equipment: {},
    images,
    looks: defaultFarmLooks,
    pickFloorVariant: hashFloorVariant,
    scene,
    time: 0,
  });
  copyToPreview();
}
