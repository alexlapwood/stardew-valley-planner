import saveAs from "file-saver";
import { createSignal } from "solid-js";

import {
  crops as cropDetails,
  equipment as equipmentDetails,
} from "../data/sdv.json";

interface IFarmData {
  crops: IFarmCrops;
  date: number;
  equipment: IFarmEquipment;
}

interface IFarmShape {
  crops: Record<string, unknown>;
  date: number;
  equipment: Record<string, unknown>;
}

interface IBadItem {
  path: string;
  value: unknown;
}

type Cell = Record<string, unknown>;

const storageKey = "stardewValleySeasonalPlannerV1";
const backupStorageKey = "stardewValleySeasonalPlannerV1Backup";

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
  if (
    typeof cell.equipmentId !== "string" ||
    !Object.hasOwn(equipmentDetails, cell.equipmentId)
  ) {
    return false;
  }

  return (
    isOptionalNumber(cell.dateDestroyed) &&
    typeof cell.dateInstalled === "number" &&
    isIndex(cell.skinIndex) &&
    cell.skinIndex < equipmentDetails[cell.equipmentId].skins.length &&
    cell.type === "equipment"
  );
}

function keepGoodCells<T extends Cell>(
  name: string,
  items: Record<string, unknown>,
  isCell: (cell: Cell) => cell is T,
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

      cells.forEach((cell: unknown, index) => {
        if (isRecord(cell) && isCellAt(cell, x, y) && isCell(cell)) {
          goodCells.push(cell);
        } else {
          badItems.push({ path: `${name}[${y}][${x}][${index}]`, value: cell });
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

function keepGoodFarm(value: IFarmShape) {
  const crops = keepGoodCells("crops", value.crops, isCropCell);
  const equipment = keepGoodCells(
    "equipment",
    value.equipment,
    isEquipmentCell,
  );
  const farm: IFarmData = {
    crops: crops.goodItems,
    date: value.date,
    equipment: equipment.goodItems,
  };

  return { badItems: [...crops.badItems, ...equipment.badItems], farm };
}

export function isFarmData(value: unknown): value is IFarmData {
  return isFarmShape(value) && keepGoodFarm(value).badItems.length === 0;
}

function parseFarmData(text: string) {
  const data: unknown = JSON.parse(text);

  if (!isFarmData(data)) {
    throw new Error("The farm data is not valid.");
  }

  return data;
}

function newFarm(): IFarmData {
  return { crops: {}, date: 0, equipment: {} };
}

function backUpSavedFarm(savedFarm: string) {
  try {
    localStorage.setItem(backupStorageKey, savedFarm);
    console.warn(
      `The saved farm was copied to the "${backupStorageKey}" localStorage key.`,
    );
  } catch (error) {
    console.error("Could not back up the saved farm.", error);
  }
}

function loadSavedFarm(): IFarmData {
  const savedFarm = localStorage.getItem(storageKey);

  if (savedFarm === null) {
    return newFarm();
  }

  let data: unknown;

  try {
    data = JSON.parse(savedFarm);
  } catch (error) {
    backUpSavedFarm(savedFarm);
    console.error(
      "The saved farm is not valid JSON, so a new farm was started.",
      error,
    );
    return newFarm();
  }

  if (!isFarmShape(data)) {
    backUpSavedFarm(savedFarm);
    console.error(
      "The saved farm does not have crops, a date and equipment, so a new farm was started.",
      data,
    );
    return newFarm();
  }

  const { badItems, farm } = keepGoodFarm(data);

  if (badItems.length > 0) {
    backUpSavedFarm(savedFarm);
    console.warn(
      `Removed ${badItems.length} bad items from the saved farm.`,
      badItems,
    );
  }

  return farm;
}

const savedFarm = loadSavedFarm();

export const [date, setDateSignal] = createSignal(savedFarm.date);
export function setDate(date: number) {
  setDateSignal(date);
  localStorage.setItem(storageKey, JSON.stringify(farmStore()));
}

export const [crops, setCropsSignal] = createSignal<IFarmCrops>(
  savedFarm.crops,
);
export function setCrops(crops: IFarmCrops) {
  setCropsSignal(crops);
  localStorage.setItem(storageKey, JSON.stringify(farmStore()));
}

export const [equipment, setEquipmentSignal] = createSignal<IFarmEquipment>(
  savedFarm.equipment,
);
export function setEquipment(equipment: IFarmEquipment) {
  setEquipmentSignal(equipment);
  localStorage.setItem(storageKey, JSON.stringify(farmStore()));
}

export const farmStore = (): IFarmData => ({
  crops: crops(),
  date: date(),
  equipment: equipment(),
});
export const setFarmStore = ({ crops, date, equipment }: IFarmData) => {
  setCrops(crops);
  setDate(date);
  setEquipment(equipment);
};

async function openFarmFile(file: File) {
  try {
    setFarmStore(parseFarmData(await file.text()));
  } catch (error) {
    console.error("Could not open the farm file.", error);
  }
}

export function openFarm() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (file !== undefined) {
      void openFarmFile(file);
    }
  });
  input.click();
}

export function saveFarm() {
  saveAs(
    new Blob([JSON.stringify(farmStore())], {
      type: "text/plain;charset=utf-8",
    }),
    "Stardew Valley Seasonal Planner.layout.json",
  );
}

document.addEventListener("keydown", function (event) {
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault();
    saveFarm();
  } else if ((event.ctrlKey || event.metaKey) && event.key === "o") {
    event.preventDefault();
    openFarm();
  }
});
