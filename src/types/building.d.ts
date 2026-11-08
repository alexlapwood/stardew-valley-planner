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

interface IMaterial {
  icon: TSpriteRect;
  name: string;
}

// sprite is the still sprite, for where the map does not animate. The
// animation is for the sprite, not for the season sprites. paintMask is in
// line with the sprite when the two offsets are the same.
interface IBuildingSprite {
  animation?: ISpriteAnimation;
  offset: IPixelOffset;
  paintMask?: ISpritePiece;
  seasons?: Partial<Record<string, TSpriteRect>>;
  sprite: TSpriteRect;
}

interface IBuildingSkin {
  buildCost?: number;
  buildDays?: number;
  buildMaterials?: IBuildingMaterial[];
  condition?: string;
  name: string;
  paint?: IBuildingPaint;
  sprite: IBuildingSprite;
}

interface IHouseUpgrade {
  buildCost: number;
  buildDays: number;
  buildMaterials: IBuildingMaterial[];
  look: string;
  name: string;
  offer: string;
}

interface IGreenhouseRepair {
  communityCenterArea: string;
  days: number;
  jojaCost: number;
  jojaMembershipCost: number;
}

interface IBuildingLook {
  name: string;
  sprite: IBuildingSprite;
}

interface IBuildingShadowPiece extends ISpritePiece {}

interface IBuildingTileRules {
  changes: Partial<Record<string, Partial<Record<string, boolean>>>>;
  radius: number;
  rows: string[];
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
  fishPond?: IFishPond;
  harvestArea?: { center: IBuildingTile; radius: number };
  houseUpgrades?: Partial<Record<string, IHouseUpgrade>>;
  humanDoor?: IBuildingTile;
  looks?: Partial<Record<string, IBuildingLook>>;
  magical: boolean;
  name: string;
  paint?: IBuildingPaint;
  placementTiles: IBuildingArea[];
  repair?: IGreenhouseRepair;
  shadow: boolean;
  shadowPieces?: IBuildingShadowPiece[];
  shadowUnderFloors?: boolean;
  site?: IBuildingSite;
  size: { height: number; width: number };
  skins?: Partial<Record<string, IBuildingSkin>>;
  sprite: IBuildingSprite;
  startLook?: string;
  tileRules: IBuildingTileRules;
  upgradeFrom?: string;
  upgradeRobin?: IPixelOffset;
  upgradeSign?: ISortedSpritePiece;
}
