import { findBadHouseUpgrade } from "../helpers/houseUpgrades";
import type { IBadItem } from "./farmData";

function readDatePlaced(value: unknown) {
  return typeof value === "object" &&
    value !== null &&
    "datePlaced" in value &&
    typeof value.datePlaced === "number"
    ? value.datePlaced
    : undefined;
}

function toHouseUpgrade(value: unknown): IPlannedHouseUpgrade | undefined {
  const datePlaced = readDatePlaced(value);

  return datePlaced !== undefined &&
    typeof value === "object" &&
    value !== null &&
    "level" in value &&
    typeof value.level === "number"
    ? { datePlaced, level: value.level }
    : undefined;
}

// Each upgrade needs the level before it, so a bad upgrade drops the later
// ones too, and the house keeps the levels before it.
export function readHouseUpgrades(value: unknown) {
  const badItems: IBadItem[] = [];
  const houseUpgrades: IPlannedHouseUpgrade[] = [];

  if (value !== undefined && !Array.isArray(value)) {
    badItems.push({ path: "houseUpgrades", value });
  }

  const entries: readonly unknown[] = Array.isArray(value) ? value : [];

  entries.forEach((entry, index) => {
    const upgrade = toHouseUpgrade(entry);

    if (
      badItems.length === 0 &&
      upgrade !== undefined &&
      findBadHouseUpgrade([...houseUpgrades, upgrade]) === -1
    ) {
      houseUpgrades.push(upgrade);
    } else {
      badItems.push({ path: `houseUpgrades[${index}]`, value: entry });
    }
  });

  return { badItems, houseUpgrades };
}

// No repair: the greenhouse stays broken.
export function readGreenhouseRepair(value: unknown): {
  badItems: IBadItem[];
  greenhouseRepair?: IPlannedRepair;
} {
  if (value === undefined) {
    return { badItems: [] };
  }

  const datePlaced = readDatePlaced(value);

  return datePlaced === undefined
    ? { badItems: [{ path: "greenhouseRepair", value }] }
    : { badItems: [], greenhouseRepair: { datePlaced } };
}
