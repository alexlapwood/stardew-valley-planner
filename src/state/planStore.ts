import { batch, createSignal } from "solid-js";

import { type IBadItem, type IFarmData, readFarmData } from "./farmData";
import {
  type IPlan,
  type IPlanSummary,
  makePlanId,
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

// prepare runs before a plan shows, so that its farm map can load first and the
// plan never shows on the map of the last farm.
export function createPlanStore(
  storage: IPlanStorage,
  prepare: (plan: IPlan) => Promise<unknown> = prepareNothing,
) {
  let lastShowRequest = 0;
  const [planInfo, setPlanInfo] = createSignal<TPlanInfo>();
  const [plans, setPlans] = createSignal<readonly IPlanSummary[]>([]);
  const [crops, setCropsSignal] = createSignal<IFarmCrops>({});
  const [date, setDateSignal] = createSignal(0);
  const [equipment, setEquipmentSignal] = createSignal<IFarmEquipment>({});

  function currentPlan(): IPlan | undefined {
    const info = planInfo();

    return info === undefined
      ? undefined
      : { ...info, crops: crops(), date: date(), equipment: equipment() };
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

  function setCrops(value: IFarmCrops) {
    setCropsSignal(value);
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

  function setLooks(looks: IFarmLooks) {
    const info = planInfo();

    if (info === undefined) {
      return;
    }

    setPlanInfo({ ...info, looks });
    save();
  }

  async function show(plan: IPlan) {
    const { crops, date, equipment, farm, id, looks, name } = plan;
    lastShowRequest += 1;
    const request = lastShowRequest;

    await prepare(plan).catch((error: unknown) => {
      console.error(`Could not get the ${farm} farm ready.`, error);
    });

    if (request !== lastShowRequest) {
      return;
    }

    batch(() => {
      setPlanInfo({ farm, id, looks, name });
      setCropsSignal(crops);
      setDateSignal(date);
      setEquipmentSignal(equipment);
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

    warnBadItems(result.badItems, "saved plan");

    return result.plan;
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

  async function addPlanFromFile(file: File) {
    const result = readFarmData(await readFile(file));

    if (result === undefined) {
      console.error(
        "The plan file does not have a farm type, looks, crops, a date and equipment, or its version is not known.",
      );
      return undefined;
    }

    warnBadItems(result.badItems, "opened plan");

    return addPlan(
      result.data,
      planNameFromFileName(file.name, result.data.farm),
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
    addPlan,
    addPlanFromFile,
    crops,
    currentPlan,
    date,
    deletePlan,
    equipment,
    openPlan,
    planInfo,
    plans,
    renamePlan,
    setCrops,
    setDate,
    setEquipment,
    setLooks,
    start,
  };
}

export type TPlanStore = ReturnType<typeof createPlanStore>;
