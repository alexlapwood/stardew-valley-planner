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
  isFlower?: boolean;
  isIndoorsOnly?: boolean;
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
  id: string;
  isSeasonal?: boolean;
  name: string;
  skins: string[];
}

interface IFarmItems<T> {
  [y: string]: {
    [x: string]: T;
  };
}

interface IFarmBuildings extends IFarmItems<IConstructedBuilding[]> {}
interface IFarmCrops extends IFarmItems<IPlantedCrop[]> {}
interface IFarmEquipment extends IFarmItems<IInstalledEquipment[]> {}
interface IFarmFlooring extends IFarmItems<IInstalledEquipment[]> {}

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
  skinIndex: number;
  type: "equipment";
  x: number;
  y: number;
}

interface ISelectedItem {
  id: string;
  skinIndex?: number;
  type: "crop" | "equipment" | "tool";
}
