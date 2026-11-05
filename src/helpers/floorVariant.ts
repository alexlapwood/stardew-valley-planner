import { getItemSkin } from "./items";

export type TPickFloorVariant = (x: number, y: number) => number;

// SV › Flooring.ApplyFlooringFlags picks the look with Game1.random.Next(16).
const floorVariantCount = 16;

export function isFloorVariant(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < floorVariantCount
  );
}

export function isRandomFloor(equipmentId: string, skin: string) {
  return getItemSkin(equipmentId, skin)?.floor?.connectType === "Random";
}

// The murmur3 fmix32 finaliser spreads each input bit over all output bits,
// so rows, columns and diagonals of looks show no stripes.
function mix(value: number) {
  let hash = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);

  return hash ^ (hash >>> 16);
}

// Stands in for the saved random pick on cells that have none, so the look
// does not change from one draw to the next.
export function hashFloorVariant(x: number, y: number) {
  const unit = (mix(mix(x + 0x9e3779b9) ^ y) >>> 0) / 2 ** 32;

  return Math.floor(unit * floorVariantCount);
}

export function createFloorVariantPicker(random: () => number = Math.random) {
  const picks = new Map<string, number>();

  const pick: TPickFloorVariant = (x, y) => {
    const key = `${x},${y}`;
    const picked = picks.get(key) ?? Math.floor(random() * floorVariantCount);

    picks.set(key, picked);

    return picked;
  };

  return {
    pick,
    reset: () => {
      picks.clear();
    },
  };
}
