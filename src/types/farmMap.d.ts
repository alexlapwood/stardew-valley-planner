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

interface IFarmMapData {
  animations: IFarmAnimation[];
  greenhousePath: IFarmPathTile[];
  height: number;
  layers: IFarmLayerData[];
  map: string;
  name: string;
  rules: IFarmRulesData;
  spots: IFarmSpots;
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
  flags: Uint8Array;
  greenhousePath: IFarmPathTile[];
  height: number;
  id: string;
  layers: IFarmLayer[];
  name: string;
  ruleFlags: IFarmRuleFlags;
  spots: IFarmSpots;
  tilesheets: IFarmTilesheet[];
  water: IFarmWater;
  width: number;
}

interface IFarmScene {
  map: IFarmMap;
  season: string;
  sheets: CanvasImageSource[];
}

type TFarmhouseLook = 0 | 1 | 2;

type TGreenhouseLook = "broken" | "repaired";

interface IFarmLooks {
  greenhouse: TGreenhouseLook;
  house: TFarmhouseLook;
}
