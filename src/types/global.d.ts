// The building or the upgrade is on the plan from datePlaced, with no build
// days, so that the player can plan many buildings on any day.
interface IPlannedUpgrade {
  buildingId: string;
  datePlaced: number;
}

// The game has no skin id for the look with no skin, so the planner uses the
// id of the building for it.
interface IPlannedPaint {
  datePainted: number;
  skin: string;
}

// The values of the game's paint sliders (SV › BuildingPaintColor).
// lightness is in the range of the region in the building's paint data.
interface IPaintColor {
  hue: number;
  lightness: number;
  saturation: number;
}

// The keys are the region ids of the building's paint data. A region with no
// colour has no paint, as with the game's default button.
type TPaintColors = Partial<Record<string, IPaintColor>>;

// The colours that the building has from datePainted.
interface IPlannedColorPaint {
  colors: TPaintColors;
  datePainted: number;
}

// lightness is the place of the slider from 0 to 100, because each building
// has its own lightness range for a region, as the game does for a saved
// colour (SV › BuildingPaintMenu.receiveLeftClick).
interface IBrushColor {
  hue: number;
  lightness: number;
  saturation: number;
}

type TBrushColors = Partial<Record<string, IBrushColor>>;

// buildingId is the lowest tier. Each upgrade is the next tier, in order.
// skin is the look picked for the order, and each paint is a later change of
// look, in date order. Each colour paint is a later change of colours, in
// date order. A starter building is on the farm when the game starts, so the
// player does not pay for it (SV › Farm.onNewGame).
interface IPlannedBuilding {
  buildingId: string;
  colorPaints?: IPlannedColorPaint[];
  dateDestroyed?: number;
  datePlaced: number;
  paints?: IPlannedPaint[];
  skin?: string;
  starter?: true;
  upgrades?: IPlannedUpgrade[];
  x: number;
  y: number;
}

// level is the house level from datePlaced. Each upgrade is the next level,
// in order.
interface IPlannedHouseUpgrade {
  datePlaced: number;
  level: number;
}

// datePlaced is the day of the Pantry bundle or the Joja payment.
interface IPlannedRepair {
  datePlaced: number;
}

// x and y are the first tile of a bush of the farm map, which is not on the
// farm from dateCut.
interface ICutBush {
  dateCut: number;
  x: number;
  y: number;
}

interface IFarmItems<T> {
  [y: string]: {
    [x: string]: T;
  };
}

interface IFarmCrops extends IFarmItems<TPlantedItem[]> {}
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

interface IPlantedTree {
  dateDestroyed?: number;
  datePlanted: number;
  treeId: string;
  type: "tree";
  x: number;
  y: number;
}

// A tree shares the crops map with the crops, so that a plan file keeps its
// shape and version.
type TPlantedItem = IPlantedCrop | IPlantedTree;

type TFarmItem = TPlantedItem | IInstalledEquipment;

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

// The id of a house upgrade is its level. colors are the colours of the
// paint item.
interface ISelectedItem {
  colors?: TBrushColors;
  id: string;
  skin?: string;
  type:
    | "building"
    | "crop"
    | "equipment"
    | "greenhouseRepair"
    | "houseUpgrade"
    | "paint"
    | "tool"
    | "tree";
}
