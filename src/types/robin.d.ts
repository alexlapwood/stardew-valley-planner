interface IBuildingSiteProp extends ISortedSpritePiece {
  lastDaySprite: TSpriteRect;
}

// The offsets are in pixels from the top-left of the footprint, and robin is
// the pixel that Robin stands on.
interface IBuildingSite {
  frame: ISortedSpritePiece[];
  lastDayFloor: ISpritePiece;
  prop: IBuildingSiteProp;
  robin: IPixelOffset;
}

interface IRobinFrame {
  seasons?: Partial<Record<string, TSpriteRect>>;
  sprite: TSpriteRect;
}

interface IRobinHammerChoice {
  chance: number;
  frame: number;
  maxMs: number;
  minMs: number;
}

// The game picks 1 choice each time the step starts.
interface IRobinHammerStep {
  choices: IRobinHammerChoice[];
}

// Robin's frames draw at her standing pixel + frameOffset, and her shadow at
// her standing pixel + shadow.offset.
interface IRobin {
  frameOffset: IPixelOffset;
  frames: Partial<Record<string, IRobinFrame>>;
  hammer: IRobinHammerStep[];
  shadow: ISpritePiece;
}
