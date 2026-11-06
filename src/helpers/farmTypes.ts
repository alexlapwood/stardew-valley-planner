import type { TFarmId } from "./farmMapLoader";

interface IFarmType {
  emoji: string;
  name: string;
}

// The exported farm maps have these names too, but a map loads only when its
// farm is drawn, and the plan switcher names farms that are not drawn.
export const farmTypes: Record<TFarmId, IFarmType> = {
  beach: { emoji: "🏖️", name: "Beach Farm" },
  forest: { emoji: "🌲", name: "Forest Farm" },
  four_corners: { emoji: "🍀", name: "Four Corners Farm" },
  hilltop: { emoji: "⛰️", name: "Hill-top Farm" },
  meadowlands: { emoji: "🐄", name: "Meadowlands Farm" },
  riverland: { emoji: "🎣", name: "Riverland Farm" },
  standard: { emoji: "🌾", name: "Standard Farm" },
  wilderness: { emoji: "⚔️", name: "Wilderness Farm" },
};
