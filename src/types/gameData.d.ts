type TSpriteRect = [x: number, y: number, width: number, height: number];

type TTileOffset = [dx: number, dy: number];

interface IShopOffer {
  price?: number;
  random?: boolean;
  trade?: { count: number; item: string };
}

interface ICropHarvest {
  extraChance: number;
  max: number;
  maxPerFarmingLevel: number;
  min: number;
}

interface ICropGrowthSprites {
  growing: TSpriteRect[];
  planted: TSpriteRect[];
  ready: TSpriteRect;
  readyOverlay?: TSpriteRect;
  regrowing?: TSpriteRect;
  regrown?: TSpriteRect;
}

interface ICropSprites {
  growth: ICropGrowthSprites;
  growthBySeason?: Partial<Record<string, ICropGrowthSprites>>;
  harvest: TSpriteRect;
  seed: TSpriteRect;
}

interface ICrop {
  giantCrop: boolean;
  gingerIsland: boolean;
  harvest: ICropHarvest;
  harvestItemId: string;
  indoorOnly: boolean;
  name: string;
  needsWater: boolean;
  paddy: boolean;
  regrow?: number;
  scythe: boolean;
  seasons: string[];
  seedItemId: string;
  seedName: string;
  seedPrices: Partial<Record<string, IShopOffer>>;
  sell: number;
  sprites: ICropSprites;
  stages: number[];
  trellis: boolean;
}

interface ITreeQualityStep {
  daysMature: number;
  quality: number;
}

interface ITreeHarvest {
  firstDay?: number;
  lastDay?: number;
  maxFruit: number;
  quality?: ITreeQualityStep[];
}

type TTreeSpacingKind = "fruitTree" | "wildTree";

type TTreeGrowthBlocker =
  | "building"
  | "bush"
  | "crop"
  | "floor"
  | "fruitTree"
  | "furniture"
  | "object"
  | "resourceClump"
  | "teaBush"
  | "wildTree";

interface ITreePlacement {
  gardenPot: boolean;
  growthBlockers?: TTreeGrowthBlocker[];
  growthClearance?: number;
  spacingTrees?: TTreeSpacingKind[];
  treeSpacing?: number;
}

interface ITreeSeasonSprites {
  growing: TSpriteRect[];
  mature: TSpriteRect;
  ready?: TSpriteRect;
}

interface ITreeSpotShift {
  divisor: number;
  modulo: number;
  times: number;
}

interface ITreeFruitSpot {
  flipped: boolean;
  shiftX?: ITreeSpotShift;
  shiftY?: ITreeSpotShift;
  x: number;
  y: number;
}

interface ITreeSprites {
  fruit: TSpriteRect;
  fruitSpots?: ITreeFruitSpot[];
  growingOffset: IPixelOffset;
  matureOffset: IPixelOffset;
  sapling: TSpriteRect;
  seasons: Partial<Record<string, ITreeSeasonSprites>>;
  shelteredSeason: string;
}

interface ITree {
  daysToMature: number;
  fruitItemId: string;
  harvest: ITreeHarvest;
  name: string;
  placement: ITreePlacement;
  saplingItemId: string;
  saplingName: string;
  saplingPrices: Partial<Record<string, IShopOffer>>;
  seasons: string[];
  sell: number;
  sprites: ITreeSprites;
  stages: number[];
  type: "fruitTree" | "teaBush";
}

interface IItemRange {
  radius: number;
  shape: "circle" | "diamond" | "tiles";
  tiles?: TTileOffset[];
}

interface IFenceSkin {
  block: TSpriteRect;
  gate: boolean;
}

interface IFloorCorners<T> {
  ne: T;
  nw: T;
  se: T;
  sw: T;
}

interface IFloorCornerPatch {
  at: [x: number, y: number];
  source: TSpriteRect;
}

interface IFloorSkin {
  block: TSpriteRect;
  connectType: string;
  corners?: IFloorCorners<IFloorCornerPatch>;
  cornerSize: number;
  id: string;
  shadowType: string;
  winterBlock?: TSpriteRect;
}

interface IItemSkin {
  buy?: Partial<Record<string, IShopOffer>>;
  crowRange?: IItemRange;
  fence?: IFenceSkin;
  floor?: IFloorSkin;
  flowerRange?: IItemRange;
  icon: TSpriteRect;
  itemId: string;
  name: string;
  sprite?: TSpriteRect;
  spritesBySeason?: Partial<Record<string, TSpriteRect>>;
  waterRange?: IItemRange;
}

interface ISideValues {
  e: number;
  n: number;
  s: number;
  w: number;
}

interface IGatePart {
  closed: TSpriteRect;
  offset: TTileOffset;
  open: TSpriteRect;
}

interface IFenceDrawing {
  cellHeight: number;
  cellOffset: TTileOffset;
  cellWidth: number;
  columns: number;
  drawGuide: Partial<Record<string, number>>;
  gate: {
    otherCell: number;
    partsBySum: Partial<Record<string, IGatePart[]>>;
  };
  neighbours: ISideValues;
}

interface IFloorNeighbours extends ISideValues {
  ne: number;
  nw: number;
  se: number;
  sw: number;
}

interface IFloorCornerRule {
  empty: keyof IFloorNeighbours;
  needs: (keyof IFloorNeighbours)[];
}

interface IFloorShadow {
  offset: TTileOffset;
  opacity: number;
}

interface IFloorDrawing {
  corners: IFloorCorners<IFloorCornerRule>;
  drawGuide: Partial<Record<string, number>>;
  neighbours: IFloorNeighbours;
  shadow: IFloorShadow;
  tileSize: number;
  tilesPerRow: number;
  variants: number[];
}

interface IItem {
  fenceDrawing?: IFenceDrawing;
  floorDrawing?: IFloorDrawing;
  kind: "bigCraftable" | "fence" | "floor" | "object";
  name: string;
  skinOrder: string[];
  skins: Partial<Record<string, IItemSkin>>;
}

interface IPixelOffset {
  x: number;
  y: number;
}

interface IBuildingTile {
  x: number;
  y: number;
}

interface IBuildingArea extends IBuildingTile {
  height: number;
  onlyPassable?: boolean;
  width: number;
}

interface IBuildingMaterial {
  count: number;
  itemId: string;
  name: string;
}

interface IBuildingSprite {
  offset: IPixelOffset;
  seasons?: Partial<Record<string, TSpriteRect>>;
  sprite: TSpriteRect;
}

interface IBuildingSkin {
  buildCost?: number;
  buildMaterials?: IBuildingMaterial[];
  name: string;
  sprite: IBuildingSprite;
}

interface IBuildingLook {
  name: string;
  sprite: IBuildingSprite;
}

interface IBuildingShadowPiece {
  offset: IPixelOffset;
  sprite: TSpriteRect;
}

interface IBuildingTileRules {
  changes: Partial<Record<string, Partial<Record<string, boolean>>>>;
  radius: number;
  rows: string[];
}

interface IWaterStrip {
  frameHeight: number;
  frameInterval: number;
  frameWidth: number;
  frames: number;
  image: string;
  rows: number;
  slideLength: number;
  slideSpeed: number;
  slideStep: number;
}

interface IBuilding {
  animalDoor?: IBuildingArea;
  buildCondition?: string;
  buildCost: number;
  buildDays: number;
  builder?: string;
  buildingId: string;
  buildMaterials: IBuildingMaterial[];
  collision: string[];
  default: boolean;
  harvestArea?: { center: IBuildingTile; radius: number };
  humanDoor?: IBuildingTile;
  looks?: Partial<Record<string, IBuildingLook>>;
  magical: boolean;
  name: string;
  placementTiles: IBuildingArea[];
  shadow: boolean;
  shadowPieces?: IBuildingShadowPiece[];
  shadowUnderFloors?: boolean;
  size: { height: number; width: number };
  skins?: Partial<Record<string, IBuildingSkin>>;
  sprite: IBuildingSprite;
  startLook?: string;
  tileRules: IBuildingTileRules;
  upgradeFrom?: string;
}
