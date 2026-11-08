import saveAs from "file-saver";

import { getSeasonName } from "../helpers/date";
import { loadFarmMap, loadFarmScene } from "../helpers/farmMapLoader";
import { toSavedFarmData } from "./farmData";
import { planFileName } from "./plan";
import { createLocalPlanStorage } from "./planStorage";
import { createPlanStore } from "./planStore";

export const planStore = createPlanStore(
  createLocalPlanStorage(),
  (plan) => loadFarmScene(plan.farm, getSeasonName(plan.date)),
  async (farm) => (await loadFarmMap(farm)).start,
  async (farm) => (await loadFarmMap(farm)).bushes,
);

export const {
  buildings,
  crops,
  cutBushes,
  date,
  equipment,
  greenhouseRepair,
  houseColorPaints,
  houseUpgrades,
  petBowlPaints,
  setBuildings,
  setCrops,
  setCutBushes,
  setDate,
  setEquipment,
  setGreenhouseRepair,
  setHouseColorPaints,
  setHouseUpgrades,
  setPetBowlPaints,
} = planStore;

export function openPlanFile() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (file !== undefined) {
      void planStore.addPlanFromFile(file);
    }
  });
  input.click();
}

export function savePlanFile() {
  const plan = planStore.currentPlan();

  if (plan === undefined) {
    return;
  }

  saveAs(
    new Blob([toSavedFarmData(plan)], { type: "text/plain;charset=utf-8" }),
    planFileName(plan),
  );
}
