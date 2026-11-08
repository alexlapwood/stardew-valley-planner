type TFarmLayerGroup = "AlwaysFront" | "Back" | "Buildings" | "Front";

interface IFarmTilesheet {
  columns: number;
  firstGid: number;
  id: string;
  images: Partial<Record<string, string>>;
  rows: number;
  seasonal: boolean;
  tileHeight: number;
  tileWidth: number;
}

interface IFarmAnimation {
  frames: number[];
  gid: number;
  interval: number;
}

interface IFarmLayerData {
  group: string;
  id: string;
  tiles: number[];
}

interface IFarmSpot {
  height: number;
  width: number;
  x: number;
  y: number;
}

interface IFarmSpots {
  farmhouse: IFarmSpot;
  greenhouse: IFarmSpot;
  petBowl: IFarmSpot;
  shippingBin: IFarmSpot;
}

interface IFarmRuleFlags {
  blocked: number;
  buildable: number;
  floorable: number;
  noSprinklers: number;
  tillable: number;
  water: number;
}

interface IFarmRulesData {
  flags: IFarmRuleFlags;
  rows: string[];
}

interface IFarmTile {
  x: number;
  y: number;
}

interface IFarmPathTile extends IFarmTile {
  gid: number;
}

type TRgba = [red: number, green: number, blue: number, alpha: number];

interface IFarmWater {
  hidden?: IFarmTile[];
  tints: Partial<Record<string, TRgba>>;
}

interface IFarmStartBuilding extends IFarmTile {
  building: string;
}

interface IFarmStartItem extends IFarmTile {
  item: string;
  skin: string;
}

// The things that a new game puts on this farm, more than the fixed buildings
// in spots (SV › Farm.onNewGame).
interface IFarmStart {
  buildings: IFarmStartBuilding[];
  items: IFarmStartItem[];
}

// x and y are the first tile of the footprint. The game draws no shadow for a
// bush that starts under a Front tile (SV › Bush).
interface IFarmBush extends IFarmTile {
  destroyable: boolean;
  noShadow?: true;
  size: TBushSize;
}

interface IFarmMapData {
  animations: IFarmAnimation[];
  bushes: IFarmBush[];
  greenhousePath: IFarmPathTile[];
  height: number;
  layers: IFarmLayerData[];
  map: string;
  name: string;
  rules: IFarmRulesData;
  saplingRows: string[];
  spots: IFarmSpots;
  start: IFarmStart;
  tilesheets: IFarmTilesheet[];
  tillable: number;
  water: IFarmWater;
  width: number;
}

interface IFarmMapFile {
  farm: IFarmMapData;
  gameVersion: string;
}

interface IFarmLayer {
  gids: Uint32Array;
  group: TFarmLayerGroup;
  id: string;
}

interface IFarmMap {
  animations: Map<number, IFarmAnimation>;
  bushes: IFarmBush[];
  flags: Uint8Array;
  greenhousePath: IFarmPathTile[];
  height: number;
  id: string;
  layers: IFarmLayer[];
  name: string;
  ruleFlags: IFarmRuleFlags;
  saplings: Uint8Array;
  spots: IFarmSpots;
  start: IFarmStart;
  tilesheets: IFarmTilesheet[];
  water: IFarmWater;
  width: number;
}

interface IFarmScene {
  map: IFarmMap;
  season: string;
  sheets: CanvasImageSource[];
}

type TGreenhouseLook = "broken" | "repaired";

// house is a key of the farmhouse looks in buildings.json, and petBowl is a
// skin of the pet bowl, as in IPlannedPaint. houseColors are the paint of the
// house.
interface IFarmLooks {
  greenhouse: TGreenhouseLook;
  house: string;
  houseColors?: TPaintColors;
  petBowl: string;
}
