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

type Cell = Record<string, unknown>;

const storageKey = "stardewValleySeasonalPlannerV1";

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

function isCropCell(cell: Cell) {
  return (
    typeof cell.cropId === "string" &&
    Object.hasOwn(cropDetails, cell.cropId) &&
    isOptionalNumber(cell.dateDestroyed) &&
    typeof cell.datePlanted === "number" &&
    cell.type === "crop"
  );
}

function isEquipmentCell(cell: Cell) {
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

function isFarmItems(value: unknown, isCell: (cell: Cell) => boolean) {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([y, row]) =>
        isRecord(row) &&
        Object.entries(row).every(
          ([x, cells]) =>
            Array.isArray(cells) &&
            cells.every(
              (cell: unknown) =>
                isRecord(cell) && isCellAt(cell, x, y) && isCell(cell),
            ),
        ),
    )
  );
}

export function isFarmData(value: unknown): value is IFarmData {
  return (
    isRecord(value) &&
    isFarmItems(value.crops, isCropCell) &&
    typeof value.date === "number" &&
    isFarmItems(value.equipment, isEquipmentCell)
  );
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

function loadSavedFarm() {
  const savedFarm = localStorage.getItem(storageKey);

  if (savedFarm === null) {
    return newFarm();
  }

  try {
    return parseFarmData(savedFarm);
  } catch {
    return newFarm();
  }
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
