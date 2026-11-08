import { batch, createSignal } from "solid-js";

import type { TFarmId } from "../helpers/farmMapLoader";
import { checkCutsOnFarm, type TLoadBushes } from "./bushCutsData";
import { type IBadItem, type IFarmData, readFarmData } from "./farmData";
import {
  type IPlan,
  type IPlanSummary,
  makePlanId,
  newFarmData,
  noFarmStart,
  planNameFromFileName,
  readStoredPlan,
  toPlanSummary,
  type TPlanInfo,
} from "./plan";
import type { IPlanStorage } from "./planStorage";

function logSaveError(error: unknown) {
  console.error("Could not save the plan.", error);
}

function warnBadItems(badItems: IBadItem[], source: string) {
  if (badItems.length > 0) {
    console.warn(
      `Removed ${badItems.length} bad items from the ${source}.`,
      badItems,
    );
  }
}

async function readFile(file: File) {
  try {
    const data: unknown = JSON.parse(await file.text());

    return data;
  } catch (error) {
    console.error("The plan file is not valid JSON.", error);
    return undefined;
  }
}

function prepareNothing() {
  return Promise.resolve();
}

function loadNoStart(): Promise<IFarmStart> {
  return Promise.resolve(noFarmStart);
}

function loadNoBushes() {
  return Promise.resolve(undefined);
}

// prepare runs before a plan shows, so that its farm map can load first and the
// plan never shows on the map of the last farm. loadStart gives the things that
// a new game puts on the farm, and loadBushes the bushes of its map, to check
// the cuts of a plan that loads.
export function createPlanStore(
  storage: IPlanStorage,
  prepare: (plan: IPlan) => Promise<unknown> = prepareNothing,
  loadStart: (farm: TFarmId) => Promise<IFarmStart> = loadNoStart,
  loadBushes: TLoadBushes = loadNoBushes,
) {
  let lastShowRequest = 0;
  const [planInfo, setPlanInfo] = createSignal<TPlanInfo>();
  const [plans, setPlans] = createSignal<readonly IPlanSummary[]>([]);
  const [buildings, setBuildingsSignal] = createSignal<
    readonly IPlannedBuilding[]
  >([]);
  const [crops, setCropsSignal] = createSignal<IFarmCrops>({});
  const [cutBushes, setCutBushesSignal] = createSignal<readonly ICutBush[]>([]);
  const [date, setDateSignal] = createSignal(0);
  const [equipment, setEquipmentSignal] = createSignal<IFarmEquipment>({});
  const [greenhouseRepair, setGreenhouseRepairSignal] =
    createSignal<IPlannedRepair>();
  const [houseColorPaints, setHouseColorPaintsSignal] = createSignal<
    readonly IPlannedColorPaint[]
  >([]);
  const [houseUpgrades, setHouseUpgradesSignal] = createSignal<
    readonly IPlannedHouseUpgrade[]
  >([]);
  const [petBowlPaints, setPetBowlPaintsSignal] = createSignal<
    readonly IPlannedPaint[]
  >([]);

  function currentPlan(): IPlan | undefined {
    const info = planInfo();
    const repair = greenhouseRepair();
    const houseColors = houseColorPaints();

    return info === undefined
      ? undefined
      : {
          ...info,
          buildings: buildings(),
          crops: crops(),
          cutBushes: cutBushes(),
          date: date(),
          equipment: equipment(),
          ...(repair === undefined ? {} : { greenhouseRepair: repair }),
          ...(houseColors.length === 0
            ? {}
            : { houseColorPaints: houseColors }),
          houseUpgrades: houseUpgrades(),
          petBowlPaints: petBowlPaints(),
        };
  }

  function isListed(id: string) {
    return plans().some((plan) => plan.id === id);
  }

  // A deleted plan stays on screen while the farm of the next plan loads, and
  // an edit in that time must not save it again.
  function save() {
    const plan = currentPlan();

    if (plan !== undefined && isListed(plan.id)) {
      storage.putPlan(plan).catch(logSaveError);
    }
  }

  function setBuildings(value: readonly IPlannedBuilding[]) {
    setBuildingsSignal(value);
    save();
  }

  function setCrops(value: IFarmCrops) {
    setCropsSignal(value);
    save();
  }

  function setCutBushes(value: readonly ICutBush[]) {
    setCutBushesSignal(value);
    save();
  }

  function setDate(value: number) {
    setDateSignal(value);
    save();
  }

  function setEquipment(value: IFarmEquipment) {
    setEquipmentSignal(value);
    save();
  }

  function setGreenhouseRepair(value: IPlannedRepair | undefined) {
    setGreenhouseRepairSignal(value);
    save();
  }

  function setHouseColorPaints(value: readonly IPlannedColorPaint[]) {
    setHouseColorPaintsSignal(value);
    save();
  }

  function setHouseUpgrades(value: readonly IPlannedHouseUpgrade[]) {
    setHouseUpgradesSignal(value);
    save();
  }

  function setPetBowlPaints(value: readonly IPlannedPaint[]) {
    setPetBowlPaintsSignal(value);
    save();
  }

  async function show(plan: IPlan) {
    const { buildings, crops, cutBushes, date, equipment, farm, id, name } =
      plan;
    const { greenhouseRepair, houseUpgrades, petBowlPaints } = plan;
    const { houseColorPaints = [] } = plan;
    lastShowRequest += 1;
    const request = lastShowRequest;

    await prepare(plan).catch((error: unknown) => {
      console.error(`Could not get the ${farm} farm ready.`, error);
    });

    if (request !== lastShowRequest) {
      return;
    }

    batch(() => {
      setPlanInfo({ farm, id, name });
      setBuildingsSignal(buildings);
      setCropsSignal(crops);
      setCutBushesSignal(cutBushes);
      setDateSignal(date);
      setEquipmentSignal(equipment);
      setGreenhouseRepairSignal(greenhouseRepair);
      setHouseColorPaintsSignal(houseColorPaints);
      setHouseUpgradesSignal(houseUpgrades);
      setPetBowlPaintsSignal(petBowlPaints);
    });
    storage.setLastPlanId(id).catch(logSaveError);
  }

  async function loadPlan(id: string) {
    let value: unknown;

    try {
      value = await storage.getPlan(id);
    } catch (error) {
      console.error(`Could not load the plan ${id}.`, error);
      return undefined;
    }

    const result = readStoredPlan(value);

    if (result === undefined || result.plan.id !== id) {
      console.error(`The saved plan ${id} is not valid.`, value);
      return undefined;
    }

    const checked = await checkCutsOnFarm(result.plan, loadBushes);
    warnBadItems([...result.badItems, ...checked.badItems], "saved plan");

    return checked.data;
  }

  async function openPlan(id: string) {
    const plan = await loadPlan(id);

    if (plan === undefined) {
      return false;
    }

    await show(plan);

    return true;
  }

  async function addPlan(data: IFarmData, name: string) {
    const plan: IPlan = { ...data, id: makePlanId(), name };

    setPlans([...plans(), toPlanSummary(plan)]);
    await storage.putPlan(plan).catch(logSaveError);
    await show(plan);

    return plan;
  }

  // A new plan with no start would not be the farm of a new game, so there is
  // no plan when the start does not load.
  async function addNewPlan(farm: TFarmId, name: string) {
    const start = await loadStart(farm).catch((error: unknown) => {
      console.error(`Could not load the start of the ${farm} farm.`, error);
    });

    return start === undefined
      ? undefined
      : addPlan(newFarmData(farm, start), name);
  }

  async function addPlanFromFile(file: File) {
    const result = readFarmData(await readFile(file));

    if (result === undefined) {
      console.error(
        "The plan file does not have a farm type, buildings, crops, a date and equipment, or its version is not known.",
      );
      return undefined;
    }

    const checked = await checkCutsOnFarm(result.data, loadBushes);
    warnBadItems([...result.badItems, ...checked.badItems], "opened plan");

    return addPlan(
      checked.data,
      planNameFromFileName(file.name, checked.data.farm),
    );
  }

  function closePlan() {
    lastShowRequest += 1;
    setPlanInfo(undefined);
  }

  async function openLastPlan() {
    const summaries = plans();
    const lastPlanId = await storage.getLastPlanId();
    const lastPlan = summaries.find(({ id }) => id === lastPlanId);
    const order =
      lastPlan === undefined
        ? summaries
        : [lastPlan, ...summaries.filter((plan) => plan !== lastPlan)];

    for (const { id } of order) {
      if (await openPlan(id)) {
        return true;
      }
    }

    return false;
  }

  async function start() {
    setPlans(await storage.listPlans());
    await openLastPlan();
  }

  async function renamePlan(id: string, name: string) {
    const info = planInfo();

    setPlans(
      plans().map((plan) => (plan.id === id ? { ...plan, name } : plan)),
    );

    if (info?.id === id) {
      setPlanInfo({ ...info, name });
      save();
      return;
    }

    const plan = await loadPlan(id);

    if (plan !== undefined) {
      await storage.putPlan({ ...plan, name }).catch(logSaveError);
    }
  }

  async function deletePlan(id: string) {
    const isOpen = planInfo()?.id === id;

    setPlans(plans().filter((plan) => plan.id !== id));
    await storage.deletePlan(id).catch((error: unknown) => {
      console.error(`Could not delete the plan ${id}.`, error);
    });

    if (isOpen && !(await openLastPlan())) {
      closePlan();
    }
  }

  return {
    addNewPlan,
    addPlan,
    addPlanFromFile,
    buildings,
    crops,
    currentPlan,
    cutBushes,
    date,
    deletePlan,
    equipment,
    greenhouseRepair,
    houseColorPaints,
    houseUpgrades,
    openPlan,
    petBowlPaints,
    planInfo,
    plans,
    renamePlan,
    setBuildings,
    setCrops,
    setCutBushes,
    setDate,
    setEquipment,
    setGreenhouseRepair,
    setHouseColorPaints,
    setHouseUpgrades,
    setPetBowlPaints,
    start,
  };
}

export type TPlanStore = ReturnType<typeof createPlanStore>;
