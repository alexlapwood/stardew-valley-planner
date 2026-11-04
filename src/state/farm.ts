import saveAs from "file-saver";
import { createSignal } from "solid-js";

interface IFarmData {
  crops: IFarmCrops;
  date: number;
  equipment: IFarmEquipment;
}

const storageKey = "stardewValleySeasonalPlannerV1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFarmData(value: unknown): value is IFarmData {
  return (
    isRecord(value) &&
    isRecord(value.crops) &&
    typeof value.date === "number" &&
    isRecord(value.equipment)
  );
}

function parseFarmData(text: string) {
  const data: unknown = JSON.parse(text);

  if (!isFarmData(data)) {
    throw new Error("The farm data must have crops, date and equipment.");
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
