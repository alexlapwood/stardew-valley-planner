import { type IPlanSummary, toPlanSummary, toStoredPlan } from "../state/plan";
import type { IPlanStorage } from "../state/planStorage";

export interface IMemoryPlanStorage extends IPlanStorage {
  records: Map<string, unknown>;
}

export function createMemoryPlanStorage(): IMemoryPlanStorage {
  const records = new Map<string, unknown>();
  let summaries: IPlanSummary[] = [];
  let recentPlanIds: string[] = [];

  return {
    deletePlan(id) {
      records.delete(id);
      summaries = summaries.filter((summary) => summary.id !== id);
      recentPlanIds = recentPlanIds.filter((recentId) => recentId !== id);

      return Promise.resolve();
    },

    getLastPlanId: () => Promise.resolve(recentPlanIds.at(0)),

    getPlan: (id) => Promise.resolve(structuredClone(records.get(id))),

    listPlans: () => Promise.resolve(structuredClone(summaries)),

    putPlan(plan) {
      const summary = toPlanSummary(plan);

      records.set(plan.id, structuredClone(toStoredPlan(plan)));
      summaries = summaries.some(({ id }) => id === plan.id)
        ? summaries.map((saved) => (saved.id === plan.id ? summary : saved))
        : [...summaries, summary];

      return Promise.resolve();
    },

    records,

    setLastPlanId(id) {
      recentPlanIds = [
        id,
        ...recentPlanIds.filter((recentId) => recentId !== id),
      ];

      return Promise.resolve();
    },
  };
}
