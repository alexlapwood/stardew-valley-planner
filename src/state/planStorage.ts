import { isFarmId } from "../helpers/farmMapLoader";
import { isRecord } from "./farmData";
import {
  type IPlan,
  type IPlanSummary,
  toPlanSummary,
  toStoredPlan,
} from "./plan";

// After a plan is deleted, getLastPlanId gives the last plan used of the plans
// that are left.
export interface IPlanStorage {
  deletePlan(id: string): Promise<void>;
  getLastPlanId(): Promise<string | undefined>;
  getPlan(id: string): Promise<unknown>;
  listPlans(): Promise<IPlanSummary[]>;
  putPlan(plan: IPlan): Promise<void>;
  setLastPlanId(id: string): Promise<void>;
}

interface IPlanIndex {
  plans: IPlanSummary[];
  recentPlanIds: string[];
}

export const planIndexKey = "stardewValleySeasonalPlannerPlans";

export function planKey(id: string) {
  return `stardewValleySeasonalPlannerPlan:${id}`;
}

function isPlanSummary(value: unknown): value is IPlanSummary {
  return (
    isRecord(value) &&
    typeof value.farm === "string" &&
    isFarmId(value.farm) &&
    typeof value.id === "string" &&
    typeof value.name === "string"
  );
}

function isSameSummary(a: IPlanSummary, b: IPlanSummary) {
  return a.farm === b.farm && a.id === b.id && a.name === b.name;
}

function parseIndex(saved: string) {
  try {
    const index: unknown = JSON.parse(saved);

    return index;
  } catch {
    return undefined;
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function readIndex(storage: Storage): IPlanIndex {
  const saved = storage.getItem(planIndexKey);

  if (saved === null) {
    return { plans: [], recentPlanIds: [] };
  }

  const index = parseIndex(saved);

  if (!isRecord(index) || !Array.isArray(index.plans)) {
    console.error("The plan list is not valid, so it was not read.", saved);
    return { plans: [], recentPlanIds: [] };
  }

  return {
    plans: index.plans.filter(isPlanSummary).map(toPlanSummary),
    recentPlanIds: Array.isArray(index.recentPlanIds)
      ? index.recentPlanIds.filter(isString)
      : [],
  };
}

function writeIndex(storage: Storage, index: IPlanIndex) {
  storage.setItem(planIndexKey, JSON.stringify(index));
}

function withSummary(plans: readonly IPlanSummary[], summary: IPlanSummary) {
  const position = plans.findIndex(({ id }) => id === summary.id);

  if (position === -1) {
    return [...plans, summary];
  }

  if (isSameSummary(plans[position], summary)) {
    return undefined;
  }

  return plans.map((plan, index) => (index === position ? summary : plan));
}

function readPlan(storage: Storage, id: string) {
  const saved = storage.getItem(planKey(id));

  if (saved === null) {
    return undefined;
  }

  const plan: unknown = JSON.parse(saved);

  return plan;
}

function writePlan(storage: Storage, plan: IPlan) {
  storage.setItem(planKey(plan.id), JSON.stringify(toStoredPlan(plan)));

  const index = readIndex(storage);
  const plans = withSummary(index.plans, toPlanSummary(plan));

  if (plans !== undefined) {
    writeIndex(storage, { ...index, plans });
  }
}

function deletePlan(storage: Storage, id: string) {
  const index = readIndex(storage);

  storage.removeItem(planKey(id));
  writeIndex(storage, {
    plans: index.plans.filter((plan) => plan.id !== id),
    recentPlanIds: index.recentPlanIds.filter((recentId) => recentId !== id),
  });
}

function setLastPlanId(storage: Storage, id: string) {
  const index = readIndex(storage);

  writeIndex(storage, {
    ...index,
    recentPlanIds: [
      id,
      ...index.recentPlanIds.filter((recentId) => recentId !== id),
    ],
  });
}

// A throw in run, for example a full localStorage, rejects the promise.
function toPromise<T>(run: () => T) {
  return new Promise<T>((resolve) => {
    resolve(run());
  });
}

export function createLocalPlanStorage(
  storage: Storage = localStorage,
): IPlanStorage {
  return {
    deletePlan: (id) =>
      toPromise(() => {
        deletePlan(storage, id);
      }),
    getLastPlanId: () =>
      toPromise(() => readIndex(storage).recentPlanIds.at(0)),
    getPlan: (id) => toPromise(() => readPlan(storage, id)),
    listPlans: () => toPromise(() => readIndex(storage).plans),
    putPlan: (plan) =>
      toPromise(() => {
        writePlan(storage, plan);
      }),
    setLastPlanId: (id) =>
      toPromise(() => {
        setLastPlanId(storage, id);
      }),
  };
}
