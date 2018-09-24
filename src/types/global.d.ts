declare module "visibl";

interface ICrop {
  buy: number;
  harvest:
    | {}
    | {
        extra_chance: number;
        level_increase: number;
        max: number;
        min: number;
      };
  id: string;
  index: number;
  isFlower?: boolean;
  name: string;
  regrow?: number;
  scythe?: boolean;
  seasons: string[];
  sell: number;
  stages: number[];
}

interface IConstructedBuilding {
  buildingId: string;
  dateConstructed: number;
  dateDestroyed?: number;
  x: number;
  y: number;
}

interface IEquipment {
  scarecrow: IScarecrow;
}

interface IFarmItems<T> {
  [y: number]: {
    [x: number]: T;
  };
}

interface IFarmBuildings extends IFarmItems<IConstructedBuilding[]> {}
interface IFarmCrops extends IFarmItems<IPlantedCrop[]> {}
interface IFarmEquipment extends IFarmItems<IInstalledEquipment[]> {}

interface IPlantedCrop {
  cropId: string;
  datePlanted: number;
  dateDestroyed?: number;
  type: "crop";
  x: number;
  y: number;
}

interface IInstalledEquipment {
  dateInstalled: number;
  dateDestroyed?: number;
  equipmentId: string;
  type: "equipment";
  x: number;
  y: number;
}

interface IScarecrow {
  id: string;
  name: string;
  skins: string[];
}

interface ISelectedItem {
  id: string;
  type: "crop" | "equipment" | "tool";
}
