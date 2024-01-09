import saveAs from "file-saver";
import { createSignal } from "solid-js";

const {
  crops: localStorageCrops,
  date: localStorageDate,
  equipment: localStorageEquipment,
} = JSON.parse(localStorage.getItem("stardewValleySeasonalPlannerV1") || "{}");

export const [date, setDateSignal] = createSignal(localStorageDate || 0);
export function setDate(date: number) {
  setDateSignal(date);
  localStorage.setItem(
    "stardewValleySeasonalPlannerV1",
    JSON.stringify(farmStore())
  );
}

export const [crops, setCropsSignal] = createSignal<IFarmCrops>(
  localStorageCrops || {}
);
export function setCrops(crops: IFarmCrops) {
  setCropsSignal(crops);
  localStorage.setItem(
    "stardewValleySeasonalPlannerV1",
    JSON.stringify(farmStore())
  );
}

export const [equipment, setEquipmentSignal] = createSignal<IFarmEquipment>(
  localStorageEquipment || {}
);
export function setEquipment(equipment: IFarmEquipment) {
  setEquipmentSignal(equipment);
  localStorage.setItem(
    "stardewValleySeasonalPlannerV1",
    JSON.stringify(farmStore())
  );
}

export const farmStore = () => ({
  crops: crops(),
  date: date(),
  equipment: equipment(),
});
export const setFarmStore = ({
  crops,
  date,
  equipment,
}: {
  crops: IFarmCrops;
  date: number;
  equipment: IFarmEquipment;
}) => {
  setCrops(crops);
  setDate(date);
  setEquipment(equipment);
};

export function openFarm() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.addEventListener("change", (e) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result;

      if (typeof text === "string") {
        setFarmStore(JSON.parse(text));
      }
    };

    const files = (e.target as HTMLInputElement).files;

    if (files && files[0]) {
      reader.readAsText(files[0]);
    }
  });
  input.click();
}

export function saveFarm() {
  saveAs(
    new Blob([JSON.stringify(farmStore())], {
      type: "text/plain;charset=utf-8",
    }),
    "Stardew Valley Seasonal Planner.layout.json"
  );
}

document.addEventListener("keydown", function (event) {
  // Check if Control or Command key is pressed along with 'S' or 'O'
  if ((event.ctrlKey || event.metaKey) && event.key === "s") {
    event.preventDefault(); // Prevent the default save behavior
    saveFarm(); // Call your custom save function
  } else if ((event.ctrlKey || event.metaKey) && event.key === "o") {
    event.preventDefault(); // Prevent the default open behavior
    openFarm(); // Call your custom open function
  }
});
