import { defaultFarmId, isFarmId, type TFarmId } from "./farmMapLoader";

export function hasDevFarmSwitch(search: string) {
  return new URLSearchParams(search).has("farm");
}

export function parseDevFarmSwitch(search: string): TFarmId {
  const farm = new URLSearchParams(search).get("farm");

  return farm !== null && isFarmId(farm) ? farm : defaultFarmId;
}
