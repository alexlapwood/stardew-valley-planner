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
