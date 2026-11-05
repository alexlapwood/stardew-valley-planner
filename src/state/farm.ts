import saveAs from "file-saver";
import { createSignal } from "solid-js";

import { type IFarmData, readFarmData, toSavedFarmData } from "./farmData";

const storageKey = "stardewValleySeasonalPlannerV2";
const storageKeyV1 = "stardewValleySeasonalPlannerV1";

function newFarm(): IFarmData {
  return { crops: {}, date: 0, equipment: {} };
}

function backUpSavedFarm(key: string, savedFarm: string) {
  const backupKey = `${key}Backup`;

  try {
    localStorage.setItem(backupKey, savedFarm);
    console.warn(
      `The saved farm was copied to the "${backupKey}" localStorage key.`,
    );
  } catch (error) {
    console.error("Could not back up the saved farm.", error);
  }
}

function readSavedFarm(savedFarm: string) {
  let data: unknown;

  try {
    data = JSON.parse(savedFarm);
  } catch (error) {
    console.error(
      "The saved farm is not valid JSON, so a new farm was started.",
      error,
    );
    return { farm: newFarm(), isBad: true };
  }

  const result = readFarmData(data);

  if (result === undefined) {
    console.error(
      "The saved farm does not have crops, a date and equipment, or its version is not known, so a new farm was started.",
      data,
    );
    return { farm: newFarm(), isBad: true };
  }

  if (result.badItems.length > 0) {
    console.warn(
      `Removed ${result.badItems.length} bad items from the saved farm.`,
      result.badItems,
    );
  }

  return { farm: result.farm, isBad: result.badItems.length > 0 };
}

function loadSavedFarm(): IFarmData {
  const savedFarm = localStorage.getItem(storageKey);

  if (savedFarm !== null) {
    const { farm, isBad } = readSavedFarm(savedFarm);

    if (isBad) {
      backUpSavedFarm(storageKey, savedFarm);
    }

    return farm;
  }

  const savedFarmV1 = localStorage.getItem(storageKeyV1);

  if (savedFarmV1 === null) {
    return newFarm();
  }

  const { farm } = readSavedFarm(savedFarmV1);

  backUpSavedFarm(storageKeyV1, savedFarmV1);
  localStorage.setItem(storageKey, toSavedFarmData(farm));

  return farm;
}

const savedFarm = loadSavedFarm();

export const [date, setDateSignal] = createSignal(savedFarm.date);
export function setDate(date: number) {
  setDateSignal(date);
  localStorage.setItem(storageKey, toSavedFarmData(farmStore()));
}

export const [crops, setCropsSignal] = createSignal<IFarmCrops>(
  savedFarm.crops,
);
export function setCrops(crops: IFarmCrops) {
  setCropsSignal(crops);
  localStorage.setItem(storageKey, toSavedFarmData(farmStore()));
}

export const [equipment, setEquipmentSignal] = createSignal<IFarmEquipment>(
  savedFarm.equipment,
);
export function setEquipment(equipment: IFarmEquipment) {
  setEquipmentSignal(equipment);
  localStorage.setItem(storageKey, toSavedFarmData(farmStore()));
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
    const data: unknown = JSON.parse(await file.text());
    const result = readFarmData(data);

    if (result === undefined) {
      throw new Error(
        "The file does not have crops, a date and equipment, or its version is not known.",
      );
    }

    if (result.badItems.length > 0) {
      console.warn(
        `Removed ${result.badItems.length} bad items from the opened farm.`,
        result.badItems,
      );
    }

    setFarmStore(result.farm);
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
    new Blob([toSavedFarmData(farmStore())], {
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
