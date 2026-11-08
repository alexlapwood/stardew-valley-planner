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
  passable?: boolean;
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
