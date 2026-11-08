import { getSeasonName } from "../../helpers/date";
import {
  drawBuildingShadows,
  drawDefaultBuildingShadows,
  type IPlacedBuilding,
} from "../../helpers/defaultBuildings";
import { getScarecrowMap } from "../../helpers/farm";
import { getJunimoAreaMap } from "../../helpers/junimoArea";
import {
  drawBuildingSiteFloors,
  type IBuildSite,
} from "../../helpers/renderBuildingSites";
import { drawBushShadows } from "../../helpers/renderBushes";
import { renderFloorsToContext } from "../../helpers/renderFloors";
import {
  type ICropAreaImages,
  renderCropAreasToContext,
  renderSoilToContext,
  renderWateredSoilToContext,
} from "../../helpers/renderTileMaps";

interface IGroundImages {
  buildings: HTMLImageElement;
  bushes: HTMLImageElement;
  flooring: HTMLImageElement;
  flooringWinter: HTMLImageElement;
  highlight: ICropAreaImages;
  hoeDirt: HTMLImageElement;
  hoeDirtSnow: HTMLImageElement;
}

// equipment and plannedItems have the equipment of the preview in them, and
// shownBuildings have the building of the preview, and the stage of each
// build animation in the place of its building.
export interface IGround {
  buildings: readonly IPlannedBuilding[];
  cutBushes?: readonly ICutBush[];
  date: number;
  equipment: IFarmEquipment;
  map: IFarmMap;
  plannedItems: IFarmItems<TFarmItem[]>;
  shownBuildings: readonly IPlacedBuilding[];
  sites: readonly IBuildSite[];
}

export function drawGround(
  context: CanvasRenderingContext2D,
  images: IGroundImages,
  ground: IGround,
) {
  const { buildings, cutBushes, date, equipment, map, plannedItems } = ground;
  const { shownBuildings } = ground;
  const soilImage =
    getSeasonName(date) === "winter" ? images.hoeDirtSnow : images.hoeDirt;

  // The plan canvas is over the map canvas, so these shadows are under the
  // floors as long as they come first.
  drawBuildingShadows(context, images.buildings, shownBuildings, "underFloors");

  renderFloorsToContext(context, images, equipment, date, {
    height: map.height,
    width: map.width,
  });
  renderSoilToContext(
    context,
    soilImage,
    plannedItems,
    map,
    date,
    buildings,
    cutBushes,
  );
  renderWateredSoilToContext(
    context,
    soilImage,
    plannedItems,
    map,
    date,
    buildings,
    cutBushes,
  );

  drawDefaultBuildingShadows(context, images.buildings, map, "overFloors");
  drawBuildingShadows(context, images.buildings, shownBuildings, "overFloors");
  drawBushShadows(context, images.bushes, { cutBushes, date, map });
  drawBuildingSiteFloors(context, images.buildings, ground.sites);

  renderCropAreasToContext(context, images.highlight, {
    junimo: getJunimoAreaMap(shownBuildings, map, date, buildings, cutBushes),
    scarecrow: getScarecrowMap(equipment, date, map, buildings, cutBushes),
  });
}
