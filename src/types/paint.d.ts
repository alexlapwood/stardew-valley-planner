interface IPaintRange {
  max: number;
  min: number;
}

// The mask has a pixel of exactly maskColor where the region takes paint.
interface IPaintRegion {
  id: string;
  lightness: IPaintRange;
  maskColor: [red: number, green: number, blue: number];
  name: string;
}

// minHouseLevel is the level that the house or the cabin needs before it
// takes paint (SV › Building.CanBePainted).
interface IBuildingPaint {
  hue: IPaintRange;
  key: string;
  minHouseLevel?: number;
  regions: IPaintRegion[];
  saturation: IPaintRange;
}
