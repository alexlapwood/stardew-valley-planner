// The water is tiles of the farm water strip, from offset. The last row is
// lastRowHeight pixels high, before the slide.
interface IFishPondWater {
  columns: number;
  lastRowHeight: number;
  offset: IPixelOffset;
  rows: number;
}

// The edge frames have the float on them. The netting style comes from the
// tile of the pond, in steps of nettingTileStep tiles. sortY is as in
// ISortedSpritePiece, for all the pieces.
interface IFishPond {
  edge: IAnimatedSpritePiece;
  floor: ISpritePiece;
  nettings: ISpritePiece[];
  nettingTileStep: number;
  sortY: number;
  water: IFishPondWater;
}
