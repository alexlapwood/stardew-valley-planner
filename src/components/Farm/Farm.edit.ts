import { mergeDeep } from "immutable";

import {
  equipmentForRegion,
  installableEquipmentByTile,
} from "../../helpers/equipmentPlacement";
import { forEachTileInRegion } from "../../helpers/farm";
import type { TPickFloorVariant } from "../../helpers/floorVariant";
import {
  checkCropsToPlant,
  destroyCrops,
  destroyEquipment,
} from "../../helpers/itemPlacement";
import { crops, equipment, setCrops, setEquipment } from "../../state/farm";
import { pickAxe } from "./Farm.drag";
import type { IRegion } from "./Farm.region";

interface IFarmEditState {
  date: number;
  farmMap: IFarmMap;
  pickFloorVariant: TPickFloorVariant;
}

function plantCrops(cropsToPlant: IPlantedCrop[], farmMap: IFarmMap) {
  const { plantableCrops } = checkCropsToPlant(
    cropsToPlant,
    {
      currentCrops: crops(),
      currentEquipment: equipment(),
    },
    farmMap,
  );

  let newCrops: IFarmCrops = {};

  plantableCrops.forEach((cropToPlant) => {
    newCrops = mergeDeep(newCrops, {
      [cropToPlant.y]: {
        [cropToPlant.x]: [cropToPlant],
      },
    });
  });

  setCrops(mergeDeep(crops(), newCrops));
}

function installEquipment(
  equipmentToInstallList: IInstalledEquipment[],
  farmMap: IFarmMap,
) {
  const newEquipment = installableEquipmentByTile(
    equipmentToInstallList,
    {
      currentCrops: crops(),
      currentEquipment: equipment(),
    },
    farmMap,
  );

  setEquipment(mergeDeep(equipment(), newEquipment));
}

function eraseRegion(highlightedRegion: IRegion, date: number) {
  const currentCrops: IFarmCrops = mergeDeep({}, crops());
  const currentEquipment: IFarmEquipment = mergeDeep({}, equipment());

  forEachTileInRegion(highlightedRegion, (x, y) => {
    if (currentCrops[y] !== undefined && currentCrops[y][x] !== undefined) {
      currentCrops[y][x] = destroyCrops(currentCrops[y][x], date);
    }

    if (
      currentEquipment[y] !== undefined &&
      currentEquipment[y][x] !== undefined
    ) {
      currentEquipment[y][x] = destroyEquipment(currentEquipment[y][x], date);
    }
  });

  setCrops(currentCrops);
  setEquipment(currentEquipment);
}

export function applyItem(
  selectedItem: ISelectedItem,
  highlightedRegion: IRegion,
  { date, farmMap, pickFloorVariant }: IFarmEditState,
) {
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
    eraseRegion(highlightedRegion, date);
  }
}
