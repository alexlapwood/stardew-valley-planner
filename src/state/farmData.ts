import { crops as cropDetails } from "../data/game/crops.json";
import {
  defaultFarmLooks,
  farmhouseLooks,
  greenhouseLooks,
  petBowlLooks,
} from "../helpers/defaultBuildings";
import { isFarmId, type TFarmId } from "../helpers/farmMapLoader";
import { isFloorVariant } from "../helpers/floorVariant";
import { hasSkin, isItem } from "../helpers/items";

export interface IFarmData {
  crops: IFarmCrops;
  date: number;
  equipment: IFarmEquipment;
  farm: TFarmId;
  looks: IFarmLooks;
}

export interface IBadItem {
  path: string;
  value: unknown;
}

interface IFarmShape {
  crops: Record<string, unknown>;
  date: number;
  equipment: Record<string, unknown>;
  farm: TFarmId;
  looks: Record<string, unknown>;
}

type Cell = Record<string, unknown>;

export const farmDataVersion = 3;

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
    isRecord(value.looks) &&
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

function readLooks(looks: Record<string, unknown>) {
  const badItems: IBadItem[] = [];

  function readLook<K extends keyof IFarmLooks>(
    name: K,
    knownLooks: readonly IFarmLooks[K][],
  ) {
    const look = knownLooks.find((known) => known === looks[name]);

    if (look === undefined) {
      badItems.push({ path: `looks.${name}`, value: looks[name] });
    }

    return look ?? defaultFarmLooks[name];
  }

  return {
    badItems,
    looks: {
      greenhouse: readLook("greenhouse", greenhouseLooks),
      house: readLook("house", farmhouseLooks),
      petBowl: readLook("petBowl", petBowlLooks),
    },
  };
}

export function readFarmData(value: unknown) {
  if (!isFarmShape(value)) {
    return undefined;
  }

  const crops = keepGoodCells("crops", value.crops, isCropCell);
  const equipment = keepGoodCells(
    "equipment",
    value.equipment,
    isEquipmentCell,
    withoutBadVariant,
  );
  const looks = readLooks(value.looks);
  const data: IFarmData = {
    crops: crops.goodItems,
    date: value.date,
    equipment: equipment.goodItems,
    farm: value.farm,
    looks: looks.looks,
  };

  return {
    badItems: [...looks.badItems, ...crops.badItems, ...equipment.badItems],
    data,
  };
}

export function toFarmFile({ crops, date, equipment, farm, looks }: IFarmData) {
  return { crops, date, equipment, farm, looks, version: farmDataVersion };
}

export function toSavedFarmData(data: IFarmData) {
  return JSON.stringify(toFarmFile(data));
}
