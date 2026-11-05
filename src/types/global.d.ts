interface IConstructedBuilding {
  buildingId: string;
  dateConstructed: number;
  dateDestroyed?: number;
  x: number;
  y: number;
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
  skin: string;
  type: "equipment";
  variant?: number;
  x: number;
  y: number;
}

interface ISelectedItem {
  id: string;
  skin?: string;
  type: "crop" | "equipment" | "tool";
}
