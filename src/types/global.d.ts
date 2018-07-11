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

interface IBuilding {
  buildingId: string;
  dateConstructed: number;
  dateDestroyed?: number;
  x: number;
  y: number;
}

interface IPlantedCrop {
  cropId: string;
  datePlanted: number;
  dateDestroyed?: number;
  x: number;
  y: number;
}

interface IFarmBuildings {
  [y: number]: {
    [x: number]: IBuilding[];
  };
}

interface IFarmCrops {
  [y: number]: {
    [x: number]: IPlantedCrop[];
  };
}

interface ISelectedItem {
  id: string;
  type: "crop" | "tool";
}
