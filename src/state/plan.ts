import { defaultFarmLooks } from "../helpers/defaultBuildings";
import { farmIds, type TFarmId } from "../helpers/farmMapLoader";
import { farmTypes } from "../helpers/farmTypes";
import {
  type IBadItem,
  type IFarmData,
  isRecord,
  readFarmData,
  toFarmFile,
} from "./farmData";

export interface IPlan extends IFarmData {
  id: string;
  name: string;
}

export interface IPlanSummary {
  farm: TFarmId;
  id: string;
  name: string;
}

export type TPlanInfo = Omit<IPlan, "crops" | "date" | "equipment">;

export const maxPlanNameLength = 48;

export interface IFarmPlans {
  farm: TFarmId;
  plans: IPlanSummary[];
}

// crypto.randomUUID needs a secure context, and the dev server is opened over
// the local network with plain http.
export function makePlanId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function newFarmData(
  farm: TFarmId,
  looks: IFarmLooks = defaultFarmLooks,
): IFarmData {
  return { crops: {}, date: 0, equipment: {}, farm, looks };
}

export function toPlanSummary({ farm, id, name }: IPlanSummary): IPlanSummary {
  return { farm, id, name };
}

export function defaultPlanName(
  farm: TFarmId,
  plans: readonly Pick<IPlanSummary, "name">[],
) {
  const farmName = farmTypes[farm].name;
  const names = new Set(plans.map(({ name }) => name));
  let number = 2;

  if (!names.has(farmName)) {
    return farmName;
  }

  while (names.has(`${farmName} ${number}`)) {
    number += 1;
  }

  return `${farmName} ${number}`;
}

export function planFileName({ name }: Pick<IPlan, "name">) {
  return `${name}.layout.json`;
}

export function planNameFromFileName(fileName: string, farm: TFarmId) {
  const name = fileName.replace(/(?:\.layout)?\.json$/iu, "").trim();

  return name === "" ? farmTypes[farm].name : name;
}

export function toStoredPlan(plan: IPlan) {
  return { ...toFarmFile(plan), id: plan.id, name: plan.name };
}

export function readStoredPlan(
  value: unknown,
): { badItems: IBadItem[]; plan: IPlan } | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string"
  ) {
    return undefined;
  }

  const result = readFarmData(value);

  if (result === undefined) {
    return undefined;
  }

  return {
    badItems: result.badItems,
    plan: { ...result.data, id: value.id, name: value.name },
  };
}

export function groupPlansByFarm(plans: readonly IPlanSummary[]) {
  return farmIds
    .map((farm): IFarmPlans => ({
      farm,
      plans: plans.filter((plan) => plan.farm === farm),
    }))
    .filter((group) => group.plans.length > 0);
}
