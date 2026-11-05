import { crops as cropDetails } from "../data/game/crops.json";
import { isFloorVariant } from "../helpers/floorVariant";
import { hasSkin, isItem } from "../helpers/items";
import { migrateCropCellV1, migrateEquipmentCellV1 } from "./farmMigration";

export interface IFarmData {
  crops: IFarmCrops;
  date: number;
  equipment: IFarmEquipment;
}

export interface IBadItem {
  path: string;
  value: unknown;
}

interface IFarmShape {
  crops: Record<string, unknown>;
  date: number;
  equipment: Record<string, unknown>;
  version?: unknown;
}

type Cell = Record<string, unknown>;

export const farmDataVersion = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
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

function keepGoodCells<T extends Cell>(
  name: string,
  items: Record<string, unknown>,
  isCell: (cell: Cell) => cell is T,
  migrate: (cell: Cell) => Cell | undefined,
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
        const cell = isRecord(value) ? migrate(value) : undefined;

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
    isRecord(value.crops) &&
    typeof value.date === "number" &&
    isRecord(value.equipment)
  );
}

function keepCell(cell: Cell) {
  return cell;
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

// V1 data has no version field.
export function readFarmData(value: unknown) {
  if (
    !isFarmShape(value) ||
    (value.version !== undefined && value.version !== farmDataVersion)
  ) {
    return undefined;
  }

  const isV1 = value.version === undefined;
  const migrateEquipmentCell = isV1 ? migrateEquipmentCellV1 : keepCell;
  const crops = keepGoodCells(
    "crops",
    value.crops,
    isCropCell,
    isV1 ? migrateCropCellV1 : keepCell,
  );
  const equipment = keepGoodCells(
    "equipment",
    value.equipment,
    isEquipmentCell,
    (cell) => {
      const migratedCell = migrateEquipmentCell(cell);

      return migratedCell === undefined
        ? undefined
        : withoutBadVariant(migratedCell);
    },
  );
  const farm: IFarmData = {
    crops: crops.goodItems,
    date: value.date,
    equipment: equipment.goodItems,
  };

  return { badItems: [...crops.badItems, ...equipment.badItems], farm };
}

export function toSavedFarmData(farm: IFarmData) {
  return JSON.stringify({ ...farm, version: farmDataVersion });
}
