import { crops as cropDetails } from "../data/game/crops.json";
import { trees as treeDetails } from "../data/game/trees.json";
import { findBadUpgrade } from "../helpers/buildingTiers";
import { isFarmId, type TFarmId } from "../helpers/farmMapLoader";
import { isFloorVariant } from "../helpers/floorVariant";
import { hasSkin, isItem } from "../helpers/items";
import {
  isGroundBuilding,
  isPlannableBuilding,
} from "../helpers/plannedBuildings";
import { readCutBushes } from "./bushCutsData";
import { readHouseColorPaints } from "./colorPaintData";
import { readGreenhouseRepair, readHouseUpgrades } from "./fixedBuildingsData";
import { readBuildingLooks, readPetBowlPaints } from "./paintData";

export interface IFarmData {
  buildings: readonly IPlannedBuilding[];
  crops: IFarmCrops;
  cutBushes: readonly ICutBush[];
  date: number;
  equipment: IFarmEquipment;
  farm: TFarmId;
  greenhouseRepair?: IPlannedRepair;
  houseColorPaints?: readonly IPlannedColorPaint[];
  houseUpgrades: readonly IPlannedHouseUpgrade[];
  petBowlPaints: readonly IPlannedPaint[];
}

export interface IBadItem {
  path: string;
  value: unknown;
}

interface IFarmShape {
  buildings: unknown[];
  crops: Record<string, unknown>;
  cutBushes?: unknown;
  date: number;
  equipment: Record<string, unknown>;
  farm: TFarmId;
  greenhouseRepair?: unknown;
  houseColorPaints?: unknown;
  houseUpgrades?: unknown;
  petBowlPaints?: unknown;
}

type Cell = Record<string, unknown>;

export const farmDataVersion = 4;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIndex(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isOptionalNumber(value: unknown) {
  return value === undefined || typeof value === "number";
}

// The draw code reads x and y from the cell, but the place and remove code
// finds the cell by its row and column keys.
function isCellAt(cell: Cell, x: string, y: string) {
  return (
    isIndex(cell.x) &&
    cell.x === Number(x) &&
    isIndex(cell.y) &&
    cell.y === Number(y)
  );
}

function isCropCell(cell: Cell): cell is Cell & IPlantedCrop {
  return (
    typeof cell.cropId === "string" &&
    Object.hasOwn(cropDetails, cell.cropId) &&
    isOptionalNumber(cell.dateDestroyed) &&
    typeof cell.datePlanted === "number" &&
    cell.type === "crop"
  );
}

function isTreeCell(cell: Cell): cell is Cell & IPlantedTree {
  return (
    typeof cell.treeId === "string" &&
    Object.hasOwn(treeDetails, cell.treeId) &&
    isOptionalNumber(cell.dateDestroyed) &&
    typeof cell.datePlanted === "number" &&
    cell.type === "tree"
  );
}

function isPlantedCell(cell: Cell): cell is Cell & TPlantedItem {
  return isCropCell(cell) || isTreeCell(cell);
}

function isEquipmentCell(cell: Cell): cell is Cell & IInstalledEquipment {
  return (
    typeof cell.equipmentId === "string" &&
    isItem(cell.equipmentId) &&
    typeof cell.skin === "string" &&
    hasSkin(cell.equipmentId, cell.skin) &&
    isOptionalNumber(cell.dateDestroyed) &&
    typeof cell.dateInstalled === "number" &&
    cell.type === "equipment"
  );
}

// The game puts the starter buildings on the farm before the first day.
function isGoodStarter({ datePlaced, starter }: Cell) {
  return starter === undefined || (starter === true && datePlaced === 0);
}

function isPlannedBuilding(value: unknown): value is Cell & IPlannedBuilding {
  return (
    isRecord(value) &&
    typeof value.buildingId === "string" &&
    isGroundBuilding(value.buildingId) &&
    isOptionalNumber(value.dateDestroyed) &&
    typeof value.datePlaced === "number" &&
    isGoodStarter(value) &&
    isIndex(value.x) &&
    isIndex(value.y)
  );
}

function isPlannedUpgrade(value: unknown): value is IPlannedUpgrade {
  return (
    isRecord(value) &&
    typeof value.buildingId === "string" &&
    isPlannableBuilding(value.buildingId) &&
    typeof value.datePlaced === "number"
  );
}

// Each upgrade needs the tier before it, so a bad upgrade drops the later
// ones too, and the building keeps the tiers before it.
function readUpgrades(plannedBuilding: Cell & IPlannedBuilding, path: string) {
  const { upgrades: _upgrades, ...withoutUpgrades } = plannedBuilding;
  const upgrades: unknown = plannedBuilding.upgrades;
  const badItems: IBadItem[] = [];
  const goodUpgrades: IPlannedUpgrade[] = [];

  if (upgrades !== undefined && !Array.isArray(upgrades)) {
    badItems.push({ path: `${path}.upgrades`, value: upgrades });
  }

  const entries: readonly unknown[] = Array.isArray(upgrades) ? upgrades : [];

  entries.forEach((value, index) => {
    if (
      badItems.length === 0 &&
      isPlannedUpgrade(value) &&
      findBadUpgrade({
        ...withoutUpgrades,
        upgrades: [...goodUpgrades, value],
      }) === -1
    ) {
      goodUpgrades.push(value);
    } else {
      badItems.push({ path: `${path}.upgrades[${index}]`, value });
    }
  });

  return {
    badItems,
    plannedBuilding:
      goodUpgrades.length === 0
        ? withoutUpgrades
        : { ...withoutUpgrades, upgrades: goodUpgrades },
  };
}

function keepGoodBuildings(buildings: readonly unknown[]) {
  const badItems: IBadItem[] = [];
  const goodBuildings: IPlannedBuilding[] = [];

  buildings.forEach((value, index) => {
    if (!isPlannedBuilding(value)) {
      badItems.push({ path: `buildings[${index}]`, value });
      return;
    }

    const path = `buildings[${index}]`;
    const read = readUpgrades(value, path);
    const looks = readBuildingLooks(read.plannedBuilding, path);
    goodBuildings.push(looks.plannedBuilding);
    badItems.push(...read.badItems, ...looks.badItems);
  });

  return { badItems, goodBuildings };
}

function keepCell(cell: Cell) {
  return cell;
}

function keepGoodCells<T extends Cell>(
  name: string,
  items: Record<string, unknown>,
  isCell: (cell: Cell) => cell is T,
  clean: (cell: Cell) => Cell = keepCell,
) {
  const badItems: IBadItem[] = [];
  const goodRows: [string, Record<string, T[]>][] = [];

  Object.entries(items).forEach(([y, row]) => {
    if (!isRecord(row)) {
      badItems.push({ path: `${name}[${y}]`, value: row });
      return;
    }

    const goodTiles: [string, T[]][] = [];

    Object.entries(row).forEach(([x, cells]) => {
      if (!Array.isArray(cells)) {
        badItems.push({ path: `${name}[${y}][${x}]`, value: cells });
        return;
      }

      const goodCells: T[] = [];

      cells.forEach((value: unknown, index) => {
        const cell = isRecord(value) ? clean(value) : undefined;

        if (cell !== undefined && isCellAt(cell, x, y) && isCell(cell)) {
          goodCells.push(cell);
        } else {
          badItems.push({ path: `${name}[${y}][${x}][${index}]`, value });
        }
      });

      goodTiles.push([x, goodCells]);
    });

    goodRows.push([y, Object.fromEntries(goodTiles)]);
  });

  return { badItems, goodItems: Object.fromEntries(goodRows) };
}

function isFarmShape(value: unknown): value is IFarmShape {
  return (
    isRecord(value) &&
    value.version === farmDataVersion &&
    typeof value.farm === "string" &&
    isFarmId(value.farm) &&
    Array.isArray(value.buildings) &&
    isRecord(value.crops) &&
    typeof value.date === "number" &&
    isRecord(value.equipment)
  );
}

// A bad variant is dropped, not the cell, because the draw code has a
// fallback look for a floor cell with no variant.
function withoutBadVariant(cell: Cell) {
  if (cell.variant === undefined || isFloorVariant(cell.variant)) {
    return cell;
  }

  const { variant: _variant, ...rest } = cell;

  return rest;
}

export function readFarmData(value: unknown) {
  if (!isFarmShape(value)) {
    return undefined;
  }

  const crops = keepGoodCells("crops", value.crops, isPlantedCell);
  const equipment = keepGoodCells(
    "equipment",
    value.equipment,
    isEquipmentCell,
    withoutBadVariant,
  );
  const buildings = keepGoodBuildings(value.buildings);
  const house = readHouseUpgrades(value.houseUpgrades);
  const { greenhouseRepair, ...repair } = readGreenhouseRepair(
    value.greenhouseRepair,
  );
  const petBowl = readPetBowlPaints(value.petBowlPaints);
  const houseColors = readHouseColorPaints(value.houseColorPaints);
  const cuts = readCutBushes(value.cutBushes);
  const data: IFarmData = {
    buildings: buildings.goodBuildings,
    crops: crops.goodItems,
    cutBushes: cuts.cutBushes,
    date: value.date,
    equipment: equipment.goodItems,
    farm: value.farm,
    ...(greenhouseRepair === undefined ? {} : { greenhouseRepair }),
    ...(houseColors.colorPaints.length === 0
      ? {}
      : { houseColorPaints: houseColors.colorPaints }),
    houseUpgrades: house.houseUpgrades,
    petBowlPaints: petBowl.petBowlPaints,
  };

  return {
    badItems: [
      ...buildings.badItems,
      ...house.badItems,
      ...houseColors.badItems,
      ...repair.badItems,
      ...petBowl.badItems,
      ...cuts.badItems,
      ...crops.badItems,
      ...equipment.badItems,
    ],
    data,
  };
}

export function toFarmFile({
  buildings,
  crops,
  cutBushes,
  date,
  equipment,
  farm,
  greenhouseRepair,
  houseColorPaints = [],
  houseUpgrades,
  petBowlPaints,
}: IFarmData) {
  return {
    buildings,
    crops,
    cutBushes,
    date,
    equipment,
    farm,
    ...(greenhouseRepair === undefined ? {} : { greenhouseRepair }),
    ...(houseColorPaints.length === 0 ? {} : { houseColorPaints }),
    houseUpgrades,
    petBowlPaints,
    version: farmDataVersion,
  };
}

export function toSavedFarmData(data: IFarmData) {
  return JSON.stringify(toFarmFile(data));
}
