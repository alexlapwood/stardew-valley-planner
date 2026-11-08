import { mergeDeep } from "immutable";

import {
  getHouseBuild,
  getNewBuildingBuild,
  getUpgradeBuild,
  type IBuild,
} from "../../helpers/buildAnimation";
import {
  checkColorPaint,
  type TColorPaintChange,
} from "../../helpers/buildingColorPaint";
import { checkBuildingOrder } from "../../helpers/buildingOrders";
import { checkPaint, type TPaintChange } from "../../helpers/buildingPaint";
import { removeFloors } from "../../helpers/buildingPlacement";
import {
  equipmentForRegion,
  installableEquipmentByTile,
} from "../../helpers/equipmentPlacement";
import { forEachTileInRegion } from "../../helpers/farm";
import {
  checkFixedOrder,
  type IFixedUpgradeItem,
  isFixedUpgradeItem,
} from "../../helpers/fixedBuildingOrders";
import type { TPickFloorVariant } from "../../helpers/floorVariant";
import {
  checkCropsToPlant,
  type ICurrentItems,
} from "../../helpers/itemPlacement";
import { checkTreesToPlant, treesForRegion } from "../../helpers/treePlacement";
import {
  buildings,
  crops,
  cutBushes,
  equipment,
  greenhouseRepair,
  houseColorPaints,
  houseUpgrades,
  petBowlPaints,
  setBuildings,
  setCrops,
  setEquipment,
  setGreenhouseRepair,
  setHouseColorPaints,
  setHouseUpgrades,
  setPetBowlPaints,
} from "../../state/farm";
import { pickAxe } from "./Farm.drag";
import { eraseRegion } from "./Farm.erase";
import type { IRegion } from "./Farm.region";

interface IFarmEditState {
  date: number;
  farmMap: IFarmMap;
  pickFloorVariant: TPickFloorVariant;
}

function getCurrentItems(): ICurrentItems {
  return {
    currentBuildings: buildings(),
    currentCrops: crops(),
    currentCutBushes: cutBushes(),
    currentEquipment: equipment(),
    currentGreenhouseRepair: greenhouseRepair(),
    currentHouseColorPaints: houseColorPaints(),
    currentHouseUpgrades: houseUpgrades(),
    currentPetBowlPaints: petBowlPaints(),
  };
}

function addPlantedItems(plantedItems: readonly TPlantedItem[]) {
  let newCrops: IFarmCrops = {};

  plantedItems.forEach((plantedItem) => {
    newCrops = mergeDeep(newCrops, {
      [plantedItem.y]: {
        [plantedItem.x]: [plantedItem],
      },
    });
  });

  setCrops(mergeDeep(crops(), newCrops));
}

function plantCrops(cropsToPlant: IPlantedCrop[], farmMap: IFarmMap) {
  const { plantableCrops } = checkCropsToPlant(
    cropsToPlant,
    getCurrentItems(),
    farmMap,
  );

  addPlantedItems(plantableCrops);
}

function plantTrees(treesToPlant: IPlantedTree[], farmMap: IFarmMap) {
  const { plantableTrees } = checkTreesToPlant(
    treesToPlant,
    getCurrentItems(),
    farmMap,
  );

  addPlantedItems(plantableTrees);
}

function installEquipment(
  equipmentToInstallList: IInstalledEquipment[],
  farmMap: IFarmMap,
) {
  const newEquipment = installableEquipmentByTile(
    equipmentToInstallList,
    getCurrentItems(),
    farmMap,
  );

  setEquipment(mergeDeep(equipment(), newEquipment));
}

function applyPaint(change: TPaintChange | undefined) {
  if (change?.type === "building") {
    setBuildings(change.buildings);
  }

  if (change?.type === "petBowl") {
    setPetBowlPaints(change.petBowlPaints);
  }
}

function applyColorPaint(change: TColorPaintChange | undefined) {
  if (change?.type === "building") {
    setBuildings(change.buildings);
  }

  if (change?.type === "house") {
    setHouseColorPaints(change.houseColorPaints);
  }
}

function orderBuilding(
  { id, skin }: ISelectedItem,
  highlightedRegion: IRegion,
  { date, farmMap }: Pick<IFarmEditState, "date" | "farmMap">,
): IBuild | undefined {
  const request = {
    buildingId: id,
    currentItems: getCurrentItems(),
    date,
    farmMap,
    region: highlightedRegion,
    skin,
  };
  const paint = checkPaint(request);

  if (paint !== undefined) {
    applyPaint(paint.change);
    return undefined;
  }

  const { after, check, click, refusal } = checkBuildingOrder(request);

  if (refusal !== undefined) {
    return undefined;
  }

  if (click.type === "new" && check.removedFloors.length > 0) {
    setEquipment(removeFloors(equipment(), check.removedFloors, date));
  }

  setBuildings(after);

  if (click.type === "new") {
    return getNewBuildingBuild(click.plannedBuilding);
  }

  return click.upgraded === undefined
    ? undefined
    : getUpgradeBuild(click.target, click.upgraded, date);
}

function orderFixedUpgrade(
  item: IFixedUpgradeItem,
  region: IRegion,
  { date, farmMap }: Pick<IFarmEditState, "date" | "farmMap">,
): IBuild | undefined {
  const before = houseUpgrades();
  const change = checkFixedOrder({
    currentItems: getCurrentItems(),
    date,
    farmMap,
    item,
    region,
  })?.change;

  if (change?.type === "greenhouseRepair") {
    setGreenhouseRepair(change.greenhouseRepair);
  }

  if (change?.type !== "houseUpgrade") {
    return undefined;
  }

  setHouseUpgrades(change.houseUpgrades);

  return getHouseBuild(before, change.houseUpgrades, date);
}

// The build is what the click put down or upgraded, for its animation.
export function applyItem(
  selectedItem: ISelectedItem,
  highlightedRegion: IRegion,
  { date, farmMap, pickFloorVariant }: IFarmEditState,
): IBuild | undefined {
  if (selectedItem.type === "crop") {
    const cropsToPlant: IPlantedCrop[] = [];
    forEachTileInRegion(highlightedRegion, (x, y) => {
      cropsToPlant.push({
        cropId: selectedItem.id,
        datePlanted: date,
        type: "crop",
        x,
        y,
      });
    });

    plantCrops(cropsToPlant, farmMap);
  }

  if (selectedItem.type === "tree") {
    plantTrees(
      treesForRegion(selectedItem.id, highlightedRegion, date),
      farmMap,
    );
  }

  if (selectedItem.type === "equipment") {
    installEquipment(
      equipmentForRegion(
        selectedItem,
        highlightedRegion,
        date,
        pickFloorVariant,
      ),
      farmMap,
    );
  }

  if (selectedItem.type === "tool" && selectedItem.id === pickAxe.id) {
    eraseRegion(highlightedRegion, { date, farmMap }, getCurrentItems());
  }

  if (selectedItem.type === "building") {
    return orderBuilding(selectedItem, highlightedRegion, { date, farmMap });
  }

  if (selectedItem.type === "paint") {
    applyColorPaint(
      checkColorPaint({
        colors: selectedItem.colors,
        currentItems: getCurrentItems(),
        date,
        farmMap,
        region: highlightedRegion,
      })?.change,
    );
  }

  return isFixedUpgradeItem(selectedItem)
    ? orderFixedUpgrade(selectedItem, highlightedRegion, { date, farmMap })
    : undefined;
}
