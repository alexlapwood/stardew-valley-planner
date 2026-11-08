type TSpriteRect = [x: number, y: number, width: number, height: number];

type TTileOffset = [dx: number, dy: number];

interface IPixelOffset {
  x: number;
  y: number;
}

interface IShopOffer {
  price?: number;
  random?: boolean;
  trade?: { count: number; item: string; itemId: string };
}

// The frame at a time is ⌊time / frameDuration⌋ mod the number of frames.
interface ISpriteAnimation {
  frameDuration: number;
  frames: TSpriteRect[];
}

interface ISpritePiece {
  offset: IPixelOffset;
  sprite: TSpriteRect;
}

interface IAnimatedSpritePiece extends ISpritePiece {
  animation?: ISpriteAnimation;
}

// The game sorts a sprite by its layer depth. sortY is that depth in pixels
// from the top of the footprint, and a higher sortY draws on top.
interface ISortedSpritePiece extends ISpritePiece {
  sortY: number;
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
