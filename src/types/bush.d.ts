type TBushSize = "large" | "medium" | "small" | "walnut";

interface IBushSprite {
  offset: IPixelOffset;
  seasons?: Partial<Record<string, TSpriteRect>>;
  sprite: TSpriteRect;
}

// The footprint of a bush is 1 row of width tiles. The offsets are in pixels
// from the top-left of the footprint, and sortY is as in ISortedSpritePiece.
// ready is the look with berries or a nut, and gameSize is the size number of
// the game (SV › Bush.size).
interface IBush {
  gameSize: number;
  minAxeLevel?: number;
  name: string;
  ready?: IBushSprite;
  shadow: ISpritePiece;
  sortY: number;
  sprite: IBushSprite;
  startsReady?: boolean;
  width: number;
}
