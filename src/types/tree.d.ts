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
